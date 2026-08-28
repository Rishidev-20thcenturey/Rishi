import * as THREE from 'three';

export interface ProceduralAvatarRig {
  root: THREE.Group;
  bones: {
    hips: THREE.Group;
    spine: THREE.Group;
    chest: THREE.Group;
    upperChest?: THREE.Group;
    neck: THREE.Group;
    head: THREE.Group;
    leftUpperArm: THREE.Group;
    leftLowerArm: THREE.Group;
    leftHand: THREE.Group;
    rightUpperArm: THREE.Group;
    rightLowerArm: THREE.Group;
    rightHand: THREE.Group;
    leftUpperLeg: THREE.Group;
    rightUpperLeg: THREE.Group;
  };
  face: {
    setBlink: (amount: number) => void;
    setViseme: (viseme: string, openness: number) => void;
    setEmotion: (emotion: string) => void;
    setGaze: (x: number, y: number) => void;
  };
  updateHairPhysics: (time: number, isMoving: boolean) => void;
  dispose: () => void;
}

export function createProceduralAnimeAvatar(): ProceduralAvatarRig {
  const root = new THREE.Group();
  root.name = 'ProceduralAnimeAvatar';

  // Materials with high-quality Toon / Soft Anime Shading
  const skinMat = new THREE.MeshToonMaterial({
    color: 0xffe4db,
    gradientMap: null,
  });

  const hairMat = new THREE.MeshToonMaterial({
    color: 0xfce7f3, // Soft rose-pink anime hair
  });

  const hairHighlightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
  });

  const eyeScleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeIrisMat = new THREE.MeshBasicMaterial({ color: 0xec4899 }); // Vibrant magenta anime iris
  const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x1f1025 });
  const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const eyelidMat = new THREE.MeshToonMaterial({ color: 0xffe4db });

  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.35,
  });

  const mouthMat = new THREE.MeshBasicMaterial({ color: 0xbe123c });
  const mouthInsideMat = new THREE.MeshBasicMaterial({ color: 0x4a044e });

  const dressDarkMat = new THREE.MeshToonMaterial({ color: 0x18181b });
  const dressAccentMat = new THREE.MeshToonMaterial({ color: 0xec4899 });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.8,
    roughness: 0.2,
  });
  const glowGemMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  // 1. Hips / Root Center
  const hips = new THREE.Group();
  hips.position.set(0, 0.75, 0);
  root.add(hips);

  // Pelvis mesh
  const pelvisGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.14, 16);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, dressDarkMat);
  pelvisMesh.castShadow = true;
  hips.add(pelvisMesh);

  // Pleated Skirt
  const skirtGeo = new THREE.ConeGeometry(0.24, 0.22, 20, 1, true);
  const skirtMesh = new THREE.Mesh(skirtGeo, dressDarkMat);
  skirtMesh.position.set(0, -0.05, 0);
  skirtMesh.castShadow = true;
  hips.add(skirtMesh);

  // Skirt Glow Ribbon Trim
  const skirtTrimGeo = new THREE.TorusGeometry(0.23, 0.008, 8, 24);
  const skirtTrimMesh = new THREE.Mesh(skirtTrimGeo, dressAccentMat);
  skirtTrimMesh.rotation.x = Math.PI / 2;
  skirtTrimMesh.position.set(0, -0.16, 0);
  hips.add(skirtTrimMesh);

  // 2. Spine & Chest
  const spine = new THREE.Group();
  spine.position.set(0, 0.1, 0);
  hips.add(spine);

  const waistGeo = new THREE.CylinderGeometry(0.1, 0.11, 0.12, 16);
  const waistMesh = new THREE.Mesh(waistGeo, dressDarkMat);
  waistMesh.castShadow = true;
  spine.add(waistMesh);

  const chest = new THREE.Group();
  chest.position.set(0, 0.12, 0);
  spine.add(chest);

  const chestGeo = new THREE.CylinderGeometry(0.125, 0.1, 0.16, 16);
  const chestMesh = new THREE.Mesh(chestGeo, dressDarkMat);
  chestMesh.castShadow = true;
  chest.add(chestMesh);

  // Bustier / Idol Ribbon & Cyber Core
  const ribbonGeo = new THREE.BoxGeometry(0.14, 0.05, 0.03);
  const ribbonMesh = new THREE.Mesh(ribbonGeo, dressAccentMat);
  ribbonMesh.position.set(0, 0.02, 0.12);
  chest.add(ribbonMesh);

  const coreGemGeo = new THREE.OctahedronGeometry(0.025);
  const coreGemMesh = new THREE.Mesh(coreGemGeo, glowGemMat);
  coreGemMesh.position.set(0, 0.02, 0.14);
  chest.add(coreGemMesh);

  // 3. Neck & Head
  const neck = new THREE.Group();
  neck.position.set(0, 0.12, 0);
  chest.add(neck);

  const neckGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.08, 16);
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.set(0, 0.04, 0);
  neck.add(neckMesh);

  // Choker
  const chokerGeo = new THREE.CylinderGeometry(0.047, 0.047, 0.02, 16);
  const chokerMesh = new THREE.Mesh(chokerGeo, dressDarkMat);
  chokerMesh.position.set(0, 0.04, 0);
  neck.add(chokerMesh);

  const head = new THREE.Group();
  head.position.set(0, 0.1, 0);
  neck.add(head);

  // Anime Face & Head Geometry (Cute soft teardrop/spherical anime head)
  const headGeo = new THREE.SphereGeometry(0.14, 32, 24);
  headGeo.scale(1, 1.15, 1.05);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.08, 0);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Chin contour
  const chinGeo = new THREE.ConeGeometry(0.06, 0.08, 16);
  const chinMesh = new THREE.Mesh(chinGeo, skinMat);
  chinMesh.rotation.x = Math.PI;
  chinMesh.position.set(0, 0.01, 0.08);
  head.add(chinMesh);

  // 4. Eyes & Facial Features (Blinking & Expressions)
  const leftEyeGroup = new THREE.Group();
  leftEyeGroup.position.set(0.048, 0.09, 0.135);
  head.add(leftEyeGroup);

  const rightEyeGroup = new THREE.Group();
  rightEyeGroup.position.set(-0.048, 0.09, 0.135);
  head.add(rightEyeGroup);

  const createEye = () => {
    const eyeContainer = new THREE.Group();

    // Eye Sclera (White background)
    const scleraGeo = new THREE.PlaneGeometry(0.04, 0.05);
    const sclera = new THREE.Mesh(scleraGeo, eyeScleraMat);
    eyeContainer.add(sclera);

    // Iris (Large anime magenta)
    const irisGeo = new THREE.PlaneGeometry(0.03, 0.042);
    const iris = new THREE.Mesh(irisGeo, eyeIrisMat);
    iris.position.set(0, 0, 0.001);
    eyeContainer.add(iris);

    // Pupil
    const pupilGeo = new THREE.PlaneGeometry(0.016, 0.024);
    const pupil = new THREE.Mesh(pupilGeo, eyePupilMat);
    pupil.position.set(0, 0, 0.002);
    eyeContainer.add(pupil);

    // Specular Catchlights (Top sparkle & soft glow)
    const highlightGeo = new THREE.CircleGeometry(0.006, 12);
    const highlight = new THREE.Mesh(highlightGeo, eyeHighlightMat);
    highlight.position.set(0.007, 0.01, 0.003);
    eyeContainer.add(highlight);

    const subHighlightGeo = new THREE.CircleGeometry(0.003, 8);
    const subHighlight = new THREE.Mesh(subHighlightGeo, eyeHighlightMat);
    subHighlight.position.set(-0.006, -0.008, 0.003);
    eyeContainer.add(subHighlight);

    // Eyelash upper contour
    const lashGeo = new THREE.BoxGeometry(0.046, 0.006, 0.004);
    const lash = new THREE.Mesh(lashGeo, dressDarkMat);
    lash.position.set(0, 0.026, 0.004);
    eyeContainer.add(lash);

    // Dynamic Eyelid for Blinking (Slides down)
    const eyelidGeo = new THREE.PlaneGeometry(0.046, 0.056);
    const eyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
    eyelid.position.set(0, 0.056, 0.005); // retracted up by default
    eyeContainer.add(eyelid);

    return { eyeContainer, eyelid, iris, pupil };
  };

  const leftEye = createEye();
  leftEyeGroup.add(leftEye.eyeContainer);
  leftEyeGroup.rotation.y = 0.12;

  const rightEye = createEye();
  rightEyeGroup.add(rightEye.eyeContainer);
  rightEyeGroup.rotation.y = -0.12;

  // Eyebrows
  const browGeo = new THREE.BoxGeometry(0.038, 0.004, 0.002);
  const leftBrow = new THREE.Mesh(browGeo, hairMat);
  leftBrow.position.set(0.048, 0.128, 0.136);
  leftBrow.rotation.z = -0.08;
  head.add(leftBrow);

  const rightBrow = new THREE.Mesh(browGeo, hairMat);
  rightBrow.position.set(-0.048, 0.128, 0.136);
  rightBrow.rotation.z = 0.08;
  head.add(rightBrow);

  // Blush planes (Anime cheek flush)
  const blushGeo = new THREE.CircleGeometry(0.02, 16);
  const leftBlush = new THREE.Mesh(blushGeo, blushMat);
  leftBlush.position.set(0.065, 0.062, 0.132);
  leftBlush.rotation.y = 0.25;
  head.add(leftBlush);

  const rightBlush = new THREE.Mesh(blushGeo, blushMat);
  rightBlush.position.set(-0.065, 0.062, 0.132);
  rightBlush.rotation.y = -0.25;
  head.add(rightBlush);

  // Animated Mouth (Viseme Morphs)
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, 0.038, 0.144);
  head.add(mouthGroup);

  const mouthShape = new THREE.Shape();
  mouthShape.moveTo(-0.015, 0);
  mouthShape.quadraticCurveTo(0, -0.012, 0.015, 0);
  mouthShape.quadraticCurveTo(0, -0.004, -0.015, 0);
  const mouthGeo = new THREE.ShapeGeometry(mouthShape);
  const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
  mouthGroup.add(mouthMesh);

  // 5. Anime Styled Hair (Bangs, Side locks, Twin-Tails)
  const hairBaseGeo = new THREE.SphereGeometry(0.155, 24, 20);
  hairBaseGeo.scale(1.02, 1.16, 1.12);
  const hairBase = new THREE.Mesh(hairBaseGeo, hairMat);
  hairBase.position.set(0, 0.1, -0.02);
  hairBase.castShadow = true;
  head.add(hairBase);

  // Hair Halo Shine Highlight Band
  const haloGeo = new THREE.TorusGeometry(0.145, 0.008, 8, 32);
  const haloMesh = new THREE.Mesh(haloGeo, hairHighlightMat);
  haloMesh.position.set(0, 0.15, 0.04);
  haloMesh.rotation.x = Math.PI / 4;
  head.add(haloMesh);

  // Bangs
  for (let i = -3; i <= 3; i++) {
    const bangGeo = new THREE.ConeGeometry(0.022, 0.08, 8);
    const bang = new THREE.Mesh(bangGeo, hairMat);
    bang.rotation.x = Math.PI;
    bang.rotation.z = (i * 0.08);
    bang.position.set(i * 0.025, 0.14, 0.13 - Math.abs(i) * 0.012);
    head.add(bang);
  }

  // Twin-tail Left Physics Rig
  const leftTwinTail = new THREE.Group();
  leftTwinTail.position.set(0.14, 0.14, -0.04);
  head.add(leftTwinTail);

  // Ribbon Left
  const ribbonL = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), dressAccentMat);
  leftTwinTail.add(ribbonL);

  const leftTailSegments: THREE.Mesh[] = [];
  let prevTailL: THREE.Object3D = leftTwinTail;
  for (let s = 0; s < 4; s++) {
    const segGeo = new THREE.ConeGeometry(0.03 - s * 0.005, 0.15, 10);
    const segMesh = new THREE.Mesh(segGeo, hairMat);
    segMesh.rotation.x = Math.PI;
    segMesh.position.set(0.01 * s, -0.08, 0);
    prevTailL.add(segMesh);
    leftTailSegments.push(segMesh);
    prevTailL = segMesh;
  }

  // Twin-tail Right Physics Rig
  const rightTwinTail = new THREE.Group();
  rightTwinTail.position.set(-0.14, 0.14, -0.04);
  head.add(rightTwinTail);

  // Ribbon Right
  const ribbonR = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), dressAccentMat);
  rightTwinTail.add(ribbonR);

  const rightTailSegments: THREE.Mesh[] = [];
  let prevTailR: THREE.Object3D = rightTwinTail;
  for (let s = 0; s < 4; s++) {
    const segGeo = new THREE.ConeGeometry(0.03 - s * 0.005, 0.15, 10);
    const segMesh = new THREE.Mesh(segGeo, hairMat);
    segMesh.rotation.x = Math.PI;
    segMesh.position.set(-0.01 * s, -0.08, 0);
    prevTailR.add(segMesh);
    rightTailSegments.push(segMesh);
    prevTailR = segMesh;
  }

  // 6. Arms & Hands
  // Left Arm
  const leftUpperArm = new THREE.Group();
  leftUpperArm.position.set(0.16, 0.08, 0);
  chest.add(leftUpperArm);

  const upperArmLGeo = new THREE.CylinderGeometry(0.032, 0.03, 0.22, 12);
  const upperArmLMesh = new THREE.Mesh(upperArmLGeo, skinMat);
  upperArmLMesh.position.set(0, -0.11, 0);
  upperArmLMesh.castShadow = true;
  leftUpperArm.add(upperArmLMesh);

  const leftLowerArm = new THREE.Group();
  leftLowerArm.position.set(0, -0.22, 0);
  leftUpperArm.add(leftLowerArm);

  const lowerArmLGeo = new THREE.CylinderGeometry(0.03, 0.026, 0.2, 12);
  const lowerArmLMesh = new THREE.Mesh(lowerArmLGeo, skinMat);
  lowerArmLMesh.position.set(0, -0.1, 0);
  lowerArmLMesh.castShadow = true;
  leftLowerArm.add(lowerArmLMesh);

  // Idol Sleeve Cuff
  const cuffLGeo = new THREE.CylinderGeometry(0.042, 0.036, 0.08, 12);
  const cuffL = new THREE.Mesh(cuffLGeo, dressAccentMat);
  cuffL.position.set(0, -0.06, 0);
  leftLowerArm.add(cuffL);

  const leftHand = new THREE.Group();
  leftHand.position.set(0, -0.2, 0);
  leftLowerArm.add(leftHand);

  const handLGeo = new THREE.SphereGeometry(0.026, 12, 12);
  handLGeo.scale(1, 1.3, 0.7);
  const handLMesh = new THREE.Mesh(handLGeo, skinMat);
  handLMesh.position.set(0, -0.025, 0);
  leftHand.add(handLMesh);

  // Right Arm
  const rightUpperArm = new THREE.Group();
  rightUpperArm.position.set(-0.16, 0.08, 0);
  chest.add(rightUpperArm);

  const upperArmRGeo = new THREE.CylinderGeometry(0.032, 0.03, 0.22, 12);
  const upperArmRMesh = new THREE.Mesh(upperArmRGeo, skinMat);
  upperArmRMesh.position.set(0, -0.11, 0);
  upperArmRMesh.castShadow = true;
  rightUpperArm.add(upperArmRMesh);

  const rightLowerArm = new THREE.Group();
  rightLowerArm.position.set(0, -0.22, 0);
  rightUpperArm.add(rightLowerArm);

  const lowerArmRGeo = new THREE.CylinderGeometry(0.03, 0.026, 0.2, 12);
  const lowerArmRMesh = new THREE.Mesh(lowerArmRGeo, skinMat);
  lowerArmRMesh.position.set(0, -0.1, 0);
  lowerArmRMesh.castShadow = true;
  rightLowerArm.add(lowerArmRMesh);

  // Idol Sleeve Cuff Right
  const cuffRGeo = new THREE.CylinderGeometry(0.042, 0.036, 0.08, 12);
  const cuffR = new THREE.Mesh(cuffRGeo, dressAccentMat);
  cuffR.position.set(0, -0.06, 0);
  rightLowerArm.add(cuffR);

  const rightHand = new THREE.Group();
  rightHand.position.set(0, -0.2, 0);
  rightLowerArm.add(rightHand);

  const handRGeo = new THREE.SphereGeometry(0.026, 12, 12);
  handRGeo.scale(1, 1.3, 0.7);
  const handRMesh = new THREE.Mesh(handRGeo, skinMat);
  handRMesh.position.set(0, -0.025, 0);
  rightHand.add(handRMesh);

  // 7. Complete Anime Legs & High-Fidelity Idol Boots / Shoes
  const createAnimeLeg = (isLeft: boolean) => {
    const legGroup = new THREE.Group();
    const sideSign = isLeft ? 1 : -1;
    legGroup.position.set(sideSign * 0.08, -0.06, 0);

    // Upper Leg (Thigh) - Smooth contoured fair anime skin tone
    const upperLegGeo = new THREE.CylinderGeometry(0.048, 0.038, 0.32, 20);
    const upperLegMesh = new THREE.Mesh(upperLegGeo, skinMat);
    upperLegMesh.position.set(0, -0.16, 0);
    upperLegMesh.castShadow = true;
    legGroup.add(upperLegMesh);

    // Thigh-High Stocking Top Band / Lace Ribbon
    const bandGeo = new THREE.TorusGeometry(0.046, 0.007, 8, 24);
    const bandMesh = new THREE.Mesh(bandGeo, dressAccentMat);
    bandMesh.rotation.x = Math.PI / 2;
    bandMesh.position.set(0, -0.21, 0);
    legGroup.add(bandMesh);

    const goldBandGeo = new THREE.TorusGeometry(0.045, 0.003, 8, 24);
    const goldBandMesh = new THREE.Mesh(goldBandGeo, goldTrimMat);
    goldBandMesh.rotation.x = Math.PI / 2;
    goldBandMesh.position.set(0, -0.22, 0);
    legGroup.add(goldBandMesh);

    // Knee Joint
    const kneeGeo = new THREE.SphereGeometry(0.036, 16, 16);
    const kneeMesh = new THREE.Mesh(kneeGeo, skinMat);
    kneeMesh.position.set(0, -0.32, 0.005);
    kneeMesh.scale.set(1, 1.1, 1);
    legGroup.add(kneeMesh);

    // Lower Leg (Calf & Shin) with Thigh-High Dark Stocking
    const lowerLegGroup = new THREE.Group();
    lowerLegGroup.position.set(0, -0.32, 0);
    legGroup.add(lowerLegGroup);

    // Calf Stocking Mesh
    const calfGeo = new THREE.CylinderGeometry(0.037, 0.029, 0.30, 20);
    const calfMesh = new THREE.Mesh(calfGeo, dressDarkMat);
    calfMesh.position.set(0, -0.15, -0.005);
    calfMesh.castShadow = true;
    lowerLegGroup.add(calfMesh);

    // Sock Glowing Cyan Cyber Diamonds / Accents
    for (let d = 0; d < 3; d++) {
      const dotGeo = new THREE.OctahedronGeometry(0.005);
      const dotMesh = new THREE.Mesh(dotGeo, glowGemMat);
      dotMesh.position.set(0, -0.08 - d * 0.06, 0.033);
      lowerLegGroup.add(dotMesh);
    }

    // Ankle Cuff & Boot Collar
    const ankleCuffGeo = new THREE.CylinderGeometry(0.034, 0.038, 0.06, 20);
    const ankleCuff = new THREE.Mesh(ankleCuffGeo, dressDarkMat);
    ankleCuff.position.set(0, -0.28, 0);
    lowerLegGroup.add(ankleCuff);

    // Boot Top Gold Trim Ring
    const bootRingGeo = new THREE.TorusGeometry(0.035, 0.005, 8, 24);
    const bootRing = new THREE.Mesh(bootRingGeo, goldTrimMat);
    bootRing.rotation.x = Math.PI / 2;
    bootRing.position.set(0, -0.25, 0);
    lowerLegGroup.add(bootRing);

    // Full 3D Anime Idol Foot & Boot Structure
    const footGroup = new THREE.Group();
    footGroup.position.set(0, -0.30, 0);
    lowerLegGroup.add(footGroup);

    // Boot Upper & Instep (sleek tapering forward)
    const instepGeo = new THREE.BoxGeometry(0.062, 0.05, 0.10);
    const instepMesh = new THREE.Mesh(instepGeo, dressDarkMat);
    instepMesh.position.set(0, -0.02, 0.025);
    instepMesh.castShadow = true;
    footGroup.add(instepMesh);

    // Rounded Anime Toe Box
    const toeGeo = new THREE.SphereGeometry(0.032, 16, 16);
    toeGeo.scale(0.95, 0.75, 1.35);
    const toeMesh = new THREE.Mesh(toeGeo, dressDarkMat);
    toeMesh.position.set(0, -0.03, 0.07);
    toeMesh.castShadow = true;
    footGroup.add(toeMesh);

    // Toe Cap Gold Accent Plate
    const toeCapGeo = new THREE.SphereGeometry(0.022, 12, 12);
    toeCapGeo.scale(0.9, 0.6, 1.2);
    const toeCapMesh = new THREE.Mesh(toeCapGeo, goldTrimMat);
    toeCapMesh.position.set(0, -0.032, 0.088);
    footGroup.add(toeCapMesh);

    // Platform Sole (Rubber base with clean cyber edges)
    const soleGeo = new THREE.BoxGeometry(0.068, 0.016, 0.14);
    const soleMesh = new THREE.Mesh(soleGeo, goldTrimMat);
    soleMesh.position.set(0, -0.052, 0.04);
    soleMesh.castShadow = true;
    footGroup.add(soleMesh);

    // Cyber Cyan Sole Light Strip
    const soleLightGeo = new THREE.BoxGeometry(0.069, 0.004, 0.138);
    const soleLightMesh = new THREE.Mesh(soleLightGeo, glowGemMat);
    soleLightMesh.position.set(0, -0.046, 0.04);
    footGroup.add(soleLightMesh);

    // Idol Wedge / Block Heel
    const heelGeo = new THREE.CylinderGeometry(0.018, 0.014, 0.045, 12);
    const heelMesh = new THREE.Mesh(heelGeo, dressDarkMat);
    heelMesh.position.set(0, -0.065, -0.02);
    heelMesh.castShadow = true;
    footGroup.add(heelMesh);

    const heelTipGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.008, 12);
    const heelTipMesh = new THREE.Mesh(heelTipGeo, goldTrimMat);
    heelTipMesh.position.set(0, -0.09, -0.02);
    footGroup.add(heelTipMesh);

    return {
      upperLeg: legGroup,
      lowerLeg: lowerLegGroup,
      foot: footGroup,
    };
  };

  const leftLeg = createAnimeLeg(true);
  const leftUpperLeg = leftLeg.upperLeg;
  hips.add(leftUpperLeg);

  const rightLeg = createAnimeLeg(false);
  const rightUpperLeg = rightLeg.upperLeg;
  hips.add(rightUpperLeg);

  // Set initial default resting angles
  leftUpperArm.rotation.set(0.2, 0.1, 1.25);
  leftLowerArm.rotation.set(-0.35, 0.2, -0.45);
  rightUpperArm.rotation.set(0.2, -0.1, -1.25);
  rightLowerArm.rotation.set(-0.35, -0.2, 0.45);

  // Face Controller
  const faceController = {
    setBlink: (amount: number) => {
      const amt = Math.max(0, Math.min(1, amount));
      // Slide eyelid from Y=0.056 (fully open) down to Y=0.0 (closed)
      const eyePos = 0.056 * (1 - amt);
      leftEye.eyelid.position.y = eyePos;
      rightEye.eyelid.position.y = eyePos;
    },
    setViseme: (viseme: string, openness: number) => {
      const amt = Math.max(0, Math.min(1, openness));
      mouthGroup.scale.set(1 + amt * 0.4, 1 + amt * 1.8, 1);

      if (viseme === 'aa' || viseme === 'oh') {
        mouthGroup.position.y = 0.038 - amt * 0.01;
      } else if (viseme === 'ee' || viseme === 'smile') {
        mouthGroup.scale.x = 1.4 + amt * 0.5;
        mouthGroup.position.y = 0.04;
      } else {
        mouthGroup.position.y = 0.038;
      }
    },
    setEmotion: (emotion: string) => {
      if (emotion === 'blush' || emotion === 'love') {
        blushMat.opacity = 0.75;
      } else if (emotion === 'pout') {
        blushMat.opacity = 0.55;
        leftBrow.rotation.z = -0.25;
        rightBrow.rotation.z = 0.25;
      } else if (emotion === 'happy') {
        blushMat.opacity = 0.4;
        leftBrow.rotation.z = -0.05;
        rightBrow.rotation.z = 0.05;
      } else {
        blushMat.opacity = 0.25;
        leftBrow.rotation.z = -0.08;
        rightBrow.rotation.z = 0.08;
      }
    },
    setGaze: (x: number, y: number) => {
      const clampX = Math.max(-0.008, Math.min(0.008, x * 0.01));
      const clampY = Math.max(-0.008, Math.min(0.008, y * 0.01));
      leftEye.iris.position.set(clampX, clampY, 0.001);
      rightEye.iris.position.set(clampX, clampY, 0.001);
    },
  };

  // Second-order spring physics state for hair, ribbons, skirt & dynamic inertia
  const springState = {
    tailL: { pos: 0, vel: 0, rotXPos: 0, rotXVel: 0 },
    tailR: { pos: 0, vel: 0, rotXPos: 0, rotXVel: 0 },
    ribbon: { pos: 0, vel: 0 },
    skirt: { pos: 0, vel: 0 },
    bangs: { pos: 0, vel: 0 },
  };

  const updateHairPhysics = (
    time: number,
    isMoving: boolean,
    delta: number = 0.016,
    motionImpulse: number = 0
  ) => {
    const dt = Math.min(0.05, Math.max(0.005, delta));
    const k = 48.0; // Spring constant
    const damping = 6.8; // Damping constant

    // External driving wind & inertial forces
    const windNoise = Math.sin(time * 2.8) * 0.12 + Math.sin(time * 5.2) * 0.06;
    const movementForce = (isMoving ? Math.sin(time * 6.5) * 0.35 : 0) + motionImpulse * 0.5;

    // Spring calculation for Left Twintail
    const targetL = windNoise + movementForce;
    const forceL = -k * (springState.tailL.pos - targetL) - damping * springState.tailL.vel;
    springState.tailL.vel += forceL * dt;
    springState.tailL.pos += springState.tailL.vel * dt;

    // Spring calculation for Right Twintail
    const targetR = -windNoise - movementForce;
    const forceR = -k * (springState.tailR.pos - targetR) - damping * springState.tailR.vel;
    springState.tailR.vel += forceR * dt;
    springState.tailR.pos += springState.tailR.vel * dt;

    // Pitch Spring (X-axis bounce)
    const pitchForce = Math.cos(time * 3.0) * 0.15 + (isMoving ? 0.25 : 0);
    const forcePitch = -k * (springState.tailL.rotXPos - pitchForce) - damping * springState.tailL.rotXVel;
    springState.tailL.rotXVel += forcePitch * dt;
    springState.tailL.rotXPos += springState.tailL.rotXVel * dt;

    leftTwinTail.rotation.z = 0.14 + springState.tailL.pos * 0.6;
    leftTwinTail.rotation.x = springState.tailL.rotXPos * 0.4;

    rightTwinTail.rotation.z = -0.14 + springState.tailR.pos * 0.6;
    rightTwinTail.rotation.x = springState.tailL.rotXPos * 0.4;

    // Multi-segment chain spring physics for realistic hair fluidity
    leftTailSegments.forEach((seg, idx) => {
      const segLag = idx * 0.18;
      seg.rotation.z = springState.tailL.pos * (0.35 + idx * 0.15) + Math.sin(time * 4.2 - segLag) * 0.08;
      seg.rotation.x = springState.tailL.rotXPos * 0.25;
    });

    rightTailSegments.forEach((seg, idx) => {
      const segLag = idx * 0.18;
      seg.rotation.z = springState.tailR.pos * (0.35 + idx * 0.15) - Math.sin(time * 4.2 - segLag) * 0.08;
      seg.rotation.x = springState.tailL.rotXPos * 0.25;
    });

    // Chest Ribbon Spring Jiggle
    const ribbonForce = -35.0 * (springState.ribbon.pos - (isMoving ? Math.sin(time * 8.0) * 0.08 : 0)) - 5.0 * springState.ribbon.vel;
    springState.ribbon.vel += ribbonForce * dt;
    springState.ribbon.pos += springState.ribbon.vel * dt;
    ribbonMesh.rotation.x = springState.ribbon.pos;

    // Skirt Spring Dynamics
    const skirtTarget = Math.sin(time * 2.2) * 0.05 + motionImpulse * 0.2;
    const skirtForce = -30.0 * (springState.skirt.pos - skirtTarget) - 4.5 * springState.skirt.vel;
    springState.skirt.vel += skirtForce * dt;
    springState.skirt.pos += springState.skirt.vel * dt;
    skirtMesh.rotation.z = springState.skirt.pos;
    skirtMesh.rotation.x = Math.sin(time * 3.5) * 0.03 + (isMoving ? 0.06 : 0);
  };

  const dispose = () => {
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
  };

  return {
    root,
    bones: {
      hips,
      spine,
      chest,
      neck,
      head,
      leftUpperArm,
      leftLowerArm,
      leftHand,
      rightUpperArm,
      rightLowerArm,
      rightHand,
      leftUpperLeg,
      rightUpperLeg,
    },
    face: faceController,
    updateHairPhysics,
    dispose,
  };
}
