import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpFromLine,
  Camera,
  Check,
  House,
  Languages,
  Maximize2,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import expandIconUrl from './assets/icon-k1-expand.svg';
import homeIconUrl from './assets/icon-k1-home.svg';
import languageSettingsIconUrl from './assets/icon-k1-language-settings.svg';
import {
  AutoCapturePayload,
  CameraPreview,
} from './components/CameraPreview';
import { OvalButton } from './components/OvalButton';
import { ConfettiEffect } from './components/ConfettiEffect';
import { WorksheetPreview } from './components/WorksheetPreview';
import { bundledWorksheetSource } from './content/worksheetSource';
import {
  CompletedWorksheetData,
  CompletedWorksheetExtractionResult,
  GeminiWorksheetService,
} from './services/geminiWorksheetService';
import {
  GeminiLiveGuidanceService,
  LiveConnectionState,
} from './services/geminiLiveGuidanceService';
import {
  GeminiWorksheetReadAloudService,
  ReadAloudState,
  WorksheetLanguage,
  WorksheetReadAloudScript,
} from './services/geminiWorksheetReadAloudService';

type WorkflowStep =
  | 'start'
  | 'view_pdf'
  | 'working'
  | 'guided_capture'
  | 'processing'
  | 'finished';

export default function App() {
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('start');
  const [status, setStatus] = useState('');
  const [completedWorksheet, setCompletedWorksheet] = useState<CompletedWorksheetData | null>(null);
  const [lastCapturedFrame, setLastCapturedFrame] = useState<string | null>(null);
  const [captureRequestNonce, setCaptureRequestNonce] = useState(0);
  const [triggerAutoCapture, setTriggerAutoCapture] = useState(0);
  const [liveConnectionState, setLiveConnectionState] = useState<LiveConnectionState>('disconnected');
  const [worksheetLanguage, setWorksheetLanguage] = useState<WorksheetLanguage>('en');
  const [readAloudState, setReadAloudState] = useState<ReadAloudState>('idle');
  const [readAloudError, setReadAloudError] = useState<string | null>(null);
  const [readAloudScripts, setReadAloudScripts] = useState<
    Partial<Record<WorksheetLanguage, WorksheetReadAloudScript>>
  >({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  const serviceRef = useRef<GeminiWorksheetService | null>(null);
  const liveServiceRef = useRef<GeminiLiveGuidanceService | null>(null);
  const readAloudServiceRef = useRef<GeminiWorksheetReadAloudService | null>(null);
  const workflowStepRef = useRef<WorkflowStep>('start');
  const isAnalyzingRef = useRef(false);
  const scanCooldownUntilRef = useRef(0);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);

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

  const stopReadAloud = useCallback(() => {
    if (readAloudServiceRef.current) {
      readAloudServiceRef.current.stop();
      readAloudServiceRef.current = null;
    }
  }, []);

  const getReadAloudService = useCallback((apiKey: string) => {
    if (!readAloudServiceRef.current) {
      readAloudServiceRef.current = new GeminiWorksheetReadAloudService(apiKey, {
        onStateChange: (state: ReadAloudState) => {
          setReadAloudState(state);
        },
        onPlaybackComplete: () => {
          readAloudServiceRef.current = null;
          setReadAloudState('idle');
          setStatus('');
        },
        onError: (message: string) => {
          readAloudServiceRef.current = null;
          setReadAloudError(message);
        },
      });
    }

    return readAloudServiceRef.current;
  }, []);

  const connectLive = useCallback((apiKey: string) => {
    disconnectLive();

    const live = new GeminiLiveGuidanceService(apiKey, {
      onGuidanceText: (text: string) => {
        if (workflowStepRef.current === 'guided_capture') {
          setStatus(text);
        }
      },
      onReadyToCapture: () => {
        if (workflowStepRef.current === 'guided_capture' && !isAnalyzingRef.current) {
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
            '"Now grab your pencil and work on your worksheet. ' +
            'When you\'re all done, come back and press the big blue Take Picture button ' +
            'so I can see your work!" Keep it under 10 seconds.'
          );
        }
      },
    }, {
      startPromptCycleOnConnect: false,
    });

    liveServiceRef.current = live;
    live.connect().catch(() => {});
  }, [disconnectLive]);

  const speakViewPdfInstructions = useCallback((apiKey: string) => {
    disconnectLive();

    const live = new GeminiLiveGuidanceService(apiKey, {
      onGuidanceText: () => {},
      onReadyToCapture: () => {},
      onConnectionStateChange: (state: LiveConnectionState) => {
        if (state === 'connected' && live === liveServiceRef.current) {
          live.speakThenDisconnect(
            'Tell the student in a cheerful, short way: ' +
            '"Hi there, click the blue button to listen to the instructions for your worksheet. ' +
            'Go to the next slide button when you\'re ready to start working on your worksheet." ' +
            'Keep it under 10 seconds.'
          );
        }
      },
    }, {
      startPromptCycleOnConnect: false,
    });

    liveServiceRef.current = live;
    live.connect().catch(() => {});
  }, [disconnectLive]);

  useEffect(() => {
    if (workflowStep !== 'view_pdf') return;

    const apiKey = getApiKey();
    if (!apiKey) return;

    speakViewPdfInstructions(apiKey);
  }, [workflowStep, getApiKey, speakViewPdfInstructions]);

  const handleStart = useCallback(() => {
    setStatus('');
    setWorkflowStep('view_pdf');
  }, []);

  const resetWorkflow = useCallback(() => {
    disconnectLive();
    stopReadAloud();
    setWorkflowStep('start');
    setStatus('');
    setCompletedWorksheet(null);
    setLastCapturedFrame(null);
    setCaptureRequestNonce(0);
    setTriggerAutoCapture(0);
    setLiveConnectionState('disconnected');
    setWorksheetLanguage('en');
    setReadAloudState('idle');
    setReadAloudError(null);
    setReadAloudScripts({});
    setShowConfetti(false);
    setIsLanguageMenuOpen(false);
    isAnalyzingRef.current = false;
    scanCooldownUntilRef.current = 0;
    serviceRef.current = null;
  }, [disconnectLive, stopReadAloud]);

  const handleReady = useCallback(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    stopReadAloud();
    serviceRef.current = new GeminiWorksheetService(apiKey);
    setWorkflowStep('working');
    speakWorkingInstructions(apiKey);
  }, [getApiKey, speakWorkingInstructions, stopReadAloud]);

  const handleTakePicture = useCallback(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    if (!serviceRef.current) {
      serviceRef.current = new GeminiWorksheetService(apiKey);
    }

    setWorkflowStep('guided_capture');
    setStatus('Connecting to live guidance...');
    connectLive(apiKey);
  }, [connectLive, getApiKey]);

  const handleCompletedExtractionResult = useCallback((result: CompletedWorksheetExtractionResult) => {
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
          subject: bundledWorksheetSource.subject,
          answerKey: bundledWorksheetSource.questionContexts,
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

  const handleLanguageChange = useCallback((language: WorksheetLanguage) => {
    if (language === worksheetLanguage) {
      setIsLanguageMenuOpen(false);
      return;
    }

    if (readAloudState === 'connecting' || readAloudState === 'speaking') {
      stopReadAloud();
      setReadAloudState('idle');
      setStatus('');
    }

    setReadAloudError(null);
    setWorksheetLanguage(language);
    setIsLanguageMenuOpen(false);
  }, [readAloudState, stopReadAloud, worksheetLanguage]);

  const handleListen = useCallback(async () => {
    if (readAloudState === 'connecting' || readAloudState === 'speaking') {
      stopReadAloud();
      setReadAloudState('idle');
      setStatus('');
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) return;

    disconnectLive();
    setReadAloudState('connecting');
    setReadAloudError(null);
    setStatus('');

    try {
      const readAloudService = getReadAloudService(apiKey);
      const cachedScript = readAloudScripts[worksheetLanguage];
      const script = cachedScript ?? await readAloudService.buildScript({
        worksheetText: bundledWorksheetSource.accessibleText,
        language: worksheetLanguage,
      });

      if (!cachedScript) {
        setReadAloudScripts(prev => ({
          ...prev,
          [worksheetLanguage]: script,
        }));
      }

      await readAloudService.speakScript(script);
    } catch (error) {
      console.error('Read-aloud failed:', error);
      stopReadAloud();
      setReadAloudError('Unable to read the worksheet aloud right now.');
      setReadAloudState('error');
    }
  }, [
    disconnectLive,
    getApiKey,
    getReadAloudService,
    readAloudScripts,
    readAloudState,
    stopReadAloud,
    worksheetLanguage,
  ]);

  const handleReplayFeedback = useCallback(() => {
    if (!completedWorksheet) return;

    const apiKey = getApiKey();
    if (!apiKey) return;

    stopReadAloud();
    disconnectLive();

    const live = new GeminiLiveGuidanceService(apiKey, {
      onGuidanceText: () => {},
      onReadyToCapture: () => {},
      onConnectionStateChange: (state: LiveConnectionState) => {
        if (state === 'connected' && live === liveServiceRef.current) {
          live.speakThenDisconnect(buildFeedbackVoicePrompt(completedWorksheet));
        }
      },
    }, {
      startPromptCycleOnConnect: false,
    });

    liveServiceRef.current = live;
    live.connect().catch(() => {});
  }, [completedWorksheet, disconnectLive, getApiKey, stopReadAloud]);

  const captureNow = useCallback(() => {
    if (workflowStepRef.current !== 'guided_capture' || isAnalyzingRef.current) return;
    setStatus('Capturing current frame...');
    setCaptureRequestNonce(prev => prev + 1);
  }, []);

  const isGuidedCapture = workflowStep === 'guided_capture';
  const isProcessing = workflowStep === 'processing';
  const isLiveConnected = liveConnectionState === 'connected';
  const isLiveFailed = liveConnectionState === 'error';
  const isReadAloudActive = readAloudState === 'connecting' || readAloudState === 'speaking';
  const listenButtonLabel = readAloudState === 'connecting'
    ? 'Loading'
    : readAloudState === 'speaking'
      ? 'Stop'
      : 'Listen';
  const listenButtonIcon = readAloudState === 'connecting'
    ? <RotateCcw className="h-9 w-9 animate-spin" />
    : <Volume2 className="h-9 w-9" />;
  const isListenButtonDisabled = readAloudState === 'connecting';
  const languageOptions: Array<{ value: WorksheetLanguage; label: string }> = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
  ];
  const currentLanguageLabel = languageOptions.find(option => option.value === worksheetLanguage)?.label ?? 'English';
  const currentStepNumber = workflowStep === 'start' ? '1' : workflowStep === 'view_pdf' ? '2' : '3';
  const feedbackSummary = buildFeedbackSummary(completedWorksheet);
  const captureCaption = isLiveFailed
    ? 'Live guidance unavailable. Use Capture Now.'
    : isProcessing
      ? 'Reading your answers...'
      : status;

  const handleStepBack = useCallback(() => {
    setIsLanguageMenuOpen(false);

    if (workflowStep === 'start' || workflowStep === 'processing') {
      return;
    }

    if (workflowStep === 'view_pdf') {
      resetWorkflow();
      return;
    }

    disconnectLive();
    stopReadAloud();
    setShowConfetti(false);
    setStatus('');
    setLiveConnectionState('disconnected');
    scanCooldownUntilRef.current = 0;
    setWorkflowStep('view_pdf');
  }, [disconnectLive, resetWorkflow, stopReadAloud, workflowStep]);

  const handleStepForward = useCallback(() => {
    setIsLanguageMenuOpen(false);

    if (workflowStep === 'start') {
      handleStart();
      return;
    }

    if (workflowStep === 'view_pdf') {
      handleReady();
    }
  }, [handleReady, handleStart, workflowStep]);

  const canGoBack = workflowStep !== 'start' && workflowStep !== 'processing';
  const canGoForward = workflowStep === 'start' || workflowStep === 'view_pdf';

  useEffect(() => {
    setIsLanguageMenuOpen(false);
  }, [workflowStep]);

  useEffect(() => {
    if (!isLanguageMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLanguageMenuOpen]);

  useEffect(() => {
    return () => {
      disconnectLive();
      stopReadAloud();
    };
  }, [disconnectLive, stopReadAloud]);

  return (
    <div className="min-h-screen font-sans">
      {showConfetti && <ConfettiEffect />}

      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 py-[10px]">
        <TopShell
          stepNumber={currentStepNumber}
          languageLabel={currentLanguageLabel}
          isLanguageMenuOpen={isLanguageMenuOpen}
          languageMenuRef={languageMenuRef}
          onToggleLanguageMenu={() => setIsLanguageMenuOpen(prev => !prev)}
          onSelectLanguage={handleLanguageChange}
          languageOptions={languageOptions}
          selectedLanguage={worksheetLanguage}
          onHome={resetWorkflow}
          onBack={handleStepBack}
          onForward={handleStepForward}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
        />

        <div className="flex flex-1 items-center justify-center">
          <AnimatePresence mode="wait">
            {workflowStep === 'start' && (
              <motion.section
                key="start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[690px] w-full items-center justify-center"
              >
                <div className="flex w-full flex-col items-center gap-[40px] px-4">
                  <OvalButton
                    label="Start Quiz Worksheet"
                    icon={<ArrowRight className="h-9 w-9" />}
                    variant="primary"
                    onClick={handleStart}
                    className="min-w-[365px] max-w-full"
                  />
                  <OvalButton
                    label="Upload a Different Worksheet"
                    icon={<ArrowUpFromLine className="h-9 w-9" />}
                    variant="secondary"
                    className="min-w-[467px] max-w-full"
                  />
                  <OvalButton
                    label="Upload Finished Worksheet"
                    icon={<Check className="h-9 w-9" />}
                    variant="secondary"
                    className="min-w-[433px] max-w-full"
                  />
                  <p
                    className="mt-2 text-center text-[24px] leading-[34px] text-gray-btn"
                    style={{ fontFamily: 'var(--font-student-upper)' }}
                  >
                    These options are visible for prototyping purposes only.
                  </p>
                </div>
              </motion.section>
            )}

            {workflowStep === 'view_pdf' && (
              <motion.section
                key="view_pdf"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[690px] w-full items-center justify-center"
              >
                <div className="flex w-full flex-col items-center">
                  <WorksheetPreview
                    source={bundledWorksheetSource}
                    overlay={(
                      <OvalButton
                        label={listenButtonLabel}
                        icon={listenButtonIcon}
                        variant="primary"
                        onClick={handleListen}
                        disabled={isListenButtonDisabled}
                        className="min-w-[160px]"
                      />
                    )}
                  />
                </div>
              </motion.section>
            )}

            {workflowStep === 'working' && (
              <motion.section
                key="working"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[690px] w-full items-center justify-center"
              >
                <div className="k1-stage-dashed flex h-[530px] w-full max-w-[480px] items-center justify-center">
                  <OvalButton
                    label="Take Picture"
                    icon={<Camera className="h-9 w-9" />}
                    variant="primary"
                    onClick={handleTakePicture}
                    className="min-w-[260px]"
                  />
                </div>
              </motion.section>
            )}

            {(isGuidedCapture || isProcessing) && (
              <motion.section
                key="guided_capture"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[690px] w-full items-center justify-center"
              >
                <div className="flex w-full flex-col items-center gap-6">
                  <div className="k1-stage-dashed flex h-[530px] w-full max-w-[480px] items-center justify-center p-[10px]">
                    <div className="relative h-full w-full overflow-hidden rounded-[12px] bg-[#f8f8f8]">
                      <CameraPreview
                        className="h-full w-full"
                        isCapturing={isGuidedCapture}
                        isFinished={false}
                        status={status}
                        captureRequestNonce={captureRequestNonce}
                        triggerAutoCapture={triggerAutoCapture}
                        onFrame={handleFrame}
                        onAutoCapture={handleAutoCapture}
                        onStatusChange={handleScanStatusChange}
                      />
                      {isProcessing ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
                          <OvalButton
                            label="Capturing"
                            icon={<RotateCcw className="h-9 w-9 animate-spin" />}
                            variant="disabled"
                            disabled
                            className="min-w-[220px]"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {!isProcessing ? (
                    <OvalButton
                      label="Capture Now"
                      icon={<Camera className="h-9 w-9" />}
                      variant="secondary"
                      onClick={captureNow}
                      className="min-w-[260px]"
                    />
                  ) : null}

                  {captureCaption ? (
                    <p
                      className="max-w-[34rem] text-center text-[20px] leading-[30px] text-text-secondary"
                      style={{ fontFamily: 'var(--font-student-upper)' }}
                    >
                      {captureCaption}
                    </p>
                  ) : null}

                  {!isLiveConnected && !isLiveFailed && !isProcessing ? (
                    <p className="text-center text-sm font-semibold text-text-secondary">
                      Connecting to live guidance...
                    </p>
                  ) : null}
                </div>
              </motion.section>
            )}

            {workflowStep === 'finished' && (
              <motion.section
                key="finished"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[690px] w-full items-center justify-center"
              >
                <div className="grid w-full max-w-[1120px] items-start gap-[68px] md:grid-cols-[410px_minmax(0,1fr)]">
                  <div className="flex justify-center md:justify-start">
                    {lastCapturedFrame ? (
                      <CapturedWorksheetPreview base64Image={lastCapturedFrame} />
                    ) : (
                      <div className="h-[483px] w-[410px] bg-[#bdbdbd]" />
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-[28px] pt-[4px]">
                    <OvalButton
                      label="Listen"
                      icon={<Volume2 className="h-9 w-9" />}
                      variant="primary"
                      onClick={completedWorksheet ? handleReplayFeedback : undefined}
                      className="min-w-[161px]"
                    />

                    <p
                      className="max-w-[32em] text-[24px] leading-[58px] text-[#3b3b3b]"
                      style={{ fontFamily: 'var(--font-student-upper)', lineHeight: '1.55' }}
                    >
                      {feedbackSummary}
                    </p>

                    <OvalButton
                      label="Redo"
                      icon={<RotateCcw className="h-9 w-9" />}
                      variant="secondary"
                      onClick={resetWorkflow}
                      className="min-w-[157px]"
                    />
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function TopShell({
  stepNumber,
  languageLabel,
  isLanguageMenuOpen,
  languageMenuRef,
  onToggleLanguageMenu,
  onSelectLanguage,
  languageOptions,
  selectedLanguage,
  onHome,
  onBack,
  onForward,
  canGoBack,
  canGoForward,
}: {
  stepNumber: string;
  languageLabel: string;
  isLanguageMenuOpen: boolean;
  languageMenuRef: RefObject<HTMLDivElement | null>;
  onToggleLanguageMenu: () => void;
  onSelectLanguage: (language: WorksheetLanguage) => void;
  languageOptions: Array<{ value: WorksheetLanguage; label: string }>;
  selectedLanguage: WorksheetLanguage;
  onHome: () => void;
  onBack: () => void;
  onForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}) {
  return (
    <header className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-[17px]">
          <TopIconButton
            label="Go home"
            icon={<img src={homeIconUrl} alt="" className="h-9 w-9" />}
            onClick={onHome}
          />
          <p className="text-[24px] font-bold leading-[34px] text-[#3b3b3b]">Jane Doe</p>
        </div>

        <div className="flex items-center gap-[17px]">
          <TopIconButton
            label="Expand"
            icon={<img src={expandIconUrl} alt="" className="h-9 w-9" />}
          />
          <div ref={languageMenuRef} className="relative">
            <TopIconButton
              label={`Language: ${languageLabel}`}
              icon={<img src={languageSettingsIconUrl} alt="" className="h-9 w-9" />}
              onClick={onToggleLanguageMenu}
              active={isLanguageMenuOpen}
            />
            {isLanguageMenuOpen ? (
              <div className="absolute left-1/2 top-[72px] z-20 w-[272px] -translate-x-1/2">
                <div className="mx-auto h-4 w-4 rotate-45 border-l border-t border-student-cool-gray-light-1 bg-white" />
                <div className="-mt-2 overflow-hidden rounded-[14px] border-2 border-student-cool-gray-light-3 bg-white shadow-[var(--shadow-raised)]">
                  {languageOptions.map(option => {
                    const isSelected = option.value === selectedLanguage;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onSelectLanguage(option.value)}
                        className={[
                          'k1-focus-ring flex h-[51px] w-full items-center px-[17px] text-left text-[24px] font-medium leading-[34px] transition-colors',
                          isSelected ? 'bg-student-cool-gray-light-2 text-[#3b3b3b]' : 'bg-white text-[#3b3b3b] hover:bg-student-cool-gray-light-3',
                        ].join(' ')}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-[17px]">
          <ArrowNavButton
            label="Previous step"
            direction="left"
            onClick={onBack}
            disabled={!canGoBack}
          />
          <p className="w-[36px] text-center text-[32px] font-bold leading-[34px] text-[#3b3b3b]">
            {stepNumber}
          </p>
          <ArrowNavButton
            label="Next step"
            direction="right"
            onClick={onForward}
            disabled={!canGoForward}
          />
        </div>
      </div>
    </header>
  );
}

function TopIconButton({
  label,
  icon,
  onClick,
  active = false,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const isInteractive = Boolean(onClick);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      tabIndex={isInteractive ? 0 : -1}
      className={[
        'k1-focus-ring group relative inline-flex h-[68px] w-[68px] items-start rounded-full',
        isInteractive ? 'cursor-pointer' : 'cursor-default',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-[8px] h-[60px] w-[60px] -translate-x-1/2 rounded-full bg-student-cool-gray"
      />
      <span
        className={[
          'relative inline-flex h-[60px] w-[60px] items-center justify-center rounded-full border-[2.25px] shadow-[var(--shadow-raised)] transition-all duration-100',
          active
            ? 'bg-student-primary text-white border-transparent'
            : 'bg-student-cool-gray-light-3 text-student-primary border-transparent',
          isInteractive ? 'group-hover:-translate-y-px group-active:translate-y-[8px]' : '',
        ].join(' ')}
      >
        {icon}
      </span>
    </button>
  );
}

function ArrowNavButton({
  label,
  direction,
  onClick,
  disabled,
}: {
  label: string;
  direction: 'left' | 'right';
  onClick: () => void;
  disabled: boolean;
}) {
  const arrowClasses = disabled
    ? 'fill-student-primary opacity-50'
    : 'fill-student-primary';
  const transformClass = direction === 'left' ? 'scale-x-[-1]' : '';

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={[
        'k1-focus-ring group relative inline-flex h-[51px] w-[68px] items-start justify-center',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'relative inline-flex h-[51px] w-[68px] items-start justify-center transition-transform duration-100',
          disabled ? '' : 'group-hover:-translate-y-px group-active:translate-y-[6px]',
          transformClass,
        ].join(' ')}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 93 80"
          className="absolute inset-x-0 top-[3px] h-[48px] w-[68px] fill-gray-btn"
        >
          <path d="M43.7 9.1c-4.7-3.2-8.6-1.6-8.6 4v9.4h-21c-3.6 0-6.5 2.9-6.6 6.5v22.1c.1 3.6 3 6.4 6.6 6.4H35v9c0 5.7 3.9 7.7 8.6 4.6l37.8-25.2c4.7-3.2 4.7-8.3 0-11.5L43.7 9.1z" />
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 93 76"
          className="absolute inset-x-0 top-0 h-[45px] w-[68px] fill-white"
        >
          <path d="M43.7 8.7c-4.7-3-8.6-1.5-8.6 3.8v8.9h-21c-3.6 0-6.5 2.8-6.6 6.2v21c.1 3.4 3 6.1 6.6 6.1H35v8.5c0 5.4 3.9 7.3 8.6 4.3l37.8-24c4.7-3 4.7-7.9 0-10.9L43.7 8.7z" />
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 93 76"
          className={`absolute inset-x-0 top-0 h-[45px] w-[68px] ${arrowClasses}`}
        >
          <path d="M43.7 8.7c-4.7-3-8.6-1.5-8.6 3.8v8.9h-21c-3.6 0-6.5 2.8-6.6 6.2v21c.1 3.4 3 6.1 6.6 6.1H35v8.5c0 5.4 3.9 7.3 8.6 4.3l37.8-24c4.7-3 4.7-7.9 0-10.9L43.7 8.7z" />
        </svg>
      </span>
    </button>
  );
}

function CapturedWorksheetPreview({ base64Image }: { base64Image: string }) {
  return (
    <div className="h-[483px] w-[410px] overflow-hidden bg-[#bdbdbd]">
      <img
        src={`data:image/jpeg;base64,${base64Image}`}
        alt="Your completed worksheet"
        className="h-full w-full bg-white object-contain"
      />
    </div>
  );
}

function buildFeedbackSummary(worksheet: CompletedWorksheetData | null): string {
  if (!worksheet) {
    return 'Nice work finishing your worksheet.';
  }

  const answeredCount = worksheet.responses.filter(response => response.answered).length;
  const totalCount = worksheet.responses.length;
  const analysis = worksheet.analysis;

  return [
    analysis?.textFeedback || worksheet.feedback || 'Nice work!',
    !analysis?.textFeedback ? `You completed ${answeredCount} of ${totalCount} questions.` : '',
    analysis?.caution,
    !analysis?.textFeedback ? worksheet.visualWorkSummary : '',
  ].filter(Boolean).join(' ');
}

function buildFeedbackVoicePrompt(worksheet: CompletedWorksheetData): string {
  const answeredCount = worksheet.responses.filter(r => r.answered).length;
  const totalCount = worksheet.responses.length;
  const showedWork = worksheet.responses.some(r => r.studentWorkDescription);
  const analysis = worksheet.analysis;
  const exactVoiceMessage = analysis?.voiceFeedback
    || worksheet.feedback
    || `You answered ${answeredCount} out of ${totalCount} questions and showed your thinking.`;

  return [
    'Read the following message exactly to the student in a short, warm, child-friendly voice.',
    `Exact message: "${exactVoiceMessage}"`,
    analysis?.caution ? `If it fits naturally, add this short caution afterward: "${analysis.caution}"` : '',
    worksheet.visualWorkSummary && !analysis?.voiceFeedback
      ? `Visible work summary: ${worksheet.visualWorkSummary}`
      : '',
    showedWork && !analysis?.voiceFeedback
      ? 'The student showed their thinking and work on the paper — make sure that praise stays in the message.'
      : '',
    '',
    'Do not add greetings, extra commentary, or new analysis.',
    'Keep it short (about 10-15 seconds of speaking), warm, and encouraging for a young student.',
  ].filter(Boolean).join('\n');
}
