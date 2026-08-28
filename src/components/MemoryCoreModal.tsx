import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  X,
  Plus,
  Trash2,
  Check,
  User,
  Tag,
  Zap,
  Info,
  ShieldCheck,
  MessageSquareHeart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CharacterPreset, UserMemoryProfile, MemoryCategory } from '../types';
import { memoryEngine } from '../services/memoryEngine';

interface MemoryCoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterPreset;
  memoryProfile: UserMemoryProfile;
  onUpdateMemoryProfile: (newProfile: UserMemoryProfile) => void;
}

export const MemoryCoreModal: React.FC<MemoryCoreModalProps> = ({
  isOpen,
  onClose,
  character,
  memoryProfile,
  onUpdateMemoryProfile,
}) => {
  const [userName, setUserName] = useState(memoryProfile.userName || '');
  const [userNickname, setUserNickname] = useState(memoryProfile.userNickname || 'Senpai');
  const [customNotes, setCustomNotes] = useState(memoryProfile.customNotes || '');
  const [newFactText, setNewFactText] = useState('');
  const [newFactCategory, setNewFactCategory] = useState<MemoryCategory>('interest');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfileInfo = () => {
    memoryEngine.updateUserInfo(userName, userNickname, customNotes);
    onUpdateMemoryProfile(memoryEngine.getProfile());
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const handleToggleInfinite = () => {
    const nextState = !memoryProfile.infiniteMemoryEnabled;
    memoryEngine.setInfiniteMemoryEnabled(nextState);
    onUpdateMemoryProfile(memoryEngine.getProfile());
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactText.trim()) return;
    const success = memoryEngine.addMemory(newFactText.trim(), newFactCategory);
    if (success) {
      onUpdateMemoryProfile(memoryEngine.getProfile());
      setNewFactText('');
    }
  };

  const handleDeleteMemory = (id: string) => {
    memoryEngine.removeMemory(id);
    onUpdateMemoryProfile(memoryEngine.getProfile());
  };

  const handleClearAll = () => {
    if (window.confirm(`Clear all long-term memories remembered by ${character.name}?`)) {
      memoryEngine.clearAllMemories();
      onUpdateMemoryProfile(memoryEngine.getProfile());
    }
  };

  const getCategoryBadge = (cat: MemoryCategory) => {
    switch (cat) {
      case 'identity':
        return { label: 'Identity', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
      case 'interest':
        return { label: 'Interest', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'preference':
        return { label: 'Preference', bg: 'bg-pink-500/20 text-pink-300 border-pink-500/30' };
      case 'experience':
        return { label: 'Milestone', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      default:
        return { label: 'Custom', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
  };

  return (
    <div
      id="memory-core-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl cyber-panel-glow border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-mono tracking-wider text-cyan-200 uppercase">
                  NEURAL MEMORY CORE
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  INFINITE TIER
                </span>
              </div>
              <p className="text-xs text-cyan-300/60 font-mono">
                Long-Term Synapse Bank with {character?.name || 'Companion'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-cyan-950/40 rounded-xl text-cyan-300/60 hover:text-cyan-200 transition cursor-pointer border border-transparent hover:border-cyan-500/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Feature Status Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Infinite Free Tier Memory System</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              </div>
              <p className="text-[11px] text-cyan-200/60">
                Remembers your personal life, habits, & inside jokes forever across all sessions.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleInfinite}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition border cursor-pointer ${
              memoryProfile.infiniteMemoryEnabled
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/30'
                : 'bg-white/10 text-white/60 border-white/10'
            }`}
          >
            {memoryProfile.infiniteMemoryEnabled ? 'ACTIVE: ON' : 'DISABLED'}
          </button>
        </div>

        {/* Section 1: User Identity & How Kira Calls You */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <label className="text-xs font-mono font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Identity & How {character.name} Addresses You
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-white/50 block mb-1">Your Preferred Name:</span>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Alexander, Ren, Leo"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition"
              />
            </div>

            <div>
              <span className="text-[11px] text-white/50 block mb-1">Nickname / Honorific:</span>
              <input
                type="text"
                value={userNickname}
                onChange={(e) => setUserNickname(e.target.value)}
                placeholder="e.g. Senpai, Master, Darling"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition"
              />
            </div>
          </div>

          <div>
            <span className="text-[11px] text-white/50 block mb-1">Special Companion Instructions / Quirks:</span>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Likes when Kira acts a little playful/tsundere, studying for finals..."
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-white/40">Saves locally to your browser profile</span>
            <button
              onClick={handleSaveProfileInfo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600/30 hover:bg-pink-600/50 border border-pink-500/40 text-pink-200 text-xs font-semibold transition cursor-pointer"
            >
              {isSavedNotice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{isSavedNotice ? 'Saved!' : 'Save Identity'}</span>
            </button>
          </div>
        </div>

        {/* Section 2: Permanent Memory Bank */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Long-Term Memories ({memoryProfile.memories.length})
            </label>
            {memoryProfile.memories.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[10px] text-red-400/80 hover:text-red-300 font-mono underline transition cursor-pointer"
              >
                Clear All Memories
              </button>
            )}
          </div>

          {/* Add Manual Memory Form */}
          <form onSubmit={handleAddMemory} className="flex gap-2">
            <select
              value={newFactCategory}
              onChange={(e) => setNewFactCategory(e.target.value as MemoryCategory)}
              className="bg-black/50 border border-white/15 rounded-xl px-2 py-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
            >
              <option value="interest">Interest</option>
              <option value="preference">Preference</option>
              <option value="identity">Identity</option>
              <option value="experience">Milestone</option>
              <option value="custom">Custom</option>
            </select>

            <input
              type="text"
              value={newFactText}
              onChange={(e) => setNewFactText(e.target.value)}
              placeholder="Add fact: e.g. 'I work late hours', 'Favorite anime is Steins;Gate'..."
              className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition"
            />

            <button
              type="submit"
              disabled={!newFactText.trim()}
              className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs flex items-center justify-center transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Memory List */}
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {memoryProfile.memories.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl text-xs text-white/40 font-mono">
                No custom memories stored yet. As you talk, Kira will automatically remember key facts!
              </div>
            ) : (
              memoryProfile.memories.map((mem) => {
                const badge = getCategoryBadge(mem.category);
                return (
                  <div
                    key={mem.id}
                    className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-md border flex-shrink-0 ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-white/90 truncate font-medium">{mem.fact}</span>
                    </div>

                    <button
                      onClick={() => handleDeleteMemory(mem.id)}
                      title="Forget this memory"
                      className="p-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Technical Metrics & Free-Tier Optimization Stats */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-white/50 gap-2">
          <div className="flex items-center gap-1.5 text-cyan-300/80">
            <Info className="w-3.5 h-3.5" />
            <span>2-Layer Sliding Memory Window (~65 Tokens / Zero Free-Tier Quota Drain)</span>
          </div>
          <div>Total Exchanges: {memoryProfile.totalConversations}</div>
        </div>
      </motion.div>
    </div>
  );
};
