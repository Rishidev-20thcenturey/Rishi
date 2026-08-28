import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CharacterPreset, CustomizationSettings, EmotionType, VisemeType } from '../types';
import { audioEngine } from '../services/audioEngine';
import confetti from 'canvas-confetti';

interface AnimeCharacterCanvasProps {
  character: CharacterPreset;
  customization?: CustomizationSettings;
  emotion: EmotionType;
  viseme: VisemeType;
  visemeOpenness: number;
  isTalking: boolean;
  isListening: boolean;
  isThinking: boolean;
  onHeadPat?: () => void;
  onCheekPoke?: () => void;
  isPlayingMusic?: boolean;
  isDancing?: boolean;
  showFloorProjector?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  type: 'heart' | 'sparkle' | 'petal' | 'sweat' | 'note' | 'zzz';
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
}

export const AnimeCharacterCanvas: React.FC<AnimeCharacterCanvasProps> = ({
  character,
  customization,
  emotion,
  viseme,
  visemeOpenness,
  isTalking,
  isListening,
  isThinking,
  onHeadPat,
  onCheekPoke,
  isPlayingMusic = false,
  isDancing = false,
  showFloorProjector = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [touchFeedback, setTouchFeedback] = useState<string | null>(null);
  const portraitImgRef = useRef<HTMLImageElement | null>(null);
  const [portraitLoaded, setPortraitLoaded] = useState(false);
  const bedroomBgRef = useRef<HTMLImageElement | null>(null);
  const [bedroomBgLoaded, setBedroomBgLoaded] = useState(false);

  // Load bedroom background image
  useEffect(() => {
    const bgImg = new Image();
    bgImg.src = '/code27_bedroom_bg.jpg';
    bgImg.onload = () => {
      bedroomBgRef.current = bgImg;
      setBedroomBgLoaded(true);
    };
    if (bgImg.complete && bgImg.naturalWidth > 0) {
      bedroomBgRef.current = bgImg;
      setBedroomBgLoaded(true);
    }
  }, []);

  // Load avatar portrait image if available
  useEffect(() => {
    const src = character.avatarImage || (character.id === 'mai' ? '/mai_fullbody_waifu.jpg' : null);
    if (src) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        portraitImgRef.current = img;
        setPortraitLoaded(true);
      };
      img.onerror = () => {
        portraitImgRef.current = null;
        setPortraitLoaded(false);
      };
      if (img.complete && img.naturalWidth > 0) {
        portraitImgRef.current = img;
        setPortraitLoaded(true);
      }
    } else {
      portraitImgRef.current = null;
      setPortraitLoaded(false);
    }
  }, [character.avatarImage, character.id]);

  // Physics & Animation State Refs (to avoid re-renders during 60 FPS loop)
  const animState = useRef({
    time: 0,
    headYaw: 0, // -1 to 1 (left/right)
    headPitch: 0, // -1 to 1 (up/down)
    headRoll: 0, // -1 to 1 (tilt)
    targetYaw: 0,
    targetPitch: 0,
    targetRoll: 0,
    gazeX: 0,
    gazeY: 0,
    blinkProgress: 0, // 0 = open, 1 = fully closed
    isBlinking: false,
    nextBlinkTime: 2.0,
    mouthOpen: 0,
    mouthWidth: 0,
    hairPhysicsAngle: 0,
    hairVelocity: 0,
    earBounceAngle: 0,
    earVelocity: 0,
    ahogeAngle: 0,
    ahogeVelocity: 0,
    blushAlpha: 0.3,
    heartEyeSpin: 0,
    particles: [] as Particle[],
    isPetting: false,
    petCount: 0,
    lastPetTime: 0,
  });

  // Effective appearance (preset or customized)
  const hairColor = customization?.hairColor || character.appearance.hairColor;
  const hairStyle = customization?.hairStyle || character.appearance.hairStyle;
  const eyeColor = customization?.eyeColor || character.appearance.eyeColor;
  const outfit = customization?.outfit || character.appearance.outfit;
  const outfitColor = customization?.outfitColor || character.appearance.outfitPrimaryColor;

  // Active accessories
  const hasCatEars = customization ? customization.accessories.catEars : character.appearance.accessories.includes('catEars');
  const hasRibbon = customization ? customization.accessories.ribbon : character.appearance.accessories.includes('ribbon');
  const hasHairpin = customization ? customization.accessories.hairpin : character.appearance.accessories.includes('hairpin');
  const hasCyberClips = customization ? customization.accessories.cyberClips : character.appearance.accessories.includes('cyberClips');
  const hasGlasses = customization ? customization.accessories.glasses : character.appearance.accessories.includes('glasses');
  const hasChoker = customization ? customization.accessories.choker : character.appearance.accessories.includes('choker');
  const hasWhiteBarrettes = customization ? customization.accessories.whiteBarrettes : character.appearance.accessories.includes('whiteBarrettes');

  // Spawn visual emotion particles
  const spawnParticles = useCallback((type: Particle['type'], count: number, startX: number, startY: number) => {
    for (let i = 0; i < count; i++) {
      const colors = {
        heart: ['#fb7185', '#f43f5e', '#fda4af', '#f472b6'],
        sparkle: ['#fde047', '#facc15', '#67e8f9', '#a7f3d0', '#ffffff'],
        petal: ['#fbcfe8', '#f472b6', '#fda4af'],
        sweat: ['#38bdf8', '#7dd3fc'],
        note: ['#c084fc', '#f472b6', '#38bdf8'],
        zzz: ['#94a3b8', '#cbd5e1', '#e2e8f0'],
      };
      const palette = colors[type];
      animState.current.particles.push({
        x: startX + (Math.random() - 0.5) * 60,
        y: startY + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -1.2 - Math.random() * 2.5,
        size: 10 + Math.random() * 14,
        alpha: 1.0,
        color: palette[Math.floor(Math.random() * palette.length)],
        type,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.1,
        life: 0,
        maxLife: 60 + Math.random() * 40,
      });
    }
  }, []);

  // Mouse & Touch Tracking
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to 1
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1; // -1 to 1

    // Update targets
    animState.current.targetYaw = Math.max(-0.6, Math.min(0.6, nx * 0.7));
    animState.current.targetPitch = Math.max(-0.5, Math.min(0.5, ny * 0.5));
    animState.current.gazeX = Math.max(-1, Math.min(1, nx * 1.2));
    animState.current.gazeY = Math.max(-1, Math.min(1, ny * 1.2));

    // If dragging/petting near top of head
    if (animState.current.isPetting) {
      const now = performance.now();
      if (now - animState.current.lastPetTime > 200) {
        animState.current.petCount++;
        animState.current.lastPetTime = now;
        spawnParticles('heart', 2, canvas.width / 2 + nx * 100, canvas.height * 0.25);
        audioEngine.playSoundEffect('headpat');
        if (animState.current.petCount % 5 === 0 && onHeadPat) {
          onHeadPat();
        }
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const relY = y / rect.height;
    const relX = x / rect.width;

    setIsInteracting(true);

    if (relY < 0.42 && relX > 0.25 && relX < 0.75) {
      // Head-pat zone
      animState.current.isPetting = true;
      animState.current.lastPetTime = performance.now();
      setTouchFeedback('Head-pat! (✿◡‿◡)');
      audioEngine.playSoundEffect('headpat');
      spawnParticles('heart', 6, canvas.width / 2, canvas.height * 0.25);
      if (onHeadPat) onHeadPat();
    } else if (relY >= 0.42 && relY <= 0.65 && (relX < 0.38 || relX > 0.62)) {
      // Cheek poke zone
      setTouchFeedback('Cheek poke! >w<');
      audioEngine.playSoundEffect('blush');
      spawnParticles('sparkle', 5, x, y);
      animState.current.targetRoll = relX < 0.5 ? 0.3 : -0.3;
      if (onCheekPoke) onCheekPoke();
    } else {
      setTouchFeedback('Giggle~ ✨');
      spawnParticles('sparkle', 3, x, y);
    }

    setTimeout(() => setTouchFeedback(null), 1600);
  };

  const handlePointerUp = () => {
    animState.current.isPetting = false;
    setIsInteracting(false);
  };

  // Main Canvas Render Loop (60 FPS)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const state = animState.current;
      state.time += dt;

      // Handle Canvas Sizing
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth || 600;
      const displayHeight = canvas.clientHeight || 700;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const width = displayWidth;
      const height = displayHeight;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // =====================================================================
      // LAYER 0: COZY ANIME BEDROOM / CAPSULE CHAMBER BACKGROUND
      // =====================================================================
      if (bedroomBgRef.current && bedroomBgLoaded) {
        ctx.save();
        // Scale to cover
        const bg = bedroomBgRef.current;
        const scale = Math.max(width / bg.naturalWidth, height / bg.naturalHeight);
        const bgW = bg.naturalWidth * scale;
        const bgH = bg.naturalHeight * scale;
        const bgX = (width - bgW) / 2;
        const bgY = (height - bgH) / 2;
        ctx.drawImage(bg, bgX, bgY, bgW, bgH);

        // Soft Holographic Chamber Lighting & Vignette
        const vignette = ctx.createRadialGradient(
          width / 2,
          height * 0.45,
          width * 0.2,
          width / 2,
          height * 0.45,
          width * 0.8
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.35)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else {
        // Fallback Cyber Bedroom Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // =====================================================================
      // LAYER 0.5: HOLOGRAPHIC FLOOR PROJECTOR DISC
      // =====================================================================
      if (showFloorProjector) {
        drawHologramFloorProjector(ctx, width / 2, height * 0.90, width * 0.42, state.time, isPlayingMusic);
      }

      // 1. Interpolate Head Angles & Idle Motion
      let idlePitch = Math.sin(state.time * 1.2) * 0.04;
      let idleYaw = Math.cos(state.time * 0.8) * 0.05;
      let idleRoll = Math.sin(state.time * 0.9) * 0.03;
      let musicSwayX = 0;
      let musicBobY = 0;

      if (isPlayingMusic || isDancing) {
        // Rhythm dance motion
        musicSwayX = Math.sin(state.time * 4.2) * 8;
        musicBobY = Math.abs(Math.sin(state.time * 4.2)) * 6;
        idleRoll += Math.sin(state.time * 4.2) * 0.06;
        idlePitch += Math.cos(state.time * 4.2) * 0.03;
      }

      if (isThinking) {
        state.targetPitch = -0.15;
        state.targetRoll = 0.2;
        idleRoll += Math.sin(state.time * 2.5) * 0.04;
      } else if (isTalking) {
        idlePitch += Math.sin(state.time * 6.0) * 0.06 * (visemeOpenness + 0.2);
        idleRoll += Math.cos(state.time * 3.0) * 0.04;
      } else if (isListening) {
        state.targetRoll = -0.15; // attentive tilt
        idlePitch += Math.sin(state.time * 1.5) * 0.03;
      }

      // Smooth damping (Lerp)
      state.headYaw += (state.targetYaw + idleYaw - state.headYaw) * (dt * 6);
      state.headPitch += (state.targetPitch + idlePitch - state.headPitch) * (dt * 6);
      state.headRoll += (state.targetRoll + idleRoll - state.headRoll) * (dt * 6);

      // Reset target angles gently towards center if not interacting
      if (!isInteracting && Math.random() < 0.02) {
        state.targetYaw = (Math.random() - 0.5) * 0.3;
        state.targetPitch = (Math.random() - 0.5) * 0.2;
        state.targetRoll = (Math.random() - 0.5) * 0.15;
      }

      // 2. Eye Blinking Logic
      if (state.time > state.nextBlinkTime) {
        state.isBlinking = true;
        state.blinkProgress += dt * 9; // speed of blink
        if (state.blinkProgress >= 1) {
          state.blinkProgress = 0;
          state.isBlinking = false;
          state.nextBlinkTime = state.time + 2.5 + Math.random() * 4.0;
        }
      }

      // 3. Hair & Ears Physics Simulation (Spring Damping)
      const springK = 80;
      const dampC = 8;
      const hairTarget = -state.headYaw * 0.5 - state.headRoll * 0.7;
      const hairForce = springK * (hairTarget - state.hairPhysicsAngle) - dampC * state.hairVelocity;
      state.hairVelocity += hairForce * dt;
      state.hairPhysicsAngle += state.hairVelocity * dt;

      const earTarget = -state.headYaw * 0.8 + Math.sin(state.time * 4) * 0.05;
      const earForce = springK * (earTarget - state.earBounceAngle) - dampC * state.earVelocity;
      state.earVelocity += earForce * dt;
      state.earBounceAngle += state.earVelocity * dt;

      // Ahoge (hair cowlick antenna)
      const ahogeTarget = -state.headRoll * 1.5 + Math.sin(state.time * 3) * 0.15;
      const ahogeForce = 120 * (ahogeTarget - state.ahogeAngle) - 10 * state.ahogeVelocity;
      state.ahogeVelocity += ahogeForce * dt;
      state.ahogeAngle += state.ahogeVelocity * dt;

      // 4. Center coordinates & Breathing
      const cx = width / 2;
      const cy = height * 0.48; // Eye-level anchor
      const breath = Math.sin(state.time * 2.2) * 4;
      const effectiveEmotion = state.isPetting ? 'love' : emotion;

      // Check if High-Fidelity 2.5D Portrait mode is active for this character
      if (portraitImgRef.current && portraitLoaded) {
        drawLive2DPortrait(
          ctx,
          portraitImgRef.current,
          width,
          height,
          cx,
          cy,
          state,
          breath,
          effectiveEmotion,
          viseme,
          visemeOpenness,
          isTalking,
          dt
        );
      } else {
        // Draw Procedural Character Hierarchy
        ctx.save();
        ctx.translate(cx, cy);

        // ==========================================
        // LAYER 1: BACK HAIR / TWINTAILS
        // ==========================================
        drawBackHair(ctx, hairStyle, hairColor, state.hairPhysicsAngle, state.headYaw);

        // ==========================================
        // LAYER 2: TORSO & SHOULDERS & OUTFIT
        // ==========================================
        drawTorsoAndOutfit(ctx, outfit, outfitColor, breath, state.headYaw, hasChoker);

        // ==========================================
        // LAYER 3: NECK & JAW
        // ==========================================
        ctx.save();
        // Apply Head Rotations & Translation (Parallax 2.5D Rig)
        ctx.translate(state.headYaw * 20, state.headPitch * 15 + breath * 0.3);
        ctx.rotate(state.headRoll * 0.25);

        drawNeck(ctx);
        drawFaceBase(ctx);

        // ==========================================
        // LAYER 4: EARS & ACCESSORIES (CAT EARS)
        // ==========================================
        if (hasCatEars) {
          drawCatEars(ctx, hairColor, state.earBounceAngle, state.headYaw);
        }

        // ==========================================
        // LAYER 5: FACIAL FEATURES (Eyes, Blush, Eyebrows, Mouth)
        // ==========================================
        // Blush
        drawBlush(ctx, effectiveEmotion, state.headYaw);

        // Eyes
        drawEyes(
          ctx,
          eyeColor,
          effectiveEmotion,
          state.blinkProgress,
          state.gazeX,
          state.gazeY,
          state.headYaw,
          state.headPitch,
          state.time
        );

        // Eyebrows
        drawEyebrows(ctx, hairColor, effectiveEmotion, state.headYaw);

        // Nose
        drawNose(ctx, state.headYaw);

        // Mouth (Viseme Lip Sync)
        drawMouth(ctx, viseme, visemeOpenness, effectiveEmotion, isTalking, state.time);

        // Glasses (if active)
        if (hasGlasses) {
          drawGlasses(ctx, state.headYaw);
        }

        // ==========================================
        // LAYER 6: FRONT BANGS & SIDE HAIR
        // ==========================================
        drawFrontHair(
          ctx,
          hairStyle,
          hairColor,
          character.appearance.hairHighlight,
          state.hairPhysicsAngle,
          state.headYaw,
          state.ahogeAngle
        );

        // Hair Accessories (Clips, Ribbons, Hairpin, White Barrettes)
        if (hasCyberClips) drawCyberClips(ctx, state.headYaw);
        if (hasHairpin) drawHairpin(ctx, state.headYaw);
        if (hasRibbon) drawHairRibbon(ctx, state.headYaw);
        if (hasWhiteBarrettes) drawWhiteBarrettes(ctx, state.headYaw);

        ctx.restore(); // restore head transform
        ctx.restore(); // restore center transform
      }

      // ==========================================
      // LAYER 7: FLOATING PARTICLES & EMOTE FX
      // ==========================================
      drawParticles(ctx, state.particles, dt);

      // Ambient emotion & music notes spawning
      if (isPlayingMusic && Math.random() < 0.12) {
        spawnParticles('note', 1, cx + (Math.random() - 0.5) * 120, height * 0.85);
      }
      if (Math.random() < 0.05) {
        if (effectiveEmotion === 'love') spawnParticles('heart', 1, cx, cy - 40);
        else if (effectiveEmotion === 'happy' || effectiveEmotion === 'wink') spawnParticles('sparkle', 1, cx, cy - 50);
        else if (effectiveEmotion === 'sleepy') spawnParticles('zzz', 1, cx + 70, cy - 100);
      }

      ctx.restore(); // Restore root canvas transform (undo scale(dpr, dpr))

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    character,
    customization,
    emotion,
    viseme,
    visemeOpenness,
    isTalking,
    isListening,
    isThinking,
    isInteracting,
    isPlayingMusic,
    isDancing,
    showFloorProjector,
    spawnParticles,
    hasCatEars,
    hasRibbon,
    hasHairpin,
    hasCyberClips,
    hasGlasses,
    hasChoker,
    hasWhiteBarrettes,
    hairColor,
    hairStyle,
    eyeColor,
    outfit,
    outfitColor,
  ]);

  // Trigger celebration confetti on high affection / special moments
  useEffect(() => {
    if (emotion === 'love') {
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#fb7185', '#f43f5e', '#fbcfe8', '#fda4af'],
        disableForReducedMotion: true,
      });
    }
  }, [emotion]);

  return (
    <div
      id="anime-character-container"
      className="relative w-full h-full flex items-center justify-center select-none touch-none overflow-hidden"
    >
      <canvas
        id="anime-live-canvas"
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-full max-w-2xl max-h-[850px] cursor-grab active:cursor-grabbing transition-transform duration-200"
      />

      {/* Touch Interaction Feedback Toast */}
      {touchFeedback && (
        <div className="absolute top-16 px-4 py-1.5 bg-white/10 backdrop-blur-md text-white font-mono uppercase tracking-wider text-xs border border-white/20 rounded-full shadow-2xl animate-bounce pointer-events-none">
          {touchFeedback}
        </div>
      )}

      {/* Live Audio / Thinking Aura Ring */}
      {isTalking && (
        <div className="absolute inset-0 pointer-events-none border border-white/15 rounded-3xl animate-pulse" />
      )}
      {isListening && (
        <div className="absolute inset-0 pointer-events-none border border-white/25 rounded-3xl animate-pulse" />
      )}
    </div>
  );
};

