import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Loader2 } from 'lucide-react';

export interface AutoCapturePayload {
  base64: string;
  mimeType: string;
  captureMode: 'auto' | 'manual';
}

interface CameraPreviewProps {
  isCapturing: boolean;
  isFinished?: boolean;
  status: string;
  captureRequestNonce: number;
  triggerAutoCapture: number;
  onFrame?: (base64Jpeg: string) => void;
  onAutoCapture: (payload: AutoCapturePayload) => void;
  onStatusChange: (status: string) => void;
}

const FRAME_INTERVAL_MS = 1000;
const FRAME_SIZE = 768;

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  isCapturing,
  isFinished,
  status,
  captureRequestNonce,
  triggerAutoCapture,
  onFrame,
  onAutoCapture,
  onStatusChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastHandledCaptureRequestRef = useRef(0);
  const lastHandledAutoCaptureRef = useRef(0);
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = mediaStream;
        setIsCameraReady(true);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        onStatusChange('Camera access is needed to scan the worksheet.');
      }
    }

    setupCamera();

    return () => {
      isMounted = false;
      setIsCameraReady(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, [onStatusChange]);

  useEffect(() => {
    if (!isCapturing || !isCameraReady || !onFrame) {
      return;
    }

    const interval = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = frameCanvasRef.current;
      if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scale = Math.min(FRAME_SIZE / video.videoWidth, FRAME_SIZE / video.videoHeight);
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const base64 = dataUrl.split(',')[1];
      if (base64) {
        onFrame(base64);
      }
    }, FRAME_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isCapturing, isCameraReady, onFrame]);

  useEffect(() => {
    if (!isCameraReady || !isCapturing) return;
    if (triggerAutoCapture === 0 || triggerAutoCapture === lastHandledAutoCaptureRef.current) return;

    lastHandledAutoCaptureRef.current = triggerAutoCapture;
    const capture = captureStillImage(videoRef.current, captureCanvasRef.current);
    if (capture) {
      onAutoCapture({ ...capture, captureMode: 'auto' });
    }
  }, [triggerAutoCapture, isCameraReady, isCapturing, onAutoCapture]);

  useEffect(() => {
    if (!isCameraReady || !isCapturing) return;
    if (captureRequestNonce === 0 || captureRequestNonce === lastHandledCaptureRequestRef.current) return;

    lastHandledCaptureRequestRef.current = captureRequestNonce;
    const capture = captureStillImage(videoRef.current, captureCanvasRef.current);
    if (capture) {
      onAutoCapture({ ...capture, captureMode: 'manual' });
    }
  }, [captureRequestNonce, isCameraReady, isCapturing, onAutoCapture]);

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas ref={captureCanvasRef} className="hidden" />
      <canvas ref={frameCanvasRef} className="hidden" />

      <AnimatePresence>
        {isCapturing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[85%] w-auto max-w-[calc(100%-2rem)] aspect-[8.5/11] rounded-xl border-[3px] border-white/60 box-border"
            >
              <motion.div
                animate={{ top: ['6%', '94%', '6%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute left-2 right-2 h-1 bg-white/50 shadow-[0_0_15px_rgba(255,255,255,0.55)] z-10 rounded-full"
              />
            </div>

            <div className="absolute bottom-12 left-0 right-0 flex justify-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 flex items-center gap-3"
              >
                <Loader2 className="w-4 h-4 text-white animate-spin" />
                <span className="text-white font-medium text-sm">{status}</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isFinished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="text-center text-white p-8">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Work Captured!</h3>
            <p className="text-white/70">Review your feedback below.</p>
          </div>
        </div>
      )}
    </div>
  );
};

function captureStillImage(
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement | null
) {
  if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
    return null;
  }

  const maxWidth = 1600;
  const targetWidth = Math.min(video.videoWidth, maxWidth);
  const targetHeight = Math.round((targetWidth / video.videoWidth) * video.videoHeight);
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.drawImage(video, 0, 0, targetWidth, targetHeight);

  return {
    base64: canvas.toDataURL('image/jpeg', 0.96).split(',')[1],
    mimeType: 'image/jpeg',
  };
}
