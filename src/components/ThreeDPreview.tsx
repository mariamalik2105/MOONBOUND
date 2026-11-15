import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface ThreeDPreviewProps {
  type: 'avatar' | 'pet';
  itemId: string;
  suitColor?: string;
  accentColor?: string;
}

export const ThreeDPreview: React.FC<ThreeDPreviewProps> = ({
  type,
  itemId,
  suitColor = '#ea580c',
  accentColor = '#fdba74',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    scene.background = null; // Transparent canvas background

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 3.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Studio RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting: Warm key light, cool hemisphere light
    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
    keyLight.position.set(2.5, 4, 3);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 512;
      keyLight.shadow.mapSize.height = 512;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0xd9e8f5, 0x1a243b, 1.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.5);
    rimLight.position.set(-2, 2.5, -3);
    scene.add(rimLight);

    // Contact shadow plane
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext('2d');
    if (sctx) {
      const grad = sctx.createRadialGradient(64, 64, 10, 64, 64, 60);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.01;
    scene.add(shadowMesh);

    // Model root group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Build procedural 3D model
    if (type === 'avatar') {
      // Composite Astronaut: 9 parts
      const suitMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(suitColor),
        roughness: 0.45,
        metalness: 0.1,
      });
      const whiteSuitMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.35,
        metalness: 0.15,
      });
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24, // Gold reflective visor
        roughness: 0.08,
        metalness: 0.95,
      });
      const darkMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.7,
        metalness: 0.2,
      });

      // 1. Torso
      const torsoGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.65, 16);
      const torso = new THREE.Mesh(torsoGeo, suitMat);
      torso.position.y = 0.85;
      torso.castShadow = true;
      modelGroup.add(torso);

      // 2. Chest control pack
      const chestGeo = new THREE.BoxGeometry(0.3, 0.24, 0.14);
      const chest = new THREE.Mesh(chestGeo, whiteSuitMat);
      chest.position.set(0, 0.88, 0.22);
      chest.castShadow = true;
      modelGroup.add(chest);

      // 3. Helmet Base
      const helmetGeo = new THREE.SphereGeometry(0.34, 20, 20);
      const helmet = new THREE.Mesh(helmetGeo, whiteSuitMat);
      helmet.position.y = 1.35;
      helmet.castShadow = true;
      modelGroup.add(helmet);

      // 4. Gold Visor
      const visorGeo = new THREE.SphereGeometry(0.24, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.rotation.x = Math.PI / 2;
      visor.position.set(0, 1.36, 0.16);
      visor.scale.set(1.1, 0.85, 0.95);
      modelGroup.add(visor);

      // 5. Backpack (PLSS - Portable Life Support System)
      const plssGeo = new THREE.BoxGeometry(0.44, 0.58, 0.26);
      const plss = new THREE.Mesh(plssGeo, whiteSuitMat);
      plss.position.set(0, 0.92, -0.22);
      plss.castShadow = true;
      modelGroup.add(plss);

      // 6. Oxygen Tanks on PLSS
      const tankGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.48, 12);
      const tank1 = new THREE.Mesh(tankGeo, darkMat);
      tank1.position.set(-0.12, 0.92, -0.36);
      const tank2 = new THREE.Mesh(tankGeo, darkMat);
      tank2.position.set(0.12, 0.92, -0.36);
      modelGroup.add(tank1, tank2);

      // 7. Legs & Boots
      const legGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.52, 12);
      const legL = new THREE.Mesh(legGeo, suitMat);
      legL.position.set(-0.16, 0.36, 0);
      legL.castShadow = true;
      const legR = new THREE.Mesh(legGeo, suitMat);
      legR.position.set(0.16, 0.36, 0);
      legR.castShadow = true;
      modelGroup.add(legL, legR);

      const bootGeo = new THREE.BoxGeometry(0.15, 0.14, 0.26);
      const bootL = new THREE.Mesh(bootGeo, darkMat);
      bootL.position.set(-0.16, 0.08, 0.05);
      const bootR = new THREE.Mesh(bootGeo, darkMat);
      bootR.position.set(0.16, 0.08, 0.05);
      modelGroup.add(bootL, bootR);

      // 8. Arms
      const armGeo = new THREE.CylinderGeometry(0.085, 0.09, 0.45, 12);
      const armL = new THREE.Mesh(armGeo, suitMat);
      armL.position.set(-0.4, 0.82, 0);
      armL.rotation.z = 0.2;
      const armR = new THREE.Mesh(armGeo, suitMat);
      armR.position.set(0.4, 0.82, 0);
      armR.rotation.z = -0.2;
      modelGroup.add(armL, armR);
    } else {
      // Pets
      if (itemId === 'rocky') {
        // ROCKY the Moon Rock: Faceted rock geometry with googly eyes
        const rockGeo = new THREE.DodecahedronGeometry(0.48, 1);
        const rockMat = new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.85,
          metalness: 0.15,
          flatShading: true,
        });
        const rockMesh = new THREE.Mesh(rockGeo, rockMat);
        rockMesh.position.y = 0.5;
        rockMesh.scale.set(1.1, 0.95, 1.0);
        rockMesh.castShadow = true;
        modelGroup.add(rockMesh);

        // Googly Eyes
        const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });

        const eyeWhiteGeo = new THREE.SphereGeometry(0.11, 16, 16);
        const pupilGeo = new THREE.SphereGeometry(0.055, 16, 16);

        const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        leftEyeWhite.position.set(-0.15, 0.6, 0.42);
        const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
        leftPupil.position.set(-0.14, 0.61, 0.51);

        const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        rightEyeWhite.position.set(0.15, 0.6, 0.42);
        const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
        rightPupil.position.set(0.14, 0.61, 0.51);

        modelGroup.add(leftEyeWhite, leftPupil, rightEyeWhite, rightPupil);

        // Tiny crystal spikes on top
        const crystalGeo = new THREE.ConeGeometry(0.08, 0.22, 5);
        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          metalness: 0.6,
          roughness: 0.2,
          flatShading: true,
        });
        const c1 = new THREE.Mesh(crystalGeo, crystalMat);
        c1.position.set(-0.18, 0.95, -0.05);
        c1.rotation.z = 0.25;
        const c2 = new THREE.Mesh(crystalGeo, crystalMat);
        c2.position.set(0.12, 0.98, 0.08);
        c2.rotation.z = -0.2;
        modelGroup.add(c1, c2);
      } else {
        // Space Animal (Dog / Cat / Monkey / Tardigrade / Tortoise)
        const petBodyMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(suitColor || 0xd97706),
          roughness: 0.4,
          metalness: 0.1,
        });
        const petVisorMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.1,
          metalness: 0.9,
        });

        // Body
        const bodyGeo = new THREE.CapsuleGeometry(0.24, 0.35, 8, 16);
        const body = new THREE.Mesh(bodyGeo, petBodyMat);
        body.rotation.z = Math.PI / 2;
        body.position.set(0, 0.45, 0);
        body.castShadow = true;
        modelGroup.add(body);

        // Helmet Dome
        const domeGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const dome = new THREE.Mesh(domeGeo, petVisorMat);
        dome.position.set(0.3, 0.58, 0);
        modelGroup.add(dome);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.28, 8);
        const l1 = new THREE.Mesh(legGeo, petBodyMat);
        l1.position.set(0.2, 0.15, 0.16);
        const l2 = new THREE.Mesh(legGeo, petBodyMat);
        l2.position.set(0.2, 0.15, -0.16);
        const l3 = new THREE.Mesh(legGeo, petBodyMat);
        l3.position.set(-0.2, 0.15, 0.16);
        const l4 = new THREE.Mesh(legGeo, petBodyMat);
        l4.position.set(-0.2, 0.15, -0.16);
        modelGroup.add(l1, l2, l3, l4);

        // Tail Antenna
        const antGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.3, 8);
        const ant = new THREE.Mesh(antGeo, petBodyMat);
        ant.position.set(-0.35, 0.65, 0);
        ant.rotation.z = -0.5;
        const tipGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const tip = new THREE.Mesh(tipGeo, petVisorMat);
        tip.position.set(-0.43, 0.8, 0);
        modelGroup.add(ant, tip);
      }
    }

    // Interactive drag-to-rotate & Turntable loop
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationY = 0;
    let currentRotationY = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMousePosition = { x: clientX, y: clientY };
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - previousMousePosition.x;
      targetRotationY += deltaX * 0.015;
      previousMousePosition = { x: clientX, y: clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onPointerDown);
    dom.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    dom.addEventListener('touchstart', onPointerDown, { passive: true });
    dom.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    let animationFrameId = 0;
    let clock = new THREE.Clock();

    const animate = () => {
      const dt = clock.getDelta();
      // Auto-turntable spin when not dragging
      if (!isDragging) {
        targetRotationY += dt * 0.6;
      }
      // Damped exponential lerp
      currentRotationY += (targetRotationY - currentRotationY) * (1 - Math.exp(-8 * dt));
      modelGroup.rotation.y = currentRotationY;

      // Gentle floating bob
      const time = clock.getElapsedTime();
      modelGroup.position.y = Math.sin(time * 2) * 0.04;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener('mousedown', onPointerDown);
      dom.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      dom.removeEventListener('touchstart', onPointerDown);
      dom.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      renderer.dispose();
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, [type, itemId, suitColor, accentColor]);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full min-h-[280px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
    />
  );
};