// =========================================================================
// CANVAS PROCEDURAL RENDERING HELPERS (High Aesthetic Anime Artistry)
// =========================================================================

function drawBackHair(
  ctx: CanvasRenderingContext2D,
  style: string,
  color: string,
  sway: number,
  yaw: number
) {
  ctx.save();
  ctx.fillStyle = color;

  if (style === 'twintails') {
    // Left Twintail
    ctx.save();
    ctx.translate(-85, -60);
    ctx.rotate(sway * 0.8 - 0.2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-50, 40, -70, 160, -35, 260);
    ctx.bezierCurveTo(-20, 290, 10, 240, 0, 180);
    ctx.bezierCurveTo(-10, 120, 10, 50, 15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right Twintail
    ctx.save();
    ctx.translate(85, -60);
    ctx.rotate(sway * 0.8 + 0.2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(50, 40, 70, 160, 35, 260);
    ctx.bezierCurveTo(20, 290, -10, 240, 0, 180);
    ctx.bezierCurveTo(10, 120, -10, 50, -15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (style === 'long') {
    // Flowing long locks behind shoulders
    ctx.save();
    ctx.translate(0, -60);
    ctx.beginPath();
    ctx.moveTo(-110, 0);
    ctx.bezierCurveTo(-140 + sway * 30, 120, -120 + sway * 40, 260, -70, 340);
    ctx.lineTo(70, 340);
    ctx.bezierCurveTo(120 + sway * 40, 260, 140 + sway * 30, 120, 110, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (style === 'ponytail') {
    // High Ponytail
    ctx.save();
    ctx.translate(35, -120);
    ctx.rotate(sway * 0.9 + 0.4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(70, -20, 130, 80, 90, 220);
    ctx.bezierCurveTo(60, 240, 40, 180, 30, 120);
    ctx.bezierCurveTo(20, 60, 10, 20, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawTorsoAndOutfit(
  ctx: CanvasRenderingContext2D,
  outfit: string,
  color: string,
  breath: number,
  yaw: number,
  hasChoker: boolean
) {
  ctx.save();
  ctx.translate(yaw * 8, 120 + breath);

  // Shoulders & Chest Base
  ctx.fillStyle = '#fff1f2'; // Skin
  ctx.beginPath();
  ctx.moveTo(-75, 0);
  ctx.lineTo(-30, 10);
  ctx.lineTo(30, 10);
  ctx.lineTo(75, 0);
  ctx.lineTo(95, 140);
  ctx.lineTo(-95, 140);
  ctx.closePath();
  ctx.fill();

  // Outfit Main Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-85, 25);
  ctx.quadraticCurveTo(0, 45, 85, 25);
  ctx.lineTo(105, 150);
  ctx.lineTo(-105, 150);
  ctx.closePath();
  ctx.fill();

  if (outfit === 'maid') {
    // White Maid Apron & Frills
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-55, 32);
    ctx.lineTo(55, 32);
    ctx.lineTo(40, 150);
    ctx.lineTo(-40, 150);
    ctx.closePath();
    ctx.fill();

    // Frill trims
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-60, 30);
    ctx.lineTo(-45, 12);
    ctx.lineTo(-30, 30);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(60, 30);
    ctx.lineTo(45, 12);
    ctx.lineTo(30, 30);
    ctx.stroke();
  } else if (outfit === 'school') {
    // Sailor collar & red tie ribbon
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-65, 25);
    ctx.lineTo(-20, 75);
    ctx.lineTo(0, 60);
    ctx.lineTo(20, 75);
    ctx.lineTo(65, 25);
    ctx.closePath();
    ctx.fill();

    // Red Ribbon Knot
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(0, 65, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5, 68);
    ctx.lineTo(-18, 110);
    ctx.lineTo(0, 95);
    ctx.lineTo(18, 110);
    ctx.lineTo(5, 68);
    ctx.closePath();
    ctx.fill();
  } else if (outfit === 'cyber') {
    // Cyber glowing circuit lines
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-60, 45);
    ctx.lineTo(-25, 75);
    ctx.lineTo(-25, 130);
    ctx.moveTo(60, 45);
    ctx.lineTo(25, 75);
    ctx.lineTo(25, 130);
    ctx.stroke();
  } else if (outfit === 'shrine') {
    // Traditional Miko White Kimono Collar with Red Accent
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-60, 15);
    ctx.lineTo(0, 75);
    ctx.lineTo(60, 15);
    ctx.lineTo(75, 140);
    ctx.lineTo(-75, 140);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-45, 15);
    ctx.lineTo(0, 70);
    ctx.stroke();
  } else if (outfit === 'blazer') {
    // Elegant Japanese High School Tan Blazer + Cream Knit Vest + White Shirt + Red Tie
    // 1. Cream Knit Vest V-Neck
    ctx.fillStyle = '#fef3c7'; // Cream knit
    ctx.beginPath();
    ctx.moveTo(-50, 18);
    ctx.lineTo(0, 85);
    ctx.lineTo(50, 18);
    ctx.lineTo(60, 145);
    ctx.lineTo(-60, 145);
    ctx.closePath();
    ctx.fill();

    // 2. White Collared Dress Shirt
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-35, 15);
    ctx.lineTo(0, 52);
    ctx.lineTo(35, 15);
    ctx.closePath();
    ctx.fill();

    // Collar flaps
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    // Left collar
    ctx.beginPath();
    ctx.moveTo(-28, 15);
    ctx.lineTo(-6, 45);
    ctx.lineTo(-2, 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right collar
    ctx.beginPath();
    ctx.moveTo(28, 15);
    ctx.lineTo(6, 45);
    ctx.lineTo(2, 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Red Necktie
    ctx.fillStyle = '#dc2626';
    // Tie knot
    ctx.beginPath();
    ctx.moveTo(-6, 38);
    ctx.lineTo(6, 38);
    ctx.lineTo(4, 50);
    ctx.lineTo(-4, 50);
    ctx.closePath();
    ctx.fill();
    // Tie blade
    ctx.beginPath();
    ctx.moveTo(-4, 50);
    ctx.lineTo(4, 50);
    ctx.lineTo(7, 115);
    ctx.lineTo(0, 128);
    ctx.lineTo(-7, 115);
    ctx.closePath();
    ctx.fill();

    // Tie silver clip / bar
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-6, 75, 12, 3.5);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-6, 77.5, 12, 1);

    // 4. Blazer Jacket Lapels & Front Seams
    ctx.fillStyle = color || '#b48356';
    // Left lapel
    ctx.beginPath();
    ctx.moveTo(-75, 15);
    ctx.lineTo(-45, 15);
    ctx.lineTo(-30, 85);
    ctx.lineTo(-75, 140);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9a6c42';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Right lapel
    ctx.beginPath();
    ctx.moveTo(75, 15);
    ctx.lineTo(45, 15);
    ctx.lineTo(30, 85);
    ctx.lineTo(75, 140);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9a6c42';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Choker
  if (hasChoker) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-22, -10, 44, 8);
    // Cute gold bell/heart charm
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawNeck(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#fce7e7';
  ctx.beginPath();
  ctx.moveTo(-20, 60);
  ctx.lineTo(20, 60);
  ctx.lineTo(25, 110);
  ctx.lineTo(-25, 110);
  ctx.closePath();
  ctx.fill();
}

function drawFaceBase(ctx: CanvasRenderingContext2D) {
  // Smooth anime jawline / chin
  ctx.fillStyle = '#fff1f2';
  ctx.beginPath();
  ctx.moveTo(-82, -20);
  ctx.bezierCurveTo(-86, 40, -65, 85, 0, 102); // Chin peak
  ctx.bezierCurveTo(65, 85, 86, 40, 82, -20);
  ctx.bezierCurveTo(80, -90, -80, -90, -82, -20);
  ctx.closePath();
  ctx.fill();

  // Subtle chin shadow
  ctx.fillStyle = '#fecdd3';
  ctx.beginPath();
  ctx.moveTo(-15, 96);
  ctx.quadraticCurveTo(0, 103, 15, 96);
  ctx.quadraticCurveTo(0, 99, -15, 96);
  ctx.fill();
}

function drawCatEars(
  ctx: CanvasRenderingContext2D,
  color: string,
  bounce: number,
  yaw: number
) {
  ctx.save();
  // Left Ear
  ctx.save();
  ctx.translate(-68 + yaw * 10, -85);
  ctx.rotate(-0.35 + bounce * 0.5);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-20, 20);
  ctx.quadraticCurveTo(-35, -45, -8, -60);
  ctx.quadraticCurveTo(20, -35, 25, 20);
  ctx.closePath();
  ctx.fill();

  // Inner Pink fluff
  ctx.fillStyle = '#fda4af';
  ctx.beginPath();
  ctx.moveTo(-10, 15);
  ctx.quadraticCurveTo(-20, -35, -5, -45);
  ctx.quadraticCurveTo(12, -25, 15, 15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Right Ear
  ctx.save();
  ctx.translate(68 + yaw * 10, -85);
  ctx.rotate(0.35 + bounce * 0.5);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-25, 20);
  ctx.quadraticCurveTo(-20, -35, 8, -60);
  ctx.quadraticCurveTo(35, -45, 20, 20);
  ctx.closePath();
  ctx.fill();

  // Inner Pink fluff
  ctx.fillStyle = '#fda4af';
  ctx.beginPath();
  ctx.moveTo(-15, 15);
  ctx.quadraticCurveTo(-12, -25, 5, -45);
  ctx.quadraticCurveTo(20, -35, 10, 15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawBlush(ctx: CanvasRenderingContext2D, emotion: EmotionType, yaw: number) {
  const intensity =
    emotion === 'blush' || emotion === 'love'
      ? 0.8
      : emotion === 'happy' || emotion === 'wink'
      ? 0.45
      : emotion === 'pout'
      ? 0.6
      : 0.25;

  ctx.save();
  // Left Cheek
  const leftX = -46 + yaw * 12;
  const rightX = 46 + yaw * 12;
  const cheekY = 32;

  // Radial Soft Glow
  const glowL = ctx.createRadialGradient(leftX, cheekY, 2, leftX, cheekY, 24);
  glowL.addColorStop(0, `rgba(244, 63, 94, ${intensity})`);
  glowL.addColorStop(1, 'rgba(244, 63, 94, 0)');
  ctx.fillStyle = glowL;
  ctx.beginPath();
  ctx.arc(leftX, cheekY, 24, 0, Math.PI * 2);
  ctx.fill();

  const glowR = ctx.createRadialGradient(rightX, cheekY, 2, rightX, cheekY, 24);
  glowR.addColorStop(0, `rgba(244, 63, 94, ${intensity})`);
  glowR.addColorStop(1, 'rgba(244, 63, 94, 0)');
  ctx.fillStyle = glowR;
  ctx.beginPath();
  ctx.arc(rightX, cheekY, 24, 0, Math.PI * 2);
  ctx.fill();

  // Anime diagonal hash lines
  if (intensity > 0.4) {
    ctx.strokeStyle = `rgba(225, 29, 72, ${intensity * 0.8})`;
    ctx.lineWidth = 1.8;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(leftX + i * 5 - 4, cheekY - 4);
      ctx.lineTo(leftX + i * 5 + 4, cheekY + 6);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rightX + i * 5 - 4, cheekY - 4);
      ctx.lineTo(rightX + i * 5 + 4, cheekY + 6);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  color: string,
  emotion: EmotionType,
  blinkProgress: number,
  gazeX: number,
  gazeY: number,
  yaw: number,
  pitch: number,
  time: number
) {
  const leftX = -38 + yaw * 14;
  const rightX = 38 + yaw * 14;
  const eyeY = 10 + pitch * 10;

  drawSingleEye(ctx, leftX, eyeY, color, emotion, blinkProgress, gazeX, gazeY, false, time);
  drawSingleEye(
    ctx,
    rightX,
    eyeY,
    color,
    emotion,
    emotion === 'wink' ? 1.0 : blinkProgress,
    gazeX,
    gazeY,
    true,
    time
  );
}

function drawSingleEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  irisColor: string,
  emotion: EmotionType,
  blink: number,
  gazeX: number,
  gazeY: number,
  isRight: boolean,
  time: number
) {
  ctx.save();
  ctx.translate(x, y);

  if (blink > 0.7 || emotion === 'sleepy') {
    // Closed happy crescent anime eye ^_^
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Eyelash flicks
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const flip = isRight ? 1 : -1;
    ctx.moveTo(flip * 14, -4);
    ctx.lineTo(flip * 20, -10);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Eye Sclera (White background)
  ctx.save();
  ctx.beginPath();
  const heightScale = 1 - blink * 0.9;
  ctx.ellipse(0, 0, 18, 22 * heightScale, 0, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Subtle upper eye shadow
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-20, -25, 40, 14);

  // Iris (Colored gradient)
  const gx = gazeX * 5;
  const gy = gazeY * 4;

  const irisGrad = ctx.createLinearGradient(gx, gy - 16, gx, gy + 16);
  irisGrad.addColorStop(0, '#0f172a');
  irisGrad.addColorStop(0.4, irisColor);
  irisGrad.addColorStop(1, '#ffffff');

  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.ellipse(gx, gy, 12, 16 * heightScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(gx, gy - 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Heart-Eyes for Love emotion
  if (emotion === 'love') {
    ctx.fillStyle = '#f43f5e';
    ctx.save();
    ctx.translate(gx, gy - 1);
    ctx.scale(0.8, 0.8);
    drawHeartShape(ctx, 0, 0, 10);
    ctx.restore();
  }

  // Starry-Eyes for Happy
  if (emotion === 'happy' && Math.sin(time * 5) > 0.5) {
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(gx, gy + 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Specular Highlights (Sparkling Anime Reflections)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(gx - 4, gy - 6, 4.5, 0, Math.PI * 2); // Primary high gloss
  ctx.fill();

  ctx.beginPath();
  ctx.arc(gx + 4, gy + 5, 2.5, 0, Math.PI * 2); // Secondary bottom sparkle
  ctx.fill();

  ctx.restore(); // end eye clip

  // Upper Thick Anime Eyeliner
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = 3.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(0, -6 * heightScale, 19, 14 * heightScale, 0, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  // Eyelash flick
  ctx.lineWidth = 2.5;
  const flip = isRight ? 1 : -1;
  ctx.beginPath();
  ctx.moveTo(flip * 15, -12 * heightScale);
  ctx.lineTo(flip * 22, -18 * heightScale);
  ctx.stroke();

  ctx.restore();
}

function drawEyebrows(
  ctx: CanvasRenderingContext2D,
  color: string,
  emotion: EmotionType,
  yaw: number
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';

  const leftX = -38 + yaw * 14;
  const rightX = 38 + yaw * 14;
  let browY = -18;
  let slant = 0;

  if (emotion === 'pout') {
    slant = 0.25; // Angry/determined slant
    browY += 4;
  } else if (emotion === 'surprised' || emotion === 'happy') {
    browY -= 5; // Raised high
  } else if (emotion === 'blush') {
    slant = -0.15; // Shy droop
  }

  // Left Brow
  ctx.save();
  ctx.translate(leftX, browY);
  ctx.rotate(-slant);
  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.quadraticCurveTo(0, -6, 16, 0);
  ctx.stroke();
  ctx.restore();

  // Right Brow
  ctx.save();
  ctx.translate(rightX, browY);
  ctx.rotate(slant);
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.quadraticCurveTo(0, -6, 16, 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawNose(ctx: CanvasRenderingContext2D, yaw: number) {
  ctx.save();
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(yaw * 10, 42, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  viseme: VisemeType,
  openness: number,
  emotion: EmotionType,
  isTalking: boolean,
  time: number
) {
  ctx.save();
  const mouthY = 62;
  ctx.translate(0, mouthY);

  if (emotion === 'pout') {
    // Cute Cat Mouth '3' / Pout Wave
    ctx.strokeStyle = '#9f1239';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-6, -2, 7, 0, Math.PI * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(6, -2, 7, Math.PI * 0.1, Math.PI);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (!isTalking && openness < 0.1) {
    // Gentle resting smile curve
    ctx.strokeStyle = '#9f1239';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -12, 16, Math.PI * 0.3, Math.PI * 0.7);
    ctx.stroke();

    // Cute lower lip dot
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.arc(0, 6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Open mouth phoneme synthesis
  const openW = 12 + openness * 14;
  const openH = 6 + openness * 22;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, openW, openH, 0, 0, Math.PI * 2);
  ctx.clip();

  // Mouth Interior Cavity
  ctx.fillStyle = '#881337';
  ctx.fill();

  // Tongue
  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.ellipse(0, openH * 0.5, openW * 0.8, openH * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cute Little Top Fang Tooth!
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(openW * 0.25, -openH);
  ctx.lineTo(openW * 0.4, -openH + 7);
  ctx.lineTo(openW * 0.55, -openH);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Lip Outline
  ctx.strokeStyle = '#881337';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, openW, openH, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawGlasses(ctx: CanvasRenderingContext2D, yaw: number) {
  ctx.save();
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 2.4;

  const leftX = -38 + yaw * 14;
  const rightX = 38 + yaw * 14;
  const gy = 10;

  // Left Lens
  ctx.strokeRect(leftX - 18, gy - 16, 36, 32);
  // Right Lens
  ctx.strokeRect(rightX - 18, gy - 16, 36, 32);

  // Bridge
  ctx.beginPath();
  ctx.moveTo(leftX + 18, gy - 4);
  ctx.lineTo(rightX - 18, gy - 4);
  ctx.stroke();

  // Gloss sheen
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftX - 12, gy - 12);
  ctx.lineTo(leftX + 12, gy + 12);
  ctx.stroke();
  ctx.restore();
}

function drawFrontHair(
  ctx: CanvasRenderingContext2D,
  style: string,
  color: string,
  highlight: string,
  sway: number,
  yaw: number,
  ahoge: number
) {
  ctx.save();
  ctx.fillStyle = color;

  // Ahoge (Bouncy cowlick antenna hair at top)
  ctx.save();
  ctx.translate(yaw * 8, -85);
  ctx.rotate(ahoge * 0.6);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(20, -35, -25, -65, 5, -80);
  ctx.stroke();
  ctx.restore();

  // Front Bangs (Anime Layering)
  ctx.beginPath();
  ctx.moveTo(-82, -20);
  ctx.bezierCurveTo(-75, 10, -60, 25, -45, 15); // Left bang strand
  ctx.lineTo(-35, -5);
  ctx.bezierCurveTo(-25, 20, -10, 25, 0, 18); // Center bang strand
  ctx.lineTo(10, -5);
  ctx.bezierCurveTo(25, 25, 50, 20, 65, 5); // Right bang strand
  ctx.lineTo(82, -20);
  ctx.bezierCurveTo(80, -95, -80, -95, -82, -20);
  ctx.closePath();
  ctx.fill();

  // Side Locks framing cheeks
  ctx.beginPath();
  ctx.moveTo(-82, -10);
  ctx.bezierCurveTo(-90 + sway * 15, 60, -75 + sway * 20, 120, -55, 140);
  ctx.bezierCurveTo(-65, 80, -70, 30, -75, -5);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(82, -10);
  ctx.bezierCurveTo(90 + sway * 15, 60, 75 + sway * 20, 120, 55, 140);
  ctx.bezierCurveTo(65, 80, 70, 30, 75, -5);
  ctx.closePath();
  ctx.fill();

  // Hair Gloss Ring (Angel Highlight)
  ctx.strokeStyle = highlight || 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(0, -45, 65, 18, 0, Math.PI * 0.9, Math.PI * 1.9);
  ctx.stroke();

  ctx.restore();
}

function drawCyberClips(ctx: CanvasRenderingContext2D, yaw: number) {
  ctx.save();
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#0284c7';
  ctx.shadowBlur = 8;
  // Left Hairclip
  ctx.fillRect(-70 + yaw * 8, -55, 16, 6);
  ctx.fillRect(-70 + yaw * 8, -45, 16, 6);
  // Right Hairclip
  ctx.fillRect(54 + yaw * 8, -55, 16, 6);
  ctx.fillRect(54 + yaw * 8, -45, 16, 6);
  ctx.restore();
}

function drawHairpin(ctx: CanvasRenderingContext2D, yaw: number) {
  ctx.save();
  // Sakura Flower Pin
  ctx.translate(56 + yaw * 8, -50);
  ctx.fillStyle = '#f472b6';
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, 8, 4, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Gold center
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHairRibbon(ctx: CanvasRenderingContext2D, yaw: number) {
  ctx.save();
  ctx.translate(-58 + yaw * 8, -55);
  ctx.rotate(-0.3);
  ctx.fillStyle = '#f43f5e';
  // Left loop
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-20, -15, -25, 15, 0, 0);
  ctx.fill();
  // Right loop
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(20, -15, 25, 15, 0, 0);
  ctx.fill();
  // Center knot
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Mai Sakurajima's Iconic Crossed White Barrettes Hair Clips
function drawWhiteBarrettes(ctx: CanvasRenderingContext2D, yaw: number) {
  ctx.save();
  // Anchor to left bangs side
  ctx.translate(46 + yaw * 8, -52);
  ctx.rotate(0.38);

  // Subtle drop shadow under clips
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.roundRect(-2, 1, 30, 6, 2.5);
  ctx.roundRect(8, -12, 6, 30, 2.5);
  ctx.fill();

  // Primary Horizontal / Diagonal White Barrette Clip
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-3, 0, 30, 5.5, 2.5);
  ctx.fill();
  ctx.stroke();

  // Secondary Crossed White Barrette Clip
  ctx.beginPath();
  ctx.roundRect(7, -13, 5.5, 30, 2.5);
  ctx.fill();
  ctx.stroke();

  // Tiny metallic silver pin hinge detail
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(9.75, 2.75, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life++;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.vRot;
    p.alpha = Math.max(0, 1 - p.life / p.maxLife);

    if (p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;

    if (p.type === 'heart') {
      drawHeartShape(ctx, 0, 0, p.size);
    } else if (p.type === 'sparkle') {
      drawSparkleShape(ctx, 0, 0, p.size);
    } else if (p.type === 'note') {
      ctx.font = `bold ${Math.round(p.size * 1.5)}px sans-serif`;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillText(p.rotation > 0 ? '♪' : '♫', 0, 0);
    } else if (p.type === 'zzz') {
      ctx.font = `bold ${p.size}px sans-serif`;
      ctx.fillText('Z', 0, 0);
    }
    ctx.restore();
  }
}

// 3D Perspective Hologram Projector Floor Disc
function drawHologramFloorProjector(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  time: number,
  isMusicActive: boolean
) {
  ctx.save();
  ctx.translate(cx, cy);

  const ry = radius * 0.28; // 3D perspective squish

  // 1. Soft Ambient Floor Glow
  const floorGlow = ctx.createRadialGradient(0, 0, 5, 0, 0, radius * 1.4);
  floorGlow.addColorStop(0, isMusicActive ? 'rgba(236, 72, 153, 0.45)' : 'rgba(56, 189, 248, 0.35)');
  floorGlow.addColorStop(0.5, isMusicActive ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.15)');
  floorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = floorGlow;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.4, ry * 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Outer Cyber Disc Ring
  ctx.strokeStyle = isMusicActive ? '#f472b6' : '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = isMusicActive ? '#ec4899' : '#0ea5e9';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Rotating Cyber Glyphs & Segmented Arc Ring
  ctx.save();
  const rot = time * 0.8;
  const segments = 8;
  ctx.lineWidth = 3;
  for (let i = 0; i < segments; i++) {
    const startAng = rot + (i * Math.PI * 2) / segments;
    const endAng = startAng + (Math.PI * 2) / (segments * 2);
    ctx.strokeStyle = i % 2 === 0 ? '#38bdf8' : '#ec4899';
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.82, ry * 0.82, 0, startAng, endAng);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Inner Concentric Glowing Ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.55, ry * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 5. Vertical Ascending Laser Hologram Light Streams
  for (let i = 0; i < 6; i++) {
    const angle = (time * 0.5 + (i * Math.PI * 2) / 6) % (Math.PI * 2);
    const px = Math.cos(angle) * (radius * 0.7);
    const py = Math.sin(angle) * (ry * 0.7);
    const beamHeight = 40 + Math.sin(time * 3 + i) * 20;

    const beamGrad = ctx.createLinearGradient(px, py, px, py - beamHeight);
    beamGrad.addColorStop(0, isMusicActive ? 'rgba(236, 72, 153, 0.6)' : 'rgba(56, 189, 248, 0.6)');
    beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - beamHeight);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHeartShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  // top left curve
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
  // bottom left curve
  ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size);
  // bottom right curve
  ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
  // top right curve
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
  ctx.closePath();
  ctx.fill();
}

function drawSparkleShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.lineTo(0, size);
    ctx.lineTo(size * 0.2, size * 0.2);
  }
  ctx.closePath();
  ctx.fill();
}

// =========================================================================
// 2.5D LIVE2D HIGH-FIDELITY PORTRAIT ENGINE (Exact Anime Likeness)
// =========================================================================

function drawLive2DPortrait(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  cx: number,
  cy: number,
  state: any,
  breath: number,
  emotion: EmotionType,
  viseme: VisemeType,
  visemeOpenness: number,
  isTalking: boolean,
  dt: number
) {
  const natW = img.naturalWidth || img.width || 600;
  const natH = img.naturalHeight || img.height || 800;
  if (!natW || !natH) return;

  ctx.save();

  // Compute uniform scale to frame character elegantly within canvas bounds
  const scale = Math.min((width * 0.90) / natW, (height * 0.90) / natH);
  const drawW = natW * scale;
  const drawH = natH * scale;

  // 2.5D Parallax Pivot & Perspective Transforms
  ctx.translate(cx + state.headYaw * 18, cy + state.headPitch * 14 + breath * 0.4);
  ctx.rotate(state.headRoll * 0.08);
  ctx.scale(1 + breath * 0.002, 1 + breath * 0.004);

  // Soft Ambient Character Drop Shadow & Glow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 16;

  // Draw base high-resolution portrait with elegant rounded portrait card
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // 1. Dynamic Eye Tracking & Iris Gleams
  drawPortraitEyeTracking(ctx, drawW, drawH, state, emotion);

  // 2. Dynamic Eyelid Blinking & Emotion Eyelashes
  drawPortraitEyelids(ctx, drawW, drawH, state, emotion);

  // 3. Dynamic Talking Viseme Mouth Lip-Sync
  drawPortraitTalkingMouth(ctx, drawW, drawH, viseme, visemeOpenness, emotion, isTalking, state.time);

  // 4. Dynamic Emotional Overlays (Blush, Sweatdrop, Tears, Pouts)
  drawPortraitEmotionOverlays(ctx, drawW, drawH, emotion, state.time, state.headYaw);

  ctx.restore();
}

// 1. Dynamic Eye Gaze Tracking Over Exact Iris Coordinates
function drawPortraitEyeTracking(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: any,
  emotion: EmotionType
) {
  // Mai Sakurajima's eye center coordinates in normalized portrait space
  const leftEyeX = -w * 0.115;
  const rightEyeX = w * 0.12;
  const eyeY = -h * 0.13;
  const eyeR = w * 0.045;

  const gazeDx = state.gazeX * (w * 0.008);
  const gazeDy = state.gazeY * (h * 0.006);

  // Left & Right Pupil Shimmer Highlights
  [leftEyeX, rightEyeX].forEach((eyeX, idx) => {
    // Only track if eye is not blinking
    if (state.blinkProgress < 0.3 && !(emotion === 'wink' && idx === 0)) {
      ctx.save();
      ctx.translate(eyeX + gazeDx, eyeY + gazeDy);

      // Deep Amethyst Iris Glow Core
      const irisGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, eyeR * 0.55);
      irisGrad.addColorStop(0, 'rgba(192, 132, 252, 0.45)'); // Amethyst lilac
      irisGrad.addColorStop(0.7, 'rgba(124, 58, 237, 0.25)'); // Deep purple
      irisGrad.addColorStop(1, 'rgba(124, 58, 237, 0)');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(0, 0, eyeR * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Crystalline Anime Specular Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(-eyeR * 0.18, -eyeR * 0.18, eyeR * 0.14, 0, Math.PI * 2);
      ctx.fill();

      // Secondary soft reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(eyeR * 0.15, eyeR * 0.15, eyeR * 0.09, 0, Math.PI * 2);
      ctx.fill();

      // Special Heart-Eyes when deeply in love / headpatted
      if (emotion === 'love') {
        ctx.fillStyle = '#f43f5e';
        drawHeartShape(ctx, 0, -eyeR * 0.05, eyeR * 0.35);
      }

      ctx.restore();
    }
  });
}

// 2. Dynamic Eyelid Blinking & Emotion Eyelashes
function drawPortraitEyelids(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: any,
  emotion: EmotionType
) {
  const leftEyeX = -w * 0.115;
  const rightEyeX = w * 0.12;
  const eyeY = -h * 0.13;
  const eyeWidth = w * 0.095;
  const eyeHeight = h * 0.075;

  const eyes = [
    { x: leftEyeX, isLeft: true },
    { x: rightEyeX, isLeft: false },
  ];

  eyes.forEach(({ x, isLeft }) => {
    const isWinking = emotion === 'wink' && isLeft;
    const isHappySmile = (emotion === 'happy' || emotion === 'love') && state.blinkProgress < 0.2;
    const isSleepy = emotion === 'sleepy';

    if (state.blinkProgress > 0.05 || isWinking || isSleepy) {
      const progress = isWinking ? 1 : isSleepy ? 0.65 : Math.sin(state.blinkProgress * Math.PI);
      const closeAmount = progress * eyeHeight;

      ctx.save();
      ctx.translate(x, eyeY);

      // Upper Eyelid Skin Sweep
      ctx.fillStyle = '#fff1f2'; // Matching anime skin tone
      ctx.beginPath();
      ctx.ellipse(0, -eyeHeight * 0.45 + closeAmount * 0.5, eyeWidth * 0.55, closeAmount * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dark Eyelash Curvature Line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-eyeWidth * 0.52, -eyeHeight * 0.2 + closeAmount * 0.6);
      ctx.quadraticCurveTo(0, closeAmount * 0.7, eyeWidth * 0.52, -eyeHeight * 0.2 + closeAmount * 0.6);
      ctx.stroke();

      // Eyelash Wing flick
      ctx.beginPath();
      const wingDir = isLeft ? -1 : 1;
      ctx.moveTo(wingDir * eyeWidth * 0.48, -eyeHeight * 0.2 + closeAmount * 0.6);
      ctx.lineTo(wingDir * (eyeWidth * 0.58), -eyeHeight * 0.35 + closeAmount * 0.6);
      ctx.stroke();

      ctx.restore();
    } else if (isHappySmile && Math.sin(state.time * 2) > 0.7) {
      // Subtle smiling eyes curve
      ctx.save();
      ctx.translate(x, eyeY);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, eyeHeight * 0.1, eyeWidth * 0.45, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.restore();
    }
  });
}

// 3. Dynamic Talking Viseme Mouth Lip-Sync
function drawPortraitTalkingMouth(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  viseme: VisemeType,
  visemeOpenness: number,
  emotion: EmotionType,
  isTalking: boolean,
  time: number
) {
  const mouthX = 0;
  const mouthY = h * 0.038; // Exact mouth placement
  const baseWidth = w * 0.055;

  ctx.save();
  ctx.translate(mouthX, mouthY);

  if (isTalking || visemeOpenness > 0.08) {
    // Dynamic Viseme Apertures
    let mw = baseWidth * 1.1;
    let mh = h * 0.025 * Math.max(0.2, visemeOpenness);

    switch (viseme) {
      case 'aa':
        mw = baseWidth * 1.25;
        mh = h * 0.035 * visemeOpenness;
        break;
      case 'ih':
      case 'ee':
        mw = baseWidth * 1.4;
        mh = h * 0.016 * Math.max(0.3, visemeOpenness);
        break;
      case 'oh':
      case 'ou':
        mw = baseWidth * 0.85;
        mh = h * 0.032 * visemeOpenness;
        break;
      case 'pout':
        mw = baseWidth * 0.7;
        mh = h * 0.012;
        break;
      case 'smile':
        mw = baseWidth * 1.35;
        mh = h * 0.018 * Math.max(0.3, visemeOpenness);
        break;
      default:
        mw = baseWidth * 1.0;
        mh = h * 0.022 * visemeOpenness;
    }

    // Cover natural mouth line with matching skin patch before drawing mouth cavity
    ctx.fillStyle = '#fff1f2';
    ctx.beginPath();
    ctx.ellipse(0, 0, mw * 0.9, mh * 1.1 + 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner Oral Cavity
    ctx.fillStyle = '#881337'; // Deep anime mouth interior
    ctx.beginPath();
    ctx.moveTo(-mw * 0.5, 0);
    ctx.quadraticCurveTo(0, mh * 1.2, mw * 0.5, 0);
    ctx.quadraticCurveTo(0, -mh * 0.3, -mw * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    // Cute White Upper Teeth Highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-mw * 0.35, 0);
    ctx.quadraticCurveTo(0, mh * 0.3, mw * 0.35, 0);
    ctx.lineTo(mw * 0.35, -mh * 0.2);
    ctx.lineTo(-mw * 0.35, -mh * 0.2);
    ctx.closePath();
    ctx.fill();

    // Tongue Shape
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.ellipse(0, mh * 0.6, mw * 0.32, mh * 0.45, 0, 0, Math.PI);
    ctx.fill();

    // Dark Lip Contour Line
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-mw * 0.5, 0);
    ctx.quadraticCurveTo(0, -mh * 0.2, mw * 0.5, 0);
    ctx.stroke();
  } else {
    // Resting expression
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';

    if (emotion === 'pout') {
      // Tsundere pout curve
      ctx.beginPath();
      ctx.arc(0, 4, baseWidth * 0.4, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
    } else if (emotion === 'happy' || emotion === 'love' || emotion === 'wink') {
      // Charming gentle smile
      ctx.beginPath();
      ctx.moveTo(-baseWidth * 0.5, -1);
      ctx.quadraticCurveTo(0, 4, baseWidth * 0.5, -1);
      ctx.stroke();
      // Lower lip soft gloss shine
      ctx.fillStyle = 'rgba(251, 113, 133, 0.45)';
      ctx.beginPath();
      ctx.arc(0, 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// 4. Dynamic Emotional Overlays (Blush, Sweatdrop, Tears, Emotes)
function drawPortraitEmotionOverlays(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  emotion: EmotionType,
  time: number,
  yaw: number
) {
  const leftCheekX = -w * 0.18;
  const rightCheekX = w * 0.18;
  const cheekY = -h * 0.04;

  // Rosy Cheek Blushing
  if (emotion === 'blush' || emotion === 'love' || emotion === 'happy') {
    const alpha = emotion === 'love' ? 0.65 : emotion === 'blush' ? 0.5 : 0.25;

    [leftCheekX, rightCheekX].forEach((cx) => {
      ctx.save();
      ctx.translate(cx, cheekY);

      // Soft Radial Blush Gradient
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, w * 0.075);
      grad.addColorStop(0, `rgba(251, 113, 133, ${alpha})`);
      grad.addColorStop(0.6, `rgba(244, 63, 94, ${alpha * 0.4})`);
      grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.075, 0, Math.PI * 2);
      ctx.fill();

      // Anime Blush Hatch Marks (///)
      ctx.strokeStyle = `rgba(225, 29, 72, ${alpha * 0.8})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-6, -3);
      ctx.lineTo(-2, 5);
      ctx.moveTo(-1, -4);
      ctx.lineTo(3, 4);
      ctx.moveTo(4, -3);
      ctx.lineTo(8, 5);
      ctx.stroke();

      ctx.restore();
    });
  }

  // Tsundere Pout Puff
  if (emotion === 'pout') {
    ctx.save();
    ctx.translate(leftCheekX - 10, cheekY - 5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Anime Crying Tears
  if (emotion === 'crying') {
    const tearLeftX = -w * 0.115;
    const tearRightX = w * 0.12;
    const eyeY = -h * 0.12;

    [tearLeftX, tearRightX].forEach((tx) => {
      ctx.save();
      ctx.translate(tx, eyeY + 12);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.beginPath();
      ctx.ellipse(0, (time * 15) % 35, 3, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // Surprised Sweatdrop
  if (emotion === 'surprised') {
    ctx.save();
    ctx.translate(w * 0.22, -h * 0.22);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(8, 2, 0, 8);
    ctx.quadraticCurveTo(-8, 2, 0, -12);
    ctx.fill();
    ctx.restore();
  }
}

