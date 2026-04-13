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
  className?: string;
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
  className,
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
    <div className={['relative mx-auto h-full w-full overflow-hidden rounded-[14px] bg-black', className ?? ''].join(' ')}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />
      <canvas ref={captureCanvasRef} className="hidden" />
      <canvas ref={frameCanvasRef} className="hidden" />

      <AnimatePresence>
        {isCapturing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0"
          >
            <div
              className="absolute inset-[7%] box-border rounded-[12px] border-[3px] border-white/80"
            >
              <motion.div
                animate={{ top: ['8%', '92%', '8%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute left-3 right-3 z-10 h-1 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.6)]"
              />
            </div>

            <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="k1-status-chip flex max-w-[calc(100%-1.5rem)] items-center gap-2 px-4 py-2 text-center"
              >
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-student-primary" />
                <span className="text-xs font-semibold text-text-primary sm:text-sm">{status}</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isFinished && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-6 backdrop-blur-sm">
          <div className="rounded-[20px] bg-white px-8 py-10 text-center shadow-[var(--shadow-raised)]">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-success" />
            <h3 className="mb-2 text-2xl font-bold text-text-primary">Work Captured!</h3>
            <p className="text-sm font-semibold text-text-secondary">Review your feedback below.</p>
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
