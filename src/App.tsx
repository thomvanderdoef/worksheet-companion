/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  RefreshCw,
  Scan,
  Sparkles,
  Star,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  AutoCapturePayload,
  CameraPreview,
} from './components/CameraPreview';
import {
  CompletedWorksheetData,
  CompletedWorksheetExtractionResult,
  EmptyWorksheetData,
  EmptyWorksheetExtractionResult,
  GeminiWorksheetService,
  WorksheetQuestion,
} from './services/geminiWorksheetService';
import {
  GeminiLiveGuidanceService,
  LiveConnectionState,
} from './services/geminiLiveGuidanceService';

type WorkflowStep =
  | 'idle'
  | 'scanning_empty'
  | 'processing_empty'
  | 'working'
  | 'scanning_completed'
  | 'processing_completed'
  | 'finished';

export default function App() {
  const [lastScanFeedback, setLastScanFeedback] = useState<{
    phase: 'empty' | 'completed';
    kind: 'rejected' | 'error';
    title: string;
    message: string;
    reason?: string;
    captureMode?: 'auto' | 'manual';
    timestamp: number;
  } | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
  const [isInitializing, setIsInitializing] = useState(false);
  const [status, setStatus] = useState('Ready to start!');
  const [emptyWorksheet, setEmptyWorksheet] = useState<EmptyWorksheetData | null>(null);
  const [completedWorksheet, setCompletedWorksheet] = useState<CompletedWorksheetData | null>(null);
  const [lastCapturedFrame, setLastCapturedFrame] = useState<string | null>(null);
  const [captureRequestNonce, setCaptureRequestNonce] = useState(0);
  const [triggerAutoCapture, setTriggerAutoCapture] = useState(0);
  const [captureCount, setCaptureCount] = useState(0);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [liveConnectionState, setLiveConnectionState] = useState<LiveConnectionState>('disconnected');
  const [showVisionDebug, setShowVisionDebug] = useState(false);

  const serviceRef = useRef<GeminiWorksheetService | null>(null);
  const liveServiceRef = useRef<GeminiLiveGuidanceService | null>(null);
  const workflowStepRef = useRef<WorkflowStep>('idle');
  const isAnalyzingRef = useRef(false);
  const scanCooldownUntilRef = useRef(0);

  const isScanning = workflowStep === 'scanning_empty' || workflowStep === 'scanning_completed';
  const isProcessing = workflowStep === 'processing_empty' || workflowStep === 'processing_completed';
  const isLiveConnected = liveConnectionState === 'connected';
  const isLiveFailed = liveConnectionState === 'error';

  useEffect(() => {
    workflowStepRef.current = workflowStep;
  }, [workflowStep]);

  const appendActivity = useCallback((message: string) => {
    setActivityLog(prev => [message, ...prev].slice(0, 3));
  }, []);

  const disconnectLive = useCallback(() => {
    if (liveServiceRef.current) {
      liveServiceRef.current.disconnect();
      liveServiceRef.current = null;
    }
  }, []);

  const resetWorkflow = useCallback(() => {
    disconnectLive();
    setWorkflowStep('idle');
    setStatus('Ready to start!');
    setEmptyWorksheet(null);
    setCompletedWorksheet(null);
    setLastCapturedFrame(null);
    setCaptureRequestNonce(0);
    setTriggerAutoCapture(0);
    setCaptureCount(0);
    setActivityLog([]);
    setLastScanFeedback(null);
    setLiveConnectionState('disconnected');
    isAnalyzingRef.current = false;
    scanCooldownUntilRef.current = 0;
    serviceRef.current = null;
  }, [disconnectLive]);

  const connectLive = useCallback((apiKey: string) => {
    disconnectLive();

    const live = new GeminiLiveGuidanceService(apiKey, {
      onGuidanceText: (text: string) => {
        const currentStep = workflowStepRef.current;
        if (currentStep === 'scanning_empty' || currentStep === 'scanning_completed') {
          setStatus(text);
        }
      },
      onReadyToCapture: () => {
        const currentStep = workflowStepRef.current;
        if (
          (currentStep === 'scanning_empty' || currentStep === 'scanning_completed') &&
          !isAnalyzingRef.current
        ) {
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
    live.connect().catch(() => {
      // error state is already handled via onConnectionStateChange
    });
  }, [disconnectLive]);

  const startAssistant = async () => {
    setIsInitializing(true);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setStatus('API Key missing. Set VITE_GEMINI_API_KEY in .env.local');
      setIsInitializing(false);
      return;
    }

    serviceRef.current = new GeminiWorksheetService(apiKey);
    setEmptyWorksheet(null);
    setCompletedWorksheet(null);
    setLastCapturedFrame(null);
    setCaptureCount(0);
    setActivityLog([]);
    setLastScanFeedback(null);
    setTriggerAutoCapture(0);
    setWorkflowStep('scanning_empty');
    setStatus('Connecting to live guidance...');
    setIsInitializing(false);

    connectLive(apiKey);
  };

  const handleScanStatusChange = useCallback((nextStatus: string) => {
    const currentStep = workflowStepRef.current;
    if (currentStep === 'scanning_empty' || currentStep === 'scanning_completed') {
      setStatus(nextStatus);
    }
  }, []);

  const handleEmptyExtractionResult = useCallback((result: EmptyWorksheetExtractionResult) => {
    if (result.outcome === 'captured') {
      setLastScanFeedback(null);
      setEmptyWorksheet(result.data);
      setWorkflowStep('working');
      setStatus('Worksheet captured! Go ahead and complete it.');
      appendActivity('Blank worksheet captured with structured instructions.');

      const voicePrompt = buildWorksheetVoicePrompt(result.data);
      if (liveServiceRef.current) {
        liveServiceRef.current.speakThenDisconnect(voicePrompt);
      } else {
        disconnectLive();
      }
      return;
    }

    const friendlyStatus = "Hmm, I didn't quite get that. Let's try holding up your worksheet again!";
    setStatus(friendlyStatus);
    appendActivity(result.issue.message);
    setLastScanFeedback({
      phase: 'empty',
      kind: 'rejected',
      title: "Let's try again",
      message: result.issue.message,
      reason: result.issue.reason,
      timestamp: Date.now(),
    });
    scanCooldownUntilRef.current = Date.now() + 3500;
    setWorkflowStep('scanning_empty');

    liveServiceRef.current?.sendMessage(
      "The scan didn't work. Tell the student in a friendly way: that one didn't come through clearly, let's try again — hold up the whole worksheet so I can see the entire page."
    );
    liveServiceRef.current?.resumePrompts();
  }, [appendActivity, disconnectLive]);

  const handleCompletedExtractionResult = useCallback((
    result: CompletedWorksheetExtractionResult
  ) => {
    if (result.outcome === 'captured') {
      setLastScanFeedback(null);
      setCompletedWorksheet(result.data);
      setWorkflowStep('finished');
      setStatus('All done! Great work.');
      appendActivity('Completed worksheet captured with structured answers.');

      const voicePrompt = buildFeedbackVoicePrompt(result.data);
      if (liveServiceRef.current) {
        liveServiceRef.current.speakThenDisconnect(voicePrompt);
      } else {
        disconnectLive();
      }
      return;
    }

    const friendlyStatus = "Almost! I couldn't read everything. Hold it up one more time!";
    setStatus(friendlyStatus);
    appendActivity(result.issue.message);
    setLastScanFeedback({
      phase: 'completed',
      kind: 'rejected',
      title: "One more try",
      message: result.issue.message,
      reason: result.issue.reason,
      timestamp: Date.now(),
    });
    scanCooldownUntilRef.current = Date.now() + 3500;
    setWorkflowStep('scanning_completed');

    liveServiceRef.current?.sendMessage(
      "The scan didn't work. Tell the student in a friendly way: almost! I couldn't quite read everything. Let's try one more time — hold up the whole worksheet nice and steady."
    );
    liveServiceRef.current?.resumePrompts();
  }, [appendActivity, disconnectLive]);

  const handleAutoCapture = useCallback(async (payload: AutoCapturePayload) => {
    const currentStep = workflowStepRef.current;
    const currentService = serviceRef.current;

    if (!currentService || isAnalyzingRef.current) {
      return;
    }

    if (currentStep !== 'scanning_empty' && currentStep !== 'scanning_completed') {
      return;
    }

    if (payload.captureMode === 'auto' && Date.now() < scanCooldownUntilRef.current) {
      return;
    }

    isAnalyzingRef.current = true;
    liveServiceRef.current?.pausePrompts();
    setCaptureCount(prev => prev + 1);
    setLastCapturedFrame(payload.base64);
    appendActivity(payload.captureMode === 'auto' ? 'Auto-captured worksheet image.' : 'Manual capture requested.');

    try {
      if (currentStep === 'scanning_empty') {
        setWorkflowStep('processing_empty');
        setStatus('Reading the worksheet...');
        const result = await currentService.extractEmptyWorksheet({
          data: payload.base64,
          mimeType: payload.mimeType,
        }, {
          metrics: { captureMode: payload.captureMode },
        });
        handleEmptyExtractionResult(result);
      } else {
        setWorkflowStep('processing_completed');
        setStatus('Reading your answers...');
        const result = await currentService.extractCompletedWorksheet(
          {
            data: payload.base64,
            mimeType: payload.mimeType,
          },
          {
            subject: emptyWorksheet?.metadata.subject,
            emptyWorksheet: emptyWorksheet ?? undefined,
            metrics: { captureMode: payload.captureMode },
          }
        );
        handleCompletedExtractionResult(result);
      }
    } catch (error) {
      console.error('Worksheet extraction failed:', error);
      const message = getErrorMessage(error);
      appendActivity(message);
      setStatus("Oops, something went wrong. Let's try again!");
      setLastScanFeedback({
        phase: currentStep === 'scanning_empty' ? 'empty' : 'completed',
        kind: 'error',
        title: 'Scan processing error',
        message,
        captureMode: payload.captureMode,
        timestamp: Date.now(),
      });
      scanCooldownUntilRef.current = Date.now() + 3500;
      setWorkflowStep(currentStep === 'scanning_empty' ? 'scanning_empty' : 'scanning_completed');

      liveServiceRef.current?.sendMessage(
        "Something went wrong with the scan. Tell the student: oops, let me try that again — hold up your worksheet one more time!"
      );
      liveServiceRef.current?.resumePrompts();
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [
    appendActivity,
    emptyWorksheet,
    handleCompletedExtractionResult,
    handleEmptyExtractionResult,
  ]);

  const handleFrame = useCallback((base64Jpeg: string) => {
    liveServiceRef.current?.sendFrame(base64Jpeg);
  }, []);

  const markAsDone = () => {
    setWorkflowStep('scanning_completed');
    setStatus('Connecting to live guidance...');
    appendActivity('Ready to scan the completed worksheet.');
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      connectLive(apiKey);
    }
  };

  const captureNow = () => {
    if (!isScanning || isAnalyzingRef.current) {
      return;
    }

    setStatus('Capturing current frame...');
    setCaptureRequestNonce(prev => prev + 1);
  };

  const heading = {
    idle: 'Ready to start?',
    scanning_empty: 'Step 1: Scan Empty Page',
    processing_empty: 'Reading Worksheet',
    working: 'Time to work!',
    scanning_completed: 'Step 2: Scan Your Answers',
    processing_completed: 'Reading Your Answers',
    finished: 'All Done!',
  }[workflowStep];

  const subheading = {
    idle: "I'll watch your camera and capture the worksheet when it's ready.",
    scanning_empty: 'Hold up your empty worksheet. I\'ll guide you with my voice and capture it automatically.',
    processing_empty: 'The worksheet photo is captured. I am reading the printed content now.',
    working: "I've saved the problems. Complete the worksheet, then come back when you're ready.",
    scanning_completed: 'Now show me the completed worksheet. I\'ll guide you and capture it automatically.',
    processing_completed: 'The completed worksheet photo is captured. I am reading the student work now.',
    finished: 'Your worksheet has been captured and reviewed.',
  }[workflowStep];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">SmartPaper</h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Student Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {workflowStep !== 'idle' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowVisionDebug(prev => !prev)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-xs font-semibold ${showVisionDebug ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Debug
                </button>
                <button
                  onClick={resetWorkflow}
                  className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors text-xs font-semibold text-slate-600"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            )}
            {isScanning && (
              <div className="flex items-center gap-2">
                <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full ${
                  isLiveConnected
                    ? 'bg-emerald-50'
                    : isLiveFailed
                      ? 'bg-red-50'
                      : 'bg-slate-100'
                }`}>
                  {isLiveConnected ? (
                    <Wifi className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-slate-400" />
                  )}
                  <span className={`text-xs font-semibold ${
                    isLiveConnected ? 'text-emerald-700' : isLiveFailed ? 'text-red-600' : 'text-slate-500'
                  }`}>
                    {isLiveConnected ? 'Live Guidance' : isLiveFailed ? 'Manual Mode' : 'Connecting...'}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  CAPTURES: {captureCount}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                {(workflowStep === 'idle' || workflowStep === 'processing_empty') && <Sparkles className="w-6 h-6 text-blue-500" />}
                {workflowStep === 'scanning_empty' && <Scan className="w-6 h-6 text-blue-500" />}
                {workflowStep === 'working' && <BookOpen className="w-6 h-6 text-blue-500" />}
                {(workflowStep === 'scanning_completed' || workflowStep === 'processing_completed') && <Scan className="w-6 h-6 text-blue-500" />}
                {workflowStep === 'finished' && <Star className="w-6 h-6 text-yellow-500" />}
                {heading}
              </h2>
              <p className="text-slate-500">{subheading}</p>
            </div>

            <div className="relative group">
              {workflowStep === 'working' ? (
                <div className="aspect-video bg-white rounded-2xl border-2 border-blue-100 flex flex-col items-center justify-center p-8 text-center space-y-6 shadow-inner">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-blue-500 animate-bounce" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-800">Your turn to write!</h3>
                    <p className="text-slate-500 max-w-xs text-sm">When you finish the worksheet, come back and tap the button below.</p>
                  </div>

                  {emptyWorksheet && (
                    <div className="bg-slate-50 p-4 rounded-xl text-left text-xs text-slate-600 max-w-md border border-slate-100 space-y-2">
                      <span className="font-bold block text-slate-400 uppercase tracking-widest text-[10px]">Worksheet Summary</span>
                      <p className="leading-relaxed">{emptyWorksheet.studentTaskSummary}</p>
                      <p className="text-slate-500">
                        {emptyWorksheet.sections.reduce((count, section) => count + section.questions.length, 0)} prompts found
                      </p>
                    </div>
                  )}

                  <button
                    onClick={markAsDone}
                    className="px-12 py-5 bg-green-600 text-white rounded-2xl font-bold text-2xl shadow-xl shadow-green-200 hover:bg-green-700 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
                  >
                    <ClipboardCheck className="w-8 h-8" />
                    I'm Done!
                  </button>
                </div>
              ) : (
                <>
                  <CameraPreview
                    isCapturing={isScanning}
                    isFinished={workflowStep === 'finished'}
                    status={status}
                    captureRequestNonce={captureRequestNonce}
                    triggerAutoCapture={triggerAutoCapture}
                    onFrame={handleFrame}
                    onAutoCapture={handleAutoCapture}
                    onStatusChange={handleScanStatusChange}
                  />

                  {workflowStep === 'idle' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 backdrop-blur-[2px] rounded-2xl">
                      <button
                        onClick={startAssistant}
                        disabled={isInitializing}
                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-blue-500/40 hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 disabled:opacity-50"
                      >
                        {isInitializing ? (
                          <RefreshCw className="w-6 h-6 animate-spin" />
                        ) : (
                          <Sparkles className="w-6 h-6" />
                        )}
                        {isInitializing ? 'Preparing Camera...' : 'Start Scanning'}
                      </button>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] rounded-2xl">
                      <div className="bg-white/90 px-6 py-4 rounded-2xl shadow-xl border border-white text-center space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                        <div className="text-sm font-semibold text-slate-700">{status}</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {showVisionDebug && (
              <div className="rounded-2xl border border-slate-200 bg-slate-950/95 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Debug</span>
                  <span className={`text-xs font-semibold ${
                    isLiveConnected ? 'text-emerald-300' : isLiveFailed ? 'text-red-300' : 'text-amber-300'
                  }`}>
                    Live: {liveConnectionState}
                  </span>
                </div>

                {lastCapturedFrame && (
                  <div className="relative aspect-video bg-black rounded-lg border border-blue-500 overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 bg-blue-500 text-[8px] text-white font-bold px-1 py-0.5 uppercase z-10">
                      Last Captured Still
                    </div>
                    <img
                      src={`data:image/jpeg;base64,${lastCapturedFrame}`}
                      className="w-full h-full object-cover"
                      alt="Captured worksheet debug"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="text-white text-[10px] space-y-1">
                  <div className="text-slate-300">Status: {status}</div>
                  <div className="text-slate-300">Workflow: {workflowStep}</div>
                  <div className="text-slate-300">Captures: {captureCount}</div>
                </div>
              </div>
            )}

            {lastScanFeedback && (
              <div className={`rounded-2xl border p-4 space-y-2 ${
                lastScanFeedback.kind === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-amber-200 bg-amber-50'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-widest ${
                      lastScanFeedback.kind === 'error' ? 'text-red-600' : 'text-amber-700'
                    }`}>
                      {lastScanFeedback.title}
                    </div>
                    <div className="text-sm font-medium text-slate-800">{lastScanFeedback.message}</div>
                  </div>
                  {lastScanFeedback.captureMode && (
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {lastScanFeedback.captureMode}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                  <span className="rounded-full bg-white px-2 py-1 border border-slate-200">
                    phase: {lastScanFeedback.phase}
                  </span>
                  {lastScanFeedback.reason && (
                    <span className="rounded-full bg-white px-2 py-1 border border-slate-200">
                      reason: {lastScanFeedback.reason}
                    </span>
                  )}
                  <span className="rounded-full bg-white px-2 py-1 border border-slate-200">
                    {new Date(lastScanFeedback.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}

            {isScanning && (
              <div className="flex flex-col items-center gap-4">
                {isLiveFailed && (
                  <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                    Live guidance unavailable. Use manual capture below.
                  </div>
                )}
                <button
                  onClick={captureNow}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  <Scan className="w-5 h-5" />
                  Capture & Analyze Now
                </button>
              </div>
            )}

            <div className="space-y-3 min-h-[100px]">
              <AnimatePresence mode="popLayout">
                {activityLog.map((text, index) => (
                  <motion.div
                    key={`${text}-${index}`}
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100"
                  >
                    <p className="text-slate-700 text-sm leading-relaxed">{text}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="lg:col-span-5">
            <AnimatePresence mode="wait">
              {workflowStep === 'finished' && completedWorksheet ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden sticky top-24"
                >
                  <div className="bg-blue-600 p-6 text-white">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {emptyWorksheet?.metadata.subject || emptyWorksheet?.metadata.worksheetTitle || 'Worksheet'}
                      </div>
                      {completedWorksheet.score && (
                        <div className="flex items-center gap-1 bg-yellow-400 text-slate-900 px-3 py-1 rounded-full text-sm font-bold">
                          <Star className="w-4 h-4 fill-current" />
                          {completedWorksheet.score}
                        </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold mb-1">Great Job!</h3>
                    <p className="text-blue-100 text-sm">Reviewing your worksheet</p>
                  </div>

                  <div className="p-6 space-y-6">
                    {completedWorksheet.studentName && (
                      <section className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Student</h4>
                        <p className="text-sm font-medium text-slate-700">{completedWorksheet.studentName}</p>
                      </section>
                    )}

                    <section className={`rounded-2xl border p-4 space-y-2 ${
                      completedWorksheet.isGradingSafe
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-amber-200 bg-amber-50'
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <h4 className={`text-xs font-bold uppercase tracking-widest ${
                          completedWorksheet.isGradingSafe ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          Grading Readiness
                        </h4>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                          completedWorksheet.isGradingSafe ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          {completedWorksheet.isGradingSafe ? 'Safe to grade' : 'Partial capture'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {completedWorksheet.isGradingSafe
                          ? 'This capture appears complete enough for downstream grading.'
                          : 'This capture is useful, but some student work may be missing from the image.'}
                      </p>
                      {completedWorksheet.capturedPortionSummary && (
                        <p className="text-xs text-slate-600">{completedWorksheet.capturedPortionSummary}</p>
                      )}
                    </section>

                    <section className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4" />
                        Your Answers
                      </h4>
                      <div className="space-y-3">
                        {completedWorksheet.responses.map((response, index) => (
                          <div
                            key={`${response.questionRef || response.promptAnchor}-${index}`}
                            className="bg-slate-50 p-4 rounded-xl text-sm border border-slate-100 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-semibold text-slate-700">
                                {response.questionRef || response.promptAnchor}
                              </div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {formatLegibility(response.legibility)}
                              </div>
                            </div>
                            <p className="text-slate-500">{response.promptAnchor}</p>
                            <div className="text-slate-700 leading-relaxed">
                              {response.answered && response.studentAnswer ? response.studentAnswer : 'No answer captured'}
                            </div>
                            {response.studentWorkDescription && (
                              <p className="text-xs text-slate-500">
                                {response.studentWorkDescription}
                              </p>
                            )}
                            {response.notes && (
                              <p className="text-xs text-amber-600">{response.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    {completedWorksheet.unmatchedMarks.length > 0 && (
                      <section className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unmatched Marks</h4>
                        <div className="space-y-2">
                          {completedWorksheet.unmatchedMarks.map((mark, index) => (
                            <div key={`${mark}-${index}`} className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
                              {mark}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {completedWorksheet.missingResponseAreas.length > 0 && (
                      <section className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Missing Response Areas</h4>
                        <div className="space-y-2">
                          {completedWorksheet.missingResponseAreas.map((area, index) => (
                            <div key={`${area}-${index}`} className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
                              {area}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {completedWorksheet.completionNotes && (
                      <section className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Completion Notes</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{completedWorksheet.completionNotes}</p>
                      </section>
                    )}

                    {completedWorksheet.visualWorkSummary && (
                      <section className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visual Work Summary</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{completedWorksheet.visualWorkSummary}</p>
                      </section>
                    )}

                    <section className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        AI Feedback
                      </h4>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {completedWorksheet.feedback || 'Your worksheet was captured successfully.'}
                      </p>
                    </section>
                  </div>
                </motion.div>
              ) : emptyWorksheet ? (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-3xl p-8 border border-slate-200 space-y-6 sticky top-24"
                >
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">Current Progress</div>
                    <h3 className="text-xl font-bold text-slate-800">Worksheet Captured</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{emptyWorksheet.studentTaskSummary}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white">
                        <ClipboardCheck className="w-4 h-4" />
                      </div>
                      <span>Empty worksheet scanned</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-slate-300 rounded-full" />
                      </div>
                      <span>Waiting for your answers...</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MetadataPill label="Name" value={emptyWorksheet.metadata.name} />
                    <MetadataPill label="Date" value={emptyWorksheet.metadata.date} />
                    <MetadataPill label="Unit/Lesson" value={emptyWorksheet.metadata.unitOrLesson} />
                    <MetadataPill label="Activity Type" value={formatActivityType(emptyWorksheet.metadata.activityType)} />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Worksheet Overview</div>
                      <div className="text-xs text-slate-600 leading-relaxed">
                        {emptyWorksheet.metadata.worksheetTitle || emptyWorksheet.metadata.subject || 'Worksheet'}
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {emptyWorksheet.sections.map((section) => (
                        <div key={section.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                          <div>
                            <div className="text-xs font-semibold text-slate-700">
                              {section.title || 'Section'}
                            </div>
                            {section.instructions && (
                              <p className="text-xs text-slate-500 mt-1">{section.instructions}</p>
                            )}
                          </div>
                          {section.questions.length > 0 ? (
                            <div className="space-y-2">
                              {section.questions.map((question) => (
                                <QuestionPreview key={question.id} question={question} />
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">No discrete prompts found in this section.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6 border-2 border-dashed border-slate-200 rounded-3xl"
                >
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                    <Scan className="w-10 h-10 text-slate-300" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-400">Waiting for Step 1</h3>
                    <p className="text-sm text-slate-400 max-w-[220px] mx-auto">
                      Hold up the empty worksheet and SmartPaper will capture it automatically.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-slate-200 mt-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h5 className="font-bold text-slate-800">Good Lighting</h5>
            <p className="text-sm text-slate-500">Bright, even light helps the worksheet auto-capture quickly.</p>
          </div>
          <div className="space-y-2">
            <h5 className="font-bold text-slate-800">Center The Page</h5>
            <p className="text-sm text-slate-500">Keep the full sheet inside the corner guides for the fastest capture.</p>
          </div>
          <div className="space-y-2">
            <h5 className="font-bold text-slate-800">Listen for Guidance</h5>
            <p className="text-sm text-slate-500">SmartPaper speaks positioning tips aloud while you scan.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const MetadataPill: FC<{ label: string; value?: string }> = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-700">{value || 'Not detected'}</div>
    </div>
  );
};

const QuestionPreview: FC<{ question: WorksheetQuestion }> = ({ question }) => {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-700">
          {question.label || question.id}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {formatResponseType(question.expectedResponseType)}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{question.prompt}</p>
      {question.instructions && (
        <p className="mt-1 text-[11px] text-slate-400">{question.instructions}</p>
      )}
    </div>
  );
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return 'The scan failed while processing the image. Please try again.';
}

function formatActivityType(activityType: string) {
  return activityType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatResponseType(expectedResponseType: string) {
  return expectedResponseType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatLegibility(legibility: string) {
  return legibility.replace('_', ' ');
}

function buildWorksheetVoicePrompt(worksheet: EmptyWorksheetData): string {
  const questions = worksheet.sections.flatMap(s => s.questions);
  const sample = questions.slice(0, 5).map(q => `- ${q.prompt}`).join('\n');
  const moreNote = questions.length > 5
    ? `\n(Plus ${questions.length - 5} more questions.)`
    : '';

  return [
    'Great news — the worksheet is all scanned!',
    'Now tell the student about their assignment in a fun, simple way a young kid can understand.',
    `Here is the task summary: "${worksheet.studentTaskSummary}"`,
    `Here are the questions:\n${sample}${moreNote}`,
    "Don't read each question one-by-one — give them a fun overview of what they'll be doing.",
    'Then say something like: "Now go grab your pencil and work on your worksheet! When you\'re all finished, come back and press the big green button so I can check your work!"',
    'Keep your whole message short and cheerful — no more than about 20 seconds of speaking.',
  ].join('\n');
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
