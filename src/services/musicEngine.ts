// Web Audio API procedural Lo-Fi & Anime Synthwave Music Synthesizer & Audio Player
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  genre: 'lofi' | 'synthwave' | 'anime_piano' | 'cyber';
  coverEmoji: string;
}

export const PRESET_TRACKS: MusicTrack[] = [
  {
    id: 'tokyo_lofi',
    title: 'Midnight Tokyo Cafe',
    artist: 'Code27 Soundworks',
    bpm: 84,
    genre: 'lofi',
    coverEmoji: '☕',
  },
  {
    id: 'sakura_dreams',
    title: 'Sakura Petals in the Rain',
    artist: 'Anime Chill Beats',
    bpm: 78,
    genre: 'anime_piano',
    coverEmoji: '🌸',
  },
  {
    id: 'cyber_capsule',
    title: 'Neon Hologram Livehouse',
    artist: 'Sybran Wave',
    bpm: 110,
    genre: 'synthwave',
    coverEmoji: '✨',
  },
  {
    id: 'starlight_study',
    title: 'Starlight Study Session',
    artist: 'Waifu Beats',
    bpm: 72,
    genre: 'lofi',
    coverEmoji: '🌙',
  },
];

class MusicEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentTrack: MusicTrack = PRESET_TRACKS[0];
  private timerId: number | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private beatCallback: ((beatCount: number, bpm: number) => void) | null = null;
  private currentBeat: number = 0;
  private customAudioEl: HTMLAudioElement | null = null;
  private customSourceNode: MediaElementAudioSourceNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0.35; // Comfortable volume
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setBeatCallback(cb: (beatCount: number, bpm: number) => void) {
    this.beatCallback = cb;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrack(): MusicTrack {
    return this.currentTrack;
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(32);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  public playTrack(track: MusicTrack) {
    this.stop();
    this.currentTrack = track;
    this.isPlaying = true;
    this.initContext();

    const intervalMs = (60 / track.bpm) * 1000;
    this.currentBeat = 0;

    // Trigger procedural instrument loop on each beat
    const loop = () => {
      if (!this.isPlaying) return;
      this.playBeatStep(this.currentBeat, track);
      if (this.beatCallback) {
        this.beatCallback(this.currentBeat, track.bpm);
      }
      this.currentBeat = (this.currentBeat + 1) % 16;
      this.timerId = window.setTimeout(loop, intervalMs / 2); // 8th note resolution
    };

    loop();
  }

  public togglePlay(track?: MusicTrack): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.playTrack(track || this.currentTrack);
      return true;
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.customAudioEl) {
      this.customAudioEl.pause();
    }
  }

  public setVolume(vol: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  // Play uploaded audio file
  public playUploadedFile(file: File, name: string) {
    this.stop();
    this.initContext();
    if (!this.ctx || !this.gainNode) return;

    const url = URL.createObjectURL(file);
    if (!this.customAudioEl) {
      this.customAudioEl = new Audio();
      this.customSourceNode = this.ctx.createMediaElementSource(this.customAudioEl);
      this.customSourceNode.connect(this.gainNode);
    }

    this.customAudioEl.src = url;
    this.customAudioEl.play();
    this.isPlaying = true;
    this.currentTrack = {
      id: 'custom-file',
      title: name || 'Custom User Audio',
      artist: 'Local Media',
      bpm: 100,
      genre: 'lofi',
      coverEmoji: '🎵',
    };

    // Beat pulse timer approximation
    const intervalMs = (60 / 100) * 1000;
    this.currentBeat = 0;
    const loop = () => {
      if (!this.isPlaying) return;
      if (this.beatCallback) {
        this.beatCallback(this.currentBeat, 100);
      }
      this.currentBeat = (this.currentBeat + 1) % 16;
      this.timerId = window.setTimeout(loop, intervalMs / 2);
    };
    loop();

    this.customAudioEl.onended = () => {
      this.stop();
    };
  }

  // Procedural Lo-Fi Chords, Basslines, Hi-hats, and Melodies
  private playBeatStep(step: number, track: MusicTrack) {
    if (!this.ctx || !this.gainNode) return;
    const t = this.ctx.currentTime;

    // Chord progressions (Cmaj7 - Am7 - Dm7 - G7 / Fmaj7 - Em7 - Dm7 - Cmaj7)
    const chordProgressions: Record<string, number[][]> = {
      lofi: [
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 392.0],  // Am7
        [293.66, 349.23, 440.0, 523.25], // Dm7
        [196.0, 246.94, 293.66, 349.23], // G7
      ],
      synthwave: [
        [146.83, 220.0, 293.66, 370.0],  // Dm
        [174.61, 261.63, 349.23, 440.0], // F
        [130.81, 196.0, 261.63, 329.63], // C
        [196.0, 293.66, 392.0, 493.88],  // G
      ],
      anime_piano: [
        [349.23, 440.0, 523.25, 659.25], // Fmaj7
        [329.63, 392.0, 493.88, 587.33], // Em7
        [293.66, 349.23, 440.0, 523.25], // Dm7
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
      ],
      cyber: [
        [220.0, 277.18, 329.63, 415.3],  // A
        [174.61, 220.0, 261.63, 329.63], // F
        [261.63, 329.63, 392.0, 523.25], // C
        [196.0, 246.94, 293.66, 392.0],  // G
      ],
    };

    const chords = chordProgressions[track.genre] || chordProgressions.lofi;
    const chordIndex = Math.floor(step / 4) % chords.length;
    const currentChord = chords[chordIndex];

    // 1. Kick Drum (Steps 0, 8, and occasionally 6/14)
    if (step === 0 || step === 8 || step === 6) {
      this.triggerKick(t);
    }

    // 2. Snare / Rimshot (Steps 4 and 12)
    if (step === 4 || step === 12) {
      this.triggerSnare(t, track.genre === 'lofi');
    }

    // 3. Hi-Hat / Shaker (Every 2 steps, with vinyl swing)
    if (step % 2 === 0 || step % 4 === 3) {
      this.triggerHiHat(t, step % 4 === 0 ? 0.15 : 0.08);
    }

    // 4. Warm Electric Piano / Pad Chord on Bar Start (Steps 0, 4, 8, 12)
    if (step % 4 === 0) {
      this.triggerChord(t, currentChord, track.genre);
    }

    // 5. Arpeggio / Melodic Pluck notes
    if (step % 2 === 1) {
      const note = currentChord[(step * 2 + 1) % currentChord.length] * (track.genre === 'anime_piano' ? 1.5 : 1);
      this.triggerMelodyPluck(t, note, track.genre);
    }

    // 6. Deep Sub Bass (Step 0 and 8)
    if (step === 0 || step === 8) {
      this.triggerBass(t, currentChord[0] / 2);
    }
  }

  private triggerKick(t: number) {
    if (!this.ctx || !this.gainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  private triggerSnare(t: number, isLofi: boolean) {
    if (!this.ctx || !this.gainNode) return;
    // Noise buffer for snap
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isLofi ? 'lowpass' : 'bandpass';
    filter.frequency.value = isLofi ? 2200 : 3500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode);

    noise.start(t);
    noise.stop(t + 0.15);
  }

  private triggerHiHat(t: number, volume: number) {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode);

    noise.start(t);
    noise.stop(t + 0.05);
  }

  private triggerChord(t: number, freqs: number[], genre: string) {
    if (!this.ctx || !this.gainNode) return;
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = genre === 'synthwave' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(genre === 'lofi' ? 1200 : 2800, t);

      const chordGain = (0.22 / freqs.length) * (1 - idx * 0.1);
      gain.gain.setValueAtTime(chordGain, t);
      gain.gain.linearRampToValueAtTime(chordGain * 0.8, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.gainNode!);

      osc.start(t);
      osc.stop(t + 0.95);
    });
  }

  private triggerMelodyPluck(t: number, freq: number, genre: string) {
    if (!this.ctx || !this.gainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = genre === 'anime_piano' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  private triggerBass(t: number, freq: number) {
    if (!this.ctx || !this.gainNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start(t);
    osc.stop(t + 0.75);
  }
}

export const musicEngine = new MusicEngine();
