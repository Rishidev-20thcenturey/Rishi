export type CapsuleChassisTheme = 'obsidian' | 'mecha_pink' | 'arctic_white';
export type SubDisplayMode = 'idol' | 'live' | 'music_eq' | 'bpm' | 'clock';

export interface CapsuleHardwareConfig {
  chassisTheme: CapsuleChassisTheme;
  subDisplayMode: SubDisplayMode;
  ledColor: string;
  isGlassReflective: boolean;
  isFloorEmitterActive: boolean;
  ambientMode: boolean;
  viewMode: 'capsule' | 'fullscreen';
}

export type EmotionType =
  | 'neutral'
  | 'happy'
  | 'blush'
  | 'pout'
  | 'surprised'
  | 'wink'
  | 'love'
  | 'thinking'
  | 'sleepy'
  | 'crying';

export type VisemeType = 'rest' | 'aa' | 'ih' | 'ou' | 'ee' | 'oh' | 'pout' | 'smile';

export interface CharacterPreset {
  id: string;
  name: string;
  title: string;
  tagline: string;
  personality: string;
  systemPrompt: string;
  voice: {
    geminiVoice: string; // 'Kore', 'Puck', 'Zephyr', 'Fenrir'
    webSpeechPitch: number;
    webSpeechRate: number;
    voiceGender: 'female';
  };
  appearance: {
    hairStyle: 'twintails' | 'long' | 'bob' | 'ponytail';
    hairColor: string;
    hairHighlight: string;
    eyeColor: string;
    skinTone: string;
    outfit: 'maid' | 'school' | 'cyber' | 'shrine' | 'casual' | 'blazer';
    outfitPrimaryColor: string;
    outfitSecondaryColor: string;
    accessories: ('catEars' | 'ribbon' | 'hairpin' | 'cyberClips' | 'glasses' | 'choker' | 'whiteBarrettes')[];
  };
  defaultEmotion: EmotionType;
  signatureCatchphrase: string;
  starterMessages: string[];
  avatarImage?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'waifu';
  text: string;
  image?: string;
  japanesePhrase?: string;
  emotion?: EmotionType;
  action?: string;
  timestamp: number;
  audioUrl?: string;
}

export interface WaifuState {
  characterId: string;
  currentEmotion: EmotionType;
  customEmotionOverride: EmotionType | null;
  emotionIntensity: number; // 0 to 1
  viseme: VisemeType;
  visemeOpenness: number; // 0 to 1
  isTalking: boolean;
  isListening: boolean;
  isThinking: boolean;
  headRotation: { x: number; y: number; z: number }; // Target angles
  eyeGaze: { x: number; y: number }; // -1 to 1
  isBlinking: boolean;
  isBeingPetted: boolean;
  affectionScore: number;
  affectionLevel: number; // 1 to 5
  backgroundId: string;
  ambientEffect: 'sakura' | 'sparkles' | 'rain' | 'hearts' | 'none';
}

export interface CustomizationSettings {
  hairColor: string;
  hairStyle: 'twintails' | 'long' | 'bob' | 'ponytail';
  eyeColor: string;
  outfit: 'maid' | 'school' | 'cyber' | 'shrine' | 'casual' | 'blazer';
  outfitColor: string;
  accessories: {
    catEars: boolean;
    ribbon: boolean;
    hairpin: boolean;
    cyberClips: boolean;
    glasses: boolean;
    choker: boolean;
    whiteBarrettes: boolean;
  };
}

export interface VoiceSettings {
  geminiVoice: string; // 'Kore' | 'Aoede' | 'Zephyr' | 'Puck' | 'Fenrir'
  speed: number; // 0.8 to 1.4
  pitch: number; // 0.8 to 1.5
  autoSpeechResume: boolean;
  voiceMode: 'studio_ai' | 'neural_web';
}

export interface BackgroundScene {
  id: string;
  name: string;
  timeOfDay: 'day' | 'sunset' | 'night' | 'cyber';
  bgGradient: string;
  ambientParticles: 'sakura' | 'sparkles' | 'rain' | 'hearts' | 'dust';
  description: string;
  imageUrl?: string;
}

export type MemoryCategory = 'identity' | 'interest' | 'preference' | 'experience' | 'custom';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  fact: string;
  timestamp: number;
}

export interface UserMemoryProfile {
  userName: string;
  userNickname: string;
  memories: MemoryItem[];
  customNotes: string;
  infiniteMemoryEnabled: boolean;
  totalConversations: number;
  lastInteraction: number;
}
