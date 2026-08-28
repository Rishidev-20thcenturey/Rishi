import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CharacterPreset,
  CustomizationSettings,
  EmotionType,
  VisemeType,
  ChatMessage,
  BackgroundScene,
  VoiceSettings,
  UserMemoryProfile,
} from './types';
import { CHARACTER_PRESETS } from './data/characters';
import { BACKGROUND_SCENES } from './data/sceneries';
import { audioEngine } from './services/audioEngine';
import { musicEngine, PRESET_TRACKS, MusicTrack } from './services/musicEngine';
import { memoryEngine } from './services/memoryEngine';
import {
  sendChatWithVoice,
  requestGeminiTTS,
  analyzeCameraSnapshot,
  transcribeAudioRecording,
  extractMemoryFact,
  consolidateCallMemory,
} from './services/geminiService';
import { GeminiLiveAudioClient } from './services/geminiLiveClient';
import { AnimeCharacterCanvas } from './components/AnimeCharacterCanvas';
import { VRMCharacterCanvas } from './components/VRMCharacterCanvas';
import { MusicPlayerModal } from './components/MusicPlayerModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { ChatHUD } from './components/ChatHUD';
import { CompanionHeader } from './components/CompanionHeader';
import { CompanionChatBar } from './components/CompanionChatBar';
import { CompanionMenuDrawer } from './components/CompanionMenuDrawer';
import { WardrobeModal } from './components/WardrobeModal';
import { CameraVisionModal } from './components/CameraVisionModal';
import { LiveVisionPiP } from './components/LiveVisionPiP';
import { AffectionModal } from './components/AffectionModal';
import { MemoryCoreModal } from './components/MemoryCoreModal';
import { SnapshotModal } from './components/SnapshotModal';
import { Sparkles, Music, Box, Waves, Phone, PhoneCall, Eye, EyeOff, Maximize2, Minimize2, Brain } from 'lucide-react';

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

const defaultCharacter = CHARACTER_PRESETS.find((c) => c.id === 'kira') || CHARACTER_PRESETS[0];

