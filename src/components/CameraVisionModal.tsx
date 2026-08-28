import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Sparkles, RefreshCw, Eye, AlertCircle, Upload, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { CharacterPreset } from '../types';
import { motion } from 'motion/react';

interface CameraVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterPreset;
  onAnalyzeFrame: (base64Image: string) => void;
  isThinking: boolean;
}

export const CameraVisionModal: React.FC<CameraVisionModalProps> = ({
  isOpen,
  onClose,
  character,
  onAnalyzeFrame,
  isThinking,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [autoScan, setAutoScan] = useState<boolean>(false);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setUploadedPreview(null);
      setCameraError(null);
      return;
    }

    let activeStream: MediaStream | null = null;
    let isMounted = true;

    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMounted) {
          setCameraError('Camera access is restricted in this window. You can take a photo or upload an image below.');
        }
        return;
      }

      let s: MediaStream | null = null;
      let err: any = null;

      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
      } catch (e1) {
        err = e1;
        try {
          s = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          });
        } catch (e2) {
          err = e2;
          try {
            s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } catch (e3) {
            err = e3;
          }
        }
      }

      if (!isMounted) {
        if (s) s.getTracks().forEach((t) => t.stop());
        return;
      }

      if (s) {
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        setCameraError(null);
      } else {
        console.warn('Camera access denied or unavailable:', err);
        setCameraError('Camera access is restricted in this preview. You can use the photo capture button below or open in a full tab.');
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const captureFrame = () => {
    if (uploadedPreview) {
      onAnalyzeFrame(uploadedPreview);
      return;
    }

    if (!videoRef.current) {
      fileInputRef.current?.click();
      return;
    }
    const video = videoRef.current;
    if (video.videoWidth === 0) {
      fileInputRef.current?.click();
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.90);
    onAnalyzeFrame(base64);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setUploadedPreview(result);
        onAnalyzeFrame(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Auto-scan interval (1 frame every 10 seconds if enabled)
  useEffect(() => {
    if (!isOpen || !autoScan || isThinking || cameraError) return;
    const interval = setInterval(() => {
      captureFrame();
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen, autoScan, isThinking, cameraError, uploadedPreview]);

  if (!isOpen) return null;

  return (
    <div
      id="camera-vision-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl text-[#e5e5e5]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white tracking-tight">Optical Neural Vision</h2>
              <p className="text-xs text-white/40 font-mono">Instant visual recognition for {character?.name ? character.name.split(' ')[0] : 'Companion'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport or Uploaded Preview */}
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-inner flex items-center justify-center">
          {uploadedPreview ? (
            <img
              src={uploadedPreview}
              alt="Snapshot"
              className="w-full h-full object-contain bg-black"
            />
          ) : cameraError ? (
            <div className="p-6 text-center text-white/80 flex flex-col items-center justify-center gap-3 font-mono text-xs max-w-sm">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-amber-200">{cameraError}</p>
              <div className="flex flex-wrap gap-2 justify-center mt-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Take Live Photo / Upload</span>
                </button>
                <button
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open In Full Tab</span>
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
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Cyber Anime Face Target HUD overlay */}
              <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="text-[9px] text-cyan-300 font-mono uppercase tracking-[0.2em] bg-black/60 backdrop-blur-sm border border-cyan-500/30 px-2.5 py-1 rounded">
                    OPTICAL FEED SYNCED
                  </div>
                  <div className="w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
                </div>

                <div className="self-center w-36 h-40 border border-dashed border-cyan-400/40 rounded-3xl animate-pulse flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                </div>

                <div className="flex justify-between items-end">
                  <div className="w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
                  <div className="text-[9px] text-white/50 font-mono tracking-widest bg-black/60 backdrop-blur-sm border border-white/10 px-2 py-1 rounded">
                    GEMINI MULTIMODAL
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload/Photo</span>
          </button>

          {!cameraError && (
            <button
              onClick={() => setAutoScan((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
                autoScan
                  ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${autoScan ? 'animate-spin' : ''}`} />
              <span>Auto-Scan {autoScan ? 'ON' : 'OFF'}</span>
            </button>
          )}

          <button
            onClick={captureFrame}
            disabled={isThinking}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>{isThinking ? 'Analyzing...' : `Show & Transmit`}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

