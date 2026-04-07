// 3D World - Three.js Scene, Terrain, Crops, Weather, Sky (Enhanced v2)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { eventBus } from '../utils/EventBus.js';
import { clamp, lerp } from '../utils/MathUtils.js';
import { GROWTH_STAGES as GS } from '../utils/Constants.js';

export class World3D {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.cropMeshes = new Map();
    this.robotMeshes = [];
    this.facilityMesh = null;
    this.weatherParticles = null;
    this.clock = new THREE.Clock();
    this.currentTemp = 15;

    this.init();
    this.setupLighting();
    this.createTerrain();
    this.createSkyDome();
    this.setupEventListeners();
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      50, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    this.camera.position.set(30, 25, 30);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 80;
    this.controls.update();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0x6688aa, 0.6);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    this.sunLight.position.set(20, 30, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 100;
    this.sunLight.shadow.camera.left = -30;
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 30;
    this.sunLight.shadow.camera.bottom = -30;
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x556633, 0.5);
    this.scene.add(this.hemiLight);
  }

  createTerrain(soilColor = 0x8B7355) {
    const groundGeo = new THREE.PlaneGeometry(60, 60, 30, 30);
    const positions = groundGeo.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 2] += Math.sin(positions[i] * 0.3) * Math.cos(positions[i + 1] * 0.3) * 0.4;
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: soilColor,
      roughness: 0.9,
      metalness: 0.0,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Grid overlay
    const gridHelper = new THREE.GridHelper(40, 20, 0x444444, 0x333333);
    gridHelper.position.y = 0.01;
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    this.createSurroundings();
  }

  createSurroundings() {
    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 2;
      const radius = 26 + Math.random() * 6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      this.createTree(x, z);
    }
    // Grass patches
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 22 + Math.random() * 12;
      this.createGrass(Math.cos(angle) * r, Math.sin(angle) * r);
    }
  }

  createTree(x, z) {
    const group = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 2.2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    group.add(trunk);

    const crownGeo = new THREE.SphereGeometry(1.5 + Math.random() * 0.5, 8, 6);
    const crownMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.28 + Math.random() * 0.1, 0.55, 0.32),
      roughness: 0.8
    });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 2.8;
    crown.castShadow = true;
    group.add(crown);

    group.position.set(x, 0, z);
    group.scale.setScalar(0.7 + Math.random() * 0.7);
    this.scene.add(group);
  }

  createGrass(x, z) {
    const geo = new THREE.ConeGeometry(0.08, 0.3, 3);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.25 + Math.random() * 0.15, 0.5, 0.3 + Math.random() * 0.15)
    });
    const grass = new THREE.Mesh(geo, mat);
    grass.position.set(x, 0.15, z);
    grass.rotation.set(Math.random() * 0.2, Math.random() * Math.PI, 0);
    this.scene.add(grass);
  }

  createSkyDome() {
    const skyGeo = new THREE.SphereGeometry(200, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xddeeFF) },
        offset: { value: 20 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);
  }

  // ===== Crop Rendering (Enhanced) =====
  updateCrops(plots) {
    for (const plot of plots) {
      if (!this.cropMeshes.has(plot.id)) {
        this.createCropMesh(plot);
      }
      this.updateCropMesh(plot);
    }
  }

  createCropMesh(plot) {
    const group = new THREE.Group();
    const crop = plot.crop;
    const gridSize = Math.ceil(Math.sqrt(plot.area / 10));
    const spacing = 1.8;
    const offsetX = (Math.random() - 0.5) * 12;
    const offsetZ = (Math.random() - 0.5) * 12;

    const instances = [];
    const count = Math.min(gridSize * gridSize, 250);

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const x = (col - gridSize / 2) * spacing + offsetX + (Math.random() - 0.5) * 0.4;
      const z = (row - gridSize / 2) * spacing + offsetZ + (Math.random() - 0.5) * 0.4;

      const plantGroup = this.createPlantGeometry(crop, 0);
      plantGroup.position.set(x, 0, z);
      plantGroup.userData.randomSeed = Math.random();
      group.add(plantGroup);
      instances.push(plantGroup);
    }

    group.userData = { plot, instances };
    this.cropMeshes.set(plot.id, group);
    this.scene.add(group);
  }

  createPlantGeometry(crop) {
    const group = new THREE.Group();
    const cat = crop.category;
    const color = new THREE.Color(crop.visualization.color.young);

    if (cat === 'grain') {
      // Rice/Grain: stalk + leaf blade
      const stalkGeo = new THREE.CylinderGeometry(0.015, 0.025, 0.15, 4);
      const stalkMat = new THREE.MeshStandardMaterial({ color });
      const stalk = new THREE.Mesh(stalkGeo, stalkMat);
      stalk.position.y = 0.075;
      stalk.userData.isPlant = true;
      group.add(stalk);
      // Leaf
      const leafGeo = new THREE.PlaneGeometry(0.08, 0.06);
      const leafMat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(0.03, 0.1, 0);
      leaf.rotation.z = -0.4;
      leaf.userData.isPlant = true;
      group.add(leaf);
    } else if (cat === 'vegetable') {
      // Outer leaves + central body
      const bodyGeo = new THREE.SphereGeometry(0.05, 6, 4);
      const bodyMat = new THREE.MeshStandardMaterial({ color });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.05;
      body.userData.isPlant = true;
      group.add(body);
      // Leaves
      for (let i = 0; i < 3; i++) {
        const lg = new THREE.PlaneGeometry(0.06, 0.04);
        const lm = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
        const lf = new THREE.Mesh(lg, lm);
        lf.position.set(Math.cos(i * 2.1) * 0.04, 0.08, Math.sin(i * 2.1) * 0.04);
        lf.rotation.set(-0.5, i * 2.1, 0);
        lf.userData.isPlant = true;
        group.add(lf);
      }
    } else if (cat === 'fruit') {
      // Trunk + crown + (fruit dots appear at ripening)
      const trunkGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.25, 4);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.125;
      group.add(trunk);

      const crownGeo = new THREE.SphereGeometry(0.12, 8, 6);
      const crownMat = new THREE.MeshStandardMaterial({ color });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = 0.3;
      crown.castShadow = true;
      crown.userData.isPlant = true;
      group.add(crown);

      // Fruit spheres (hidden initially)
      for (let j = 0; j < 3; j++) {
        const fg = new THREE.SphereGeometry(0.02, 4, 4);
        const fm = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0x330000 });
        const fruit = new THREE.Mesh(fg, fm);
        fruit.position.set(
          Math.cos(j * 2.1) * 0.08,
          0.28 + Math.random() * 0.04,
          Math.sin(j * 2.1) * 0.08
        );
        fruit.visible = false;
        fruit.userData.isFruit = true;
        group.add(fruit);
      }
    } else if (cat === 'root') {
      // Root: leaves above, root body below
      const leafGeo = new THREE.ConeGeometry(0.05, 0.12, 4);
      const leafMat = new THREE.MeshStandardMaterial({ color });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = 0.08;
      leaf.userData.isPlant = true;
      group.add(leaf);
      // Multiple leaf blades
      for (let i = 0; i < 3; i++) {
        const lg = new THREE.PlaneGeometry(0.05, 0.07);
        const lm = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
        const lf = new THREE.Mesh(lg, lm);
        lf.position.set(Math.cos(i * 2.1) * 0.03, 0.1, Math.sin(i * 2.1) * 0.03);
        lf.rotation.set(-0.3, i * 2.1, 0);
        lf.userData.isPlant = true;
        group.add(lf);
      }
    }

    return group;
  }

  updateCropMesh(plot) {
    const group = this.cropMeshes.get(plot.id);
    if (!group) return;

    const crop = plot.crop;
    const totalGDD = crop.phenology.totalGDD;
    const growthFactor = clamp(plot.accumulatedGDD / totalGDD, 0, 1);

    // Color based on growth stage
    let targetColor;
    const isDead = plot.currentStage === GS.DEAD;
    const isRipe = plot.currentStage === GS.HARVEST_READY || plot.currentStage === GS.RIPENING;
    const isFlowering = plot.currentStage === GS.FLOWERING;

    if (isDead) {
      targetColor = new THREE.Color(0x554433);
    } else if (isRipe) {
      targetColor = new THREE.Color(crop.visualization.color.ripe);
    } else if (growthFactor > 0.5) {
      targetColor = new THREE.Color(crop.visualization.color.mature);
    } else {
      targetColor = new THREE.Color(crop.visualization.color.young);
    }

    // Scale & animation
    const baseScale = 0.3 + growthFactor * 4.0;
    const healthFactor = plot.health / 100;
    const time = performance.now() * 0.001;
    const windStrength = this.currentWeatherType === 'stormy' ? 0.15 : 
                         this.currentWeatherType === 'heavy_rain' ? 0.08 : 0.03;

    for (const plant of group.userData.instances) {
      const seed = plant.userData.randomSeed || 0;
      const s = baseScale * (0.85 + seed * 0.3);
      plant.scale.set(s, s * healthFactor * (0.9 + seed * 0.2), s);

      // Color update
      plant.traverse(child => {
        if (child.isMesh && child.userData.isPlant) {
          child.material.color.lerp(targetColor, 0.08);
        }
        // Show fruits when ripening
        if (child.isMesh && child.userData.isFruit) {
          child.visible = isRipe || isFlowering;
          if (isRipe) {
            child.scale.setScalar(1.0 + Math.sin(time * 2 + seed * 10) * 0.1);
          }
        }
      });

      // Wind sway - stronger during storms
      plant.rotation.z = Math.sin(time * 1.5 + plant.position.x * 0.5 + seed * 5) * windStrength;
      plant.rotation.x = Math.cos(time * 1.2 + plant.position.z * 0.3 + seed * 3) * windStrength * 0.5;

      // Dead plants droop
      if (isDead) {
        plant.rotation.z = 0.5 + seed * 0.3;
        plant.scale.y *= 0.5;
      }
    }
  }

  // ===== Facility Rendering =====
  createFacility(facilityData) {
    if (!facilityData || facilityData.type === 'none') return;

    const group = new THREE.Group();

    if (facilityData.type === 'greenhouse') {
      // Size large enough to cover all crop plots (crops span ±12 from origin)
      const width = 28;
      const length = 28;
      const height = 6;
      const isGlass = facilityData.id === 'glass_venlo';

      const frameMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.7, roughness: 0.3 });
      const coverMat = new THREE.MeshPhysicalMaterial({
        color: isGlass ? 0xaaddff : 0xeeeefa,
        transparent: true,
        opacity: isGlass ? 0.25 : 0.4,
        roughness: isGlass ? 0.05 : 0.5,
        transmission: isGlass ? 0.7 : 0.3,
        side: THREE.DoubleSide,
      });

      // Arched roof (half cylinder)
      const roofGeo = new THREE.CylinderGeometry(width / 2, width / 2, length, 32, 1, true, 0, Math.PI);
      const roof = new THREE.Mesh(roofGeo, coverMat);
      roof.rotation.z = Math.PI / 2;
      roof.rotation.y = Math.PI / 2;
      roof.position.y = height - 1;
      group.add(roof);

      // Side walls (left & right)
      const sideWallGeo = new THREE.PlaneGeometry(length, height);
      const sideWallMat = coverMat.clone();
      sideWallMat.opacity = isGlass ? 0.2 : 0.3;

      const wallL = new THREE.Mesh(sideWallGeo, sideWallMat);
      wallL.position.set(-width / 2, height / 2, 0);
      wallL.rotation.y = Math.PI / 2;
      group.add(wallL);

      const wallR = new THREE.Mesh(sideWallGeo, sideWallMat);
      wallR.position.set(width / 2, height / 2, 0);
      wallR.rotation.y = -Math.PI / 2;
      group.add(wallR);

      // Front & back walls (end gables)
      const endWallGeo = new THREE.PlaneGeometry(width, height);
      const wallF = new THREE.Mesh(endWallGeo, sideWallMat);
      wallF.position.set(0, height / 2, length / 2);
      group.add(wallF);
      const wallB = new THREE.Mesh(endWallGeo, sideWallMat);
      wallB.position.set(0, height / 2, -length / 2);
      group.add(wallB);

      // Vertical support struts
      const strutCount = 6;
      for (let i = 0; i <= strutCount; i++) {
        const zPos = -length / 2 + i * (length / strutCount);
        const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, height, 4);
        const strutL = new THREE.Mesh(strutGeo, frameMat);
        strutL.position.set(-width / 2, height / 2, zPos);
        group.add(strutL);
        const strutR = strutL.clone();
        strutR.position.x = width / 2;
        group.add(strutR);
      }

      // Top ridge beam
      const ridgeGeo = new THREE.CylinderGeometry(0.08, 0.08, length, 6);
      const ridge = new THREE.Mesh(ridgeGeo, frameMat);
      ridge.rotation.x = Math.PI / 2;
      ridge.position.y = height + width / 2 - 1.2;
      group.add(ridge);
    }

    group.position.y = 0;
    this.facilityMesh = group;
    this.scene.add(group);
  }

  // ===== Weather Effects (Enhanced v3 - Dramatic) =====
  updateWeather(weather) {
    if (!weather) return;

    this.currentWeatherType = weather.type;
    this.currentTemp = weather.temperature || 15;

    const uniforms = this.skyDome.material.uniforms;
    const tempFactor = clamp((this.currentTemp - 0) / 35, 0, 1);
    const sunWarmth = new THREE.Color().setHSL(0.08 + tempFactor * 0.02, 0.3 + (1 - tempFactor) * 0.3, 0.9);

    switch (weather.type) {
      case 'clear':
        uniforms.topColor.value.lerp(new THREE.Color(0x0077ff), 0.05);
        uniforms.bottomColor.value.lerp(new THREE.Color(0xddeeFF), 0.05);
        this.sunLight.intensity = lerp(this.sunLight.intensity, 1.4, 0.05);
        this.sunLight.color.lerp(sunWarmth, 0.05);
        this.ambientLight.intensity = lerp(this.ambientLight.intensity, 0.6, 0.05);
        this.renderer.toneMappingExposure = lerp(this.renderer.toneMappingExposure, 1.3, 0.02);
        break;
      case 'cloudy':
        uniforms.topColor.value.lerp(new THREE.Color(0x556677), 0.05);
        uniforms.bottomColor.value.lerp(new THREE.Color(0xaabbcc), 0.05);
        this.sunLight.intensity = lerp(this.sunLight.intensity, 0.6, 0.05);
        this.renderer.toneMappingExposure = lerp(this.renderer.toneMappingExposure, 1.0, 0.02);
        break;
      case 'rainy':
      case 'heavy_rain':
        uniforms.topColor.value.lerp(new THREE.Color(0x334455), 0.05);
        uniforms.bottomColor.value.lerp(new THREE.Color(0x778899), 0.05);
        this.sunLight.intensity = lerp(this.sunLight.intensity, 0.3, 0.05);
        this.ambientLight.intensity = lerp(this.ambientLight.intensity, 0.8, 0.05);
        this.renderer.toneMappingExposure = lerp(this.renderer.toneMappingExposure, 0.8, 0.02);
        break;
      case 'stormy':
        uniforms.topColor.value.lerp(new THREE.Color(0x0a0a1e), 0.1);
        uniforms.bottomColor.value.lerp(new THREE.Color(0x222233), 0.1);
        this.sunLight.intensity = lerp(this.sunLight.intensity, 0.05, 0.1);
        this.ambientLight.intensity = lerp(this.ambientLight.intensity, 0.3, 0.1);
        this.renderer.toneMappingExposure = lerp(this.renderer.toneMappingExposure, 0.5, 0.05);
        // Lightning flash
        if (Math.random() < 0.015) {
          this.triggerLightning();
        }
        // Screen shake
        this.applyScreenShake(weather.windSpeed || 20);
        break;
      case 'snowy':
        uniforms.topColor.value.lerp(new THREE.Color(0x8899aa), 0.05);
        uniforms.bottomColor.value.lerp(new THREE.Color(0xeeeeff), 0.05);
        this.sunLight.intensity = lerp(this.sunLight.intensity, 0.5, 0.05);
        this.renderer.toneMappingExposure = lerp(this.renderer.toneMappingExposure, 1.1, 0.02);
        break;
      case 'foggy':
        uniforms.topColor.value.lerp(new THREE.Color(0x889999), 0.08);
        uniforms.bottomColor.value.lerp(new THREE.Color(0xbbcccc), 0.08);
        this.sunLight.intensity = lerp(this.sunLight.intensity, 0.3, 0.05);
        this.ambientLight.intensity = lerp(this.ambientLight.intensity, 0.7, 0.05);
        this.renderer.toneMappingExposure = lerp(this.renderer.toneMappingExposure, 0.9, 0.02);
        break;
    }

    // ---- Ground effects ----
    if (weather.frostIntensity > 0) {
      const frostColor = new THREE.Color(0xccddff);
      if (!this.groundBaseColor) this.groundBaseColor = this.ground.material.color.clone();
      this.ground.material.color.lerp(frostColor, weather.frostIntensity * 0.4);
      this.ground.material.emissive = new THREE.Color(0x334466);
      this.ground.material.emissiveIntensity = lerp(this.ground.material.emissiveIntensity || 0, weather.frostIntensity * 0.2, 0.05);
    } else if (weather.snowAccumulation > 0) {
      const snowFactor = clamp(weather.snowAccumulation / 10, 0, 0.8);
      const snowWhite = new THREE.Color(0xeef2ff);
      if (!this.groundBaseColor) this.groundBaseColor = this.ground.material.color.clone();
      const targetColor = this.groundBaseColor.clone().lerp(snowWhite, snowFactor);
      this.ground.material.color.lerp(targetColor, 0.05);
      this.ground.material.emissive = new THREE.Color(0x334455);
      this.ground.material.emissiveIntensity = lerp(this.ground.material.emissiveIntensity || 0, snowFactor * 0.1, 0.02);
    } else if (this.currentTemp < 0) {
      this.ground.material.emissive = new THREE.Color(0x112244);
      this.ground.material.emissiveIntensity = lerp(this.ground.material.emissiveIntensity || 0, 0.15, 0.02);
      if (this.groundBaseColor) this.ground.material.color.lerp(this.groundBaseColor, 0.02);
    } else if (this.currentTemp > 33) {
      this.ground.material.emissive = new THREE.Color(0x442211);
      this.ground.material.emissiveIntensity = lerp(this.ground.material.emissiveIntensity || 0, 0.15, 0.02);
      if (this.groundBaseColor) this.ground.material.color.lerp(this.groundBaseColor, 0.02);
    } else {
      this.ground.material.emissiveIntensity = lerp(this.ground.material.emissiveIntensity || 0, 0, 0.02);
      if (this.groundBaseColor) this.ground.material.color.lerp(this.groundBaseColor, 0.02);
    }

    // ---- Wind: bend trees and crops ----
    this.applyWindToVegetation(weather.windSpeed || 2, weather.type);

    // ---- Particles ----
    this.updateWeatherParticles(weather);

    // ---- Hail ----
    if (weather.hailIntensity > 0) {
      this.updateHailParticles(weather.hailIntensity);
    } else if (this.hailParticles) {
      this.scene.remove(this.hailParticles);
      this.hailParticles.geometry.dispose();
      this.hailParticles.material.dispose();
      this.hailParticles = null;
    }

    // ---- Frost sparkle ----
    if (weather.frostIntensity > 0.2) {
      this.updateFrostSparkle(weather.frostIntensity);
    } else if (this.frostSparkle) {
      this.scene.remove(this.frostSparkle);
      this.frostSparkle.geometry.dispose();
      this.frostSparkle.material.dispose();
      this.frostSparkle = null;
    }

    // ---- Fog density ----
    if (weather.type === 'foggy') {
      this.scene.fog.density = lerp(this.scene.fog.density, 0.04 + (1 - (weather.visibility || 1) / 10) * 0.06, 0.05);
    } else if (weather.type === 'rainy' || weather.type === 'heavy_rain') {
      this.scene.fog.density = lerp(this.scene.fog.density, 0.018, 0.02);
    } else if (weather.type === 'stormy') {
      this.scene.fog.density = lerp(this.scene.fog.density, 0.035, 0.05);
      this.scene.fog.color.lerp(new THREE.Color(0x222233), 0.05);
    } else if (weather.type === 'snowy') {
      this.scene.fog.density = lerp(this.scene.fog.density, 0.015, 0.02);
    } else {
      this.scene.fog.density = lerp(this.scene.fog.density, 0.006, 0.02);
    }
  }

  triggerLightning() {
    this.sunLight.intensity = 4.0;
    this.ambientLight.intensity = 2.0;
    this.renderer.toneMappingExposure = 2.5;
    this.sunLight.color.set(0xeeeeff);
    setTimeout(() => {
      this.sunLight.intensity = 0.05;
      this.ambientLight.intensity = 0.3;
      this.renderer.toneMappingExposure = 0.5;
    }, 60 + Math.random() * 40);
    if (Math.random() < 0.4) {
      setTimeout(() => {
        this.sunLight.intensity = 3.0;
        this.renderer.toneMappingExposure = 2.0;
        setTimeout(() => {
          this.sunLight.intensity = 0.05;
          this.renderer.toneMappingExposure = 0.5;
        }, 40);
      }, 150);
    }
  }

  applyScreenShake(windSpeed) {
    if (windSpeed < 15) return;
    const intensity = (windSpeed - 15) / 40 * 0.3;
    const t = performance.now() * 0.01;
    this.camera.position.x += Math.sin(t * 5.3) * intensity;
    this.camera.position.y += Math.sin(t * 7.1) * intensity * 0.5;
    this.camera.position.z += Math.cos(t * 4.7) * intensity;
  }

  applyWindToVegetation(windSpeed, weatherType) {
    const t = performance.now() * 0.001;
    const baseSwing = clamp(windSpeed / 10, 0, 1);
    const isStorm = weatherType === 'stormy';
    const swing = isStorm ? baseSwing * 2.5 : baseSwing;

    if (this.decorations) {
      this.decorations.children.forEach((tree, i) => {
        const phase = i * 0.7 + t;
        tree.rotation.z = Math.sin(phase * (isStorm ? 3.0 : 1.2)) * swing * 0.15;
        tree.rotation.x = Math.cos(phase * (isStorm ? 2.5 : 0.8)) * swing * 0.08;
      });
    }

    this.cropMeshes.forEach((group) => {
      group.children.forEach((mesh, i) => {
        if (mesh.userData && mesh.userData.isCrop) {
          const phase = i * 0.5 + t;
          mesh.rotation.z = Math.sin(phase * (isStorm ? 4.0 : 1.5)) * swing * 0.2;
          mesh.rotation.x = Math.cos(phase * (isStorm ? 3.0 : 1.0)) * swing * 0.1;
        }
      });
    });
  }

  updateWeatherParticles(weather) {
    const isRaining = weather.type === 'rainy' || weather.type === 'heavy_rain' || weather.type === 'stormy';
    const isSnowing = weather.type === 'snowy';

    if (!isRaining && !isSnowing) {
      if (this.weatherParticles) {
        this.scene.remove(this.weatherParticles);
        this.weatherParticles.geometry.dispose();
        this.weatherParticles.material.dispose();
        this.weatherParticles = null;
      }
      return;
    }

    const targetCount = weather.type === 'stormy' ? 6000 :
                        weather.type === 'heavy_rain' ? 4500 :
                        isSnowing ? 2000 : 2500;

    if (!this.weatherParticles || (this.weatherParticles.geometry.attributes.position.count !== targetCount)) {
      if (this.weatherParticles) {
        this.scene.remove(this.weatherParticles);
        this.weatherParticles.geometry.dispose();
        this.weatherParticles.material.dispose();
      }
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(targetCount * 3);
      const velocities = new Float32Array(targetCount);
      for (let i = 0; i < targetCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 70;
        positions[i * 3 + 1] = Math.random() * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
        velocities[i] = 0.5 + Math.random() * 1.5;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.userData = { velocities };
      const mat = new THREE.PointsMaterial({
        color: isSnowing ? 0xffffff : 0xaabbdd,
        size: isSnowing ? 0.5 : (weather.type === 'heavy_rain' || weather.type === 'stormy' ? 0.18 : 0.14),
        transparent: true,
        opacity: isSnowing ? 0.95 : 0.8,
      });
      this.weatherParticles = new THREE.Points(geo, mat);
      this.scene.add(this.weatherParticles);
    }

    const positions = this.weatherParticles.geometry.attributes.position.array;
    const velocities = this.weatherParticles.geometry.userData.velocities;
    const windSpeed = weather.windSpeed || 2;
    const speed = isSnowing ? 0.018 : (weather.type === 'heavy_rain' ? 0.15 : weather.type === 'stormy' ? 0.22 : 0.07);

    for (let i = 0; i < velocities.length; i++) {
      positions[i * 3 + 1] -= velocities[i] * speed;
      if (isSnowing) {
        positions[i * 3] += Math.sin(performance.now() * 0.0008 + i) * 0.02;
        positions[i * 3 + 2] += Math.cos(performance.now() * 0.0006 + i * 0.5) * 0.015;
        positions[i * 3] += windSpeed * 0.002;
      }
      if (weather.type === 'stormy') {
        const windDir = Math.sin(performance.now() * 0.0003) * 0.5 + 0.5;
        positions[i * 3] += windSpeed * 0.006 * windDir;
        positions[i * 3 + 2] += windSpeed * 0.003;
      } else if (weather.type === 'heavy_rain') {
        positions[i * 3] += windSpeed * 0.002;
      }
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 35 + Math.random() * 8;
        positions[i * 3] = (Math.random() - 0.5) * 70;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
      }
    }
    this.weatherParticles.geometry.attributes.position.needsUpdate = true;
  }

  updateHailParticles(intensity) {
    const count = Math.floor(intensity * 800);
    if (!this.hailParticles) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count);
      const bouncePhase = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 1] = Math.random() * 30;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
        velocities[i] = 1.0 + Math.random() * 2.0;
        bouncePhase[i] = Math.random() * Math.PI * 2;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.userData = { velocities, bouncePhase };
      const mat = new THREE.PointsMaterial({
        color: 0xddddff,
        size: 0.4 + intensity * 0.25,
        transparent: true,
        opacity: 0.95,
      });
      this.hailParticles = new THREE.Points(geo, mat);
      this.scene.add(this.hailParticles);
    }
    const positions = this.hailParticles.geometry.attributes.position.array;
    const velocities = this.hailParticles.geometry.userData.velocities;
    const bouncePhase = this.hailParticles.geometry.userData.bouncePhase;
    for (let i = 0; i < velocities.length; i++) {
      positions[i * 3 + 1] -= velocities[i] * 0.2;
      if (positions[i * 3 + 1] < 0.2) {
        bouncePhase[i] += 0.3;
        positions[i * 3 + 1] = Math.abs(Math.sin(bouncePhase[i])) * 1.5;
        positions[i * 3] += (Math.random() - 0.5) * 2;
        positions[i * 3 + 2] += (Math.random() - 0.5) * 2;
        if (bouncePhase[i] > Math.PI * 4) {
          positions[i * 3 + 1] = 25 + Math.random() * 10;
          positions[i * 3] = (Math.random() - 0.5) * 60;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
          bouncePhase[i] = 0;
        }
      }
    }
    this.hailParticles.geometry.attributes.position.needsUpdate = true;
  }

  updateFrostSparkle(intensity) {
    if (!this.frostSparkle) {
      const count = 400;
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 1] = 0.1 + Math.random() * 0.3;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xccddff,
        size: 0.2,
        transparent: true,
        opacity: 0,
      });
      this.frostSparkle = new THREE.Points(geo, mat);
      this.scene.add(this.frostSparkle);
    }
    const t = performance.now() * 0.003;
    this.frostSparkle.material.opacity = intensity * 0.7 * (0.5 + 0.5 * Math.sin(t));
    this.frostSparkle.material.size = 0.15 + 0.1 * Math.sin(t * 1.3);
  }


  // ===== Day/Night Cycle =====
  createStars() {
    const count = 500;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribute on upper hemisphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45; // upper hemisphere
      const r = 180 + Math.random() * 15;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.4 + Math.random() * 0.3,
      transparent: true,
      opacity: 0,
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);

    // Moon
    const moonGeo = new THREE.SphereGeometry(3, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0,
    });
    this.moon = new THREE.Mesh(moonGeo, moonMat);
    this.moon.position.set(-80, 120, -50);
    this.scene.add(this.moon);
  }

  updateDayNight(timeState) {
    if (!timeState) return;

    const { daylightFactor, timePhase, hour, minute } = timeState;
    const dl = daylightFactor;

    // Create stars on first call
    if (!this.stars) this.createStars();

    // Stars visibility (inverse of daylight)
    if (this.stars) {
      this.stars.material.opacity = lerp(this.stars.material.opacity, (1 - dl) * 0.8, 0.05);
      // Twinkle
      this.stars.rotation.y += 0.00005;
    }

    // Moon
    if (this.moon) {
      this.moon.material.opacity = lerp(this.moon.material.opacity, (1 - dl) * 0.6, 0.05);
    }

    // Sky dome colors based on time of day
    const uniforms = this.skyDome.material.uniforms;
    let targetTop, targetBottom;

    switch (timePhase) {
      case 'night':
        targetTop = new THREE.Color(0x0a0a2e);
        targetBottom = new THREE.Color(0x1a1a3e);
        break;
      case 'dawn':
        targetTop = new THREE.Color(0x1a2a5e);
        targetBottom = new THREE.Color(0xff7744);
        break;
      case 'morning':
        targetTop = new THREE.Color(0x2277cc);
        targetBottom = new THREE.Color(0xc4ddff);
        break;
      case 'noon':
        targetTop = new THREE.Color(0x0077ff);
        targetBottom = new THREE.Color(0xddeeFF);
        break;
      case 'afternoon':
        targetTop = new THREE.Color(0x2266aa);
        targetBottom = new THREE.Color(0xccddee);
        break;
      case 'dusk':
        targetTop = new THREE.Color(0x2a1a5e);
        targetBottom = new THREE.Color(0xff5533);
        break;
      default:
        targetTop = new THREE.Color(0x0a0a2e);
        targetBottom = new THREE.Color(0x1a1a3e);
    }

    // Override sky colors only if no extreme weather
    if (this.currentWeatherType === 'clear' || !this.currentWeatherType) {
      uniforms.topColor.value.lerp(targetTop, 0.03);
      uniforms.bottomColor.value.lerp(targetBottom, 0.03);
    }

    // Sun light intensity & color by time
    const sunAngle = ((hour + minute / 60) - 6) / 12 * Math.PI; // 0 at 6AM, PI at 6PM
    const sunHeight = Math.sin(Math.max(0, Math.min(Math.PI, sunAngle)));

    // Sun position
    const sunX = 20 * Math.cos(sunAngle);
    const sunY = 30 * sunHeight;
    const sunZ = 10;
    this.sunLight.position.set(sunX, Math.max(2, sunY), sunZ);

    // Sun intensity
    const baseIntensity = sunHeight * 1.4;
    if (!this.currentWeatherType || this.currentWeatherType === 'clear') {
      this.sunLight.intensity = lerp(this.sunLight.intensity, baseIntensity, 0.05);
    }

    // Sun color: warm at dawn/dusk, white at noon
    let sunColor;
    if (timePhase === 'dawn' || timePhase === 'dusk') {
      sunColor = new THREE.Color(0xff8844);
    } else if (timePhase === 'night') {
      sunColor = new THREE.Color(0x223355);
    } else {
      sunColor = new THREE.Color(0xffeedd);
    }
    this.sunLight.color.lerp(sunColor, 0.05);

    // Ambient light
    const ambientTarget = 0.1 + dl * 0.5;
    this.ambientLight.intensity = lerp(this.ambientLight.intensity, ambientTarget, 0.05);

    // Ambient color
    let ambientColor;
    if (dl < 0.2) {
      ambientColor = new THREE.Color(0x112244);
    } else if (dl < 0.4) {
      ambientColor = new THREE.Color(0x446688);
    } else {
      ambientColor = new THREE.Color(0x6688aa);
    }
    this.ambientLight.color.lerp(ambientColor, 0.03);

    // Fog color matches sky
    if (!this.currentWeatherType || this.currentWeatherType === 'clear') {
      this.scene.fog.color.lerp(targetBottom, 0.03);
    }

    // Tone mapping exposure
    const exposureTarget = 0.3 + dl * 1.0;
    if (!this.currentWeatherType || this.currentWeatherType === 'clear') {
      this.renderer.toneMappingExposure = lerp(this.renderer.toneMappingExposure, exposureTarget, 0.03);
    }
  }

  setupEventListeners() {
    eventBus.on('weather_updated', (weather) => this.updateWeather(weather));
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  updateTerrain(soilColor) {
    if (this.ground && this.ground.material) {
      this.ground.material.color.set(soilColor);
    }
  }
}

export default World3D;

