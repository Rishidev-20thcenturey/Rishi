import React from 'react';
import { CustomizationSettings, BackgroundScene, CharacterPreset } from '../types';
import { BACKGROUND_SCENES } from '../data/sceneries';
import { X, Sparkles, Palette, Layers, Image as ImageIcon, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface WardrobeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customization: CustomizationSettings;
  onChangeCustomization: (updated: CustomizationSettings) => void;
  selectedBackground: BackgroundScene;
  onSelectBackground: (bg: BackgroundScene) => void;
  activeCharacter: CharacterPreset;
}

const HAIR_COLORS = [
  { label: 'Charcoal Slate', hex: '#475569' },
  { label: 'Cyber Cyan', hex: '#38bdf8' },
  { label: 'Sakura Pink', hex: '#f43f5e' },
  { label: 'Silky Violet', hex: '#6366f1' },
  { label: 'Honey Blonde', hex: '#fb923c' },
  { label: 'Emerald Jade', hex: '#10b981' },
  { label: 'Silver White', hex: '#cbd5e1' },
  { label: 'Midnight Obsidian', hex: '#1e1b4b' },
  { label: 'Crimson Red', hex: '#e11d48' },
];

const EYE_COLORS = [
  { label: 'Amethyst Purple', hex: '#7c3aed' },
  { label: 'Deep Ocean', hex: '#0284c7' },
  { label: 'Amber Gold', hex: '#fbbf24' },
  { label: 'Violet Glow', hex: '#a855f7' },
  { label: 'Ruby Rose', hex: '#ec4899' },
  { label: 'Emerald Green', hex: '#059669' },
  { label: 'Obsidian Grey', hex: '#475569' },
];

const HAIR_STYLES: { id: CustomizationSettings['hairStyle']; label: string }[] = [
  { id: 'long', label: 'Flowing Long' },
  { id: 'twintails', label: 'Twin Tails' },
  { id: 'bob', label: 'Cute Bob' },
  { id: 'ponytail', label: 'High Ponytail' },
];

