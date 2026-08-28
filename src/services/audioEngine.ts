import { VisemeType } from '../types';

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private vocalPresenceFilter: BiquadFilterNode | null = null;
  private airFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isMuted: boolean = false;
  private animationFrameId: number | null = null;
  private audioBufferCache = new Map<string, AudioBuffer>();
  private spectrumListeners = new Set<(freqData: Uint8Array, volume: number) => void>();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

      // Studio Vocal Equalizer Chain
      // 1. High Pass Filter to remove low-frequency rumble & plosives
      this.highPassFilter = this.audioCtx.createBiquadFilter();
      this.highPassFilter.type = 'highpass';
      this.highPassFilter.frequency.setValueAtTime(85, this.audioCtx.currentTime);

      // 2. Anime Vocal Presence Peaking EQ (3.2 kHz boost for bright, crisp anime voice)
      this.vocalPresenceFilter = this.audioCtx.createBiquadFilter();
      this.vocalPresenceFilter.type = 'peaking';
      this.vocalPresenceFilter.frequency.setValueAtTime(3200, this.audioCtx.currentTime);
      this.vocalPresenceFilter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);
      this.vocalPresenceFilter.gain.setValueAtTime(2.5, this.audioCtx.currentTime);

      // 3. Air High Shelf (8 kHz sparkle)
      this.airFilter = this.audioCtx.createBiquadFilter();
      this.airFilter.type = 'highshelf';
      this.airFilter.frequency.setValueAtTime(8000, this.audioCtx.currentTime);
      this.airFilter.gain.setValueAtTime(1.5, this.audioCtx.currentTime);

      // 4. Dynamics Compressor for smooth vocal level
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.audioCtx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.audioCtx.currentTime);
      this.compressor.ratio.setValueAtTime(3.5, this.audioCtx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);

      // 5. Spectrum Analyser
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;

      // Connect filter chain: Input -> HighPass -> VocalPresence -> Air -> Compressor -> Analyser -> MasterGain -> Destination
      this.highPassFilter.connect(this.vocalPresenceFilter);
      this.vocalPresenceFilter.connect(this.airFilter);
      this.airFilter.connect(this.compressor);
      this.compressor.connect(this.analyser);
      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private currentSessionId: number = 0;
  private pendingSpeakTimeout: number | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 1, this.audioCtx.currentTime);
    }
    if (muted) {
      this.stopPlayback();
    }
  }

  public addSpectrumListener(cb: (freqData: Uint8Array, volume: number) => void) {
    this.spectrumListeners.add(cb);
    return () => {
      this.spectrumListeners.delete(cb);
    };
  }

  // Play procedural cute anime sound effects
  public playSoundEffect(
    type: 'headpat' | 'blush' | 'pout' | 'heart' | 'alert' | 'levelup' | 'camera' | 'knock' | 'poke' | 'giggle' | 'ready'
  ) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      if (type === 'ready') {
        // Soft friendly double-ping indicating mic is ready to listen
        [880, 1174.66].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.07);
          gain.gain.setValueAtTime(0.06, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.14);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.15);
        });
      } else if (type === 'knock') {
        // Crisp physical capsule glass knock
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(820, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'poke') {
        // Cute bouncy boing poke
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(850, now + 0.06);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'giggle') {
        // Cute cheerful double note
        [783.99, 1046.5].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.08);
          gain.gain.setValueAtTime(0.08, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.13);
        });
      } else if (type === 'headpat') {
        // Soft cute high harmonic purr
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'blush') {
        // Shimmering anime chime
        const freqs = [659.25, 783.99, 987.77, 1318.51];
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + i * 0.04);
          gain.gain.setValueAtTime(0.06, now + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.04);
          osc.stop(now + i * 0.04 + 0.35);
        });
      } else if (type === 'pout') {
        // Cute comic descending boing
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'heart' || type === 'levelup') {
        // Joyful ascending arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.06);
          gain.gain.setValueAtTime(0.08, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.3);
        });
      } else if (type === 'camera') {
        // Shutter click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.setValueAtTime(800, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch (err) {
      console.warn('SFX playback error:', err);
    }
  }

  // Play studio AI audio buffer through the vocal enhancement equalizer graph
  public playAudioBuffer(
    buffer: AudioBuffer,
    onVisemeUpdate: (viseme: VisemeType, openness: number) => void,
    onEnd: () => void
  ) {
    this.stopPlayback();
    if (this.isMuted) {
      onEnd();
      return;
    }
    this.initContext();
    if (!this.audioCtx || !this.highPassFilter || !this.analyser) {
      onEnd();
      return;
    }

    const thisSession = ++this.currentSessionId;

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;

    // Connect into the studio equalizer pipeline
    source.connect(this.highPassFilter);
    this.currentSource = source;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateLipSync = () => {
      if (this.currentSessionId !== thisSession || !this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);

      // Compute spectral bands for accurate Japanese vowel visemes
      let sum = 0;
      let lowSum = 0; // ~100Hz - 800Hz (Vowels: O, U)
      let midSum = 0; // ~800Hz - 2500Hz (Vowels: A, E)
      let highSum = 0; // ~2500Hz - 6000Hz (Vowels: I, Sibilants)

      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
        if (i < 8) lowSum += dataArray[i];
        else if (i < 26) midSum += dataArray[i];
        else highSum += dataArray[i];
      }

      const avg = sum / dataArray.length;
      const normalizedVol = Math.min(1, avg / 120);

      // Notify spectrum waveform visualizers
      this.spectrumListeners.forEach((listener) => listener(dataArray, normalizedVol));

      // Calculate mouth openness
      const openness = Math.min(1, Math.max(0, (avg - 12) / 65));

      let viseme: VisemeType = 'rest';
      if (openness > 0.08) {
        if (lowSum > midSum * 1.15 && lowSum > highSum) {
          viseme = openness > 0.6 ? 'ou' : 'oh';
        } else if (highSum > midSum * 1.1) {
          viseme = 'ee';
        } else if (midSum > lowSum && midSum > highSum) {
          viseme = openness > 0.5 ? 'aa' : 'ih';
        } else {
          viseme = 'aa';
        }
      }

      onVisemeUpdate(viseme, openness);

      this.animationFrameId = requestAnimationFrame(updateLipSync);
    };

    source.onended = () => {
      if (this.currentSessionId === thisSession) {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.currentSource = null;
        onVisemeUpdate('rest', 0);
        this.spectrumListeners.forEach((listener) => listener(new Uint8Array(128), 0));
        onEnd();
      }
    };

    source.start(0);
    this.animationFrameId = requestAnimationFrame(updateLipSync);
  }

  // Enhanced Speech Synthesis fallback with neural voice selection & smooth cadence
  public speakWithWebSpeech(
    text: string,
    pitch: number = 1.25,
    rate: number = 1.05,
    onVisemeUpdate: (viseme: VisemeType, openness: number) => void,
    onEnd: () => void
  ) {
    this.stopPlayback();
    if (this.isMuted || !('speechSynthesis' in window)) {
      onEnd();
      return;
    }

    const thisSession = ++this.currentSessionId;

    // Clean text of bracket tags, markdown asterisks, kaomojis, and emojis for crystal clear speech
    const cleanText = text
      .replace(/\[(?:emotion|action|viseme|mood|pose):[^\]]*\]/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\*.*?\*/g, '')
      .replace(/[\(（][^a-zA-Z0-9\s]{1,}[\)）]/g, '')
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .trim();

    if (!cleanText) {
      onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = pitch;
    utterance.rate = rate;

    // Intelligent search for highest-fidelity natural female/Japanese anime voices
    const voices = window.speechSynthesis.getVoices();
    const rankedVoice =
      voices.find((v) => v.name.includes('Google') && v.name.includes('Female')) ||
      voices.find((v) => v.name.includes('Natural') && v.name.includes('Female')) ||
      voices.find((v) => v.lang.includes('ja') || v.name.includes('Japan') || v.name.includes('Kyoko') || v.name.includes('Ayumi')) ||
      voices.find((v) => v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen') || v.name.includes('Zira')) ||
      voices.find((v) => v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))) ||
      voices[0];

    if (rankedVoice) {
      utterance.voice = rankedVoice;
    }

    let intervalId: number | null = null;
    const visemes: VisemeType[] = ['aa', 'ih', 'ee', 'oh', 'ou', 'smile'];

    utterance.onstart = () => {
      if (this.currentSessionId !== thisSession) {
        window.speechSynthesis.cancel();
        return;
      }
      let counter = 0;
      intervalId = window.setInterval(() => {
        if (this.currentSessionId !== thisSession) {
          if (intervalId) clearInterval(intervalId);
          return;
        }
        counter++;
        const openness = 0.35 + Math.sin(counter * 0.65) * 0.4 + Math.random() * 0.2;
        const currentViseme = visemes[Math.floor(Math.random() * visemes.length)];
        onVisemeUpdate(currentViseme, Math.max(0.15, Math.min(1, openness)));
      }, 70);
    };

    const cleanup = () => {
      if (intervalId) clearInterval(intervalId);
      if (this.activeUtterance === utterance) {
        this.activeUtterance = null;
      }
      if (this.currentSessionId === thisSession) {
        onVisemeUpdate('rest', 0);
        onEnd();
      }
    };

    utterance.onend = cleanup;
    utterance.onerror = cleanup;

    this.activeUtterance = utterance;

    // Small delay ensures window.speechSynthesis.cancel() has completed before new utterance begins
    this.pendingSpeakTimeout = window.setTimeout(() => {
      if (this.currentSessionId === thisSession && 'speechSynthesis' in window) {
        window.speechSynthesis.speak(utterance);
      }
    }, 50);
  }

  public stopPlayback() {
    this.currentSessionId++;
    if (this.pendingSpeakTimeout) {
      clearTimeout(this.pendingSpeakTimeout);
      this.pendingSpeakTimeout = null;
    }
    if (this.activeUtterance) {
      this.activeUtterance.onstart = null;
      this.activeUtterance.onend = null;
      this.activeUtterance.onerror = null;
      this.activeUtterance = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.currentSource) {
      try {
        this.currentSource.onended = null;
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // ignore already stopped
      }
      this.currentSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  // Convert raw base64 PCM / audio string from Gemini TTS to an AudioBuffer with robust decoding
  public async decodeBase64ToBuffer(
    base64Data: string,
    sampleRate: number = 24000
  ): Promise<AudioBuffer | null> {
    try {
      this.initContext();
      if (!this.audioCtx) return null;

      // Check fast cache
      const cacheKey = base64Data.slice(0, 64) + base64Data.length;
      if (this.audioBufferCache.has(cacheKey)) {
        return this.audioBufferCache.get(cacheKey)!;
      }

      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      let audioBuffer: AudioBuffer | null = null;

      // Check if it is a containerized format (WAV 'RIFF', MP3 'ID3' or MPEG sync)
      const isWav = len >= 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
      const isMp3 = len >= 3 && ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));

      if (isWav || isMp3) {
        try {
          const bufferCopy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
          audioBuffer = await this.audioCtx.decodeAudioData(bufferCopy);
        } catch {
          audioBuffer = null;
        }
      }

      // If not decoded as container or container decode failed, decode as raw 16-bit PCM little-endian
      if (!audioBuffer) {
        const sampleCount = Math.floor(len / 2);
        if (sampleCount > 0) {
          const float32 = new Float32Array(sampleCount);
          const dataView = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
          for (let i = 0; i < sampleCount; i++) {
            const int16 = dataView.getInt16(i * 2, true); // Little-endian 16-bit PCM
            float32[i] = int16 / 32768.0;
          }

          audioBuffer = this.audioCtx.createBuffer(1, float32.length, sampleRate);
          audioBuffer.getChannelData(0).set(float32);
        }
      }

      if (audioBuffer) {
        // Cache buffer
        if (this.audioBufferCache.size > 30) {
          const firstKey = this.audioBufferCache.keys().next().value;
          if (firstKey) this.audioBufferCache.delete(firstKey);
        }
        this.audioBufferCache.set(cacheKey, audioBuffer);
      }

      return audioBuffer;
    } catch (err) {
      console.warn('Failed to decode base64 audio:', err);
      return null;
    }
  }
}

export const audioEngine = new AudioEngine();
