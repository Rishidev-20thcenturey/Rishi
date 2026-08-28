import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { EmotionType, VisemeType, CharacterPreset, CustomizationSettings } from '../types';
import { audioEngine } from '../services/audioEngine';
import { createProceduralAnimeAvatar, ProceduralAvatarRig } from '../utils/proceduralAnimeAvatar';
import {
  Upload,
  RotateCcw,
  Sparkles,
  Heart,
  Hand,
  Smile,
  AlertCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

interface VRMCharacterCanvasProps {
  character: CharacterPreset;
  customization?: CustomizationSettings;
  emotion: EmotionType;
  viseme: VisemeType;
  visemeOpenness: number;
  isTalking: boolean;
  isListening: boolean;
  isThinking: boolean;
  isPlayingMusic?: boolean;
  isDancing?: boolean;
  showFloorProjector?: boolean;
  customVrmUrl?: string | null;
  activeStance?: StanceMode;
  onSelectStance?: (stance: StanceMode) => void;
  onHeadPat: () => void;
  onCheekPoke: () => void;
  onUploadVrmFile?: (file: File) => void;
}

type StanceMode = 'idol' | 'shy' | 'playful' | 'curious';

interface FloatingReactionParticle {
  id: number;
  x: number;
  y: number;
  icon: string;
  color: string;
}

export const VRMCharacterCanvas: React.FC<VRMCharacterCanvasProps> = ({
  character,
  emotion,
  viseme,
  visemeOpenness,
  isTalking,
  isListening,
  isThinking,
  isPlayingMusic = false,
  isDancing = false,
  showFloorProjector = true,
  customVrmUrl,
  activeStance: propActiveStance,
  onSelectStance,
  onHeadPat,
  onCheekPoke,
  onUploadVrmFile,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Loading & Model States
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [modelLoaded, setModelLoaded] = useState<boolean>(true); // Default 3D model active on start
  const [isCustomVRM, setIsCustomVRM] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<{ name: string; author?: string; version?: string } | null>({
    name: 'Sybran Cyber-Idol',
    author: 'CODE27 Core Engine',
    version: '3D Hologram 1.0',
  });

  // User Model Height & Scale Fine-tuning Adjustments
  const [userHeightOffset, setUserHeightOffset] = useState<number>(0);
  const [userScaleMultiplier, setUserScaleMultiplier] = useState<number>(1.0);

  // Interactive Pose & Physical Reaction States
  const [internalStance, setInternalStance] = useState<StanceMode>('idol');
  const activeStance = propActiveStance || internalStance;
  const setActiveStance = (stance: StanceMode) => {
    setInternalStance(stance);
    if (onSelectStance) onSelectStance(stance);
  };
  const [reactionText, setReactionText] = useState<string | null>(null);
  const [particles, setParticles] = useState<FloatingReactionParticle[]>([]);

  // Camera Mode Framing Presets ('full' = complete head-to-shoes view, 'portrait' = upper-body closeup)
  const [cameraFraming, setCameraFraming] = useState<'full' | 'portrait'>('full');

  // Base dynamic offsets calculated from model skeleton & bounding box
  const basePosYRef = useRef<number>(-0.42);
  const baseScaleRef = useRef<number>(1.22);
  const userAdjustRef = useRef({ height: 0, scale: 1.0 });
  const cameraDistanceRef = useRef<number>(2.75);
  const targetCameraDistanceRef = useRef<number>(2.75);
  const targetCameraPosYRef = useRef<number>(0.46);

  useEffect(() => {
    userAdjustRef.current = { height: userHeightOffset, scale: userScaleMultiplier };
  }, [userHeightOffset, userScaleMultiplier]);

  // Update target camera framing preset
  useEffect(() => {
    if (cameraFraming === 'full') {
      targetCameraDistanceRef.current = 2.75;
      targetCameraPosYRef.current = 0.46;
      setUserHeightOffset(0);
    } else {
      targetCameraDistanceRef.current = 1.55;
      targetCameraPosYRef.current = 0.85;
    }
  }, [cameraFraming]);

  // Ref to store latest animation and emotion properties to avoid re-mounting Three.js scene
  const animStateRef = useRef({
    emotion,
    viseme,
    visemeOpenness,
    isTalking,
    isListening,
    isThinking,
    isPlayingMusic,
    isDancing,
    activeStance,
  });

  useEffect(() => {
    animStateRef.current = {
      emotion,
      viseme,
      visemeOpenness,
      isTalking,
      isListening,
      isThinking,
      isPlayingMusic,
      isDancing,
      activeStance,
    };
  }, [emotion, viseme, visemeOpenness, isTalking, isListening, isThinking, isPlayingMusic, isDancing, activeStance]);

  // Track loaded URL to avoid infinite reload loop
  const loadedUrlRef = useRef<string | null>(null);

  // Transient Physical Reaction Triggers (Ref-based for high-framerate render loop)
  const physicalReactionRef = useRef<{
    type: 'none' | 'pat' | 'poke_left' | 'poke_right' | 'knock' | 'shy' | 'wave';
    startTime: number;
    duration: number;
  }>({
    type: 'none',
    startTime: 0,
    duration: 0,
  });

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const currentVrmRef = useRef<VRM | null>(null);
  const proceduralRigRef = useRef<ProceduralAvatarRig | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; rotY: number }>({ x: 0, y: 0, rotY: 0 });
  const targetRotationYRef = useRef<number>(0);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());

  // Spawn visual reaction particle
  const spawnReactionParticle = useCallback((x: number, y: number, icon: string, color: string) => {
    const newP: FloatingReactionParticle = {
      id: Date.now() + Math.random(),
      x,
      y,
      icon,
      color,
    };
    setParticles((prev) => [...prev.slice(-6), newP]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newP.id));
    }, 1200);
  }, []);

  // Trigger Physical Reaction
  const triggerPhysicalReaction = useCallback(
    (type: 'pat' | 'poke_left' | 'poke_right' | 'knock' | 'shy' | 'wave', x?: number, y?: number) => {
      const now = performance.now() / 1000;
      let dur = 1.4;
      let text = '';
      let soundType: 'headpat' | 'poke' | 'knock' | 'blush' | 'giggle' = 'giggle';

      if (type === 'pat') {
        dur = 2.0;
        text = 'Kyaa~ That head pat feels so gentle! (｡♥‿♥｡)';
        soundType = 'headpat';
        onHeadPat();
        spawnReactionParticle(x ?? 50, y ?? 30, '💖', '#ec4899');
      } else if (type === 'poke_left' || type === 'poke_right') {
        dur = 1.5;
        text = 'Ehh?! My cheek is soft, isn’t it? (・`ω´・)';
        soundType = 'poke';
        onCheekPoke();
        spawnReactionParticle(x ?? 50, y ?? 45, '✨', '#38bdf8');
      } else if (type === 'knock') {
        dur = 1.8;
        text = '*Knock Knock* "I can see you clearly through the glass!" (*´▽`*)';
        soundType = 'knock';
        spawnReactionParticle(x ?? 50, y ?? 55, '💫', '#a855f7');
      } else if (type === 'shy') {
        dur = 2.2;
        text = 'M-Mou! Staring so closely makes me blush... (//ω//)';
        soundType = 'blush';
        spawnReactionParticle(x ?? 50, y ?? 50, '🌸', '#f43f5e');
      } else if (type === 'wave') {
        dur = 2.2;
        text = 'Yaho~! Welcome back to CODE27 capsule! (＾▽＾)/';
        soundType = 'giggle';
        spawnReactionParticle(x ?? 50, y ?? 40, '👋', '#eab308');
      }

      physicalReactionRef.current = {
        type,
        startTime: now,
        duration: dur,
      };

      setReactionText(text);
      audioEngine.playSoundEffect(soundType);

      setTimeout(() => {
        setReactionText((cur) => (cur === text ? null : cur));
      }, dur * 1000);
    },
    [onHeadPat, onCheekPoke, spawnReactionParticle]
  );

  // Expression Mapping for VRM
  const updateVRMExpressions = useCallback(
    (vrm: VRM, em: EmotionType, v: VisemeType, openness: number) => {
      if (!vrm.expressionManager) return;

      const reaction = physicalReactionRef.current;
      const now = performance.now() / 1000;
      const isReacting = reaction.type !== 'none' && now - reaction.startTime < reaction.duration;

      // Reset standard expression weights
      const allPresets: VRMExpressionPresetName[] = [
        'happy',
        'angry',
        'sad',
        'relaxed',
        'surprised',
        'aa',
        'ih',
        'ou',
        'ee',
        'oh',
        'blink',
        'blinkLeft',
        'blinkRight',
        'neutral',
      ];

      allPresets.forEach((p) => {
        try {
          vrm.expressionManager?.setValue(p, 0);
        } catch {
          // ignore
        }
      });

      // Reaction override expressions
      if (isReacting) {
        if (reaction.type === 'pat') {
          vrm.expressionManager.setValue('happy', 0.95);
          vrm.expressionManager.setValue('relaxed', 0.8);
          vrm.expressionManager.setValue('blink', 0.6);
          return;
        } else if (reaction.type === 'poke_left' || reaction.type === 'poke_right') {
          vrm.expressionManager.setValue('surprised', 0.6);
          vrm.expressionManager.setValue('happy', 0.5);
          vrm.expressionManager.setValue('ou', 0.35);
          return;
        } else if (reaction.type === 'knock') {
          vrm.expressionManager.setValue('surprised', 0.9);
          vrm.expressionManager.setValue('oh', 0.4);
          return;
        } else if (reaction.type === 'shy') {
          vrm.expressionManager.setValue('happy', 0.7);
          vrm.expressionManager.setValue('relaxed', 0.6);
          vrm.expressionManager.setValue('blink', 0.3);
          return;
        } else if (reaction.type === 'wave') {
          vrm.expressionManager.setValue('happy', 1.0);
          vrm.expressionManager.setValue('aa', 0.2);
          return;
        }
      }

      // Base Emotion Expression
      try {
        switch (em) {
          case 'happy':
          case 'love':
            vrm.expressionManager.setValue('happy', 0.95);
            vrm.expressionManager.setValue('relaxed', 0.4);
            break;
          case 'blush':
            vrm.expressionManager.setValue('happy', 0.7);
            vrm.expressionManager.setValue('relaxed', 0.6);
            break;
          case 'pout':
            vrm.expressionManager.setValue('angry', 0.45);
            vrm.expressionManager.setValue('sad', 0.35);
            vrm.expressionManager.setValue('ou', 0.25);
            break;
          case 'surprised':
            vrm.expressionManager.setValue('surprised', 1.0);
            vrm.expressionManager.setValue('oh', 0.2);
            break;
          case 'wink':
            vrm.expressionManager.setValue('happy', 0.85);
            vrm.expressionManager.setValue('blinkRight', 1.0);
            break;
          case 'sleepy':
            vrm.expressionManager.setValue('relaxed', 0.95);
            vrm.expressionManager.setValue('blink', 0.7);
            break;
          case 'crying':
            vrm.expressionManager.setValue('sad', 0.95);
            break;
          case 'thinking':
            vrm.expressionManager.setValue('relaxed', 0.5);
            vrm.expressionManager.setValue('surprised', 0.2);
            break;
          case 'neutral':
          default:
            vrm.expressionManager.setValue('neutral', 0.15);
            break;
        }
      } catch (err) {
        console.warn('VRM Emotion error:', err);
      }

      // Viseme Lip-sync
      try {
        const amt = Math.min(1.0, Math.max(0, openness));
        switch (v) {
          case 'aa':
            vrm.expressionManager.setValue('aa', amt);
            break;
          case 'ih':
            vrm.expressionManager.setValue('ih', amt);
            break;
          case 'ou':
            vrm.expressionManager.setValue('ou', amt);
            break;
          case 'ee':
            vrm.expressionManager.setValue('ee', amt);
            break;
          case 'oh':
            vrm.expressionManager.setValue('oh', amt);
            break;
          case 'smile':
            vrm.expressionManager.setValue('happy', Math.max(0.6, amt));
            break;
          case 'pout':
            vrm.expressionManager.setValue('ou', amt * 0.6);
            break;
          case 'rest':
          default:
            break;
        }
      } catch (err) {
        console.warn('VRM Viseme error:', err);
      }
    },
    []
  );

  // Load User VRM Model with intelligent auto-framing and auto-scaling
  const loadVRMModel = useCallback(
    (urlOrFile: string | File) => {
      if (!sceneRef.current) return;
      setIsLoadingModel(true);
      setLoadingProgress(15);
      setErrorMessage(null);

      const loader = new GLTFLoader();
      loader.crossOrigin = 'anonymous';
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const loadPath =
        typeof urlOrFile === 'string' ? urlOrFile : URL.createObjectURL(urlOrFile);

      loader.load(
        loadPath,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM | undefined;
          if (!vrm) {
            setIsLoadingModel(false);
            setErrorMessage('File is not a valid VRM humanoid model.');
            return;
          }

          // Clean up procedural avatar if present
          if (proceduralRigRef.current && sceneRef.current) {
            sceneRef.current.remove(proceduralRigRef.current.root);
            proceduralRigRef.current.dispose();
            proceduralRigRef.current = null;
          }

          // Clean up previous VRM
          if (currentVrmRef.current && sceneRef.current) {
            sceneRef.current.remove(currentVrmRef.current.scene);
            VRMUtils.deepDispose(currentVrmRef.current.scene);
          }

          // Optimize and prepare VRM
          VRMUtils.removeUnnecessaryVertices(gltf.scene);
          VRMUtils.combineSkeletons(gltf.scene);
          VRMUtils.rotateVRM0(vrm);

          // 1. Reset transforms to calculate true raw bounds
          vrm.scene.position.set(0, 0, 0);
          vrm.scene.rotation.set(0, Math.PI, 0); // Face camera
          vrm.scene.scale.set(1, 1, 1);
          vrm.scene.updateMatrixWorld(true);

          const rawBbox = new THREE.Box3().setFromObject(vrm.scene);
          const rawSize = rawBbox.getSize(new THREE.Vector3());

          // 2. Intelligent auto-scaling so avatar fills the capsule viewport proportionally
          let autoScale = 1.18;
          if (rawSize.y > 0.05) {
            autoScale = 1.52 / rawSize.y;
            autoScale = THREE.MathUtils.clamp(autoScale, 0.45, 4.0);
          }
          baseScaleRef.current = autoScale;
          vrm.scene.scale.set(autoScale, autoScale, autoScale);
          vrm.scene.updateMatrixWorld(true);

          // 3. Ground the character feet perfectly on the holographic pedestal floor (Y = -0.86)
          const scaledBbox = new THREE.Box3().setFromObject(vrm.scene);
          let autoPosY = -0.86 - scaledBbox.min.y;

          basePosYRef.current = autoPosY;

          // Lock position strictly in the middle (X=0, Z=0)
          vrm.scene.position.set(0, autoPosY, 0);

          // Reset user offset nudge to default centered
          setUserHeightOffset(0);
          setUserScaleMultiplier(1.0);
          targetRotationYRef.current = 0;

          // Setup shadows and materials without breaking MToon alpha
          vrm.scene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const mesh = obj as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              mesh.frustumCulled = false;
            }
          });

          sceneRef.current?.add(vrm.scene);
          currentVrmRef.current = vrm;
          setIsCustomVRM(true);

          // Model metadata
          const meta = vrm.meta as unknown as Record<string, unknown> | undefined;
          if (meta) {
            const modelName =
              (typeof meta.name === 'string' && meta.name) ||
              (typeof meta.title === 'string' && meta.title) ||
              'VRoid Custom Model';
            const authorName =
              (Array.isArray(meta.authors) && meta.authors.join(', ')) ||
              (typeof meta.author === 'string' && meta.author) ||
              'VRoid Creator';
            const metaVersion =
              (typeof meta.version === 'string' && meta.version) ||
              (typeof meta.vrmVersion === 'string' && meta.vrmVersion) ||
              'VRM 1.0';

            setModelInfo({
              name: modelName,
              author: authorName,
              version: metaVersion,
            });
          }

          setIsLoadingModel(false);
          setModelLoaded(true);
          setLoadingProgress(100);

          setTimeout(() => {
            triggerPhysicalReaction('wave');
          }, 400);
        },
        (progress) => {
          if (progress.total > 0) {
            setLoadingProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        },
        (error) => {
          console.error('Error loading VRM model:', error);
          setIsLoadingModel(false);
          setErrorMessage('Failed to load 3D VRM model. Restoring built-in avatar.');
        }
      );
    },
    [triggerPhysicalReaction]
  );

  // Dedicated Effect for loading customVrmUrl
  useEffect(() => {
    if (customVrmUrl && customVrmUrl !== loadedUrlRef.current) {
      loadedUrlRef.current = customVrmUrl;
      loadVRMModel(customVrmUrl);
    }
  }, [customVrmUrl, loadVRMModel]);

  // Initialize Three.js WebGL Scene ONCE on mount
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 750;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera (Centering character in capsule viewport, near plane 0.01 to prevent facial clipping on zoom)
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.01, 50);
    camera.position.set(0, 0.46, 2.75);
    camera.lookAt(0, 0.46, 0);
    cameraRef.current = camera;
    targetCameraDistanceRef.current = 2.75;
    cameraDistanceRef.current = 2.75;
    targetCameraPosYRef.current = 0.46;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Studio & Hologram Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const mainKeyLight = new THREE.DirectionalLight(0xfff5ea, 2.4);
    mainKeyLight.position.set(1.5, 3.0, 2.0);
    mainKeyLight.castShadow = true;
    mainKeyLight.shadow.mapSize.width = 1024;
    mainKeyLight.shadow.mapSize.height = 1024;
    mainKeyLight.shadow.bias = -0.001;
    scene.add(mainKeyLight);

    const cyanFill = new THREE.PointLight(0x38bdf8, 2.8, 10);
    cyanFill.position.set(-1.8, 0.8, 1.2);
    scene.add(cyanFill);

    const pinkRim = new THREE.PointLight(0xf472b6, 3.2, 10);
    pinkRim.position.set(1.6, 0.5, -1.2);
    scene.add(pinkRim);

    const topSpot = new THREE.SpotLight(0xec4899, 4.0, 8, Math.PI / 4, 0.5);
    topSpot.position.set(0, 3.2, 0);
    topSpot.target.position.set(0, 0, 0);
    scene.add(topSpot);
    scene.add(topSpot.target);

    // 5. 2099 Holographic Platform Pedestal (Multi-ring & Cyber grid)
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.y = -0.92;

    const floorGeo = new THREE.CircleGeometry(1.05, 32);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.14,
      wireframe: true,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    pedestalGroup.add(floorMesh);

    const outerRingGeo = new THREE.RingGeometry(0.95, 1.02, 48);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRingMesh.rotation.x = -Math.PI / 2;
    pedestalGroup.add(outerRingMesh);

    const innerRingGeo = new THREE.RingGeometry(0.65, 0.7, 32);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRingMesh.rotation.x = -Math.PI / 2;
    pedestalGroup.add(innerRingMesh);

    scene.add(pedestalGroup);

    // 6. Mount Built-in 3D Avatar immediately if no custom VRM
    if (!customVrmUrl) {
      const proceduralAvatar = createProceduralAnimeAvatar();
      proceduralAvatar.root.position.set(0, -0.42, 0);
      proceduralAvatar.root.scale.set(1.22, 1.22, 1.22);
      scene.add(proceduralAvatar.root);
      proceduralRigRef.current = proceduralAvatar;
      basePosYRef.current = -0.42;
      baseScaleRef.current = 1.22;
      setModelLoaded(true);
    }

    // 7. Resize Observer (debounced with requestAnimationFrame)
    let resizeReqId: number | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      if (resizeReqId !== null) {
        cancelAnimationFrame(resizeReqId);
      }
      resizeReqId = requestAnimationFrame(() => {
        if (!container || !rendererRef.current || !cameraRef.current) return;
        const entry = entries[0];
        const w = entry ? Math.round(entry.contentRect.width) : container.clientWidth;
        const h = entry ? Math.round(entry.contentRect.height) : container.clientHeight;
        if (w <= 0 || h <= 0) return;

        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h, false);
      });
    });
    resizeObserver.observe(container);

    // 8. Animation & Render Loop with Universal Kinematics Engine
    let animationFrameId: number;
    let blinkTimer = 0;
    let isBlinkingNow = false;
    let saccadeTimer = 0;
    let saccadeOffset = { x: 0, y: 0 };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const time = clockRef.current.getElapsedTime();
      const now = performance.now() / 1000;

      // Extract current anim props & user offsets
      const {
        isTalking: curTalking,
        isListening: curListening,
        isThinking: curThinking,
        isPlayingMusic: curPlayingMusic,
        isDancing: curDancing,
        activeStance: curActiveStance,
        emotion: curEmotion,
        viseme: curViseme,
        visemeOpenness: curVisemeOpenness,
      } = animStateRef.current;

      const { height: uHeight, scale: uScale } = userAdjustRef.current;
      const targetBaseY = basePosYRef.current + uHeight;
      const targetScale = baseScaleRef.current * uScale;

      const vrm = currentVrmRef.current;
      const procRig = proceduralRigRef.current;

      // Blinking Cycle
      blinkTimer += delta;
      if (blinkTimer > 3.6 + Math.random() * 2.5) {
        isBlinkingNow = true;
        blinkTimer = 0;
      }

      let currentBlinkAmount = 0;
      if (isBlinkingNow) {
        currentBlinkAmount = Math.sin((blinkTimer / 0.18) * Math.PI);
        if (blinkTimer > 0.18) {
          isBlinkingNow = false;
          currentBlinkAmount = 0;
        }
      }

      // Micro-Saccades
      saccadeTimer += delta;
      if (saccadeTimer > 2.2) {
        saccadeTimer = 0;
        saccadeOffset = {
          x: (Math.random() - 0.5) * 0.08,
          y: (Math.random() - 0.5) * 0.05,
        };
      }

      // Check active physical reaction
      const reaction = physicalReactionRef.current;
      const reactionElapsed = now - reaction.startTime;
      const isReacting = reaction.type !== 'none' && reactionElapsed < reaction.duration;
      const rProgress = Math.min(1, Math.max(0, reactionElapsed / (reaction.duration || 1)));

      // =========================================================
      // UNIVERSAL BONE KINEMATICS CALCULATION
      // =========================================================
      // 1. Multi-Harmonic Breathing
      const breathPrimary = Math.sin(time * 2.2);
      const breathSecondary = Math.sin(time * 4.4) * 0.2;
      const breathTotal = breathPrimary + breathSecondary;
      const chestBreath = breathTotal * 0.032;
      const spineBreath = breathTotal * 0.018;

      // 2. Weight Shifting (Hip sway & balance transfer)
      const shiftPhase = time * 0.85;
      const hipSwayX = Math.sin(shiftPhase) * 0.035 + Math.sin(shiftPhase * 0.5) * 0.015;
      const hipBobY = Math.abs(Math.cos(shiftPhase)) * 0.008;

      // 3. Dynamic Head & Neck Orientation
      const idleHeadTilt = Math.sin(time * 0.6) * 0.04;
      const targetHeadYaw = -mousePosRef.current.x * 0.42 + Math.sin(time * 0.35) * 0.03;
      const targetHeadPitch = mousePosRef.current.y * 0.32 + Math.cos(time * 0.5) * 0.02;

      // Target Bone Poses
      const targetBoneRot = {
        hips: { x: 0, y: 0, z: hipSwayX, posY: hipBobY },
        spine: { x: spineBreath, y: 0, z: -hipSwayX * 0.65 },
        chest: { x: chestBreath, y: 0, z: 0 },
        neck: { x: targetHeadPitch * 0.3, y: targetHeadYaw * 0.4, z: 0 },
        head: { x: targetHeadPitch, y: targetHeadYaw, z: idleHeadTilt },
        leftUpperArm: { x: 0.12, y: 0.05, z: 0.22 },
        leftLowerArm: { x: -0.32, y: 0.18, z: -0.18 },
        leftHand: { x: 0.08, y: 0.05, z: 0.08 },
        rightUpperArm: { x: 0.12, y: -0.05, z: -0.22 },
        rightLowerArm: { x: -0.32, y: -0.18, z: 0.18 },
        rightHand: { x: 0.08, y: -0.05, z: -0.08 },
        rootPosY: targetBaseY,
        rootPosZ: 0,
        rootRotZ: 0,
      };

      const easeOut = Math.sin((1 - rProgress) * Math.PI * 0.5);

      // Physical Reaction Overrides
      if (isReacting) {
        if (reaction.type === 'pat') {
          targetBoneRot.head.x = 0.22 * easeOut;
          targetBoneRot.head.z = Math.sin(time * 6) * 0.08 * easeOut;
          targetBoneRot.chest.x = 0.06 * easeOut;
          targetBoneRot.leftUpperArm = { x: 0.15, y: 0.1, z: 1.2 - 0.3 * easeOut };
          targetBoneRot.rightUpperArm = { x: 0.15, y: -0.1, z: -1.2 + 0.3 * easeOut };
          targetBoneRot.rootPosY = targetBaseY - 0.025 * easeOut;
        } else if (reaction.type === 'poke_left' || reaction.type === 'poke_right') {
          const dir = reaction.type === 'poke_left' ? -1 : 1;
          const pokeDamp = Math.sin(rProgress * Math.PI * 3.5) * Math.exp(-rProgress * 4.0);
          targetBoneRot.head.y = dir * 0.35 * pokeDamp;
          targetBoneRot.head.z = -dir * 0.22 * pokeDamp;
          targetBoneRot.neck.y = dir * 0.15 * pokeDamp;
        } else if (reaction.type === 'knock') {
          const leanAmt = Math.sin(rProgress * Math.PI) * 0.22;
          targetBoneRot.rootPosZ = leanAmt;
          targetBoneRot.spine.x = -leanAmt * 0.7;
          targetBoneRot.head.x = -leanAmt * 0.4;
          targetBoneRot.leftUpperArm = { x: -0.65 * easeOut, y: 0.25, z: 0.75 };
          targetBoneRot.leftLowerArm = { x: -0.75 * easeOut, y: 0.35, z: -0.2 };
          targetBoneRot.rightUpperArm = { x: -0.65 * easeOut, y: -0.25, z: -0.75 };
          targetBoneRot.rightLowerArm = { x: -0.75 * easeOut, y: -0.35, z: 0.2 };
        } else if (reaction.type === 'shy') {
          targetBoneRot.head.x = 0.2 * easeOut;
          targetBoneRot.head.z = 0.12 * easeOut;
          targetBoneRot.leftUpperArm = { x: -0.45, y: 0.4, z: 0.9 };
          targetBoneRot.leftLowerArm = { x: -1.1, y: 0.6, z: -0.2 };
          targetBoneRot.rightUpperArm = { x: -0.45, y: -0.4, z: -0.9 };
          targetBoneRot.rightLowerArm = { x: -1.1, y: -0.6, z: 0.2 };
        } else if (reaction.type === 'wave') {
          const waveCycle = Math.sin(time * 11) * 0.42;
          targetBoneRot.rightUpperArm = { x: -0.75, y: -0.2, z: -1.95 };
          targetBoneRot.rightLowerArm = { x: -0.45 + waveCycle, y: -0.5, z: 0.3 };
          targetBoneRot.rightHand = { x: 0.15, y: waveCycle * 0.6, z: -0.25 };
          targetBoneRot.head.z = -0.12;
        }
      }
      // Music Dancing Motion
      else if (curDancing || curPlayingMusic) {
        const beat = time * 4.8;
        const danceBob = Math.abs(Math.sin(beat * 2)) * 0.032;
        const danceSway = Math.sin(beat) * 0.06;

        targetBoneRot.rootPosY = targetBaseY + danceBob;
        targetBoneRot.rootRotZ = danceSway * 0.6;
        targetBoneRot.hips.z = danceSway;

        targetBoneRot.leftUpperArm = {
          x: 0.25 + Math.cos(beat) * 0.25,
          y: 0.15,
          z: 0.85 + Math.sin(beat) * 0.3,
        };
        targetBoneRot.leftLowerArm = {
          x: -0.65 + Math.sin(beat) * 0.25,
          y: 0.25,
          z: -0.3,
        };

        targetBoneRot.rightUpperArm = {
          x: 0.25 - Math.cos(beat) * 0.25,
          y: -0.15,
          z: -0.85 - Math.sin(beat) * 0.3,
        };
        targetBoneRot.rightLowerArm = {
          x: -0.65 - Math.sin(beat) * 0.25,
          y: -0.25,
          z: 0.3,
        };

        targetBoneRot.head.z = Math.sin(beat) * 0.12;
        targetBoneRot.head.x += Math.cos(beat * 2) * 0.04;
      }
      // Talking Gestures
      else if (curTalking) {
        const talkCadence = Math.sin(time * 5.2) * 0.09;
        const gestureCycle = Math.sin(time * 2.2);

        targetBoneRot.head.x += talkCadence * 0.55;
        targetBoneRot.head.y += Math.sin(time * 2.8) * 0.05;

        if (gestureCycle > 0) {
          targetBoneRot.rightUpperArm = { x: -0.35 + talkCadence * 0.6, y: -0.2, z: -1.05 };
          targetBoneRot.rightLowerArm = { x: -0.65 + talkCadence * 0.4, y: -0.3, z: 0.25 };
        } else {
          targetBoneRot.leftUpperArm = { x: -0.35 + talkCadence * 0.6, y: 0.2, z: 1.05 };
          targetBoneRot.leftLowerArm = { x: -0.65 + talkCadence * 0.4, y: 0.3, z: -0.25 };
        }
      }
      // Listening Lean
      else if (curListening) {
        targetBoneRot.spine.x = -0.07;
        targetBoneRot.head.z = 0.16 + Math.sin(time * 1.5) * 0.02;
        targetBoneRot.leftUpperArm = { x: 0.18, y: 0.1, z: 1.22 };
        targetBoneRot.rightUpperArm = { x: 0.18, y: -0.1, z: -1.22 };
      }
      // Thinking Pose
      else if (curThinking) {
        targetBoneRot.head = { x: -0.18, y: 0.22, z: 0.1 };
        targetBoneRot.rightUpperArm = { x: -0.65, y: 0.35, z: -0.75 };
        targetBoneRot.rightLowerArm = { x: -1.35, y: 0.45, z: 0.55 };
      }
      // Stance Poses
      else {
        const armBreath = Math.sin(time * 2.2) * 0.02;
        if (curActiveStance === 'shy') {
          targetBoneRot.leftUpperArm = { x: -0.25 + armBreath, y: 0.3, z: 1.0 };
          targetBoneRot.leftLowerArm = { x: -0.85, y: 0.5, z: -0.2 };
          targetBoneRot.rightUpperArm = { x: -0.25 + armBreath, y: -0.3, z: -1.0 };
          targetBoneRot.rightLowerArm = { x: -0.85, y: -0.5, z: 0.2 };
        } else if (curActiveStance === 'playful') {
          targetBoneRot.leftUpperArm = { x: -0.12, y: 0.42, z: 0.95 };
          targetBoneRot.leftLowerArm = { x: -1.12, y: 0.72, z: -0.4 };
          targetBoneRot.rightUpperArm = { x: 0.22 + armBreath, y: -0.08, z: -1.28 };
        } else if (curActiveStance === 'curious') {
          targetBoneRot.leftUpperArm = { x: 0.35 + armBreath, y: -0.2, z: 1.15 };
          targetBoneRot.leftLowerArm = { x: -0.5, y: -0.4, z: -0.2 };
          targetBoneRot.rightUpperArm = { x: 0.35 + armBreath, y: 0.2, z: -1.15 };
          targetBoneRot.rightLowerArm = { x: -0.5, y: 0.4, z: 0.2 };
        }
      }

      // =========================================================
      // APPLY TO VRM AVATAR (IF LOADED)
      // =========================================================
      if (vrm) {
        vrm.update(delta);
        vrm.scene.scale.set(targetScale, targetScale, targetScale);
        vrm.scene.position.set(0, targetBoneRot.rootPosY - (uScale - 1.0) * 0.32, targetBoneRot.rootPosZ);
        vrm.scene.rotation.z = targetBoneRot.rootRotZ;

        updateVRMExpressions(vrm, curEmotion, curViseme, curVisemeOpenness);

        if (currentBlinkAmount > 0 && vrm.expressionManager) {
          vrm.expressionManager.setValue('blink', currentBlinkAmount);
        }

        if (vrm.lookAt) {
          vrm.lookAt.lookAt(
            new THREE.Vector3(
              mousePosRef.current.x * 0.85 + saccadeOffset.x,
              0.25 + mousePosRef.current.y * 0.55 + saccadeOffset.y,
              camera.position.z
            )
          );
        }

        const humanoid = vrm.humanoid;
        if (humanoid) {
          const applyRot = (nodeName: string, r: { x: number; y: number; z: number }) => {
            const node = humanoid.getNormalizedBoneNode(nodeName as any);
            if (node) {
              node.rotation.x = THREE.MathUtils.lerp(node.rotation.x, r.x, 0.12);
              node.rotation.y = THREE.MathUtils.lerp(node.rotation.y, r.y, 0.12);
              node.rotation.z = THREE.MathUtils.lerp(node.rotation.z, r.z, 0.12);
            }
          };

          applyRot('hips', targetBoneRot.hips);
          applyRot('spine', targetBoneRot.spine);
          applyRot('chest', targetBoneRot.chest);
          applyRot('neck', targetBoneRot.neck);
          applyRot('head', targetBoneRot.head);
          applyRot('leftUpperArm', targetBoneRot.leftUpperArm);
          applyRot('leftLowerArm', targetBoneRot.leftLowerArm);
          applyRot('leftHand', targetBoneRot.leftHand);
          applyRot('rightUpperArm', targetBoneRot.rightUpperArm);
          applyRot('rightLowerArm', targetBoneRot.rightLowerArm);
          applyRot('rightHand', targetBoneRot.rightHand);
        }

        vrm.scene.rotation.y = THREE.MathUtils.lerp(
          vrm.scene.rotation.y,
          Math.PI + targetRotationYRef.current,
          0.12
        );
      }

      // =========================================================
      // APPLY TO PROCEDURAL BUILT-IN AVATAR
      // =========================================================
      if (procRig) {
        procRig.root.scale.set(targetScale, targetScale, targetScale);
        procRig.root.position.set(0, targetBoneRot.rootPosY - (uScale - 1.0) * 0.32, targetBoneRot.rootPosZ);
        procRig.root.rotation.z = targetBoneRot.rootRotZ;

        // Apply Bone Orientations
        const { bones, face, updateHairPhysics } = procRig;
        const lerpBone = (b: THREE.Group, r: { x: number; y: number; z: number }) => {
          b.rotation.x = THREE.MathUtils.lerp(b.rotation.x, r.x, 0.12);
          b.rotation.y = THREE.MathUtils.lerp(b.rotation.y, r.y, 0.12);
          b.rotation.z = THREE.MathUtils.lerp(b.rotation.z, r.z, 0.12);
        };

        lerpBone(bones.hips, targetBoneRot.hips);
        lerpBone(bones.spine, targetBoneRot.spine);
        lerpBone(bones.chest, targetBoneRot.chest);
        lerpBone(bones.neck, targetBoneRot.neck);
        lerpBone(bones.head, targetBoneRot.head);
        lerpBone(bones.leftUpperArm, targetBoneRot.leftUpperArm);
        lerpBone(bones.leftLowerArm, targetBoneRot.leftLowerArm);
        lerpBone(bones.leftHand, targetBoneRot.leftHand);
        lerpBone(bones.rightUpperArm, targetBoneRot.rightUpperArm);
        lerpBone(bones.rightLowerArm, targetBoneRot.rightLowerArm);
        lerpBone(bones.rightHand, targetBoneRot.rightHand);

        // Face & Physics
        face.setBlink(currentBlinkAmount);
        face.setViseme(curViseme, curVisemeOpenness);
        face.setEmotion(curEmotion);
        face.setGaze(mousePosRef.current.x * 0.6 + saccadeOffset.x * 10, mousePosRef.current.y * 0.6 + saccadeOffset.y * 10);
        updateHairPhysics(time, curDancing || curTalking || isReacting, delta, Math.abs(mousePosRef.current.x) + (isDraggingRef.current ? 0.8 : 0));

        procRig.root.rotation.y = THREE.MathUtils.lerp(
          procRig.root.rotation.y,
          targetRotationYRef.current,
          0.12
        );
      }

      // Rotate 2099 hologram pedestal rings
      pedestalGroup.rotation.y = time * 0.2;
      outerRingMesh.rotation.z = time * 0.35;
      innerRingMesh.rotation.z = -time * 0.5;

      // Smooth Camera Zoom & Framing Lerping
      cameraDistanceRef.current = THREE.MathUtils.lerp(
        cameraDistanceRef.current,
        targetCameraDistanceRef.current,
        0.08
      );
      camera.position.z = cameraDistanceRef.current;
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCameraPosYRef.current, 0.08);
      camera.lookAt(0, camera.position.y, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Mouse Move Parallax & Drag
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePosRef.current = { x, y };

      if (isDraggingRef.current) {
        const deltaX = e.clientX - dragStartRef.current.x;
        targetRotationYRef.current = dragStartRef.current.rotY + deltaX * 0.01;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDraggingRef.current = true;
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          rotY: targetRotationYRef.current,
        };
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    // Wheel Zoom Support
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetCameraDistanceRef.current = THREE.MathUtils.clamp(
        targetCameraDistanceRef.current + e.deltaY * 0.0025,
        1.2,
        4.2
      );
    };

    // Mobile Touch Drag & Pinch-to-Zoom
    let initialPinchDist = 0;
    let initialPinchCamDist = 2.75;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          rotY: targetRotationYRef.current,
        };
      } else if (e.touches.length === 2) {
        isDraggingRef.current = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.hypot(dx, dy);
        initialPinchCamDist = targetCameraDistanceRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDraggingRef.current) {
        const deltaX = e.touches[0].clientX - dragStartRef.current.x;
        targetRotationYRef.current = dragStartRef.current.rotY + deltaX * 0.012;
      } else if (e.touches.length === 2 && initialPinchDist > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const factor = initialPinchDist / Math.max(10, currentDist);
        targetCameraDistanceRef.current = THREE.MathUtils.clamp(
          initialPinchCamDist * factor,
          1.2,
          4.2
        );
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      initialPinchDist = 0;
    };

    // 3D Raycasting Tap / Click Handler for Physical Reactions
    const handleCanvasClick = (e: MouseEvent) => {
      if (Math.abs(e.clientX - dragStartRef.current.x) > 6) return;

      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      );

      const clickXPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const clickYPercent = ((e.clientY - rect.top) / rect.height) * 100;

      raycasterRef.current.setFromCamera(mouse, camera);

      const activeSceneObj = currentVrmRef.current?.scene || proceduralRigRef.current?.root;

      if (activeSceneObj) {
        const intersects = raycasterRef.current.intersectObjects(
          activeSceneObj.children,
          true
        );

        if (intersects.length > 0) {
          const hitPoint = intersects[0].point;
          const currentY = activeSceneObj.position.y;
          const relY = hitPoint.y - currentY;

          if (relY > 0.95) {
            if (Math.abs(hitPoint.x) < 0.12 && relY > 1.05) {
              triggerPhysicalReaction('pat', clickXPercent, clickYPercent);
            } else if (hitPoint.x < 0) {
              triggerPhysicalReaction('poke_left', clickXPercent, clickYPercent);
            } else {
              triggerPhysicalReaction('poke_right', clickXPercent, clickYPercent);
            }
          } else {
            triggerPhysicalReaction('shy', clickXPercent, clickYPercent);
          }
        } else {
          triggerPhysicalReaction('knock', clickXPercent, clickYPercent);
        }
      } else {
        triggerPhysicalReaction('knock', clickXPercent, clickYPercent);
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('click', handleCanvasClick);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeReqId !== null) cancelAnimationFrame(resizeReqId);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('click', handleCanvasClick);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mouseup', handleMouseUp);

      if (currentVrmRef.current && sceneRef.current) {
        sceneRef.current.remove(currentVrmRef.current.scene);
        VRMUtils.deepDispose(currentVrmRef.current.scene);
      }
      if (proceduralRigRef.current && sceneRef.current) {
        sceneRef.current.remove(proceduralRigRef.current.root);
        proceduralRigRef.current.dispose();
      }
      renderer.dispose();
    };
  }, []); // Run ONCE on mount

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadVRMModel(file);
    if (onUploadVrmFile) onUploadVrmFile(file);
  };

  const handleResetRotation = () => {
    targetRotationYRef.current = 0;
  };

  const handleResetPosition = () => {
    setUserHeightOffset(0);
    setUserScaleMultiplier(1.0);
    targetRotationYRef.current = 0;
    targetCameraDistanceRef.current = 2.75;
    targetCameraPosYRef.current = 0.46;
    setCameraFraming('full');
  };

  const handleZoom = (delta: number) => {
    targetCameraDistanceRef.current = THREE.MathUtils.clamp(
      targetCameraDistanceRef.current + delta,
      1.2,
      4.2
    );
  };

  return (
    <div
      id="vrm-character-viewport"
      className="relative w-full h-full min-h-[520px] flex items-center justify-center select-none overflow-hidden"
    >
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-pointer active:cursor-grabbing" />

      {/* Sleek Floating Camera Controls Pill - Positioned safely on right side below header */}
      <div className="absolute top-16 right-2 sm:top-20 sm:right-4 z-20 flex flex-col items-center gap-1.5 p-1 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/50">
        <button
          onClick={() => setCameraFraming(cameraFraming === 'full' ? 'portrait' : 'full')}
          title={cameraFraming === 'full' ? 'Switch to Portrait Mode (Face Focus)' : 'Switch to Full Body Mode'}
          className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
            cameraFraming === 'portrait'
              ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
              : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30'
          }`}
        >
          {cameraFraming === 'full' ? <Maximize2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </button>

        <div className="w-4 h-[1px] bg-white/15 my-0.5" />

        <button
          onClick={() => handleZoom(-0.35)}
          title="Zoom In"
          className="p-1.5 rounded-xl text-zinc-300 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleZoom(0.35)}
          title="Zoom Out"
          className="p-1.5 rounded-xl text-zinc-300 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetPosition}
          title="Reset Camera & View"
          className="p-1.5 rounded-xl text-zinc-300 hover:text-pink-300 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Reaction Speech Bubble */}
      {reactionText && (
        <div className="absolute top-16 inset-x-6 z-30 flex justify-center pointer-events-none animate-in zoom-in-95 fade-in duration-200">
          <div className="px-4 py-1.5 rounded-full cyber-panel-glow border-pink-500/50 text-white text-xs font-semibold shadow-xl shadow-pink-500/30 text-center max-w-sm">
            <span className="text-pink-300 font-mono tracking-wide">{reactionText}</span>
          </div>
        </div>
      )}

      {/* Floating Burst Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute z-30 pointer-events-none text-2xl animate-bounce duration-700 transition-all transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            textShadow: `0 0 12px ${p.color}`,
          }}
        >
          {p.icon}
        </div>
      ))}

      {/* Loading Progress Indicator */}
      {isLoadingModel && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white">
          <RefreshCw className="w-8 h-8 text-pink-400 animate-spin mb-3" />
          <h4 className="text-xs font-bold tracking-wide">Loading 3D Model...</h4>
          <div className="w-40 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/20 mt-2">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-500 transition-all duration-200"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-cyan-300 mt-1.5">{loadingProgress}%</span>
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="absolute bottom-6 inset-x-6 z-30 p-3 rounded-2xl bg-red-950/90 border border-red-500/50 flex items-center gap-3 text-red-200 text-xs shadow-xl animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs">Load Error</p>
            <p className="text-red-300/80 text-[10px]">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="px-2 py-1 bg-white/10 rounded text-[10px] hover:bg-white/20 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
