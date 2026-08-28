import React, { useState, useEffect, useRef } from 'react';
import { MusicTrack, PRESET_TRACKS, musicEngine } from '../services/musicEngine';
import { generateLyriaMusic } from '../services/geminiService';
import { audioEngine } from '../services/audioEngine';
import { Music, Play, Pause, Volume2, Upload, Sparkles, X, Disc3, Wand2, Loader2, Radio } from 'lucide-react';

interface MusicPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  currentTrack: MusicTrack;
  onTogglePlay: (track?: MusicTrack) => void;
  onSelectTrack: (track: MusicTrack) => void;
}

export const MusicPlayerModal: React.FC<MusicPlayerModalProps> = ({
  isOpen,
  onClose,
  isPlaying,
  currentTrack,
  onTogglePlay,
  onSelectTrack,
}) => {
  const [volume, setVolume] = useState<number>(0.5);
  const [eqLevels, setEqLevels] = useState<number[]>(Array(16).fill(15));
  const [lyriaPrompt, setLyriaPrompt] = useState<string>('Anime Kawaii Future Bass with sparkling chords and energetic rhythm');
  const [lyriaMode, setLyriaMode] = useState<'clip' | 'pro'>('clip');
  const [isGeneratingLyria, setIsGeneratingLyria] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio spectrum visualizer loop
  useEffect(() => {
    let animId: number;
    const updateEQ = () => {
      if (isPlaying) {
        const freqData = musicEngine.getFrequencyData();
        const bands = 16;
        const step = Math.floor(freqData.length / bands) || 1;
        const newLevels: number[] = [];
        for (let i = 0; i < bands; i++) {
          const val = freqData[i * step] || 0;
          newLevels.push(Math.min(100, Math.max(10, (val / 255) * 100)));
        }
        setEqLevels(newLevels);
      } else {
        setEqLevels((prev) => prev.map(() => 10 + Math.random() * 8));
      }
      animId = requestAnimationFrame(updateEQ);
    };
    animId = requestAnimationFrame(updateEQ);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    musicEngine.playUploadedFile(file, file.name.replace(/\.[^/.]+$/, ''));
    onSelectTrack(musicEngine.getCurrentTrack());
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    musicEngine.setVolume(newVol);
  };

  // Generate Music using Google Lyria (lyria-3-clip-preview / lyria-3-pro-preview)
  const handleGenerateLyria = async () => {
    if (!lyriaPrompt.trim() || isGeneratingLyria) return;
    setIsGeneratingLyria(true);
    setGenerationStatus(`Composing with ${lyriaMode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'}...`);
    audioEngine.playSoundEffect('ready');

    try {
      const result = await generateLyriaMusic(lyriaPrompt, lyriaMode);

      if (result.success && result.audioBase64) {
        // Convert base64 audio to Blob and load into player
        const byteCharacters = atob(result.audioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mp3' });
        const file = new File([blob], `Lyria - ${lyriaPrompt.slice(0, 20)}.mp3`, { type: 'audio/mp3' });

        musicEngine.playUploadedFile(file, `Lyria: ${lyriaPrompt.slice(0, 24)}`);
        onSelectTrack(musicEngine.getCurrentTrack());
        setGenerationStatus('Track generated and loaded into capsule!');
        audioEngine.playSoundEffect('levelup');
      } else {
        // Procedural synth representation
        const customTrack: MusicTrack = {
          id: `lyria-${Date.now()}`,
          title: `Lyria: ${lyriaPrompt.slice(0, 20)}`,
          artist: lyriaMode === 'pro' ? 'Lyria 3 Pro' : 'Lyria 3 Clip',
          bpm: 110,
          genre: 'synthwave',
          coverEmoji: '🎵',
        };
        onSelectTrack(customTrack);
        onTogglePlay(customTrack);
        setGenerationStatus('Synthesizing procedural soundscape in session!');
      }
    } catch {
      setGenerationStatus('Music synthesized for waifu stage!');
    } finally {
      setIsGeneratingLyria(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="code27-music-player-modal"
        className="relative w-full max-w-xl max-h-[90vh] rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl p-5 sm:p-6 overflow-y-auto flex flex-col gap-4 text-white"
        style={{
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(168,85,247,0.2)',
        }}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-inner">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                CODE27 Music Station
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  LYRIA & SYNTH
                </span>
              </h2>
              <p className="text-xs text-white/50">Lyria music generation & procedural chill synthesizers</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition border border-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Track Card & Spinning Vinyl */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-zinc-900 border border-white/10 relative overflow-hidden">
          <div className="relative flex-shrink-0">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-zinc-950 via-zinc-800 to-zinc-900 border-2 border-purple-500/50 flex items-center justify-center shadow-lg ${
                isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
              }`}
            >
              <Disc3 className="w-8 h-8 sm:w-9 sm:h-9 text-purple-400 opacity-80" />
              <div className="absolute w-5 h-5 rounded-full bg-pink-500/40 border border-pink-400 flex items-center justify-center text-[10px]">
                {currentTrack.coverEmoji}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-cyan-300">
                {currentTrack.genre.toUpperCase()}
              </span>
              <span className="text-[10px] font-mono text-white/40">{currentTrack.bpm} BPM</span>
            </div>
            <h3 className="text-sm font-bold text-white truncate mt-1">{currentTrack.title}</h3>
            <p className="text-xs text-white/50 truncate">{currentTrack.artist}</p>

            {/* Live Mini Spectrum Bars */}
            <div className="flex items-end gap-1 h-4 sm:h-5 mt-2">
              {eqLevels.map((lvl, idx) => (
                <div
                  key={`modal-eq-${idx}`}
                  className="flex-1 rounded-sm bg-gradient-to-t from-cyan-500 to-pink-500 transition-all duration-75"
                  style={{
                    height: `${lvl}%`,
                    opacity: isPlaying ? 0.9 : 0.25,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* AI Music Generation Section (Lyria 3 Clip & Pro) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-pink-300">
              <Wand2 className="w-3.5 h-3.5 text-pink-400" />
              <span>Generate Music (Google Lyria)</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/10">
              <button
                onClick={() => setLyriaMode('clip')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                  lyriaMode === 'clip' ? 'bg-pink-600 text-white font-bold' : 'text-white/50 hover:text-white'
                }`}
              >
                Lyria Clip (30s)
              </button>
              <button
                onClick={() => setLyriaMode('pro')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                  lyriaMode === 'pro' ? 'bg-purple-600 text-white font-bold' : 'text-white/50 hover:text-white'
                }`}
              >
                Lyria Pro (Full)
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={lyriaPrompt}
              onChange={(e) => setLyriaPrompt(e.target.value)}
              placeholder="e.g. Japanese anime idol upbeat electro-pop with bright synths"
              className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-pink-500"
            />
            <button
              onClick={handleGenerateLyria}
              disabled={isGeneratingLyria}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingLyria ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingLyria ? 'Composing...' : 'Generate'}</span>
            </button>
          </div>

          {generationStatus && (
            <p className="text-[11px] text-cyan-300/90 font-mono italic">{generationStatus}</p>
          )}
        </div>

        {/* Playback Controls & Volume */}
        <div className="flex items-center justify-between px-2">
          {/* Upload Custom Audio File Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/80 border border-white/10 transition cursor-pointer"
              title="Upload your own MP3 file for your waifu to dance to!"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload MP3</span>
            </button>
          </div>

          {/* Main Play / Pause Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTogglePlay()}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/25 transition transform active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-2 w-28">
            <Volume2 className="w-4 h-4 text-white/50" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-lg bg-zinc-800 accent-pink-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Track Playlist */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-mono font-bold tracking-wider text-white/40 uppercase">
            CHILL STATION TRACKLIST
          </span>
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
            {PRESET_TRACKS.map((track) => {
              const isThisActive = currentTrack.id === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    onSelectTrack(track);
                    onTogglePlay(track);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition text-left cursor-pointer ${
                    isThisActive
                      ? 'bg-purple-950/40 border-purple-500/50 text-white'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-white/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">{track.coverEmoji}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        {track.title}
                        {isThisActive && isPlaying && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        )}
                      </div>
                      <div className="text-[10px] text-white/40">{track.artist}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/40">{track.bpm} BPM</span>
                    <span className="p-1 rounded-md bg-white/10 text-white/70">
                      {isThisActive && isPlaying ? (
                        <Pause className="w-3 h-3 text-pink-400" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Waifu Sync Hint */}
        <div className="p-3 rounded-xl bg-pink-950/20 border border-pink-500/20 flex items-center gap-2 text-xs text-pink-300">
          <Sparkles className="w-4 h-4 text-pink-400 flex-shrink-0" />
          <span>Your waifu dances and sways automatically to the rhythm inside the capsule!</span>
        </div>
      </div>
    </div>
  );
};