const OUTFITS: { id: CustomizationSettings['outfit']; label: string; desc: string }[] = [
  { id: 'blazer', label: 'School Blazer', desc: 'Tan blazer, cream knit vest & red tie' },
  { id: 'school', label: 'Sailor Uniform', desc: 'School sailor collar & red tie' },
  { id: 'maid', label: 'Maid Uniform', desc: 'Frilled apron & classic ribbons' },
  { id: 'cyber', label: 'Cyber Suit', desc: 'Neon glowing circuitry' },
  { id: 'shrine', label: 'Miko Robes', desc: 'Traditional red & white shrine maiden' },
  { id: 'casual', label: 'Cozy Knit', desc: 'Soft oversized knit sweater' },
];

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  isOpen,
  onClose,
  customization,
  onChangeCustomization,
  selectedBackground,
  onSelectBackground,
  activeCharacter,
}) => {
  if (!isOpen) return null;

  const toggleAccessory = (key: keyof CustomizationSettings['accessories']) => {
    onChangeCustomization({
      ...customization,
      accessories: {
        ...customization.accessories,
        [key]: !customization.accessories[key],
      },
    });
  };

  return (
    <div
      id="wardrobe-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl text-[#e5e5e5] my-8 max-h-[88vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/5 text-white border border-white/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-medium tracking-tight text-white">Trait & Environment Matrix</h2>
              <p className="text-xs text-white/40 font-mono">Configure appearance parameters & scene backdrop</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Hair Style & Color */}
        <div className="space-y-4 mb-6">
          <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
            <Palette className="w-3.5 h-3.5" /> Hair Configuration
          </h3>

          {/* Hair Styles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {HAIR_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => onChangeCustomization({ ...customization, hairStyle: style.id })}
                className={`py-2.5 px-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  customization.hairStyle === style.id
                    ? 'bg-white text-black font-semibold border-white shadow-md'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>

          {/* Hair Color Palette */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block mb-2">Pigment Palette</span>
            <div className="flex items-center gap-2.5 flex-wrap">
              {HAIR_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => onChangeCustomization({ ...customization, hairColor: c.hex })}
                  title={c.label}
                  className={`w-8 h-8 rounded-full border-2 transition-transform transform active:scale-90 flex items-center justify-center cursor-pointer ${
                    customization.hairColor === c.hex
                      ? 'border-white scale-110 shadow-lg'
                      : 'border-white/20 hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {customization.hairColor === c.hex && <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Eye Color */}
        <div className="space-y-3 mb-6">
          <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
            <Palette className="w-3.5 h-3.5" /> Iris Spectral Color
          </h3>
          <div className="flex items-center gap-2.5 flex-wrap">
            {EYE_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => onChangeCustomization({ ...customization, eyeColor: c.hex })}
                title={c.label}
                className={`w-8 h-8 rounded-full border-2 transition-transform transform active:scale-90 flex items-center justify-center cursor-pointer ${
                  customization.eyeColor === c.hex
                    ? 'border-white scale-110 shadow-lg'
                    : 'border-white/20 hover:scale-105 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {customization.eyeColor === c.hex && <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Outfits */}
        <div className="space-y-3 mb-6">
          <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" /> Attire & Uniform
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {OUTFITS.map((outfit) => (
              <button
                key={outfit.id}
                onClick={() => onChangeCustomization({ ...customization, outfit: outfit.id })}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  customization.outfit === outfit.id
                    ? 'bg-white/15 border-white/30 text-white shadow-md'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'
                }`}
              >
                <div className="font-medium text-sm text-white">{outfit.label}</div>
                <div className="text-xs text-white/40 mt-0.5">{outfit.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 4: Accessories */}
        <div className="space-y-3 mb-6">
          <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Adornments & Neural Addons
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: 'whiteBarrettes', label: '🤍 Crossed Barrettes' },
              { key: 'catEars', label: '🐱 Cat Ears' },
              { key: 'ribbon', label: '🎀 Hair Ribbon' },
              { key: 'hairpin', label: '🌸 Sakura Pin' },
              { key: 'cyberClips', label: '⚡ Cyber Clips' },
              { key: 'glasses', label: '👓 Spectacles' },
              { key: 'choker', label: '🔔 Bell Choker' },
            ].map((acc) => {
              const active = customization.accessories[acc.key as keyof CustomizationSettings['accessories']];
              return (
                <button
                  key={acc.key}
                  onClick={() => toggleAccessory(acc.key as keyof CustomizationSettings['accessories'])}
                  className={`py-2.5 px-3 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between ${
                    active
                      ? 'bg-white/15 border-white/30 text-white font-medium'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/50'
                  }`}
                >
                  <span>{acc.label}</span>
                  {active && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 5: Background Scenery */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5" /> Atmosphere & Room Scenery
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {BACKGROUND_SCENES.map((bg) => (
              <button
                key={bg.id}
                onClick={() => onSelectBackground(bg)}
                className={`relative overflow-hidden p-3 rounded-2xl border text-left transition-all cursor-pointer flex gap-3 items-center ${
                  selectedBackground.id === bg.id
                    ? 'bg-white/15 border-pink-400 text-white shadow-lg shadow-pink-500/10 ring-1 ring-pink-400/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'
                }`}
              >
                {bg.imageUrl ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-white/20 relative">
                    <img
                      src={bg.imageUrl}
                      alt={bg.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className={`w-14 h-14 rounded-xl flex-shrink-0 border border-white/20 bg-gradient-to-br ${bg.bgGradient} flex items-center justify-center text-white/40`}>
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-white truncate">{bg.name}</div>
                  <div className="text-[11px] text-white/50 line-clamp-2 mt-0.5 leading-tight">{bg.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Done Button */}
        <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-white/90 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            Apply Configuration
          </button>
        </div>
      </motion.div>
    </div>
  );
};
