import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, Mic, Sparkles, Radio, Check, Play, Sliders, Waves, Key, ShieldCheck } from 'lucide-react';
import { CharacterPreset, VoiceSettings } from '../types';
import { audioEngine } from '../services/audioEngine';
import { requestGeminiTTS } from '../services/geminiService';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCharacter: CharacterPreset;
  voiceSettings: VoiceSettings;
  onChangeVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  isLiveVoiceCallActive: boolean;
  onToggleLiveVoiceCall: () => void;
}

const PREBUILT_VOICES = [
  {
    id: 'Kore',
    name: 'Kore (コエ)',
    description: 'Sweet, bright, and charming anime idol tone. Highly expressive.',
    vibe: 'Idol / Sweet',
    previewText: 'Master! I am always here to keep you company inside your capsule!',
  },
  {
    id: 'Aoede',
    name: 'Aoede (アオエデ)',
    description: 'Gentle, soothing, elegant, and melodic. Perfect for calm conversations.',
    vibe: 'Mature / Gentle',
    previewText: 'Welcome home. May your heart find peaceful warmth with me today.',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr (ゼファー)',
    description: 'Energetic, sassy, playful, and sharp tsundere personality.',
    vibe: 'Tsundere / Peppy',
    previewText: "H-Hmph! It is not like I was waiting for you or anything, baka!",
  },
  {
    id: 'Puck',
    name: 'Puck (パック)',
    description: 'Bubbly, youthful, cheerful kouhai friend vibe.',
    vibe: 'Bubbly Kouhai',
    previewText: 'Senpai! Look at me! Let us have the most wonderful time today!',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir (フェンリル)',
    description: 'Composed, deep, calm, and reassuring tone.',
    vibe: 'Cool / Calm',
    previewText: 'Systems nominal. I am standing by for your instructions.',
  },
];

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  selectedCharacter,
  voiceSettings,
  onChangeVoiceSettings,
  isLiveVoiceCallActive,
  onToggleLiveVoiceCall,
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('GEMINI_USER_API_KEY') || '';
    setApiKeyInput(saved);
    setIsKeySaved(Boolean(saved));
  }, [isOpen]);

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('GEMINI_USER_API_KEY', trimmed);
      setIsKeySaved(true);
    } else {
      localStorage.removeItem('GEMINI_USER_API_KEY');
      setIsKeySaved(false);
    }
  };

  const handleTestVoice = async (voiceId: string, previewText: string) => {
    setIsPlayingPreview(voiceId);
    audioEngine.playSoundEffect('giggle');

    try {
      const res = await requestGeminiTTS(previewText, voiceId, 'happy');
      if (res.audioBase64) {
        const buffer = await audioEngine.decodeBase64ToBuffer(res.audioBase64, res.sampleRate);
        if (buffer) {
          audioEngine.playAudioBuffer(
            buffer,
            () => {},
            () => setIsPlayingPreview(null)
          );
          return;
        }
      }

      // Fallback
      audioEngine.speakWithWebSpeech(
        previewText,
        voiceSettings.pitch,
        voiceSettings.speed,
        () => {},
        () => setIsPlayingPreview(null)
      );
    } catch {
      setIsPlayingPreview(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="voice-settings-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-xl cyber-panel-glow border-cyan-500/40 rounded-3xl p-6 text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  <span className="font-mono text-cyan-200">AI VOICE MATRIX 2099</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                    24kHz HD
                  </span>
                </h2>
                <p className="text-xs text-cyan-300/60 font-mono">
                  Configure neural voice models, acoustic filtering, and hands-free call interaction.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-xl transition cursor-pointer border border-transparent hover:border-cyan-500/30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto pr-1 space-y-6 scrollbar-thin">
            {/* Custom Gemini API Key Card for Netlify & Mobile */}
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-cyan-200 flex items-center gap-1.5 font-mono">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Google Gemini API Key (Netlify & Mobile)</span>
                </label>
                {isKeySaved ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    Key Active
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-cyan-300/40">
                    Using Host Default
                  </span>
                )}
              </div>
              <p className="text-xs text-cyan-200/60 font-mono">
                If you export to Netlify or run on mobile, paste your free Gemini API key here so she can speak and reason directly from your browser!
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste AI Studio API Key (AIzaSy...)"
                  className="flex-1 bg-black/60 border border-cyan-500/30 rounded-xl px-3.5 py-2 text-xs text-cyan-100 placeholder-cyan-500/30 focus:outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer font-mono shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                >
                  {isKeySaved ? 'Updated' : 'Save Key'}
                </button>
              </div>
            </div>

            {/* Real-time Hands-Free Call Mode Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-2xl border ${
                    isLiveVoiceCallActive
                      ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_15px_#22d3ee]'
                      : 'bg-white/5 text-white/70 border-white/10'
                  }`}
                >
                  <Radio className={`w-5 h-5 ${isLiveVoiceCallActive ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Hands-Free Real-Time Voice Call</span>
                    {isLiveVoiceCallActive && (
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 animate-pulse">
                        LIVE CALL
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-white/60">
                    Seamless 2-way live talk. Waifu automatically listens, speaks, and replies.
                  </p>
                </div>
              </div>
              <button
                onClick={onToggleLiveVoiceCall}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 whitespace-nowrap ${
                  isLiveVoiceCallActive
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-lg shadow-cyan-500/20'
                }`}
              >
                {isLiveVoiceCallActive ? 'End Live Call' : 'Start Live Call'}
              </button>
            </div>

            {/* Voice Model Selection Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5 font-mono">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Select Studio AI Voice Model</span>
                </label>
                <span className="text-[11px] text-white/40 font-mono">
                  Active: {voiceSettings.geminiVoice}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PREBUILT_VOICES.map((v) => {
                  const isSelected = voiceSettings.geminiVoice === v.id;
                  const isPreviewing = isPlayingPreview === v.id;

                  return (
                    <div
                      key={v.id}
                      onClick={() => onChangeVoiceSettings({ geminiVoice: v.id })}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-white/10 border-cyan-400/80 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{v.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white/70 font-mono">
                              {v.vibe}
                            </span>
                          </div>
                          <p className="text-xs text-white/60 mt-1 leading-snug">
                            {v.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-[10px] font-mono text-white/40">Studio 24kHz</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestVoice(v.id, v.previewText);
                          }}
                          disabled={isPreviewing}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white flex items-center gap-1.5 transition active:scale-95 cursor-pointer font-mono"
                        >
                          <Play className={`w-3 h-3 ${isPreviewing ? 'text-cyan-400 animate-spin' : ''}`} />
                          <span>{isPreviewing ? 'Testing...' : 'Test Voice'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vocal Customization Sliders */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/80 font-mono">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Fine-Tuning Acoustics</span>
              </div>

              {/* Pitch */}
              <div>
                <div className="flex justify-between text-xs text-white/70 mb-1.5">
                  <span>Voice Pitch / Sweetness</span>
                  <span className="font-mono text-cyan-400">{voiceSettings.pitch.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.05"
                  value={voiceSettings.pitch}
                  onChange={(e) => onChangeVoiceSettings({ pitch: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Speed */}
              <div>
                <div className="flex justify-between text-xs text-white/70 mb-1.5">
                  <span>Speaking Speed</span>
                  <span className="font-mono text-cyan-400">{voiceSettings.speed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.35"
                  step="0.05"
                  value={voiceSettings.speed}
                  onChange={(e) => onChangeVoiceSettings({ speed: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 mt-5 border-t border-white/10 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white text-black font-bold rounded-xl text-xs hover:bg-white/90 transition active:scale-95 cursor-pointer shadow-lg"
            >
              Apply Voice Matrix
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
