import { BackgroundScene } from '../types';
import japaneseGirlyRoomImg from '../assets/images/japanese_girly_room_1787735517129.jpg';
import pastelAnimeRoomImg from '../assets/images/pastel_anime_room_1787735537192.jpg';
import code27BedroomImg from '../assets/images/code27_bedroom_bg_1787598651695.jpg';

export const BACKGROUND_SCENES: BackgroundScene[] = [
  {
    id: 'japanese-girly-room',
    name: 'Japanese Girly Room',
    timeOfDay: 'night',
    bgGradient: 'from-[#120a16] via-[#1a0f24] to-[#0c0812]',
    ambientParticles: 'sparkles',
    description: 'Cozy aesthetic Japanese anime bedroom with fairy lights, plushies, posters, and soft Tokyo twilight window',
    imageUrl: japaneseGirlyRoomImg,
  },
  {
    id: 'pastel-anime-bedroom',
    name: 'Pastel Kawaii Bedroom',
    timeOfDay: 'day',
    bgGradient: 'from-[#1a101d] via-[#241328] to-[#120b18]',
    ambientParticles: 'hearts',
    description: 'Warm pastel Japanese bedroom with soft sunlight, aesthetic bookshelf, and cute desk setup',
    imageUrl: pastelAnimeRoomImg,
  },
  {
    id: 'cyber-room',
    name: 'Neo Tokyo Cyber Loft',
    timeOfDay: 'cyber',
    bgGradient: 'from-[#050505] via-[#0a0d1a] to-[#131124]',
    ambientParticles: 'sparkles',
    description: 'Cyberpunk anime apartment with neon telemetry and cityscape backdrop',
    imageUrl: code27BedroomImg,
  },
  {
    id: 'sakura-shrine',
    name: 'Midnight Sakura Shrine',
    timeOfDay: 'sunset',
    bgGradient: 'from-[#050505] via-[#1a0c14] to-[#100812]',
    ambientParticles: 'sakura',
    description: 'Deep obsidian twilight with gentle falling sakura petals in the moonlight',
  },
  {
    id: 'deep-obsidian',
    name: 'Neural Obsidian Lab',
    timeOfDay: 'night',
    bgGradient: 'from-[#050505] via-[#0a0a0a] to-[#121212]',
    ambientParticles: 'sparkles',
    description: 'Minimalist high-contrast dark space with subtle radial lighting and neural telemetry',
  },
  {
    id: 'starry-sky',
    name: 'Deep Cosmic Horizon',
    timeOfDay: 'night',
    bgGradient: 'from-[#030303] via-[#070b16] to-[#0d0a1a]',
    ambientParticles: 'sparkles',
    description: 'Infinite dark cosmos with glistening starlight accents',
  },
];
