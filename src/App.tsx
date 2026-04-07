import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Check, Camera, RotateCcw } from 'lucide-react';
import {
  AutoCapturePayload,
  CameraPreview,
} from './components/CameraPreview';
import { OvalButton } from './components/OvalButton';
import { ConfettiEffect } from './components/ConfettiEffect';
import {
  CompletedWorksheetData,
  CompletedWorksheetExtractionResult,
  GeminiWorksheetService,
} from './services/geminiWorksheetService';
import {
  GeminiLiveGuidanceService,
  LiveConnectionState,
} from './services/geminiLiveGuidanceService';
import worksheetImage from './assets/worksheet-placeholder.svg';

type WorkflowStep =
  | 'view_pdf'
  | 'working'
  | 'guided_capture'
  | 'processing'
  | 'finished';

export default function App() {
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('view_pdf');
  const [status, setStatus] = useState('');
  const [completedWorksheet, setCompletedWorksheet] = useState<CompletedWorksheetData | null>(null);
  const [lastCapturedFrame, setLastCapturedFrame] = useState<string | null>(null);
  const [captureRequestNonce, setCaptureRequestNonce] = useState(0);
  const [triggerAutoCapture, setTriggerAutoCapture] = useState(0);
  const [liveConnectionState, setLiveConnectionState] = useState<LiveConnectionState>('disconnected');
  const [showConfetti, setShowConfetti] = useState(false);

  const serviceRef = useRef<GeminiWorksheetService | null>(null);
  const liveServiceRef = useRef<GeminiLiveGuidanceService | null>(null);
  const workflowStepRef = useRef<WorkflowStep>('view_pdf');
  const isAnalyzingRef = useRef(false);
  const scanCooldownUntilRef = useRef(0);

  useEffect(() => {
    workflowStepRef.current = workflowStep;
  }, [workflowStep]);

  const getApiKey = useCallback(() => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) {
      setStatus('API Key missing. Set VITE_GEMINI_API_KEY in .env.local');
    }
    return key as string | undefined;
  }, []);

  const disconnectLive = useCallback(() => {
    if (liveServiceRef.current) {
      liveServiceRef.current.disconnect();
      liveServiceRef.current = null;
    }
  }, []);

  const connectLive = useCallback((apiKey: string) => {
    disconnectLive();

    const live = new GeminiLiveGuidanceService(apiKey, {
      onGuidanceText: (text: string) => {
        const currentStep = workflowStepRef.current;
        if (currentStep === 'guided_capture') {
          setStatus(text);
        }
      },
      onReadyToCapture: () => {
        const currentStep = workflowStepRef.current;
        if (currentStep === 'guided_capture' && !isAnalyzingRef.current) {
          setTriggerAutoCapture(prev => prev + 1);
        }
      },
      onConnectionStateChange: (state: LiveConnectionState) => {
        setLiveConnectionState(state);
        if (state === 'connected') {
          setStatus('Hold up your worksheet so I can see it!');
        } else if (state === 'error') {
          setStatus('Live guidance unavailable — tap Capture when ready.');
        }
      },
    });

    liveServiceRef.current = live;
    live.connect().catch(() => {});
  }, [disconnectLive]);

  const speakWorkingInstructions = useCallback((apiKey: string) => {
    disconnectLive();

    const live = new GeminiLiveGuidanceService(apiKey, {
      onGuidanceText: () => {},
      onReadyToCapture: () => {},
      onConnectionStateChange: (state: LiveConnectionState) => {
        if (state === 'connected' && live === liveServiceRef.current) {
          live.speakThenDisconnect(
            'Tell the student in a cheerful, short way: ' +
            '"Great! Now grab your pencil and work on your worksheet. ' +
            'When you\'re all done, come back and press the big blue Take Picture button ' +
            'so I can see your work!" Keep it under 10 seconds.'
          );
        }
      },
    });

    liveServiceRef.current = live;
    live.connect().catch(() => {});
  }, [disconnectLive]);

  const resetWorkflow = useCallback(() => {
    disconnectLive();
    setWorkflowStep('view_pdf');
    setStatus('');
    setCompletedWorksheet(null);
    setLastCapturedFrame(null);
    setCaptureRequestNonce(0);
    setTriggerAutoCapture(0);
    setLiveConnectionState('disconnected');
    setShowConfetti(false);
    isAnalyzingRef.current = false;
    scanCooldownUntilRef.current = 0;
    serviceRef.current = null;
  }, [disconnectLive]);

  // --- Screen 1: Ready handler ---
  const handleReady = useCallback(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    serviceRef.current = new GeminiWorksheetService(apiKey);
    setWorkflowStep('working');
    speakWorkingInstructions(apiKey);
  }, [getApiKey, speakWorkingInstructions]);

  // --- Screen 2: Take Picture handler ---
  const handleTakePicture = useCallback(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    if (!serviceRef.current) {
      serviceRef.current = new GeminiWorksheetService(apiKey);
    }

    setWorkflowStep('guided_capture');
    setStatus('Connecting to live guidance...');
    connectLive(apiKey);
  }, [getApiKey, connectLive]);

  // --- Screen 3: Extraction result handler ---
  const handleCompletedExtractionResult = useCallback((
    result: CompletedWorksheetExtractionResult
  ) => {
    if (result.outcome === 'captured') {
      setCompletedWorksheet(result.data);
      setWorkflowStep('finished');
      setStatus('All done! Great work.');
      setShowConfetti(true);

      const voicePrompt = buildFeedbackVoicePrompt(result.data);
      if (liveServiceRef.current) {
        liveServiceRef.current.speakThenDisconnect(voicePrompt);
      } else {
        disconnectLive();
      }
      return;
    }

    setStatus("Almost! I couldn't read everything. Hold it up one more time!");
    scanCooldownUntilRef.current = Date.now() + 3500;
    setWorkflowStep('guided_capture');

    liveServiceRef.current?.sendMessage(
      "The scan didn't work. Tell the student in a friendly way: almost! I couldn't quite read everything. Let's try one more time — hold up the whole worksheet nice and steady."
    );
    liveServiceRef.current?.resumePrompts();
  }, [disconnectLive]);

  // --- Screen 3: Auto capture handler ---
  const handleAutoCapture = useCallback(async (payload: AutoCapturePayload) => {
    const currentStep = workflowStepRef.current;
    const currentService = serviceRef.current;

    if (!currentService || isAnalyzingRef.current) return;
    if (currentStep !== 'guided_capture') return;
    if (payload.captureMode === 'auto' && Date.now() < scanCooldownUntilRef.current) return;

    isAnalyzingRef.current = true;
    liveServiceRef.current?.pausePrompts();
    setLastCapturedFrame(payload.base64);

    try {
      setWorkflowStep('processing');
      setStatus('Reading your answers...');
      const result = await currentService.extractCompletedWorksheet(
        {
          data: payload.base64,
          mimeType: payload.mimeType,
        },
        {
          metrics: { captureMode: payload.captureMode },
        }
      );
      handleCompletedExtractionResult(result);
    } catch (error) {
      console.error('Worksheet extraction failed:', error);
      setStatus("Oops, something went wrong. Let's try again!");
      scanCooldownUntilRef.current = Date.now() + 3500;
      setWorkflowStep('guided_capture');

      liveServiceRef.current?.sendMessage(
        "Something went wrong with the scan. Tell the student: oops, let me try that again — hold up your worksheet one more time!"
      );
      liveServiceRef.current?.resumePrompts();
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [handleCompletedExtractionResult]);

  const handleFrame = useCallback((base64Jpeg: string) => {
    liveServiceRef.current?.sendFrame(base64Jpeg);
  }, []);

  const handleScanStatusChange = useCallback((nextStatus: string) => {
    if (workflowStepRef.current === 'guided_capture') {
      setStatus(nextStatus);
    }
  }, []);

  const captureNow = () => {
    if (workflowStepRef.current !== 'guided_capture' || isAnalyzingRef.current) return;
    setStatus('Capturing current frame...');
    setCaptureRequestNonce(prev => prev + 1);
  };

  const isGuidedCapture = workflowStep === 'guided_capture';
  const isProcessing = workflowStep === 'processing';
  const isLiveConnected = liveConnectionState === 'connected';
  const isLiveFailed = liveConnectionState === 'error';

  return (
    <div className="min-h-screen bg-surface font-sans flex flex-col items-center">
      {showConfetti && <ConfettiEffect />}

      <AnimatePresence mode="wait">
        {/* ===== SCREEN 1: View PDF ===== */}
        {workflowStep === 'view_pdf' && (
          <motion.div
            key="view_pdf"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex flex-col items-center justify-center w-full max-w-[1200px] min-h-screen px-10 py-20"
          >
            <div className="relative flex flex-col items-center">
              <div className="relative aspect-[203/259] h-[530px] rounded-[20px] shadow-[0px_0px_1px_1px_rgba(0,0,0,0.05),0px_3px_6px_0px_rgba(0,0,0,0.08),0px_3px_6px_0px_rgba(0,0,0,0.12)] overflow-hidden bg-white">
                <img
                  src={worksheetImage}
                  alt="Worksheet"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <OvalButton
                    label="Listen"
                    icon={<Volume2 className="w-7 h-7" />}
                    variant="secondary"
                    onClick={() => setStatus('TTS coming in V2!')}
                  />
                </div>
              </div>

              <div className="absolute -bottom-4 -right-8">
                <OvalButton
                  label="Ready"
                  icon={<Check className="w-7 h-7" />}
                  variant="primary"
                  onClick={handleReady}
                />
              </div>
            </div>

            {status && (
              <p className="mt-8 text-gray-btn font-bold text-lg">{status}</p>
            )}
          </motion.div>
        )}

        {/* ===== SCREEN 2: Working ===== */}
        {workflowStep === 'working' && (
          <motion.div
            key="working"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex flex-col items-center justify-center w-full max-w-[1200px] min-h-screen px-10 py-20"
          >
            <div className="aspect-[409.5/530] h-[530px] border-[10px] border-dashed border-white flex flex-col items-center justify-center gap-4 p-10 overflow-hidden">
              <OvalButton
                label="Take Picture"
                icon={<Camera className="w-7 h-7" />}
                variant="primary"
                onClick={handleTakePicture}
              />
            </div>
          </motion.div>
        )}

        {/* ===== SCREEN 3: Guided Capture ===== */}
        {(isGuidedCapture || isProcessing) && (
          <motion.div
            key="guided_capture"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex flex-col items-center justify-center w-full max-w-[1200px] min-h-screen px-10 py-10 gap-6"
          >
            <div className="relative w-full max-w-[600px]">
              <CameraPreview
                isCapturing={isGuidedCapture}
                isFinished={false}
                status={status}
                captureRequestNonce={captureRequestNonce}
                triggerAutoCapture={triggerAutoCapture}
                onFrame={handleFrame}
                onAutoCapture={handleAutoCapture}
                onStatusChange={handleScanStatusChange}
              />

              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-2xl">
                  <OvalButton
                    label="Capturing"
                    icon={<RotateCcw className="w-7 h-7 animate-spin" />}
                    variant="disabled"
                    disabled
                  />
                </div>
              )}
            </div>

            {isGuidedCapture && (
              <div className="flex flex-col items-center gap-4">
                {isLiveFailed && (
                  <div className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-200 font-semibold">
                    Live guidance unavailable. Use manual capture below.
                  </div>
                )}
                {!isLiveConnected && !isLiveFailed && (
                  <div className="text-sm text-gray-btn font-semibold">
                    Connecting to live guidance...
                  </div>
                )}
                <button
                  onClick={captureNow}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-primary text-white rounded-full font-bold flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  <Camera className="w-5 h-5" />
                  Capture Now
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ===== SCREEN 4: Finished ===== */}
        {workflowStep === 'finished' && (
          <motion.div
            key="finished"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center w-full max-w-[1200px] min-h-screen px-10 py-20 gap-8"
          >
            <div className="relative aspect-[203/259] h-[530px] rounded-[20px] shadow-[0px_0px_1px_1px_rgba(0,0,0,0.05),0px_3px_6px_0px_rgba(0,0,0,0.08),0px_3px_6px_0px_rgba(0,0,0,0.12)] overflow-hidden bg-white">
              {lastCapturedFrame ? (
                <img
                  src={`data:image/jpeg;base64,${lastCapturedFrame}`}
                  alt="Your completed worksheet"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={worksheetImage}
                  alt="Worksheet"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {completedWorksheet?.feedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl px-8 py-6 shadow-lg max-w-md text-center"
              >
                <p className="text-lg font-bold text-primary">
                  {completedWorksheet.feedback}
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <OvalButton
                label="Start Over"
                icon={<RotateCcw className="w-7 h-7" />}
                variant="secondary"
                onClick={resetWorkflow}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function buildFeedbackVoicePrompt(worksheet: CompletedWorksheetData): string {
  const answeredCount = worksheet.responses.filter(r => r.answered).length;
  const totalCount = worksheet.responses.length;
  const showedWork = worksheet.responses.some(r => r.studentWorkDescription);

  return [
    'The student just finished their worksheet! Give them a short, warm, encouraging voice message.',
    `They answered ${answeredCount} out of ${totalCount} questions.`,
    `Overall feedback: "${worksheet.feedback || 'Nice work!'}"`,
    worksheet.visualWorkSummary ? `What their work looked like: ${worksheet.visualWorkSummary}` : '',
    showedWork ? 'The student showed their thinking and work on the paper — make sure to praise that!' : '',
    '',
    'IMPORTANT: Do NOT comment on whether any answers are right or wrong. Only celebrate their effort, how many questions they tackled, and that they showed their thinking and work.',
    'For example: "Wow, you worked through every single problem! I love that you showed all your steps — that tells me you really thought about each one. Amazing effort!"',
    'Keep it short (about 10-15 seconds of speaking), warm, and encouraging for a young student.',
  ].filter(Boolean).join('\n');
}
