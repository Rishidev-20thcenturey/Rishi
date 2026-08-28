import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  Plus,
  Shirt,
  Music,
  Camera,
  Heart,
  Sliders,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CharacterPreset, EmotionType } from '../types';

interface CompanionChatBarProps {
  selectedCharacter: CharacterPreset;
  onSendMessage: (text: string, attachedImage?: string) => void;
  isListening: boolean;
  isContinuousListen: boolean;
  onToggleContinuousListen: () => void;
  onStartPushToTalk: () => void;
  onStopPushToTalk: () => void;
  isThinking: boolean;
  onOpenVision: () => void;
  onOpenWardrobe: () => void;
  onOpenMusic: () => void;
  onOpenVoiceSettings?: () => void;
  onOpenAffection: () => void;
  onTakeSnapshot?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  isDancing: boolean;
  onToggleDance: () => void;
  onTriggerEmotion?: (emotion: EmotionType) => void;
}

export const CompanionChatBar: React.FC<CompanionChatBarProps> = ({
  selectedCharacter,
  onSendMessage,
  isListening,
  isContinuousListen,
  onToggleContinuousListen,
  onStartPushToTalk,
  onStopPushToTalk,
  isThinking,
  onOpenVision,
  onOpenWardrobe,
  onOpenMusic,
  onOpenVoiceSettings,
  onOpenAffection,
  onTakeSnapshot,
  isMuted = false,
  onToggleMute,
  isDancing,
  onToggleDance,
  onTriggerEmotion,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const charName = selectedCharacter?.name ? selectedCharacter.name.split(' ')[0] : 'Companion';

  // Support pasting screenshots directly into the chat input
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              const res = evt.target?.result as string;
              if (res) setAttachedImage(res);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if ((!trimmed && !attachedImage) || isThinking) return;
    onSendMessage(trimmed || 'Look at what I am showing you!', attachedImage || undefined);
    setInputText('');
    setAttachedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const res = evt.target?.result as string;
      if (res) {
        setAttachedImage(res);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      id="companion-chat-dock"
      className="absolute inset-x-0 bottom-0 p-3 sm:p-5 flex flex-col items-center gap-2 z-30 pointer-events-none"
    >
      {/* Hidden File / Camera Capture Input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      {/* Popover Action Menu (+ Button) */}
      <AnimatePresence>
        {showPlusMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="w-full max-w-md bg-slate-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 pointer-events-auto z-40"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-white/70">Quick Actions</span>
              <button
                onClick={() => setShowPlusMenu(false)}
                className="text-white/40 hover:text-white text-xs p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenWardrobe();
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition cursor-pointer"
              >
                <Shirt className="w-4 h-4 text-pink-400" />
                <span className="text-[10px]">Wardrobe</span>
              </button>

              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  onToggleDance();
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-white transition cursor-pointer ${
                  isDancing ? 'bg-purple-600/30 border-purple-400' : 'bg-white/5 hover:bg-white/10 border-white/10'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${isDancing ? 'text-purple-300 animate-spin' : 'text-purple-400'}`} />
                <span className="text-[10px]">{isDancing ? 'Stop' : 'Dance'}</span>
              </button>

              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenMusic();
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition cursor-pointer"
              >
                <Music className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px]">Music</span>
              </button>

              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenVision();
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px]">Vision AI</span>
              </button>

              {onOpenVoiceSettings && (
                <button
                  onClick={() => {
                    setShowPlusMenu(false);
                    onOpenVoiceSettings();
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px]">Voice</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  onOpenAffection();
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition cursor-pointer"
              >
                <Heart className="w-4 h-4 text-rose-400" />
                <span className="text-[10px]">Affection</span>
              </button>

              {onToggleMute && (
                <button
                  onClick={() => {
                    setShowPlusMenu(false);
                    onToggleMute();
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                  <span className="text-[10px]">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Attachment Preview Badge */}
      <AnimatePresence>
        {attachedImage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="flex items-center gap-2 p-1.5 px-3 bg-slate-900/95 backdrop-blur-xl border border-cyan-400/50 rounded-xl shadow-lg pointer-events-auto"
          >
            <img
              src={attachedImage}
              alt="Attached preview"
              className="w-8 h-8 rounded-lg object-cover border border-white/20"
            />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-cyan-300 leading-tight">
                {charName} can see this photo
              </span>
              <span className="text-[9px] text-white/50">Attached to next message</span>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="p-1 rounded-full bg-white/10 hover:bg-rose-500/30 text-white/60 hover:text-white ml-2 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Glass Chat Input Capsule */}
      <div className="w-full max-w-xl bg-black/70 backdrop-blur-2xl border border-white/15 rounded-2xl p-1.5 shadow-2xl flex items-center gap-2 pointer-events-auto">
        {/* Plus Action Button */}
        <button
          onClick={() => setShowPlusMenu((prev) => !prev)}
          title="Quick Actions"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition active:scale-95 cursor-pointer flex-shrink-0"
        >
          <Plus className={`w-4 h-4 transition-transform ${showPlusMenu ? 'rotate-45' : ''}`} />
        </button>

        {/* Snap Photo / Upload File Button */}
        <button
          onClick={() => photoInputRef.current?.click()}
          title="Take Photo or Attach Picture for Companion to See"
          className={`p-2 rounded-xl transition-all active:scale-95 cursor-pointer flex-shrink-0 ${
            attachedImage
              ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
              : 'bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300'
          }`}
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attachedImage ? `Ask ${charName} about this photo...` : `Message ${charName}...`}
          disabled={isThinking}
          className="flex-1 bg-transparent text-white placeholder-white/40 text-xs sm:text-sm px-2 py-1.5 focus:outline-none min-w-0"
        />

        {/* Voice Microphone Button (Push-to-Talk / Toggle) */}
        <button
          onClick={onToggleContinuousListen}
          title={isContinuousListen ? 'Disable Continuous Listening' : 'Tap to Speak'}
          className={`p-2 sm:px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer flex-shrink-0 ${
            isListening || isContinuousListen
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'
              : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span className="hidden sm:inline text-[11px] font-medium">
            {isListening ? 'Listening...' : 'Voice'}
          </span>
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!inputText.trim() && !attachedImage) || isThinking}
          title="Send Message"
          className={`p-2 rounded-xl transition-all active:scale-95 cursor-pointer flex-shrink-0 ${
            (inputText.trim() || attachedImage) && !isThinking
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