export default function App() {
  // 1. Character & Customization State (Default: Kira)
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterPreset>(defaultCharacter);
  const [customization, setCustomization] = useState<CustomizationSettings>({
    hairColor: defaultCharacter.appearance.hairColor,
    hairStyle: defaultCharacter.appearance.hairStyle,
    eyeColor: defaultCharacter.appearance.eyeColor,
    outfit: defaultCharacter.appearance.outfit,
    outfitColor: defaultCharacter.appearance.outfitPrimaryColor,
    accessories: {
      catEars: defaultCharacter.appearance.accessories.includes('catEars'),
      ribbon: defaultCharacter.appearance.accessories.includes('ribbon'),
      hairpin: defaultCharacter.appearance.accessories.includes('hairpin'),
      cyberClips: defaultCharacter.appearance.accessories.includes('cyberClips'),
      glasses: defaultCharacter.appearance.accessories.includes('glasses'),
      choker: defaultCharacter.appearance.accessories.includes('choker'),
      whiteBarrettes: defaultCharacter.appearance.accessories.includes('whiteBarrettes'),
    },
  });

  const [selectedBackground, setSelectedBackground] = useState<BackgroundScene>(BACKGROUND_SCENES[0]);

  // 2. Voice Matrix & Real-time Acoustics State
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    geminiVoice: defaultCharacter.voice.geminiVoice || 'Zephyr',
    speed: defaultCharacter.voice.webSpeechRate || 1.08,
    pitch: defaultCharacter.voice.webSpeechPitch || 1.34,
    autoSpeechResume: true,
    voiceMode: 'studio_ai',
  });
  const [isLiveVoiceCallActive, setIsLiveVoiceCallActive] = useState<boolean>(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState<boolean>(false);

  // 3. 3D VRM & 2.5D Engine State
  const [renderEngine, setRenderEngine] = useState<'3d-vrm' | '2d-live2d'>('3d-vrm');
  const [customVrmUrl, setCustomVrmUrl] = useState<string | null>(null);

  // 4. Music Player & Rhythm State
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack>(PRESET_TRACKS[0]);
  const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState<boolean>(false);
  const [isDancing, setIsDancing] = useState<boolean>(false);

  // 5. Animation & Expression State
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>(defaultCharacter.defaultEmotion || 'pout');
  const [viseme, setViseme] = useState<VisemeType>('rest');
  const [visemeOpenness, setVisemeOpenness] = useState<number>(0);
  const [isTalking, setIsTalking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // 6. Conversation & Affection State (Persistent across calls, sessions, and reloads)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem('KIRA_CHAT_HISTORY_V2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [affectionScore, setAffectionScore] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('KIRA_AFFECTION_SCORE');
      if (raw) return Math.min(100, Math.max(0, parseInt(raw, 10)));
    } catch {}
    return 25;
  });
  const [affectionLevel, setAffectionLevel] = useState<number>(1);
  const [headPatCount, setHeadPatCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('KIRA_HEADPAT_COUNT');
      if (raw) return parseInt(raw, 10) || 0;
    } catch {}
    return 0;
  });

  // Auto-save conversation history & affection levels to long-term storage
  useEffect(() => {
    try {
      if (chatHistory.length > 0) {
        localStorage.setItem('KIRA_CHAT_HISTORY_V2', JSON.stringify(chatHistory.slice(-50)));
      }
    } catch {}
  }, [chatHistory]);

  useEffect(() => {
    try {
      localStorage.setItem('KIRA_AFFECTION_SCORE', String(affectionScore));
    } catch {}
  }, [affectionScore]);

  useEffect(() => {
    try {
      localStorage.setItem('KIRA_HEADPAT_COUNT', String(headPatCount));
    } catch {}
  }, [headPatCount]);

  // 7. Voice Recognition & Gemini Live Client State
  const [isContinuousListen, setIsContinuousListen] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const liveClientRef = useRef<GeminiLiveAudioClient | null>(null);
  const playbackIdRef = useRef<number>(0);
  const isCompanionSpeakingRef = useRef<boolean>(false);
  const lastCompanionSpeechEndTimeRef = useRef<number>(0);
  const recentSpokenWaifuTextsRef = useRef<string[]>([]);
  const activePushModeRef = useRef<'none' | 'recognition' | 'media_recorder'>('none');
  const lastProcessedSpeechRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const isProcessingMessageRef = useRef<boolean>(false);
  const isContinuousListenRef = useRef<boolean>(false);
  const isLiveVoiceCallActiveRef = useRef<boolean>(false);
  const isTalkingRef = useRef<boolean>(false);
  const isThinkingRef = useRef<boolean>(false);

  useEffect(() => {
    isContinuousListenRef.current = isContinuousListen;
  }, [isContinuousListen]);

  useEffect(() => {
    isLiveVoiceCallActiveRef.current = isLiveVoiceCallActive;
  }, [isLiveVoiceCallActive]);

  useEffect(() => {
    isTalkingRef.current = isTalking;
  }, [isTalking]);

  useEffect(() => {
    isThinkingRef.current = isThinking;
  }, [isThinking]);

  // Media recorder for gemini-3.5-flash Audio Transcription
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 8. Modals & View Mode State
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [activeStance, setActiveStance] = useState<'idol' | 'shy' | 'playful' | 'curious'>('idol');
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
  const [isVisionOpen, setIsVisionOpen] = useState(false);
  const [isLiveVisionActive, setIsLiveVisionActive] = useState(false);
  const latestVisionFrameRef = useRef<string | null>(null);
  const [isAffectionOpen, setIsAffectionOpen] = useState(false);
  const [isMemoryCoreOpen, setIsMemoryCoreOpen] = useState(false);
  const [memoryProfile, setMemoryProfile] = useState<UserMemoryProfile>(() => memoryEngine.getProfile());
  const [memoryToast, setMemoryToast] = useState<string | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [isPlainMode, setIsPlainMode] = useState<boolean>(false);
  const [liveCallDuration, setLiveCallDuration] = useState<number>(0);

  // Live Voice Call session duration tracker
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isLiveVoiceCallActive) {
      setLiveCallDuration(0);
      const start = Date.now();
      timer = setInterval(() => {
        setLiveCallDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      setLiveCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLiveVoiceCallActive]);

  // Trigger speech recognition resumption after waifu finishes talking
  const restartListeningIfLive = useCallback(() => {
    if (
      !isLiveVoiceCallActiveRef.current &&
      isContinuousListenRef.current &&
      recognitionRef.current &&
      !isTalkingRef.current &&
      !isThinkingRef.current &&
      !isCompanionSpeakingRef.current &&
      !isProcessingMessageRef.current
    ) {
      setTimeout(() => {
        if (
          !isLiveVoiceCallActiveRef.current &&
          isContinuousListenRef.current &&
          recognitionRef.current &&
          !isTalkingRef.current &&
          !isThinkingRef.current &&
          !isCompanionSpeakingRef.current &&
          !isProcessingMessageRef.current
        ) {
          try {
            recognitionRef.current.start();
          } catch {
            // ignore if already listening
          }
        }
      }, 1200);
    }
  }, []);

  // Speak Waifu reply using Studio AI TTS and real-time EQ visemes (Single Audio Arbiter)
  const speakWaifuReply = useCallback(
    async (
      text: string,
      char: CharacterPreset,
      emotion: EmotionType,
      preloadedAudioBase64?: string | null,
      sampleRate: number = 24000
    ) => {
      // If a Live Voice Call is currently active, it delivers real-time voice streaming; skip standalone TTS
      if (isLiveVoiceCallActive) return;

      const currentPlaybackId = ++playbackIdRef.current;
      isCompanionSpeakingRef.current = true;

      // Track recent spoken sentences to eliminate acoustic speaker feedback
      if (text && text.trim()) {
        recentSpokenWaifuTextsRef.current = [
          ...recentSpokenWaifuTextsRef.current.slice(-6),
          text.trim().toLowerCase(),
        ];
      }

      // Abort any active speech recognition to prevent feedback loops
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      audioEngine.stopPlayback();

      if (isMuted) {
        isCompanionSpeakingRef.current = false;
        isProcessingMessageRef.current = false;
        lastCompanionSpeechEndTimeRef.current = Date.now();
        restartListeningIfLive();
        return;
      }
      setIsTalking(true);

      let isDone = false;
      const onPlaybackDone = () => {
        if (isDone) return;
        isDone = true;
        if (playbackIdRef.current === currentPlaybackId) {
          setIsTalking(false);
          setViseme('rest');
          setVisemeOpenness(0);
          isCompanionSpeakingRef.current = false;
          isProcessingMessageRef.current = false;
          lastCompanionSpeechEndTimeRef.current = Date.now();
          restartListeningIfLive();
        }
      };

      // Failsafe watchdog timer: ensure speech lock is released even if browser audio stalls
      const estimatedDurationMs = Math.max(3000, Math.min(15000, (text.length / 12) * 1000 + 2000));
      setTimeout(() => {
        if (playbackIdRef.current === currentPlaybackId && isCompanionSpeakingRef.current) {
          onPlaybackDone();
        }
      }, estimatedDurationMs);

      // 1. If preloaded audio was provided, decode & play directly
      if (preloadedAudioBase64) {
        try {
          const audioBuffer = await audioEngine.decodeBase64ToBuffer(preloadedAudioBase64, sampleRate);
          if (playbackIdRef.current !== currentPlaybackId) {
            isProcessingMessageRef.current = false;
            return; // Discard superseded playback
          }

          if (audioBuffer) {
            audioEngine.playAudioBuffer(
              audioBuffer,
              (v, openness) => {
                setViseme(v);
                setVisemeOpenness(openness);
              },
              onPlaybackDone
            );
            return;
          }
        } catch (e) {
          console.warn('[Audio] Preloaded audio play failed, falling back to WebSpeech:', e);
        }
      }

      // 2. Standalone Gemini Flash TTS (only if not already attempted and returned null by backend)
      if (preloadedAudioBase64 === undefined) {
        try {
          const { audioBase64, sampleRate: ttsSampleRate } = await requestGeminiTTS(
            text,
            voiceSettings.geminiVoice || char.voice.geminiVoice,
            emotion
          );

          if (playbackIdRef.current !== currentPlaybackId) {
            isProcessingMessageRef.current = false;
            return; // Discard superseded playback
          }

          if (audioBase64) {
            const audioBuffer = await audioEngine.decodeBase64ToBuffer(audioBase64, ttsSampleRate);
            if (playbackIdRef.current !== currentPlaybackId) {
              isProcessingMessageRef.current = false;
              return;
            }

            if (audioBuffer) {
              audioEngine.playAudioBuffer(
                audioBuffer,
                (v, openness) => {
                  setViseme(v);
                  setVisemeOpenness(openness);
                },
                onPlaybackDone
              );
              return;
            }
          }
        } catch (err) {
          console.warn('TTS request error, using WebSpeech fallback:', err);
        }
      }

      if (playbackIdRef.current !== currentPlaybackId) {
        isProcessingMessageRef.current = false;
        return;
      }

      // 3. Fallback: High-quality Web Speech API synthesis with viseme driver
      audioEngine.speakWithWebSpeech(
        text,
        voiceSettings.pitch,
        voiceSettings.speed,
        (v, openness) => {
          setViseme(v);
          setVisemeOpenness(openness);
        },
        onPlaybackDone
      );
    },
    [isMuted, isLiveVoiceCallActive, voiceSettings, restartListeningIfLive]
  );

  // Knock on Capsule Glass handler
  const handleKnockGlass = useCallback(() => {
    audioEngine.playSoundEffect('knock');
    setAffectionScore((prev) => Math.min(100, prev + 2));
    setCurrentEmotion('love');

    const knockReplies = [
      "Kyaa~! Senpai, did you just tap on my capsule glass? Look, I'm pressing my hand right against yours! (｡♥‿♥｡)",
      "Tok-tok! Ehehe, I hear you loud and clear! I'm right here with you inside CODE27!",
      "Mou~ You startled me for a second, Senpai! But I love seeing your face up close!",
    ];
    const reply = knockReplies[Math.floor(Math.random() * knockReplies.length)];

    const knockMsg: ChatMessage = {
      id: `knock-${Date.now()}`,
      sender: 'waifu',
      text: reply,
      japanesePhrase: 'Tonton~ (トントン)',
      emotion: 'love',
      action: 'presses palm gently against the front glass cylinder with a blush',
      timestamp: Date.now(),
    };

    setChatHistory((prev) => [...prev, knockMsg]);
    speakWaifuReply(reply, selectedCharacter, 'love');
  }, [selectedCharacter, speakWaifuReply]);

  // Toggle procedural music playback
  const handleTogglePlayMusic = useCallback((track?: MusicTrack) => {
    const playing = musicEngine.togglePlay(track);
    setIsPlayingMusic(playing);
    if (playing) {
      setIsDancing(true);
      setCurrentTrack(musicEngine.getCurrentTrack());
      setCurrentEmotion('happy');
    } else {
      setIsDancing(false);
    }
  }, []);

  const handleSelectMusicTrack = useCallback((track: MusicTrack) => {
    setCurrentTrack(track);
    musicEngine.playTrack(track);
    setIsPlayingMusic(true);
    setIsDancing(true);
  }, []);

  // Calculate affection level milestone
  useEffect(() => {
    let lvl = 1;
    if (affectionScore >= 100) lvl = 5;
    else if (affectionScore >= 75) lvl = 4;
    else if (affectionScore >= 50) lvl = 3;
    else if (affectionScore >= 25) lvl = 2;
    setAffectionLevel(lvl);
  }, [affectionScore]);

  // When switching character, load defaults cleanly without intrusive auto-greeting speech
  const handleSelectCharacter = (char: CharacterPreset) => {
    audioEngine.stopPlayback();
    setIsTalking(false);
    setViseme('rest');
    setSelectedCharacter(char);
    setVoiceSettings((prev) => ({
      ...prev,
      geminiVoice: char.voice.geminiVoice || 'Kore',
      pitch: char.voice.webSpeechPitch || 1.25,
      speed: char.voice.webSpeechRate || 1.05,
    }));
    setCustomization({
      hairColor: char.appearance.hairColor,
      hairStyle: char.appearance.hairStyle,
      eyeColor: char.appearance.eyeColor,
      outfit: char.appearance.outfit,
      outfitColor: char.appearance.outfitPrimaryColor,
      accessories: {
        catEars: char.appearance.accessories.includes('catEars'),
        ribbon: char.appearance.accessories.includes('ribbon'),
        hairpin: char.appearance.accessories.includes('hairpin'),
        cyberClips: char.appearance.accessories.includes('cyberClips'),
        glasses: char.appearance.accessories.includes('glasses'),
        choker: char.appearance.accessories.includes('choker'),
        whiteBarrettes: char.appearance.accessories.includes('whiteBarrettes'),
      },
    });
    setCurrentEmotion(char.defaultEmotion);
  };

  // Ultra-Fast Unified Chat + Voice Dispatcher
  const handleSendMessage = useCallback(
    async (text: string, attachedImage?: string) => {
      const cleanText = text.trim();
      if (!cleanText && !attachedImage) return;

      // If already generating a reply, skip rapid duplicate triggers
      if (isThinkingRef.current) {
        console.log('[Dispatcher] Already thinking/generating reply, skipping duplicate');
        return;
      }

      // If companion is currently speaking, stop previous speech and allow user to speak/interrupt
      if (isCompanionSpeakingRef.current) {
        audioEngine.stopPlayback();
        isCompanionSpeakingRef.current = false;
        setIsTalking(false);
        setViseme('rest');
        setVisemeOpenness(0);
      }

      isProcessingMessageRef.current = true;
      setIsThinking(true);
      isThinkingRef.current = true;

      // Watchdog timeout to prevent getting permanently stuck thinking
      const thinkingWatchdog = setTimeout(() => {
        if (isThinkingRef.current) {
          setIsThinking(false);
          isThinkingRef.current = false;
          isProcessingMessageRef.current = false;
        }
      }, 12000);

      // Immediately abort and silence any listening during generation and speech
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      setIsListening(false);

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: cleanText || 'Look at this photo!',
        image: attachedImage,
        timestamp: Date.now(),
      };

      setChatHistory((prev) => [...prev, userMsg]);

      try {
        const memoryContext = memoryEngine.generateMemoryPromptContext();
        const nickname = memoryProfile.userNickname || memoryProfile.userName || 'Senpai';
        const currentVisionFrame = attachedImage || (isLiveVisionActive ? latestVisionFrameRef.current : null);

        const response = await sendChatWithVoice(
          cleanText || 'Look at this photo and tell me what you see!',
          selectedCharacter,
          chatHistory,
          affectionScore,
          undefined,
          voiceSettings.geminiVoice,
          memoryContext,
          nickname,
          currentVisionFrame
        );

        clearTimeout(thinkingWatchdog);

        // If a new memory fact was learned, persist and show toast
        if (response.newMemoryFact && response.newMemoryFact.trim().length > 3) {
          const added = memoryEngine.addMemory(response.newMemoryFact.trim(), 'interest');
          if (added) {
            setMemoryProfile(memoryEngine.getProfile());
            setMemoryToast(response.newMemoryFact.trim());
            setTimeout(() => setMemoryToast(null), 3500);
          }
        }
        memoryEngine.incrementConversation();
        setMemoryProfile(memoryEngine.getProfile());

        const waifuMsg: ChatMessage = {
          id: `waifu-${Date.now()}`,
          sender: 'waifu',
          text: response.reply,
          emotion: response.emotion,
          action: response.action,
          japanesePhrase: response.japanesePhrase,
          timestamp: Date.now(),
        };

        setChatHistory((prev) => [...prev, waifuMsg]);
        setCurrentEmotion(response.emotion);
        setAffectionScore((prev) => Math.min(100, prev + (response.affectionDelta || 2)));
        setIsThinking(false);
        isThinkingRef.current = false;

        // Speak aloud using preloaded audio if available (lock is kept until playback completes in onPlaybackDone)
        speakWaifuReply(
          response.reply,
          selectedCharacter,
          response.emotion,
          response.audioBase64,
          response.sampleRate
        );
      } catch (err) {
        clearTimeout(thinkingWatchdog);
        console.error('Chat error:', err);
        setIsThinking(false);
        isThinkingRef.current = false;
        isProcessingMessageRef.current = false;
        const fallbackMsg: ChatMessage = {
          id: `waifu-${Date.now()}`,
          sender: 'waifu',
          text: "Ehehe~ I heard you loud and clear, Master! Let's keep talking!",
          emotion: 'happy',
          japanesePhrase: 'Daijoubu!',
          timestamp: Date.now(),
        };
        setChatHistory((prev) => [...prev, fallbackMsg]);
        speakWaifuReply(fallbackMsg.text, selectedCharacter, 'happy');
      }
    },
    [chatHistory, selectedCharacter, affectionScore, voiceSettings, speakWaifuReply, memoryProfile, isLiveVisionActive]
  );

  const handleSendMessageRef = useRef(handleSendMessage);
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Gemini Live API Client (gemini-3.1-flash-live-preview) Connection Loop with Long-term Neural Memory
  useEffect(() => {
    if (isLiveVoiceCallActive) {
      // Abort any speech recognition instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      audioEngine.stopPlayback();

      // 1. Pre-Call Neural Memory Injection: compute compact recap, affection bond, and permanent facts
      const recentExchanges = chatHistory
        .slice(-3)
        .map((m) => `${m.sender === 'user' ? 'User' : selectedCharacter.name}: ${m.text}`)
        .join(' | ');

      const affectionBondName =
        affectionScore >= 100
          ? 'Eternal Bond (Lv 5)'
          : affectionScore >= 75
          ? 'Devoted Soulmate (Lv 4)'
          : affectionScore >= 50
          ? 'Sweetheart (Lv 3)'
          : affectionScore >= 25
          ? 'Close Friend (Lv 2)'
          : 'New Acquaintance (Lv 1)';

      const memoryContext = memoryEngine.generateMemoryPromptContext({
        affectionLevelName: affectionBondName,
        affectionScore,
        headPatCount,
        recentRecap: recentExchanges || undefined,
      });

      const currentProfile = memoryEngine.getProfile();
      const liveSystemInstruction = `You are ${selectedCharacter.name}, a loving, expressive anime companion waifu with personality "${selectedCharacter.personality}". Keep your spoken responses concise, conversational, lively, and warm (1 to 2 sentences max) so it sounds ultra-snappy.
${memoryContext}
Address the user as "${currentProfile.userNickname || 'Senpai'}" and remember all their facts forever even across new calls!`.trim();

      // Track the full conversation dialogue during this live voice call for post-call memory consolidation
      const sessionCallTurns: Array<{ sender: 'user' | 'waifu'; text: string }> = [];

      const client = new GeminiLiveAudioClient({
        voiceName: voiceSettings.geminiVoice || selectedCharacter.voice.geminiVoice || 'Kore',
        systemInstruction: liveSystemInstruction,
        onViseme: (v, openness) => {
          setViseme(v);
          setVisemeOpenness(openness);
          setIsTalking(openness > 0.1);
        },
        onTranscription: async (t, isUser) => {
          if (isUser) {
            setInterimTranscript(t);
            sessionCallTurns.push({ sender: 'user', text: t });
            setChatHistory((prev) => [
              ...prev,
              { id: `user-live-${Date.now()}`, sender: 'user', text: t, timestamp: Date.now() },
            ]);
            // Real-time automatic memory learning from live voice conversation
            if (t.trim().length > 5) {
              extractMemoryFact(t).then((fact) => {
                if (fact) {
                  const added = memoryEngine.addMemory(fact, 'interest');
                  if (added) {
                    setMemoryProfile(memoryEngine.getProfile());
                    setMemoryToast(fact);
                    setTimeout(() => setMemoryToast(null), 3500);
                  }
                }
              });
            }
          } else {
            sessionCallTurns.push({ sender: 'waifu', text: t });
            setChatHistory((prev) => [
              ...prev,
              { id: `waifu-live-${Date.now()}`, sender: 'waifu', text: t, timestamp: Date.now(), emotion: 'happy' },
            ]);
            setCurrentEmotion('happy');
            setAffectionScore((prev) => Math.min(100, prev + 1));
            memoryEngine.incrementConversation();
            setMemoryProfile(memoryEngine.getProfile());
          }
        },
        onInterrupted: () => {
          setIsTalking(false);
          setViseme('rest');
        },
        onConnected: () => {
          setIsListening(true);
        },
        onError: (_err) => {
          // Graceful fallback to continuous hands-free voice loop if WebSocket is restricted in preview iframe
          setIsLiveVoiceCallActive(false);
          setIsContinuousListen(true);
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              // ignore
            }
          }
        },
        onDisconnected: () => {
          setIsListening(false);
          setIsTalking(false);
        },
      });

      liveClientRef.current = client;
      client.connect().catch((_err) => {
        // Fallback gracefully
        setIsLiveVoiceCallActive(false);
        setIsContinuousListen(true);
      });

      // 2. Post-Call Memory Consolidation (Executes when Live Voice Call concludes)
      return () => {
        client.disconnect();
        liveClientRef.current = null;

        if (sessionCallTurns.length >= 2) {
          const profileSnapshot = memoryEngine.getProfile();
          const knownFacts = profileSnapshot.memories.map((m) => m.fact);
          consolidateCallMemory(sessionCallTurns, knownFacts, profileSnapshot.userNickname).then((result) => {
            let updated = false;
            if (result.newFacts && result.newFacts.length > 0) {
              const addedCount = memoryEngine.addMemoriesBatch(result.newFacts, 'interest');
              if (addedCount > 0) {
                updated = true;
                setMemoryToast(`🧠 Saved new memory: ${result.newFacts[0]}`);
                setTimeout(() => setMemoryToast(null), 4000);
              }
            }
            if (result.detectedNickname || result.detectedName) {
              memoryEngine.updateUserInfo(
                result.detectedName || profileSnapshot.userName,
                result.detectedNickname || profileSnapshot.userNickname,
                profileSnapshot.customNotes
              );
              updated = true;
            }
            if (updated) {
              setMemoryProfile(memoryEngine.getProfile());
            }
          });
        }
      };
    }
  }, [isLiveVoiceCallActive, selectedCharacter.id]);

  // Ultra-Fast Push-to-Talk Recording Handler (Mutual Exclusion between WebSpeech and MediaRecorder)
  const startPushToTalk = async () => {
    if (isLiveVoiceCallActive || isThinking || isCompanionSpeakingRef.current) return;

    audioEngine.playSoundEffect('ready');
    setIsListening(true);
    setInterimTranscript('');

    // 1. Primary: Use browser real-time SpeechRecognition for 0ms latency
    if (recognitionRef.current) {
      try {
        activePushModeRef.current = 'recognition';
        recognitionRef.current.start();
        return;
      } catch {
        // Recognition already active or unsupported, proceed to media recorder
      }
    }

    // 2. Fallback: MediaRecorder with gemini-3.5-flash transcription
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      activePushModeRef.current = 'media_recorder';

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (base64Audio) {
            setIsThinking(true);
            const transcript = await transcribeAudioRecording(base64Audio, 'audio/webm');
            if (transcript.trim()) {
              handleSendMessage(transcript.trim());
            }
            setIsThinking(false);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
    } catch (e) {
      console.warn('Microphone access notice:', e);
      setIsListening(false);
      activePushModeRef.current = 'none';
    }
  };

  const stopPushToTalk = () => {
    setIsListening(false);
    if (activePushModeRef.current === 'recognition' && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    } else if (
      activePushModeRef.current === 'media_recorder' &&
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      } catch {}
    }
    activePushModeRef.current = 'none';
  };

  // Initialize Web Speech Recognition as continuous fallback (strictly inactive during Live Voice Call & Companion speech)
  useEffect(() => {
    let isDestroyed = false;

    if (isLiveVoiceCallActive) {
      if (recognitionRef.current) {
        try {
          const old = recognitionRef.current;
          old.onstart = null;
          old.onresult = null;
          old.onerror = null;
          old.onend = null;
          old.abort();
        } catch {}
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = isContinuousListen;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (isDestroyed) return;
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (isDestroyed) return;
      // Acoustic Echo & Dual-Voice Protection: ignore if companion is speaking, processing, or spoke within last 1400ms
      if (
        isLiveVoiceCallActiveRef.current ||
        isThinkingRef.current ||
        isTalkingRef.current ||
        isCompanionSpeakingRef.current ||
        isProcessingMessageRef.current ||
        Date.now() - lastCompanionSpeechEndTimeRef.current < 1400
      ) {
        return;
      }

      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const trimmedFinal = finalTranscript.trim();
      if (trimmedFinal) {
        const now = Date.now();
        const lowerFinal = trimmedFinal.toLowerCase();

        // 1. Prevent duplicate dispatch within 2.5 seconds for the same phrase
        if (
          lastProcessedSpeechRef.current.text.toLowerCase() === lowerFinal &&
          now - lastProcessedSpeechRef.current.time < 2500
        ) {
          return;
        }

        // 2. Acoustic Speaker Echo Suppression: discard if this transcript matches recent companion speech
        const cleanWords = lowerFinal.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2);
        if (cleanWords.length > 0) {
          const isEcho = recentSpokenWaifuTextsRef.current.some((spoken) => {
            const cleanSpoken = spoken.replace(/[^a-z0-9\s]/g, '');
            if (cleanSpoken.includes(lowerFinal) || lowerFinal.includes(cleanSpoken)) return true;
            const matchCount = cleanWords.filter((w) => cleanSpoken.includes(w)).length;
            return matchCount / cleanWords.length >= 0.55;
          });

          if (isEcho) {
            console.log('[Audio Guard] Dropped acoustic speaker echo:', trimmedFinal);
            return;
          }
        }

        lastProcessedSpeechRef.current = { text: trimmedFinal, time: now };

        // Abort recognition immediately so no microphone audio leaks while model is thinking/speaking
        try {
          recognition.abort();
        } catch {}
        setIsListening(false);

        handleSendMessageRef.current(trimmedFinal);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (e) => {
      if (isDestroyed) return;
      console.warn('Speech recognition status:', e.error);
      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.onend = () => {
      if (isDestroyed || recognitionRef.current !== recognition) return;
      if (
        isContinuousListenRef.current &&
        !isLiveVoiceCallActiveRef.current &&
        !isTalkingRef.current &&
        !isThinkingRef.current &&
        !isCompanionSpeakingRef.current &&
        !isProcessingMessageRef.current &&
        Date.now() - lastCompanionSpeechEndTimeRef.current >= 1400
      ) {
        try {
          recognition.start();
        } catch {
          // ignore
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    if (isContinuousListen && !isLiveVoiceCallActive && !isCompanionSpeakingRef.current && !isThinkingRef.current) {
      try {
        recognition.start();
      } catch {}
    }

    return () => {
      isDestroyed = true;
      try {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
      } catch {}
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
  }, [isContinuousListen, isLiveVoiceCallActive]);

  const toggleContinuousListen = () => {
    setIsContinuousListen((prev) => {
      const next = !prev;
      audioEngine.stopPlayback();
      if (next) {
        setIsLiveVoiceCallActive(false);
        audioEngine.playSoundEffect('ready');
      } else {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }
      }
      return next;
    });
  };

  const toggleLiveVoiceCall = () => {
    setIsLiveVoiceCallActive((prev) => {
      const next = !prev;
      audioEngine.stopPlayback();
      if (next) {
        setIsContinuousListen(false);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }
        audioEngine.playSoundEffect('ready');
      }
      return next;
    });
  };

  // Touch Interactions
  const handleHeadPat = () => {
    setHeadPatCount((prev) => prev + 1);
    setAffectionScore((prev) => Math.min(100, prev + 1));
    audioEngine.playSoundEffect('headpat');
    setCurrentEmotion('love');
    if (Math.random() < 0.3) {
      const cuteReplies = [
        'Ehehe~ Your hand feels so warm, Master! (✿◡‿◡)',
        'M-More head-pats please! Purr~',
        'Kyaa! You know exactly how to make me happy!',
      ];
      const reply = cuteReplies[Math.floor(Math.random() * cuteReplies.length)];
      setChatHistory((prev) => [
        ...prev,
        {
          id: `pat-${Date.now()}`,
          sender: 'waifu',
          text: reply,
          japanesePhrase: 'Ehehe~',
          emotion: 'love',
          action: 'leans into your hand happily',
          timestamp: Date.now(),
        },
      ]);
      speakWaifuReply(reply, selectedCharacter, 'love');
    }
  };

  const handleCheekPoke = () => {
    setAffectionScore((prev) => Math.min(100, prev + 1));
    audioEngine.playSoundEffect('poke');
    setCurrentEmotion('pout');
    if (Math.random() < 0.4) {
      const pouts = [
        "Mou~! Don't poke my cheek! It's not squishy!",
        'Hmph! Baka! You did that on purpose, didn\'t you? >///<',
      ];
      const reply = pouts[Math.floor(Math.random() * pouts.length)];
      setChatHistory((prev) => [
        ...prev,
        {
          id: `poke-${Date.now()}`,
          sender: 'waifu',
          text: reply,
          japanesePhrase: 'Baka!',
          emotion: 'pout',
          action: 'puffs out cheeks adorably',
          timestamp: Date.now(),
        },
      ]);
      speakWaifuReply(reply, selectedCharacter, 'pout');
    }
  };

  // Webcam Vision Analysis
  const handleAnalyzeVisionFrame = async (base64Image: string) => {
    setIsThinking(true);
    try {
      const visionResult = await analyzeCameraSnapshot(
        base64Image,
        selectedCharacter,
        voiceSettings.geminiVoice
      );
      const waifuMsg: ChatMessage = {
        id: `vision-${Date.now()}`,
        sender: 'waifu',
        text: visionResult.reply,
        emotion: visionResult.emotion,
        action: visionResult.action,
        japanesePhrase: visionResult.japanesePhrase,
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, waifuMsg]);
      setCurrentEmotion(visionResult.emotion);
      setAffectionScore((prev) => Math.min(100, prev + visionResult.affectionDelta));
      setIsThinking(false);
      speakWaifuReply(
        visionResult.reply,
        selectedCharacter,
        visionResult.emotion,
        visionResult.audioBase64,
        visionResult.sampleRate
      );
    } catch (err) {
      console.error('Vision analysis error:', err);
      setIsThinking(false);
    }
  };

  // Take Snapshot / Polaroid
  const handleTakeSnapshot = () => {
    const canvas =
      (document.getElementById('vrm-canvas') as HTMLCanvasElement) ||
      (document.getElementById('anime-live-canvas') as HTMLCanvasElement);
    if (!canvas) return;
    audioEngine.playSoundEffect('camera');
    const dataUrl = canvas.toDataURL('image/png');
    setSnapshotUrl(dataUrl);
  };

  const lastMessage = chatHistory[chatHistory.length - 1] || null;

  return (
    <div
      id="live-waifu-app"
      className={`relative w-screen h-screen overflow-hidden select-none bg-gradient-to-br ${selectedBackground.bgGradient} text-[#e5e5e5] font-sans`}
    >
      {/* Dynamic Background Image / Aesthetic Poster */}
      {selectedBackground.imageUrl ? (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={selectedBackground.imageUrl}
            alt={selectedBackground.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center scale-[1.03] transition-all duration-1000 ease-out filter brightness-[0.82] contrast-[1.06] saturate-[1.08]"
          />
          {/* Subtle Ambient Vignette & Room Depth Lighting */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/60" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.65)_100%)]" />
        </div>
      ) : null}

      {/* Cyber Grid & Holographic Scanlines Overlay (Subtle in Room Mode) */}
      <div className={`absolute inset-0 pointer-events-none cyber-grid-bg ${selectedBackground.imageUrl ? 'opacity-10' : 'opacity-30'} z-0`} />
      <div className={`absolute inset-0 pointer-events-none holo-scanlines ${selectedBackground.imageUrl ? 'opacity-10' : 'opacity-25'} z-10`} />

      {/* Cyber Ambient Radial Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-pink-600/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Dynamic Ambient Particle Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {selectedBackground.ambientParticles === 'sakura' && (
          <div className="w-full h-full opacity-25 bg-[radial-gradient(#ec4899_1.5px,transparent_1.5px)] [background-size:28px_28px] animate-pulse" />
        )}
        {selectedBackground.ambientParticles === 'sparkles' && (
          <div className="w-full h-full opacity-25 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:36px_36px]" />
        )}
        {selectedBackground.ambientParticles === 'hearts' && (
          <div className="w-full h-full opacity-20 bg-[radial-gradient(#f43f5e_1.5px,transparent_1.5px)] [background-size:32px_32px] animate-pulse" />
        )}
      </div>

      {/* Unified 2099 Header Bar */}
      <CompanionHeader
        selectedCharacter={selectedCharacter}
        allCharacters={CHARACTER_PRESETS}
        onSelectCharacter={handleSelectCharacter}
        affectionLevel={affectionLevel}
        affectionScore={affectionScore}
        onOpenAffection={() => setIsAffectionOpen(true)}
        onOpenMemoryCore={() => setIsMemoryCoreOpen(true)}
        isLiveVoiceCallActive={isLiveVoiceCallActive}
        liveCallDuration={liveCallDuration}
        onToggleLiveVoiceCall={toggleLiveVoiceCall}
        isLiveVisionActive={isLiveVisionActive}
        onToggleLiveVision={() => setIsLiveVisionActive((prev) => !prev)}
        renderEngine={renderEngine}
        onToggleRenderEngine={setRenderEngine}
        isPlainMode={isPlainMode}
        onTogglePlainMode={() => setIsPlainMode((prev) => !prev)}
        onOpenMenu={() => setIsMenuDrawerOpen(true)}
        isMenuOpen={isMenuDrawerOpen}
        isTalking={isTalking}
        isListening={isListening}
        isThinking={isThinking}
        isPlayingMusic={isPlayingMusic}
        currentTrackTitle={currentTrack.title}
      />

      {/* Main Character Stage Viewport */}
      <main className={`relative w-full h-full flex items-center justify-center ${isPlainMode ? 'p-0' : 'pt-16 pb-24 px-2'} overflow-hidden`}>
        <div className="relative w-full h-full max-w-5xl flex items-center justify-center">
          {renderEngine === '3d-vrm' ? (
            <VRMCharacterCanvas
              character={selectedCharacter}
              customization={customization}
              emotion={currentEmotion}
              viseme={viseme}
              visemeOpenness={visemeOpenness}
              isTalking={isTalking}
              isListening={isListening}
              isThinking={isThinking}
              isPlayingMusic={isPlayingMusic}
              isDancing={isDancing}
              showFloorProjector={true}
              customVrmUrl={customVrmUrl}
              activeStance={activeStance}
              onSelectStance={setActiveStance}
              onHeadPat={handleHeadPat}
              onCheekPoke={handleCheekPoke}
              onUploadVrmFile={(file) => {
                const url = URL.createObjectURL(file);
                setCustomVrmUrl(url);
              }}
            />
          ) : (
            <AnimeCharacterCanvas
              character={selectedCharacter}
              customization={customization}
              emotion={currentEmotion}
              viseme={viseme}
              visemeOpenness={visemeOpenness}
              isTalking={isTalking}
              isListening={isListening}
              isThinking={isThinking}
              isPlayingMusic={isPlayingMusic}
              isDancing={isDancing}
              showFloorProjector={true}
              onHeadPat={handleHeadPat}
              onCheekPoke={handleCheekPoke}
            />
          )}
        </div>
      </main>

      {/* Live Conversation Subtitle & HUD (Positioned above clean chat bar) */}
      {!isPlainMode && (
        <ChatHUD
          lastMessage={lastMessage}
          chatHistory={chatHistory}
          isTalking={isTalking}
          isListening={isListening}
          isThinking={isThinking}
          interimTranscript={interimTranscript}
          onTopicClick={handleSendMessage}
          starterMessages={selectedCharacter.starterMessages}
          isPlayingMusic={isPlayingMusic}
          currentTrackTitle={currentTrack.title}
          onOpenMusicPlayer={() => setIsMusicPlayerOpen(true)}
          isLiveVoiceCallActive={isLiveVoiceCallActive}
          liveCallDuration={liveCallDuration}
          onToggleLiveVoiceCall={toggleLiveVoiceCall}
          onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
          activeVoiceName={voiceSettings.geminiVoice}
        />
      )}

      {/* Unified Minimalist 2099 Chat & Action Bar */}
      {!isPlainMode && (
        <CompanionChatBar
          selectedCharacter={selectedCharacter}
          isListening={isListening}
          isContinuousListen={isContinuousListen}
          onToggleContinuousListen={toggleContinuousListen}
          onStartPushToTalk={startPushToTalk}
          onStopPushToTalk={stopPushToTalk}
          onSendMessage={handleSendMessage}
          isThinking={isThinking}
          onOpenVision={() => setIsVisionOpen(true)}
          onOpenWardrobe={() => setIsWardrobeOpen(true)}
          onOpenMusic={() => setIsMusicPlayerOpen(true)}
          onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
          onOpenAffection={() => setIsAffectionOpen(true)}
          onTakeSnapshot={handleTakeSnapshot}
          isMuted={isMuted}
          onToggleMute={() => {
            setIsMuted((prev) => {
              const next = !prev;
              audioEngine.setMuted(next);
              return next;
            });
          }}
          isDancing={isDancing}
          onToggleDance={() => setIsDancing((prev) => !prev)}
          onTriggerEmotion={(emo) => setCurrentEmotion(emo)}
        />
      )}

      {/* Side Settings & Feature Drawer */}
      <CompanionMenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        selectedCharacter={selectedCharacter}
        allCharacters={CHARACTER_PRESETS}
        onSelectCharacter={handleSelectCharacter}
        renderEngine={renderEngine}
        onToggleRenderEngine={setRenderEngine}
        activeStance={activeStance}
        onSelectStance={setActiveStance}
        onUploadVrmFile={(file) => {
          const url = URL.createObjectURL(file);
          setCustomVrmUrl(url);
        }}
        onOpenWardrobe={() => setIsWardrobeOpen(true)}
        onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
        onOpenAffection={() => setIsAffectionOpen(true)}
        onOpenMemoryCore={() => setIsMemoryCoreOpen(true)}
        onOpenVision={() => setIsVisionOpen(true)}
        onOpenMusic={() => setIsMusicPlayerOpen(true)}
        isPlainMode={isPlainMode}
        onTogglePlainMode={() => setIsPlainMode((prev) => !prev)}
        isLiveVoiceCallActive={isLiveVoiceCallActive}
        onToggleLiveVoiceCall={toggleLiveVoiceCall}
      />

      {/* Floating Synapse Memory Toast */}
      {memoryToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-cyan-950/90 border border-cyan-400/50 shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-mono text-cyan-200 animate-bounce">
          <Brain className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>
            {selectedCharacter.name} remembered: <strong className="text-white">"{memoryToast}"</strong>
          </span>
        </div>
      )}

      {/* Modals */}
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
        selectedCharacter={selectedCharacter}
        voiceSettings={voiceSettings}
        onChangeVoiceSettings={(newSettings) =>
          setVoiceSettings((prev) => ({ ...prev, ...newSettings }))
        }
        isLiveVoiceCallActive={isLiveVoiceCallActive}
        onToggleLiveVoiceCall={toggleLiveVoiceCall}
      />

      <MemoryCoreModal
        isOpen={isMemoryCoreOpen}
        onClose={() => setIsMemoryCoreOpen(false)}
        character={selectedCharacter}
        memoryProfile={memoryProfile}
        onUpdateMemoryProfile={setMemoryProfile}
      />

      <MusicPlayerModal
        isOpen={isMusicPlayerOpen}
        onClose={() => setIsMusicPlayerOpen(false)}
        isPlaying={isPlayingMusic}
        currentTrack={currentTrack}
        onTogglePlay={handleTogglePlayMusic}
        onSelectTrack={handleSelectMusicTrack}
      />

      <WardrobeModal
        isOpen={isWardrobeOpen}
        onClose={() => setIsWardrobeOpen(false)}
        customization={customization}
        onChangeCustomization={setCustomization}
        selectedBackground={selectedBackground}
        onSelectBackground={setSelectedBackground}
        activeCharacter={selectedCharacter}
      />

      <CameraVisionModal
        isOpen={isVisionOpen}
        onClose={() => setIsVisionOpen(false)}
        character={selectedCharacter}
        onAnalyzeFrame={handleAnalyzeVisionFrame}
        isThinking={isThinking}
      />

      {/* 1-Tap Live Vision PiP Camera Viewport */}
      <LiveVisionPiP
        isActive={isLiveVisionActive}
        onToggle={() => setIsLiveVisionActive((prev) => !prev)}
        onFrameCaptured={(frame) => {
          latestVisionFrameRef.current = frame;
        }}
        onManualAnalyze={(frame) => {
          latestVisionFrameRef.current = frame;
          handleAnalyzeVisionFrame(frame);
        }}
        isCompanionThinking={isThinking}
        companionName={selectedCharacter.name}
      />

      <AffectionModal
        isOpen={isAffectionOpen}
        onClose={() => setIsAffectionOpen(false)}
        character={selectedCharacter}
        affectionScore={affectionScore}
        affectionLevel={affectionLevel}
        chatHistory={chatHistory}
        headPatCount={headPatCount}
        onOpenMemoryCore={() => setIsMemoryCoreOpen(true)}
      />

      <SnapshotModal
        isOpen={!!snapshotUrl}
        onClose={() => setSnapshotUrl(null)}
        character={selectedCharacter}
        emotion={currentEmotion}
        imageDateUrl={snapshotUrl}
      />
    </div>
  );
}
