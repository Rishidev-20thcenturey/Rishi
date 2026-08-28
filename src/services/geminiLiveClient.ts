import { VisemeType } from '../types';
import { audioEngine } from './audioEngine';

export interface LiveClientConfig {
  voiceName?: string; // Kore, Puck, Zephyr, Fenrir, Aoede
  systemInstruction?: string;
  onAudioData?: (base64Audio: string) => void;
  onTranscription?: (text: string, isUser: boolean) => void;
  onViseme?: (viseme: VisemeType, openness: number) => void;
  onInterrupted?: () => void;
  onError?: (err: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export class GeminiLiveAudioClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private config: LiveClientConfig;

  constructor(config: LiveClientConfig = {}) {
    this.config = config;
  }

  public updateConfig(newConfig: Partial<LiveClientConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) return;
    this.isConnecting = true;

    try {
      // 1. Setup AudioContexts
      // Input 16kHz for Live API raw PCM
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      // Output 24kHz for Model Output playback
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });

      this.analyser = this.outputAudioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.4;
      this.analyser.connect(this.outputAudioCtx.destination);

      // 2. Request mic stream
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 3. Connect WebSocket to backend Live API proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      // Safe connection timeout guard (fallback to continuous voice if proxy blocks WS)
      const timeoutId = setTimeout(() => {
        if (!this.isConnected && this.isConnecting) {
          console.warn('[LiveClient] Live socket connection timeout - initiating smooth voice fallback');
          this.cleanup();
          this.config.onError?.(new Error('Live WebSocket connection timeout'));
        }
      }, 4500);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        this.isConnected = true;
        this.isConnecting = false;
        this.nextStartTime = this.outputAudioCtx?.currentTime || 0;

        // Send initial setup config (voice & instructions)
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'setup',
              voiceName: this.config.voiceName || 'Kore',
              systemInstruction: this.config.systemInstruction || 'You are an expressive, loving anime companion waifu in a live voice conversation.',
            })
          );
        }

        this.config.onConnected?.();
        this.startMicStreaming();
        this.startVisemeTracking();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
            this.config.onAudioData?.(msg.audio);
            this.playAudioChunk(msg.audio);
          }
          if (msg.interrupted) {
            this.handleInterruption();
          }
          if (msg.userTranscription) {
            this.config.onTranscription?.(msg.userTranscription, true);
          }
          if (msg.modelTranscription) {
            this.config.onTranscription?.(msg.modelTranscription, false);
          }
        } catch (err) {
          console.warn('[LiveClient] Notice parsing message chunk:', err);
        }
      };

      ws.onerror = (_err) => {
        clearTimeout(timeoutId);
        console.warn('[LiveClient] Live audio channel event received, triggering seamless voice fallback');
        this.config.onError?.(new Error('Live Audio WebSocket stream unavailable in current environment'));
      };

      ws.onclose = () => {
        clearTimeout(timeoutId);
        this.cleanup();
        this.config.onDisconnected?.();
      };
    } catch (err) {
      this.cleanup();
      this.isConnecting = false;
      this.config.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private startMicStreaming() {
    if (!this.inputAudioCtx || !this.micStream || !this.ws) return;

    if (this.inputAudioCtx.state === 'suspended') {
      this.inputAudioCtx.resume().catch(() => {});
    }

    const source = this.inputAudioCtx.createMediaStreamSource(this.micStream);
    // Buffer size 1024 (64ms at 16kHz) for instant, lag-free live voice streaming
    this.processor = this.inputAudioCtx.createScriptProcessor(1024, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      try {
        const inputData = e.inputBuffer.getChannelData(0);

        // Acoustic Echo Gate: If model is currently outputting voice through device speaker,
        // measure mic energy to ignore speaker bleed while allowing user speech barge-in
        if (this.activeSources.length > 0) {
          let sumSquares = 0;
          for (let i = 0; i < inputData.length; i++) {
            sumSquares += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sumSquares / inputData.length);
          // If sound level is below loud voice barge-in threshold, suppress to prevent self-trigger loop
          if (rms < 0.045) {
            return;
          }
        }

        const base64PCM = this.floatTo16BitPCMBase64(inputData);
        if (base64PCM && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ audio: base64PCM }));
        }
      } catch {
        // ignore streaming send error if socket is closing
      }
    };

    // Route processor to a 0-gain node so onaudioprocess fires without looping user voice into output speakers
    const muteGain = this.inputAudioCtx.createGain();
    muteGain.gain.value = 0;
    source.connect(this.processor);
    this.processor.connect(muteGain);
    muteGain.connect(this.inputAudioCtx.destination);
  }

  private floatTo16BitPCMBase64(float32Array: Float32Array): string {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true); // Little endian
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private playAudioChunk(base64Audio: string) {
    if (!this.outputAudioCtx || !this.analyser) return;

    if (this.outputAudioCtx.state === 'suspended') {
      this.outputAudioCtx.resume().catch(() => {});
    }

    // Stop any standalone TTS or WebSpeech playback immediately
    audioEngine.stopPlayback();

    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM little endian into Float32Array
      const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      if (float32.length === 0) return;

      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser);

      const currentTime = this.outputAudioCtx.currentTime;
      // Seamless zero-overlap audio stream timeline:
      // If buffer underrun occurred or fresh turn started, align to currentTime
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx > -1) this.activeSources.splice(idx, 1);
      };
    } catch (err) {
      console.warn('[LiveClient] Audio playback chunk error:', err);
    }
  }

  private handleInterruption() {
    this.activeSources.forEach((src) => {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }
    this.config.onInterrupted?.();
  }

  private startVisemeTracking() {
    const update = () => {
      if (!this.analyser || !this.isConnected) {
        this.config.onViseme?.('rest', 0);
        return;
      }

      const freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(freqData);

      let sum = 0;
      let maxVal = 0;
      for (let i = 0; i < freqData.length; i++) {
        sum += freqData[i];
        if (freqData[i] > maxVal) maxVal = freqData[i];
      }
      const avg = sum / freqData.length;
      const openness = Math.min(1, Math.max(0, (avg / 128) * 1.5));

      if (openness > 0.08) {
        // Formant estimation
        const low = (freqData[1] || 0) + (freqData[2] || 0);
        const mid = (freqData[4] || 0) + (freqData[5] || 0);
        const high = (freqData[8] || 0) + (freqData[9] || 0);

        let detectedViseme: VisemeType = 'aa';
        if (low > mid && low > high) {
          detectedViseme = 'ou';
        } else if (high > mid && high > low) {
          detectedViseme = 'ee';
        } else if (mid > high) {
          detectedViseme = 'oh';
        } else {
          detectedViseme = 'aa';
        }
        this.config.onViseme?.(detectedViseme, openness);
      } else {
        this.config.onViseme?.('rest', 0);
      }

      this.animFrameId = requestAnimationFrame(update);
    };

    this.animFrameId = requestAnimationFrame(update);
  }

  public disconnect() {
    this.cleanup();
  }

  private cleanup() {
    this.isConnected = false;
    this.isConnecting = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.activeSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeSources = [];

    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }

    if (this.inputAudioCtx) {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  public getIsActive(): boolean {
    return this.isConnected;
  }
}
