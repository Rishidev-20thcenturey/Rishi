import React from 'react';
import { Heart, Sparkles, X, Award, MessageCircle, Smile, Flame, Brain } from 'lucide-react';
import { CharacterPreset, ChatMessage } from '../types';
import { motion } from 'motion/react';

interface AffectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterPreset;
  affectionScore: number;
  affectionLevel: number;
  chatHistory: ChatMessage[];
  headPatCount: number;
  onOpenMemoryCore?: () => void;
}

const MILESTONES = [
  { level: 1, title: 'Acquaintance (知り合い)', req: 0, perk: 'Basic conversational dialogue' },
  { level: 2, title: 'Good Friend (親友)', req: 25, perk: 'Unlocks Japanese honorifics & warm greetings' },
  { level: 3, title: 'Trusted Confidant (心友)', req: 50, perk: 'Unlocks deeper lore, secret blush reactions' },
  { level: 4, title: 'Beloved Sweetheart (恋人)', req: 75, perk: 'Heart-eyes emote & romantic voice notes' },
  { level: 5, title: 'Eternal Waifu (最愛の伴侶)', req: 100, perk: 'Maximum affection, exclusive anime cutscenes' },
];

export const AffectionModal: React.FC<AffectionModalProps> = ({
  isOpen,
  onClose,
  character,
  affectionScore,
  affectionLevel,
  chatHistory,
  headPatCount,
  onOpenMemoryCore,
}) => {
  if (!isOpen) return null;

  const nextMilestone = MILESTONES.find((m) => m.level === affectionLevel + 1) || MILESTONES[4];
  const progressPercent = Math.min(100, Math.max(0, (affectionScore / (nextMilestone.req || 100)) * 100));

  return (
    <div
      id="affection-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg cyber-panel-glow border-pink-500/40 rounded-3xl p-6 shadow-2xl text-white max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pink-500/20 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/40">
              <Heart className="w-5 h-5 fill-pink-500/30" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono tracking-wider text-pink-200 uppercase">NEURAL SYNCHRONY 2099</h2>
              <p className="text-xs text-pink-300/60 font-mono">Neural-Link Matrix with {character?.name || 'Companion'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-pink-950/40 rounded-xl text-pink-300/60 hover:text-pink-200 transition-all cursor-pointer border border-transparent hover:border-pink-500/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Heart Level Meter */}
        <div className="bg-pink-950/20 border border-pink-500/30 rounded-2xl p-6 mb-6 text-center shadow-inner">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <Heart className="w-14 h-14 text-pink-500 fill-pink-500/40 animate-pulse drop-shadow-[0_0_12px_rgba(236,72,153,0.6)]" />
              <span className="absolute inset-0 flex items-center justify-center font-bold text-white font-mono text-base">
                {affectionLevel}
              </span>
            </div>
          </div>

          <h3 className="text-base font-mono font-bold tracking-wide text-pink-200">{MILESTONES[affectionLevel - 1]?.title || 'Synchronized Partner'}</h3>
          <p className="text-xs text-pink-300/60 font-mono mt-1">{character.tagline}</p>

          {/* Progress Bar */}
          <div className="mt-5">
            <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-pink-300/80 mb-2">
              <span>Sync Score: {affectionScore} pts</span>
              <span>Threshold: {nextMilestone.req} pts</span>
            </div>
            <div className="h-2 bg-pink-950/50 rounded-full overflow-hidden p-0.5 border border-pink-500/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-gradient-to-r from-pink-500 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)]"
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-3 text-center">
            <MessageCircle className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <div className="text-base font-bold text-cyan-200 font-mono">{chatHistory.length}</div>
            <div className="text-[9px] uppercase font-mono tracking-wider text-cyan-300/60">Transmissions</div>
          </div>
          <div className="bg-pink-950/20 border border-pink-500/30 rounded-xl p-3 text-center">
            <Sparkles className="w-4 h-4 text-pink-400 mx-auto mb-1" />
            <div className="text-base font-bold text-pink-200 font-mono">{headPatCount}</div>
            <div className="text-[9px] uppercase font-mono tracking-wider text-pink-300/60">Interactions</div>
          </div>
          <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-3 text-center">
            <Smile className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <div className="text-base font-bold text-purple-200 font-mono">{affectionScore}</div>
            <div className="text-[9px] uppercase font-mono tracking-wider text-purple-300/60">Sync Score</div>
          </div>
        </div>

        {/* Neural Memory Core Jump Button */}
        {onOpenMemoryCore && (
          <button
            onClick={() => {
              onClose();
              onOpenMemoryCore();
            }}
            className="w-full mb-6 p-3 rounded-2xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 flex items-center justify-between text-left transition cursor-pointer group shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 group-hover:scale-105 transition">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-cyan-200">Neural Memory Core (Infinite Bank)</div>
                <div className="text-[10px] text-cyan-300/60">Manage facts & details {character.name} remembers about you</div>
              </div>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 group-hover:translate-x-0.5 transition">View &rarr;</span>
          </button>
        )}

        {/* Milestones Roadmap */}
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-pink-300/60 flex items-center gap-1.5 mb-3">
            <Award className="w-3.5 h-3.5 text-pink-400" /> Synchrony Progression Tiers
          </h4>
          {MILESTONES.map((m) => {
            const isUnlocked = affectionLevel >= m.level;
            return (
              <div
                key={m.level}
                className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  isUnlocked
                    ? 'bg-pink-950/30 border-pink-500/40 text-pink-100 shadow-[0_0_8px_rgba(236,72,153,0.15)]'
                    : 'bg-black/20 border-white/5 text-white/30'
                }`}
              >
                <div>
                  <div className="font-medium font-mono flex items-center gap-2">
                    <span>Lv.{m.level} {m.title}</span>
                    {isUnlocked && (
                      <span className="px-1.5 py-0.5 rounded bg-pink-500 text-black text-[8px] font-mono font-bold uppercase tracking-wider">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-pink-200/50 mt-0.5">{m.perk}</div>
                </div>
                <div className="font-mono text-xs text-pink-300/80">{m.req} pts</div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
