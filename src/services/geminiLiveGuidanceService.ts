import { GoogleGenAI, Modality, Session, type LiveServerMessage } from "@google/genai";

export type LiveConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface GeminiLiveGuidanceCallbacks {
  onGuidanceText: (text: string) => void;
  onReadyToCapture: () => void;
  onConnectionStateChange: (state: LiveConnectionState) => void;
}

interface GeminiLiveGuidanceOptions {
  startPromptCycleOnConnect?: boolean;
}

const SYSTEM_INSTRUCTION = `You are a friendly classroom assistant helping a young student scan their worksheet with a camera. You are watching their camera feed.

Your ONLY job is to guide them to hold up the worksheet properly:
- When you first connect, say: "Hold up your worksheet and make sure I can see the whole page!"
- If no paper is visible, say "Hold up your worksheet so I can see it!"
- If you can see a worksheet and can read the printed text on it, call readyToCapture IMMEDIATELY. Be eager to capture!
- Only give positioning advice if the paper is very blurry, mostly out of frame, or you truly cannot read the text.
- Fingers holding the paper are totally fine.

You should call readyToCapture within a few seconds of seeing a readable worksheet. Err on the side of capturing too early — the system will ask to try again if the image wasn't good enough.
Speak in short, encouraging sentences a child can understand.
Do NOT read or comment on the worksheet content. Stay focused on scanning.

IMPORTANT: When the system sends you a message (not the student), follow its instructions. For example if it tells you the scan failed, relay that to the student in a friendly way.`;

const READY_TO_CAPTURE_TOOL = {
  functionDeclarations: [
    {
      name: "readyToCapture",
      description:
        "Call as soon as you can see a worksheet and read its printed text. Be eager — capture early and often. The system handles quality checks afterward.",
    },
  ],
};

const CONNECTION_TIMEOUT_MS = 10_000;
const PROMPT_INTERVAL_MS = 5_000;

