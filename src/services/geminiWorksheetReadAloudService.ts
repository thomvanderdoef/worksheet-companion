import { GoogleGenAI, Modality, Session, Type, type LiveServerMessage } from '@google/genai';

export type WorksheetLanguage = 'en' | 'es';
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

    const closingInstruction = buildClosingInstruction(params.language);

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
        this.handleFatalError('Read-aloud connection timed out.');
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
                voiceName: script.language === 'es' ? 'Kore' : 'Puck',
              },
            },
          },
          systemInstruction: buildSpeechInstruction(script.language),
        },
        callbacks: {
          onopen: () => {},
          onmessage: (message: LiveServerMessage) => {
            this.handleMessage(message, script);
          },
          onerror: () => {
            this.handleFatalError('Gemini read-aloud failed to connect.');
          },
          onclose: () => {
            this.clearConnectionTimer();
            this.clearCompletionTimer();
            this.session = null;

            if (!this.closedByClient && this.state !== 'idle') {
              if (this.hasStartedPlayback) {
                this.finishPlayback();
              } else {
                this.handleFatalError('Read-aloud connection closed early.');
              }
            }
          },
        },
      });
    } catch (error) {
      console.error('Read-aloud live connection failed:', error);
      this.handleFatalError('Unable to start worksheet audio.');
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
        this.session?.sendRealtimeInput({
          text: `Read this worksheet aloud exactly as written. Do not add commentary.\n\n${script.spokenText}`,
        });
      } catch (error) {
        console.error('Failed to send read-aloud prompt:', error);
        this.handleFatalError('Unable to start worksheet audio.');
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
      this.handleFatalError('Gemini asked to end the read-aloud session.');
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

function buildReadAloudPrompt(worksheetText: string, language: WorksheetLanguage): string {
  const targetLanguage = language === 'es' ? 'Spanish' : 'English';

  return [
    `You are preparing a worksheet read-aloud for a young student in ${targetLanguage}.`,
    'Use only the worksheet content provided below.',
    'Keep the instructions faithful to the worksheet, but make the spoken delivery easy for a child to follow.',
    'Do not greet the student. Start directly with the worksheet title or directions.',
    'Read the worksheet title, directions, and each problem in order.',
    'Do not solve the problems.',
    'Do not add teacher commentary, extra introductions, or extra closings.',
    `Return the final script entirely in ${targetLanguage}.`,
    'Break the spoken script into short `spokenSegments` that could later be highlighted on screen.',
    '',
    'Worksheet source text:',
    worksheetText,
  ].join('\n');
}

function buildClosingInstruction(language: WorksheetLanguage): string {
  if (language === 'es') {
    return 'Haz clic en el boton de la siguiente diapositiva cuando estes listo para empezar.';
  }

  return 'Click the next slide button when you are ready to start.';
}

function buildSpeechInstruction(language: WorksheetLanguage): string {
  if (language === 'es') {
    return [
      'You are reading a worksheet aloud to a young student.',
      'Speak fully in Spanish.',
      'Read the provided script exactly.',
      'Do not add greetings, teacher commentary, explanations, or answers.',
      'Use a warm, patient, child-friendly tone.',
    ].join(' ');
  }

  return [
    'You are reading a worksheet aloud to a young student.',
    'Speak fully in English.',
    'Read the provided script exactly.',
    'Do not add greetings, teacher commentary, explanations, or answers.',
    'Use a warm, patient, child-friendly tone.',
  ].join(' ');
}
