import React from 'react';
import { Download, X, Heart, Sparkles } from 'lucide-react';
import { CharacterPreset, EmotionType } from '../types';
import { motion } from 'motion/react';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterPreset;
  emotion: EmotionType;
  imageDateUrl: string | null;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  isOpen,
  onClose,
  character,
  emotion,
  imageDateUrl,
}) => {
  if (!isOpen || !imageDateUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageDateUrl;
    const nameSlug = character?.name ? character.name.split(' ')[0] : 'Companion';
    a.download = `${nameSlug}_Polaroid_${Date.now()}.png`;
    a.click();
  };

  return (
    <div
      id="snapshot-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#0a0a0a] rounded-3xl p-5 shadow-2xl text-[#e5e5e5] border border-white/15 flex flex-col items-center"
      >
        {/* Photo Image Frame */}
        <div className="relative w-full aspect-[4/5] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-inner flex items-center justify-center">
          <img
            src={imageDateUrl}
            alt="Anime Waifu Capture"
            className="w-full h-full object-cover"
          />
          {/* Watermark Tag */}
          <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider border border-white/10 flex items-center gap-1.5 shadow-md">
            <Heart className="w-3 h-3 text-white/80" />
            <span>{character?.name ? character.name.split(' ')[0] : 'Companion'}</span>
          </div>
        </div>

        {/* Caption & Metadata */}
        <div className="w-full mt-4 text-center">
          <div className="font-serif italic text-base text-white/90 leading-snug">
            "{character?.signatureCatchphrase || 'Always by your side.'}"
          </div>
          <div className="text-[10px] text-white/40 font-mono uppercase tracking-widest mt-1.5">
            {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })} • MOOD: {emotion}
          </div>
        </div>

        {/* Actions */}
        <div className="w-full mt-5 flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-mono uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer"
          >
            Dismiss
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-2.5 bg-white text-black hover:bg-white/90 font-bold uppercase tracking-widest text-xs rounded-xl transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Image</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
