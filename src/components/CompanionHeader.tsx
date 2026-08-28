import React, { useState } from 'react';
import {
  Heart,
  Brain,
  Phone,
  PhoneOff,
  Menu,
  ChevronDown,
  Sparkles,
  Box,
  Eye,
  EyeOff,
  Music,
  Clock,
  Camera,
  Video,
} from 'lucide-react';
import { CharacterPreset } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface CompanionHeaderProps {
  selectedCharacter: CharacterPreset;
  allCharacters?: CharacterPreset[];
  onSelectCharacter: (char: CharacterPreset) => void;
  affectionLevel?: number;
  affectionScore?: number;
  onOpenAffection?: () => void;
  onOpenMemoryCore?: () => void;
  isLiveVoiceCallActive: boolean;
  liveCallDuration?: number;
  onToggleLiveVoiceCall: () => void;
  isLiveVisionActive?: boolean;
  onToggleLiveVision?: () => void;
  renderEngine?: '3d-vrm' | '2d-live2d';
  onToggleRenderEngine?: (engine: '3d-vrm' | '2d-live2d') => void;
  isPlainMode?: boolean;
  onTogglePlainMode?: () => void;
  onOpenMenu: () => void;
  isMenuOpen?: boolean;
  isTalking: boolean;
  isListening: boolean;
  isThinking?: boolean;
  isPlayingMusic?: boolean;
  currentTrackTitle?: string;
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

export const CompanionHeader: React.FC<CompanionHeaderProps> = ({
  selectedCharacter,
  allCharacters = [],
  onSelectCharacter,
  affectionLevel = 1,
  affectionScore = 25,
  onOpenAffection,
  onOpenMemoryCore,
  isLiveVoiceCallActive,
  liveCallDuration = 0,
  onToggleLiveVoiceCall,
  isLiveVisionActive = false,
  onToggleLiveVision,
  renderEngine,
  onToggleRenderEngine,
  isPlainMode = false,
  onTogglePlainMode,
  onOpenMenu,
  isTalking,
  isListening,
  isThinking = false,
  isPlayingMusic = false,
  currentTrackTitle,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const charName = selectedCharacter?.name || 'AI Companion';
  const initialLetter = charName.charAt(0);
  const hairColor = selectedCharacter?.appearance?.hairColor || '#ec4899';

  return (
    <header className="absolute top-0 inset-x-0 p-2.5 sm:p-4 flex items-center justify-between z-30 pointer-events-none gap-2">
      {/* Left: Companion Persona Selector */}
      <div className="relative pointer-events-auto flex-shrink-0">
        <button
          onClick={() => setShowDropdown((prev) => !prev)}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/10 text-white transition-all shadow-lg active:scale-95 cursor-pointer max-w-[140px] sm:max-w-none"
        >
          {/* Avatar Ring */}
          <div
            className="w-7 h-7 rounded-full border-2 border-white/40 flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0"
            style={{ backgroundColor: hairColor }}
          >
            {initialLetter}
          </div>

          <div className="flex flex-col text-left min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white tracking-wide truncate max-w-[70px] sm:max-w-[110px]">{charName}</span>
              <ChevronDown className="w-3 h-3 text-white/50 flex-shrink-0" />
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isLiveVoiceCallActive
                    ? 'bg-rose-500 animate-ping'
                    : isTalking
                    ? 'bg-cyan-400 animate-pulse'
                    : isListening
                    ? 'bg-pink-400 animate-pulse'
                    : isThinking
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-white/60 font-medium truncate max-w-[65px] sm:max-w-[100px]">
                {isLiveVoiceCallActive
                  ? `${formatCallDuration(liveCallDuration)}`
                  : isTalking
                  ? 'Speaking'
                  : isListening
                  ? 'Listening'
                  : isThinking
                  ? 'Thinking'
                  : isPlayingMusic && currentTrackTitle
                  ? 'Music'
                  : 'Online'}
              </span>
            </div>
          </div>
        </button>

        {/* Quick Dropdown Persona Roster */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute left-0 top-full mt-2 w-56 sm:w-64 p-2 rounded-2xl bg-black/90 backdrop-blur-2xl border border-white/15 shadow-2xl z-50 flex flex-col gap-1"
            >
              <div className="px-2.5 py-1 text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Select AI Companion
              </div>
              {allCharacters.map((char) => (
                <button
                  key={char?.id || Math.random().toString()}
                  onClick={() => {
                    if (char) onSelectCharacter(char);
                    setShowDropdown(false);
                  }}
                  className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                    selectedCharacter?.id === char?.id
                      ? 'bg-pink-500/20 text-white font-bold border border-pink-500/40'
                      : 'hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0"
                    style={{ backgroundColor: char?.appearance?.hairColor || '#ec4899' }}
                  />
                  <div className="truncate">
                    <div className="text-xs font-semibold">{char?.name || 'Companion'}</div>
                    <div className="text-[9px] text-white/40 truncate">{char?.title || ''}</div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto flex-shrink-0">
        {/* Memory Core Pill */}
        {onOpenMemoryCore && (
          <button
            onClick={onOpenMemoryCore}
            title="Neural Memory Core (Long-term Memories)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-cyan-500/30 text-cyan-300 text-xs font-medium transition shadow-lg active:scale-95 cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="font-mono text-[11px] hidden md:inline">Memory</span>
          </button>
        )}

        {/* Affection Bond Badge */}
        {onOpenAffection && (
          <button
            onClick={onOpenAffection}
            title="Neural Bond & Affection"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-pink-500/30 text-pink-300 text-xs font-medium transition shadow-lg active:scale-95 cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-400 flex-shrink-0" />
            <span className="font-bold text-xs">Lv.{affectionLevel}</span>
            <span className="text-[10px] text-pink-300/60 font-mono hidden md:inline">({affectionScore}%)</span>
          </button>
        )}

        {/* 3D vs 2.5D Mode Quick Pill (Desktop/Tablet) */}
        {renderEngine && onToggleRenderEngine && (
          <div className="hidden lg:flex items-center p-0.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10">
            <button
              onClick={() => onToggleRenderEngine('3d-vrm')}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
                renderEngine === '3d-vrm'
                  ? 'bg-cyan-500 text-black font-bold shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D</span>
            </button>
            <button
              onClick={() => onToggleRenderEngine('2d-live2d')}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
                renderEngine === '2d-live2d'
                  ? 'bg-pink-500 text-white font-bold shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>2.5D</span>
            </button>
          </div>
        )}

        {/* 1-Tap Live Camera & Vision Share Toggle */}
        {onToggleLiveVision && (
          <button
            onClick={onToggleLiveVision}
            title={isLiveVisionActive ? 'Turn Off Live Camera' : '1-Tap Live Camera (Share View)'}
            className={`p-2 rounded-2xl backdrop-blur-xl border transition-all shadow-lg active:scale-95 cursor-pointer ${
              isLiveVisionActive
                ? 'bg-cyan-500 text-black border-cyan-300 font-bold shadow-cyan-500/40 ring-2 ring-cyan-400/50'
                : 'bg-black/60 hover:bg-black/80 text-cyan-300 hover:text-white border-cyan-500/30 shadow-cyan-950/30'
            }`}
          >
            {isLiveVisionActive ? <Video className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Plain / Zen View Toggle */}
        {onTogglePlainMode && (
          <button
            onClick={onTogglePlainMode}
            title={isPlainMode ? 'Show Full Interface' : 'Zen View (Hide UI)'}
            className={`p-2 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/10 transition shadow-lg active:scale-95 cursor-pointer ${
              isPlainMode ? 'text-cyan-300 border-cyan-400/50' : 'text-white/70 hover:text-white'
            }`}
          >
            {isPlainMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Live Voice Call Button + Duration Counter */}
        <button
          onClick={onToggleLiveVoiceCall}
          title={isLiveVoiceCallActive ? 'End Live Voice Call' : 'Start Live Voice Call'}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer flex-shrink-0 ${
            isLiveVoiceCallActive
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-rose-500/40 border border-red-400/50'
              : 'bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-cyan-400/40 text-cyan-300 hover:text-white shadow-cyan-500/20'
          }`}
        >
          {isLiveVoiceCallActive ? (
            <>
              <PhoneOff className="w-3.5 h-3.5 text-white flex-shrink-0" />
              <span className="hidden sm:inline">End</span>
              <span className="bg-black/40 px-1.5 py-0.5 rounded-md text-[10px] font-mono tracking-wider text-rose-100 border border-white/20">
                {formatCallDuration(liveCallDuration)}
              </span>
            </>
          ) : (
            <>
              <Phone className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="hidden sm:inline">Call</span>
            </>
          )}
        </button>

        {/* Unified Settings / Menu Drawer Button */}
        <button
          onClick={onOpenMenu}
          title="Studio Settings & Features"
          className="p-2 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/10 text-white/80 hover:text-white transition shadow-lg active:scale-95 cursor-pointer flex-shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
