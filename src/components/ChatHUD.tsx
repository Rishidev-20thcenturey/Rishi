import React, { useEffect, useState } from 'react';
import { ChatMessage, EmotionType } from '../types';
import { Sparkles, MessageCircle, Volume2, Mic, Radio, Waves, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioEngine } from '../services/audioEngine';

interface ChatHUDProps {
  lastMessage: ChatMessage | null;
  chatHistory: ChatMessage[];
  isTalking: boolean;
  isListening: boolean;
  isThinking: boolean;
  interimTranscript: string;
  onTopicClick: (topic: string) => void;
  starterMessages: string[];
  isPlayingMusic?: boolean;
  currentTrackTitle?: string;
  onOpenMusicPlayer?: () => void;
  isLiveVoiceCallActive?: boolean;
  liveCallDuration?: number;
  onToggleLiveVoiceCall?: () => void;
  onOpenVoiceSettings?: () => void;
  activeVoiceName?: string;
}

function formatCallDuration(seconds: number = 0): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${pad(remMins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export const ChatHUD: React.FC<ChatHUDProps> = ({
  lastMessage,
  isTalking,
  isListening,
  isThinking,
  interimTranscript,
  onTopicClick,
  starterMessages,
  isPlayingMusic = false,
  currentTrackTitle = '',
  onOpenMusicPlayer,
  isLiveVoiceCallActive = false,
  liveCallDuration = 0,
  onToggleLiveVoiceCall,
  onOpenVoiceSettings,
  activeVoiceName = 'Kore',
}) => {
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 40, 60, 35, 20]);
  const [isSubtitleVisible, setIsSubtitleVisible] = useState<boolean>(true);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  // When a new message comes in, show subtitle and set auto-fade timeout
  useEffect(() => {
    if (lastMessage && lastMessage.id !== lastMessageId) {
      setLastMessageId(lastMessage.id);
      setIsSubtitleVisible(true);
    }
  }, [lastMessage, lastMessageId]);

  // Auto-dismiss subtitles 6 seconds after she stops talking
  useEffect(() => {
    if (!isTalking && isSubtitleVisible) {
      const timer = setTimeout(() => {
        setIsSubtitleVisible(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isTalking, isSubtitleVisible]);

  // Subscribe to audio engine spectrum analyzer for real-time waveform bars
  useEffect(() => {
    const unsubscribe = audioEngine.addSpectrumListener((freqData, volume) => {
      if (freqData.length >= 6) {
        const bands = [
          freqData[2] || 10,
          freqData[6] || 20,
          freqData[12] || 30,
          freqData[20] || 25,
          freqData[32] || 15,
          freqData[48] || 10,
        ].map((v) => Math.max(10, Math.min(100, Math.round((v / 255) * 100))));
        setAudioLevels(bands);
      }
    });
    return unsubscribe;
  }, []);

  const getEmotionBadge = (emotion?: EmotionType) => {
    switch (emotion) {
      case 'love':
        return { label: 'Affection', color: 'text-pink-300' };
      case 'blush':
        return { label: 'Flustered', color: 'text-rose-300' };
      case 'pout':
        return { label: 'Pout', color: 'text-amber-300' };
      case 'happy':
        return { label: 'Happy', color: 'text-emerald-300' };
      case 'wink':
        return { label: 'Playful', color: 'text-purple-300' };
      case 'surprised':
        return { label: 'Surprised', color: 'text-cyan-300' };
      case 'sleepy':
        return { label: 'Sleepy', color: 'text-blue-300' };
      default:
        return { label: 'Calm', color: 'text-white/60' };
    }
  };

  const badge = getEmotionBadge(lastMessage?.emotion);

  return (
    <div
      id="chat-hud"
      className="absolute inset-x-0 bottom-20 px-3 sm:px-6 max-w-lg mx-auto pointer-events-none flex flex-col items-center gap-2 z-20"
    >
      {/* Real-time Hands-Free Voice Call Status Pill */}
      {isLiveVoiceCallActive && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          className="px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-xl border border-cyan-400/50 text-cyan-300 text-xs font-mono flex items-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.25)] pointer-events-auto"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold tracking-wider text-[10px]">LIVE CALL</span>
          <span className="text-white/30">•</span>
          <span className="font-mono text-[11px] font-bold text-cyan-100 bg-cyan-950/60 px-1.5 py-0.5 rounded-md border border-cyan-500/30">
            {formatCallDuration(liveCallDuration)}
          </span>
          <span className="text-white/30">•</span>
          <div className="flex items-end gap-0.5 h-2.5">
            {audioLevels.map((h, i) => (
              <div
                key={i}
                style={{ height: `${isTalking || isListening ? h : 20}%` }}
                className="w-0.5 bg-cyan-400 rounded-full transition-all duration-75"
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Live Speaking Subtitle / Speech Bubble (Compact, Auto-fading, Dismissible) */}
      <AnimatePresence>
        {lastMessage && isSubtitleVisible && (
          <motion.div
            key={lastMessage.id}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="w-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-xl rounded-xl px-3.5 py-2 text-white pointer-events-auto relative group"
          >
            {/* Header / Dismiss */}
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isTalking
                      ? 'bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="text-[11px] font-semibold text-white/80">
                  {lastMessage.sender === 'waifu' ? 'Companion' : 'You'}
                </span>
                <span className={`text-[10px] font-mono ${badge.color}`}>• {badge.label}</span>
              </div>

              <button
                onClick={() => setIsSubtitleVisible(false)}
                title="Dismiss Subtitle"
                className="text-white/40 hover:text-white text-[10px] font-mono px-1 rounded transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Spoken Text & Image */}
            <div className="flex items-start gap-2.5">
              {lastMessage.image && (
                <img
                  src={lastMessage.image}
                  alt="Snapshot"
                  className="w-12 h-12 rounded-lg object-cover border border-cyan-400/40 shadow-sm flex-shrink-0 mt-0.5"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-white/90 leading-snug">
                  "{lastMessage.text}"
                  {lastMessage.action && (
                    <span className="text-[11px] text-white/50 italic ml-1.5 font-serif">
                      ({lastMessage.action})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Voice Input Transcription */}
      <AnimatePresence>
        {isListening && interimTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="px-3.5 py-1 bg-black/80 backdrop-blur-md border border-cyan-400/30 text-white rounded-full text-[11px] font-mono flex items-center gap-2 shadow-md pointer-events-auto"
          >
            <Mic className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span className="truncate max-w-xs">"{interimTranscript}"</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thinking Indicator */}
      {isThinking && (
        <div className="px-3 py-1 bg-black/70 backdrop-blur-md border border-white/10 text-white/80 rounded-full text-[11px] font-mono flex items-center gap-1.5 shadow-md pointer-events-auto">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Thinking...</span>
        </div>
      )}
    </div>
  );
};
