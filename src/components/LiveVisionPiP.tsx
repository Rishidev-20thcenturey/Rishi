import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Sparkles, X, RefreshCw, Eye, EyeOff, Maximize2, Minimize2, Video, Upload, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LiveVisionPiPProps {
  isActive: boolean;
  onToggle: () => void;
  onFrameCaptured: (base64Jpeg: string) => void;
  onManualAnalyze?: (base64Jpeg: string) => void;
  isCompanionThinking?: boolean;
  companionName?: string;
}

export const LiveVisionPiP: React.FC<LiveVisionPiPProps> = ({
  isActive,
  onToggle,
  onFrameCaptured,
  onManualAnalyze,
  isCompanionThinking = false,
  companionName = 'Waifu',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streamReady, setStreamReady] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFacingUser, setIsFacingUser] = useState<boolean>(true);
  const [lastCapturedPreview, setLastCapturedPreview] = useState<string | null>(null);

  // Progressive camera initialization with automatic constraint fallbacks
  useEffect(() => {
    if (!isActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setStreamReady(false);
      setCameraError(null);
      return;
    }

    let isMounted = true;

    async function initCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMounted) {
          setCameraError('Camera API not available in current window. Use the photo capture button below.');
          setStreamReady(false);
        }
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      let stream: MediaStream | null = null;
      let lastErr: any = null;

      // Strategy 1: Preferred resolution & facingMode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: isFacingUser ? 'user' : 'environment',
          },
          audio: false,
        });
      } catch (e1) {
        lastErr = e1;
        // Strategy 2: Simple facingMode
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: isFacingUser ? 'user' : 'environment',
            },
            audio: false,
          });
        } catch (e2) {
          lastErr = e2;
          // Strategy 3: Pure video fallback
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (e3) {
            lastErr = e3;
          }
        }
      }

      if (!isMounted) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (stream) {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setStreamReady(true);
        setCameraError(null);
      } else {
        const msg = lastErr?.message || 'Camera blocked or not found.';
        console.warn('[LiveVision] Camera init failed:', msg);
        setCameraError(
          lastErr?.name === 'NotAllowedError'
            ? 'Camera access was blocked by browser permissions.'
            : 'Could not connect to webcam directly.'
        );
        setStreamReady(false);
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isActive, isFacingUser]);

  // Frame Capture logic: converts current video frame to lightweight JPEG base64
  const captureCurrentFrame = (): string | null => {
    if (!videoRef.current || !streamReady) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    try {
      const canvas = document.createElement('canvas');
      // High-definition capture for accurate AI object and gesture recognition
      const targetWidth = Math.min(1280, video.videoWidth || 1280);
      const targetHeight = Math.round((targetWidth / (video.videoWidth || 1)) * (video.videoHeight || 720));
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      if (isFacingUser) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64 = canvas.toDataURL('image/jpeg', 0.88);
      return base64;
    } catch (e) {
      console.warn('[LiveVision] Frame capture error:', e);
      return null;
    }
  };

  // Background frame synchronization: keep the latest frame updated every 3s
  useEffect(() => {
    if (!isActive || !streamReady) return;
    const interval = setInterval(() => {
      const frame = captureCurrentFrame();
      if (frame) {
        setLastCapturedPreview(frame);
        onFrameCaptured(frame);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive, streamReady, isFacingUser]);

  // Manual Trigger: User taps 'Look at me'
  const handleManualLook = () => {
    const frame = captureCurrentFrame();
    if (frame) {
      setLastScanTime(Date.now());
      setLastCapturedPreview(frame);
      onFrameCaptured(frame);
      if (onManualAnalyze) {
        onManualAnalyze(frame);
      }
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle native photo/file selection (works 100% on phone camera or file upload)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLastCapturedPreview(result);
        onFrameCaptured(result);
        if (onManualAnalyze) {
          onManualAnalyze(result);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Switch between front/back camera (especially on phones/tablets)
  const toggleCameraFacing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFacingUser((prev) => !prev);
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="live-vision-pip"
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 20 }}
        drag
        dragMomentum={false}
        dragConstraints={{ left: -300, right: 300, top: -400, bottom: 200 }}
        className="fixed bottom-24 right-4 sm:bottom-28 sm:right-6 z-40 touch-none pointer-events-auto"
      >
        {/* Hidden Native Camera & File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="relative rounded-2xl sm:rounded-3xl bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/40 p-2.5 shadow-2xl shadow-cyan-950/50 flex flex-col gap-2 overflow-hidden transition-all duration-300 w-52 sm:w-64">
          {/* Subtle Cyber Status Header */}
          <div className="flex items-center justify-between px-1.5 pt-0.5 gap-2 select-none cursor-grab active:cursor-grabbing">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${streamReady ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-mono font-bold tracking-wide text-cyan-300">
                {companionName.split(' ')[0]} Vision
              </span>
            </div>

            <div className="flex items-center gap-1">
              {streamReady && (
                <button
                  onClick={toggleCameraFacing}
                  title="Flip Camera (Front/Back)"
                  className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}

              <button
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? 'Expand Camera View' : 'Minimize View'}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </button>

              <button
                onClick={onToggle}
                title="Close Camera"
                className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Camera Viewport or Fallback Upload */}
          {!isMinimized && (
            <div className="relative w-full aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
              {cameraError ? (
                <div className="p-3 text-center text-white/80 flex flex-col items-center justify-center gap-2">
                  <p className="text-[11px] text-amber-300 font-medium leading-tight">
                    Live camera restricted by browser.
                  </p>
                  <div className="flex flex-col gap-1.5 w-full">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="py-1 px-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[10px] flex items-center justify-center gap-1.5 shadow cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Take Photo / Upload</span>
                    </button>
                    <button
                      onClick={handleOpenInNewTab}
                      className="py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>Open in Full Tab</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isFacingUser ? 'transform -scale-x-100' : ''}`}
                  />

                  {/* High-tech anime vision scanner reticle */}
                  <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="w-2 h-2 border-t border-l border-cyan-400" />
                      <div className="w-2 h-2 border-t border-r border-cyan-400" />
                    </div>

                    <div className="self-center w-14 h-14 border border-dashed border-cyan-400/50 rounded-full animate-spin [animation-duration:8s] flex items-center justify-center">
                      <div className="w-1 h-1 bg-cyan-300 rounded-full" />
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="w-2 h-2 border-b border-l border-cyan-400" />
                      <div className="w-2 h-2 border-b border-r border-cyan-400" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Quick Reaction Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleManualLook}
              disabled={isCompanionThinking || (!streamReady && !cameraError)}
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                isCompanionThinking
                  ? 'bg-purple-600/50 text-white/70 cursor-wait'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isCompanionThinking ? 'Thinking...' : 'Look At Me!'}</span>
            </button>

            {/* Direct Snap Photo / Upload File */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Take Photo or Upload Image"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer flex-shrink-0"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

