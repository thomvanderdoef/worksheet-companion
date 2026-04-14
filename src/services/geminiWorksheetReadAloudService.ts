import { GoogleGenAI, Modality, Session, Type, type LiveServerMessage } from '@google/genai';
import {
  buildReadAloudPrompt,
  buildReadAloudSpeechInstruction,
  getPrototypeCopy,
  getVoiceName,
  type PrototypeLanguage,
} from '../content/localization';

export type WorksheetLanguage = PrototypeLanguage;
export type ReadAloudState = 'idle' | 'connecting' | 'speaking' | 'error';

export interface WorksheetReadAloudScript {
  title: string;
  language: WorksheetLanguage;
  spokenText: string;
  spokenSegments: string[];
}

interface WorksheetReadAloudResponse {
  title?: string;
  spokenText?: string;
  spokenSegments?: string[];
}

interface GeminiWorksheetReadAloudCallbacks {
  onStateChange: (state: ReadAloudState) => void;
  onPlaybackComplete: () => void;
  onError: (message: string) => void;
}

const READ_ALOUD_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Short worksheet title.',
    },
    spokenText: {
      type: Type.STRING,
      description:
        'A child-friendly worksheet read-aloud script that reads directions and problems in order.',
    },
    spokenSegments: {
      type: Type.ARRAY,
      description: 'Short spoken segments in reading order, useful for future highlighting.',
      items: {
        type: Type.STRING,
      },
    },
  },
  required: ['title', 'spokenText', 'spokenSegments'],
} as const;

const CONNECTION_TIMEOUT_MS = 10_000;

export class GeminiWorksheetReadAloudService {
  private ai: GoogleGenAI;
  private callbacks: GeminiWorksheetReadAloudCallbacks;
  private session: Session | null = null;
  private audioContext: AudioContext | null = null;
  private state: ReadAloudState = 'idle';
  private nextPlayTime = 0;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private completionTimer: ReturnType<typeof setTimeout> | null = null;
  private hasStartedPlayback = false;
  private closedByClient = false;

  constructor(apiKey: string, callbacks: GeminiWorksheetReadAloudCallbacks) {
    this.ai = new GoogleGenAI({ apiKey });
    this.callbacks = callbacks;
  }

  async buildScript(params: {
    worksheetText: string;
    language: WorksheetLanguage;
  }): Promise<WorksheetReadAloudScript> {
    const prompt = buildReadAloudPrompt(params.worksheetText, params.language);
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: prompt }],
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: READ_ALOUD_RESPONSE_SCHEMA,
      },
    });

    let parsed: WorksheetReadAloudResponse = {};
    try {
      parsed = JSON.parse(response.text ?? '{}') as WorksheetReadAloudResponse;
    } catch (error) {
      console.error('Failed to parse read-aloud response:', error, response.text);
    }

    const spokenText = parsed.spokenText?.trim();
    const spokenSegments = (parsed.spokenSegments ?? [])
      .map(segment => segment.trim())
      .filter(Boolean);

    if (!spokenText || spokenSegments.length === 0) {
      throw new Error('Gemini did not return a usable read-aloud script.');
    }

    const closingInstruction = getPrototypeCopy(params.language).readAloud.closingInstruction;

    return {
      title: parsed.title?.trim() || 'Worksheet',
      language: params.language,
      spokenText: `${spokenText}\n\n${closingInstruction}`,
      spokenSegments: [...spokenSegments, closingInstruction],
    };
  }

  async speakScript(script: WorksheetReadAloudScript): Promise<void> {
    this.stop();

    this.closedByClient = false;
    this.hasStartedPlayback = false;
    this.nextPlayTime = 0;
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    this.setState('connecting');
    this.connectionTimer = setTimeout(() => {
      if (this.state === 'connecting') {
        this.handleFatalError(getPrototypeCopy(script.language).readAloud.connectionTimedOut);
      }
    }, CONNECTION_TIMEOUT_MS);

    try {
      this.session = await this.ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: getVoiceName(script.language),
              },
            },
          },
          systemInstruction: buildReadAloudSpeechInstruction(script.language),
        },
        callbacks: {
          onopen: () => {},
          onmessage: (message: LiveServerMessage) => {
            this.handleMessage(message, script);
          },
          onerror: () => {
            this.handleFatalError(getPrototypeCopy(script.language).readAloud.connectFailed);
          },
          onclose: () => {
            this.clearConnectionTimer();
            this.clearCompletionTimer();
            this.session = null;

            if (!this.closedByClient && this.state !== 'idle') {
              if (this.hasStartedPlayback) {
                this.finishPlayback();
              } else {
                this.handleFatalError(getPrototypeCopy(script.language).readAloud.closedEarly);
              }
            }
          },
        },
      });
    } catch (error) {
      console.error('Read-aloud live connection failed:', error);
      this.handleFatalError(getPrototypeCopy(script.language).readAloud.unableToStart);
    }
  }

  stop(): void {
    this.closedByClient = true;
    this.clearConnectionTimer();
    this.clearCompletionTimer();

    if (this.session) {
      try {
        this.session.close();
      } catch {
        // Session may already be closed.
      }
      this.session = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }

    this.audioContext = null;
    this.nextPlayTime = 0;
    this.hasStartedPlayback = false;
    this.setState('idle');
  }

  private handleMessage(message: LiveServerMessage, script: WorksheetReadAloudScript): void {
    if (message.setupComplete) {
      this.clearConnectionTimer();
      try {
        const copy = getPrototypeCopy(script.language).readAloud;
        this.session?.sendRealtimeInput({
          text: `${copy.readPrefix}\n\n${script.spokenText}`,
        });
      } catch (error) {
        console.error('Failed to send read-aloud prompt:', error);
        this.handleFatalError(getPrototypeCopy(script.language).readAloud.unableToStart);
      }
      return;
    }

    const serverContent = message.serverContent;
    if (serverContent?.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.inlineData?.mimeType?.startsWith('audio/') && part.inlineData.data) {
          this.hasStartedPlayback = true;
          this.setState('speaking');
          this.playAudioChunk(part.inlineData.data);
        }
      }
    }

    if (serverContent?.turnComplete && this.hasStartedPlayback) {
      const remainingSec = this.nextPlayTime - (this.audioContext?.currentTime ?? 0);
      const delayMs = Math.max(0, remainingSec * 1000) + 250;
      this.clearCompletionTimer();
      this.completionTimer = setTimeout(() => {
        this.finishPlayback();
      }, delayMs);
    }

    if (message.goAway) {
      this.handleFatalError(getPrototypeCopy(script.language).readAloud.goAway);
    }
  }

  private playAudioChunk(base64Pcm: string): void {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    const binaryString = atob(base64Pcm);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    const startTime = Math.max(now, this.nextPlayTime);
    source.start(startTime);
    this.nextPlayTime = startTime + audioBuffer.duration;
  }

  private finishPlayback(): void {
    this.closedByClient = true;
    this.clearCompletionTimer();
    this.callbacks.onPlaybackComplete();
    this.stop();
  }

  private handleFatalError(message: string): void {
    this.callbacks.onError(message);
    this.stop();
    this.setState('error');
  }

  private setState(state: ReadAloudState): void {
    if (this.state === state) {
      return;
    }

    this.state = state;
    this.callbacks.onStateChange(state);
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer !== null) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private clearCompletionTimer(): void {
    if (this.completionTimer !== null) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
  }
}