export class GeminiLiveGuidanceService {
  private ai: GoogleGenAI;
  private session: Session | null = null;
  private callbacks: GeminiLiveGuidanceCallbacks;
  private options: Required<GeminiLiveGuidanceOptions>;
  private state: LiveConnectionState = "disconnected";
  private audioContext: AudioContext | null = null;
  private nextPlayTime = 0;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private promptTimer: ReturnType<typeof setInterval> | null = null;
  private framesSent = 0;
  private awaitingFinalTurn = false;
  private finalTurnTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    apiKey: string,
    callbacks: GeminiLiveGuidanceCallbacks,
    options: GeminiLiveGuidanceOptions = {}
  ) {
    this.ai = new GoogleGenAI({ apiKey });
    this.callbacks = callbacks;
    this.options = {
      startPromptCycleOnConnect: options.startPromptCycleOnConnect ?? true,
    };
  }

  async connect(): Promise<void> {
    if (this.session) {
      this.disconnect();
    }

    this.setState("connecting");
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
    this.nextPlayTime = 0;
    this.framesSent = 0;

    this.connectionTimer = setTimeout(() => {
      if (this.state === "connecting") {
        console.warn("[LiveGuidance] Connection timed out");
        this.setState("error");
        this.cleanupSession();
      }
    }, CONNECTION_TIMEOUT_MS);

    try {
      console.log("[LiveGuidance] Connecting to gemini-3.1-flash-live-preview...");
      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Puck" },
            },
          },
          outputAudioTranscription: {},
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [READY_TO_CAPTURE_TOOL],
        },
        callbacks: {
          onopen: () => {
            console.log("[LiveGuidance] WebSocket opened, waiting for setupComplete...");
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleMessage(message);
          },
          onerror: (e: ErrorEvent) => {
            console.error("[LiveGuidance] WebSocket error:", e);
            this.clearConnectionTimer();
            this.setState("error");
          },
          onclose: (e: CloseEvent) => {
            console.warn("[LiveGuidance] WebSocket closed — code:", e.code, "reason:", e.reason);
            this.clearConnectionTimer();
            this.stopPromptCycle();
            if (this.state !== "disconnected") {
              this.setState("error");
            }
            this.session = null;
          },
        },
      });
      console.log("[LiveGuidance] connect() resolved, session acquired");
    } catch (error) {
      console.error("[LiveGuidance] Connection failed:", error);
      this.clearConnectionTimer();
      this.setState("error");
    }
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer !== null) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private cleanupSession(): void {
    this.stopPromptCycle();
    if (this.session) {
      try { this.session.close(); } catch { /* already closed */ }
      this.session = null;
    }
  }

  private startPromptCycle(immediate = true): void {
    if (this.promptTimer) return;

    if (immediate) {
      this.sendTextPrompt();
    }

    this.promptTimer = setInterval(() => {
      if (!this.session || this.state !== "connected") {
        this.stopPromptCycle();
        return;
      }
      this.sendTextPrompt();
    }, PROMPT_INTERVAL_MS);
  }

  private stopPromptCycle(): void {
    if (this.promptTimer !== null) {
      clearInterval(this.promptTimer);
      this.promptTimer = null;
    }
  }

  private sendTextPrompt(): void {
    if (!this.session) return;
    try {
      console.log("[LiveGuidance] Sending text prompt to trigger response");
      this.session.sendRealtimeInput({
        text: "Look at the camera and guide me.",
      });
    } catch {
      // session may have closed
    }
  }

  pausePrompts(): void {
    this.stopPromptCycle();
  }

  resumePrompts(): void {
    if (this.session && this.state === "connected" && !this.promptTimer) {
      this.startPromptCycle(false);
    }
  }

  sendMessage(text: string): void {
    if (!this.session || this.state !== "connected") return;
    try {
      this.session.sendRealtimeInput({ text });
    } catch {
      // session may have closed
    }
  }

  speakThenDisconnect(text: string): void {
    if (!this.session || this.state !== "connected") {
      this.disconnect();
      return;
    }

    this.pausePrompts();
    this.awaitingFinalTurn = true;

    this.finalTurnTimer = setTimeout(() => {
      console.warn("[LiveGuidance] Final turn timed out, disconnecting");
      this.awaitingFinalTurn = false;
      this.disconnect();
    }, 30_000);

    try {
      this.session.sendRealtimeInput({ text });
    } catch {
      this.awaitingFinalTurn = false;
      this.clearFinalTurnTimer();
      this.disconnect();
    }
  }

  private clearFinalTurnTimer(): void {
    if (this.finalTurnTimer !== null) {
      clearTimeout(this.finalTurnTimer);
      this.finalTurnTimer = null;
    }
  }

  disconnect(): void {
    this.awaitingFinalTurn = false;
    this.clearFinalTurnTimer();
    this.clearConnectionTimer();
    this.cleanupSession();

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
    }
    this.audioContext = null;
    this.nextPlayTime = 0;
    this.setState("disconnected");
  }

  sendFrame(base64Jpeg: string): void {
    if (!this.session || this.state !== "connected") {
      return;
    }

    this.framesSent++;
    if (this.framesSent <= 3 || this.framesSent % 10 === 0) {
      console.log("[LiveGuidance] Sending frame #" + this.framesSent, "(" + base64Jpeg.length + " chars)");
    }

    try {
      this.session.sendRealtimeInput({
        video: {
          mimeType: "image/jpeg",
          data: base64Jpeg,
        },
      });
    } catch (error) {
      console.warn("[LiveGuidance] Send failed:", error);
      this.setState("error");
      this.cleanupSession();
    }
  }

  getState(): LiveConnectionState {
    return this.state;
  }

  private setState(state: LiveConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.callbacks.onConnectionStateChange(state);
  }

  private handleMessage(message: LiveServerMessage): void {
    if (message.setupComplete) {
      console.log("[LiveGuidance] Setup complete");
      this.clearConnectionTimer();
      this.setState("connected");

      if (this.options.startPromptCycleOnConnect) {
        console.log("[LiveGuidance] Starting prompt cycle");
        this.startPromptCycle();
      }
      return;
    }

    if (message.goAway) {
      console.warn("[LiveGuidance] Server sent goAway, disconnecting");
      this.setState("error");
      this.cleanupSession();
      return;
    }

    const sc = message.serverContent;
    if (sc) {
      if (sc.turnComplete) {
        console.log("[LiveGuidance] Model turn complete");

        if (this.awaitingFinalTurn) {
          this.awaitingFinalTurn = false;
          this.clearFinalTurnTimer();
          const remainingSec = this.nextPlayTime - (this.audioContext?.currentTime ?? 0);
          const delayMs = Math.max(0, remainingSec * 1000) + 500;
          console.log(`[LiveGuidance] Final message done, disconnecting in ${Math.round(delayMs)}ms`);
          setTimeout(() => this.disconnect(), delayMs);
        }
      }
      if (sc.outputTranscription?.text) {
        console.log("[LiveGuidance] Transcription:", sc.outputTranscription.text);
        this.callbacks.onGuidanceText(sc.outputTranscription.text);
      }
      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part.inlineData?.mimeType?.startsWith("audio/") && part.inlineData.data) {
            console.log("[LiveGuidance] Audio chunk:", part.inlineData.data.length, "chars");
            this.playAudioChunk(part.inlineData.data);
          }
        }
      }
    }

    if (message.toolCall?.functionCalls) {
      for (const call of message.toolCall.functionCalls) {
        console.log("[LiveGuidance] Tool call:", call.name);
        if (call.name === "readyToCapture") {
          this.callbacks.onReadyToCapture();
          if (this.session) {
            this.session.sendToolResponse({
              functionResponses: {
                id: call.id ?? "",
                name: call.name,
                response: { success: true },
              },
            });
          }
        }
      }
    }
  }

  private playAudioChunk(base64Pcm: string): void {
    if (!this.audioContext || this.audioContext.state === "closed") {
      return;
    }

    if (this.audioContext.state === "suspended") {
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
}
