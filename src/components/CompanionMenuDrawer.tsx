import React, { useRef } from 'react';
import {
  X,
  Box,
  Sparkles,
  Upload,
  RotateCcw,
  Sliders,
  Music,
  Camera,
  Shirt,
  Heart,
  Brain,
  Volume2,
  VolumeX,
  Users,
  Image as ImageIcon,
  Wand2,
  Eye,
  EyeOff,
  Phone,
  PhoneOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CharacterPreset } from '../types';

interface CompanionMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCharacter: CharacterPreset;
  allCharacters?: CharacterPreset[];
  onSelectCharacter: (char: CharacterPreset) => void;
  renderEngine: '3d-vrm' | '2d-live2d';
  onToggleRenderEngine: (engine: '3d-vrm' | '2d-live2d') => void;
  activeStance?: 'idol' | 'shy' | 'playful' | 'curious';
  onSelectStance?: (stance: 'idol' | 'shy' | 'playful' | 'curious') => void;
  onUploadVrmFile?: (file: File) => void;
  onResetCamera?: () => void;
  isCustomVRM?: boolean;
  onOpenWardrobe: () => void;
  onOpenVoiceSettings: () => void;
  onOpenMusic: () => void;
  onOpenVision: () => void;
  onOpenAffection: () => void;
  onOpenMemoryCore: () => void;
  isPlainMode?: boolean;
  onTogglePlainMode?: () => void;
  isLiveVoiceCallActive?: boolean;
  onToggleLiveVoiceCall?: () => void;
}

export const CompanionMenuDrawer: React.FC<CompanionMenuDrawerProps> = ({
  isOpen,
  onClose,
  selectedCharacter,
  allCharacters = [],
  onSelectCharacter,
  renderEngine,
  onToggleRenderEngine,
  activeStance = 'idol',
  onSelectStance,
  onUploadVrmFile,
  onResetCamera,
  isCustomVRM = false,
  onOpenWardrobe,
  onOpenVoiceSettings,
  onOpenMusic,
  onOpenVision,
  onOpenAffection,
  onOpenMemoryCore,
  isPlainMode = false,
  onTogglePlainMode,
  isLiveVoiceCallActive = false,
  onToggleLiveVoiceCall,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadVrmFile) {
      onUploadVrmFile(file);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-full max-w-sm sm:max-w-md h-full bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 text-white shadow-2xl p-4 sm:p-6 overflow-y-auto flex flex-col gap-5 z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Companion Controls</h3>
                  <p className="text-[11px] text-white/50">Customization & Studio Settings</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hidden VRM File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".vrm,.glb,.gltf"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Section 1: Character Roster */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Select Persona
              </label>
              <div className="grid grid-cols-2 gap-2">
                {allCharacters.map((char) => (
                  <button
                    key={char?.id || Math.random().toString()}
                    onClick={() => {
                      if (char) onSelectCharacter(char);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-left transition border cursor-pointer ${
                      selectedCharacter?.id === char?.id
                        ? 'bg-pink-500/20 border-pink-500 text-white shadow-sm shadow-pink-500/20'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-white/40 flex-shrink-0"
                      style={{ backgroundColor: char?.appearance?.hairColor || '#ec4899' }}
                    />
                    <div className="truncate">
                      <div className="font-semibold leading-tight">{char?.name || 'Companion'}</div>
                      <div className="text-[9px] text-white/40 truncate">{char?.title || ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: 3D / 2D Avatar Rendering */}
            <div className="flex flex-col gap-2 bg-white/5 rounded-2xl p-3 border border-white/10">
              <label className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5" />
                Avatar & 3D Stage
              </label>

              {/* Engine Switcher */}
              <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/10">
                <button
                  onClick={() => onToggleRenderEngine('3d-vrm')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    renderEngine === '3d-vrm'
                      ? 'bg-cyan-500 text-black font-bold shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>3D VRM</span>
                </button>
                <button
                  onClick={() => onToggleRenderEngine('2d-live2d')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    renderEngine === '2d-live2d'
                      ? 'bg-pink-500 text-white font-bold shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2.5D Canvas</span>
                </button>
              </div>

              {/* 3D Stance / Poses (Only in 3D Mode) */}
              {renderEngine === '3d-vrm' && onSelectStance && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[10px] text-white/50">Character Posture:</span>
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: 'idol', label: 'Idol' },
                        { id: 'shy', label: 'Shy' },
                        { id: 'playful', label: 'Play' },
                        { id: 'curious', label: 'Curious' },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onSelectStance(s.id)}
                        className={`py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                          activeStance === s.id
                            ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 font-bold'
                            : 'bg-black/30 hover:bg-black/50 text-white/60 border border-white/5'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Custom VRM & Reset View */}
              {renderEngine === '3d-vrm' && (
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 text-xs font-medium transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isCustomVRM ? 'Change .VRM File' : 'Upload Custom .VRM'}</span>
                  </button>

                  {onResetCamera && (
                    <button
                      onClick={onResetCamera}
                      title="Reset View Position"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Activities & Quick Modals */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                Companion Features
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* Wardrobe & Room */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenWardrobe();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition cursor-pointer group"
                >
                  <div className="p-2 rounded-lg bg-pink-500/20 text-pink-400 group-hover:scale-105 transition">
                    <Shirt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Wardrobe</div>
                    <div className="text-[10px] text-white/40">Outfit & Scenery</div>
                  </div>
                </button>

                {/* Voice Matrix */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenVoiceSettings();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition cursor-pointer group"
                >
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:scale-105 transition">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Voice Settings</div>
                    <div className="text-[10px] text-white/40">Gemini Voice & Speed</div>
                  </div>
                </button>

                {/* Music Player */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenMusic();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition cursor-pointer group"
                >
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:scale-105 transition">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Music Player</div>
                    <div className="text-[10px] text-white/40">Lo-Fi & Anime Jams</div>
                  </div>
                </button>

                {/* Camera Vision */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenVision();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition cursor-pointer group"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Vision AI</div>
                    <div className="text-[10px] text-white/40">Let her see you</div>
                  </div>
                </button>

                {/* Bond & Affection */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenAffection();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition cursor-pointer group"
                >
                  <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 group-hover:scale-105 transition">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Neural Bond</div>
                    <div className="text-[10px] text-white/40">Affection & Sync</div>
                  </div>
                </button>

                {/* Long-Term Memory Core */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenMemoryCore();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-left transition cursor-pointer group shadow-sm"
                >
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 group-hover:scale-105 transition">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-cyan-200">Memory Core</div>
                    <div className="text-[10px] text-cyan-300/60">Infinite Bank</div>
                  </div>
                </button>

                {/* Plain Mode Toggle */}
                {onTogglePlainMode && (
                  <button
                    onClick={() => {
                      onClose();
                      onTogglePlainMode();
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:scale-105 transition">
                      {isPlainMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{isPlainMode ? 'Exit Zen Mode' : 'Zen View'}</div>
                      <div className="text-[10px] text-white/40">Hide HUD overlay</div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Section 4: Live Call Quick Toggle */}
            {onToggleLiveVoiceCall && (
              <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    onClose();
                    onToggleLiveVoiceCall();
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    isLiveVoiceCallActive
                      ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-sm'
                      : 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/40 hover:to-blue-600/40 border-cyan-400/30 text-cyan-200'
                  }`}
                >
                  {isLiveVoiceCallActive ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4 text-cyan-400" />}
                  <span>{isLiveVoiceCallActive ? 'End Live Voice Call' : 'Start Live Voice Call'}</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
