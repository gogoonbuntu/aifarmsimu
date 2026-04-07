// Farmer3D - 3D 농부 캐릭터 (이동, 물주기, 비료주기, 수확 애니메이션)
import * as THREE from 'three';
import { eventBus } from '../utils/EventBus.js';
import { clamp } from '../utils/MathUtils.js';

const STATES = { IDLE: 'idle', WALKING: 'walking', WATERING: 'watering', FERTILIZING: 'fertilizing', HARVESTING: 'harvesting' };
const WALK_SPEED = 4.0; // units per second
const TASK_DURATION = 2.0; // seconds per task
const MAX_STAMINA = 100;
const STAMINA_REGEN = 2.0; // per second when idle (빠른 회복)
const STAMINA_COST = { watering: 8, fertilizing: 10, harvesting: 15 };

export class Farmer3D {
  constructor(scene) {
    this.scene = scene;
    this.state = STATES.IDLE;
    this.position = new THREE.Vector3(0, 0, 5);
    this.targetPosition = new THREE.Vector3(0, 0, 5);
    this.stamina = MAX_STAMINA;
    this.taskQueue = [];
    this.currentTask = null;
    this.taskTimer = 0;
    this.walkPhase = 0;
    this.actionParticles = null;
    this.idleTimer = 0;

    this.mesh = this.createMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    this.setupEventListeners();
  }

  createMesh() {
    const group = new THREE.Group();
    const skinColor = 0xf4c794;
    const shirtColor = 0x3b82f6;
    const pantsColor = 0x4a3728;
    const hatColor = 0xd4a55a;

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: shirtColor });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.y = 1.15;
    this.bodyMesh.castShadow = true;
    group.add(this.bodyMesh);

    // Head
    const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor });
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.position.y = 1.7;
    this.headMesh.castShadow = true;
    group.add(this.headMesh);

    // Hat (straw hat)
    const hatGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.1, 8);
    const hatMat = new THREE.MeshStandardMaterial({ color: hatColor });
    this.hatMesh = new THREE.Mesh(hatGeo, hatMat);
    this.hatMesh.position.y = 1.92;
    group.add(this.hatMesh);
    // Hat top
    const hatTopGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.15, 8);
    const hatTop = new THREE.Mesh(hatTopGeo, hatMat);
    hatTop.position.y = 2.02;
    group.add(hatTop);

    // Left Arm
    const armGeo = new THREE.BoxGeometry(0.15, 0.55, 0.15);
    const armMat = new THREE.MeshStandardMaterial({ color: shirtColor });
    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.38, 1.15, 0);
    this.leftArm.castShadow = true;
    group.add(this.leftArm);

    // Right Arm
    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(0.38, 1.15, 0);
    this.rightArm.castShadow = true;
    group.add(this.rightArm);

    // Left Leg
    const legGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    const legMat = new THREE.MeshStandardMaterial({ color: pantsColor });
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.13, 0.55, 0);
    this.leftLeg.castShadow = true;
    group.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.13, 0.55, 0);
    this.rightLeg.castShadow = true;
    group.add(this.rightLeg);

    // Feet (boots)
    const bootGeo = new THREE.BoxGeometry(0.19, 0.12, 0.25);
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(-0.13, 0.3, 0.03);
    group.add(leftBoot);
    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0.13, 0.3, 0.03);
    group.add(rightBoot);

    // Tool (watering can / sack - switches visibility)
    const canGeo = new THREE.BoxGeometry(0.12, 0.15, 0.08);
    const canMat = new THREE.MeshStandardMaterial({ color: 0x4488aa });
    this.wateringCan = new THREE.Mesh(canGeo, canMat);
    this.wateringCan.position.set(0.5, 1.05, 0.15);
    this.wateringCan.visible = false;
    group.add(this.wateringCan);

    const sackGeo = new THREE.BoxGeometry(0.15, 0.2, 0.12);
    const sackMat = new THREE.MeshStandardMaterial({ color: 0x8B6914 });
    this.fertilizerSack = new THREE.Mesh(sackGeo, sackMat);
    this.fertilizerSack.position.set(0.5, 1.1, 0.15);
    this.fertilizerSack.visible = false;
    group.add(this.fertilizerSack);

    // Shadow
    const shadowGeo = new THREE.PlaneGeometry(0.8, 0.8);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    return group;
  }

  setupEventListeners() {
    // Listen for crop needs to auto-assign tasks
    eventBus.on('daily_update', (data) => {
      if (this.taskQueue.length > 3) return; // Don't stack too many
      this.evaluateTasks(data.plots);
    });

    // Manual action from sidebar buttons
    eventBus.on('farmer_manual_action', (action) => {
      eventBus.emit('get_plots', (plots) => {
        if (!plots || plots.length === 0) return;
        const alivePlots = plots.filter(p => p.isAlive && !p.isHarvested);
        if (alivePlots.length === 0) return;
        // Pick first suitable plot
        let target = alivePlots[0];
        if (action.type === 'harvesting') {
          target = alivePlots.find(p => p.currentStage === 'harvest_ready') || target;
        }
        if (!this.hasTaskForPlot(target.id, action.type)) {
          this.addTask(action.type, target);
          eventBus.emit('event_log', { type: 'info', message: `🧑‍🌾 수동 작업 예약: ${action.type === 'watering' ? '💧 물주기' : action.type === 'fertilizing' ? '🌿 비료주기' : '🌾 수확'} → ${target.crop.name.ko}` });
        }
      });
      // Fallback: try direct SimulationManager
      if (this._lastKnownPlots) {
        const alivePlots = this._lastKnownPlots.filter(p => p.isAlive && !p.isHarvested);
        if (alivePlots.length === 0) return;
        let target = alivePlots[0];
        if (action.type === 'harvesting') {
          target = alivePlots.find(p => p.currentStage === 'harvest_ready') || target;
        }
        if (!this.hasTaskForPlot(target.id, action.type)) {
          this.addTask(action.type, target);
          eventBus.emit('event_log', { type: 'info', message: `🧑‍🌾 수동 작업 예약: ${action.type === 'watering' ? '💧 물주기' : action.type === 'fertilizing' ? '🌿 비료주기' : '🌾 수확'} → ${target.crop.name.ko}` });
        }
      }
    });

    // Manual action from crop detail panel (DOM event)
    document.addEventListener('manual-action', (e) => {
      const { type, plotId } = e.detail;
      if (this._lastKnownPlots) {
        const plot = this._lastKnownPlots.find(p => p.id === plotId);
        if (plot && plot.isAlive && !plot.isHarvested) {
          if (!this.hasTaskForPlot(plotId, type)) {
            this.addTask(type, plot);
            eventBus.emit('event_log', { type: 'info', message: `🧑‍🌾 수동 작업 예약: ${type === 'watering' ? '💧 물주기' : type === 'fertilizing' ? '🌿 비료주기' : '🌾 수확'} → ${plot.crop.name.ko}` });
          }
        }
      }
    });
  }

  evaluateTasks(plots) {
    if (!plots || plots.length === 0) return;
    this._lastKnownPlots = plots; // Store for manual actions

    for (const plot of plots) {
      if (!plot.isAlive || plot.isHarvested) continue;

      // Need watering?
      if (plot.soilMoisture < plot.soil.properties.fieldCapacity * 0.4) {
        if (!this.hasTaskForPlot(plot.id, 'watering')) {
          this.addTask('watering', plot);
        }
      }

      // Need fertilizing?
      if (plot.nutrientN < 40) {
        if (!this.hasTaskForPlot(plot.id, 'fertilizing')) {
          this.addTask('fertilizing', plot);
        }
      }

      // Ready to harvest?
      if (plot.currentStage === 'harvest_ready') {
        if (!this.hasTaskForPlot(plot.id, 'harvesting')) {
          this.addTask('harvesting', plot);
        }
      }
    }
  }

  hasTaskForPlot(plotId, type) {
    if (this.currentTask && this.currentTask.plotId === plotId && this.currentTask.type === type) return true;
    return this.taskQueue.some(t => t.plotId === plotId && t.type === type);
  }

  addTask(type, plot) {
    // Calculate target position from plot (use crop mesh position if available)
    const gridSize = Math.ceil(Math.sqrt(plot.area / 10));
    const targetX = (Math.random() - 0.5) * gridSize * 0.5;
    const targetZ = (Math.random() - 0.5) * gridSize * 0.5;

    this.taskQueue.push({
      type,
      plotId: plot.id,
      plot,
      target: new THREE.Vector3(targetX, 0, targetZ),
    });
  }

  update(deltaSeconds, gameSpeed) {
    const effectiveDelta = deltaSeconds * Math.min(gameSpeed, 24); // Cap visual speed

    switch (this.state) {
      case STATES.IDLE:
        this.updateIdle(effectiveDelta);
        break;
      case STATES.WALKING:
        this.updateWalking(effectiveDelta);
        break;
      case STATES.WATERING:
      case STATES.FERTILIZING:
      case STATES.HARVESTING:
        this.updateAction(effectiveDelta);
        break;
    }

    // Update mesh position
    this.mesh.position.copy(this.position);

    // Stamina regen when idle
    if (this.state === STATES.IDLE) {
      this.stamina = Math.min(MAX_STAMINA, this.stamina + STAMINA_REGEN * effectiveDelta);
    }
  }

  updateIdle(dt) {
    // Subtle idle animation
    this.idleTimer += dt;
    this.bodyMesh.rotation.y = Math.sin(this.idleTimer * 0.5) * 0.05;

    // Reset limbs
    this.leftArm.rotation.x = 0;
    this.rightArm.rotation.x = 0;
    this.leftLeg.rotation.x = 0;
    this.rightLeg.rotation.x = 0;
    this.wateringCan.visible = false;
    this.fertilizerSack.visible = false;

    // Pick next task
    if (this.taskQueue.length > 0 && this.stamina > 15) {
      this.currentTask = this.taskQueue.shift();
      this.targetPosition.copy(this.currentTask.target);
      this.state = STATES.WALKING;
    }
  }

  updateWalking(dt) {
    const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 0.5) {
      // Arrived at target
      this.state = this.currentTask.type;
      this.taskTimer = 0;
      return;
    }

    // Move toward target
    dir.normalize();
    const step = Math.min(WALK_SPEED * dt, dist);
    this.position.add(dir.multiplyScalar(step));

    // Face direction
    const angle = Math.atan2(dir.x, dir.z);
    this.mesh.rotation.y = angle;

    // Walk animation
    this.walkPhase += dt * 8;
    const swing = Math.sin(this.walkPhase) * 0.4;
    this.leftArm.rotation.x = swing;
    this.rightArm.rotation.x = -swing;
    this.leftLeg.rotation.x = -swing;
    this.rightLeg.rotation.x = swing;

    // Bobbing
    this.mesh.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.08;
  }

  updateAction(dt) {
    this.taskTimer += dt;

    // Show appropriate tool
    this.wateringCan.visible = this.state === STATES.WATERING;
    this.fertilizerSack.visible = this.state === STATES.FERTILIZING;

    // Action animation
    const actionPhase = this.taskTimer * 3;
    if (this.state === STATES.WATERING) {
      // Lean forward, arm out
      this.bodyMesh.rotation.x = -0.3;
      this.rightArm.rotation.x = -0.8 + Math.sin(actionPhase) * 0.3;
      this.spawnActionParticle(0x4488ff, 0.03); // blue water drops
    } else if (this.state === STATES.FERTILIZING) {
      // Sowing motion
      this.bodyMesh.rotation.x = -0.2;
      this.rightArm.rotation.x = -0.5 + Math.sin(actionPhase) * 0.5;
      this.spawnActionParticle(0x44aa44, 0.02); // green fertilizer
    } else if (this.state === STATES.HARVESTING) {
      // Bending and picking
      this.bodyMesh.rotation.x = -0.5 + Math.sin(actionPhase) * 0.2;
      this.leftArm.rotation.x = -0.6;
      this.rightArm.rotation.x = -0.6;
      this.spawnActionParticle(0xddaa44, 0.025); // golden harvest
    }

    // Complete task
    if (this.taskTimer >= TASK_DURATION) {
      this.completeTask();
    }
  }

  completeTask() {
    if (!this.currentTask) return;

    const cost = STAMINA_COST[this.currentTask.type] || 10;
    this.stamina = Math.max(0, this.stamina - cost);

    const plot = this.currentTask.plot;
    const type = this.currentTask.type;

    // Apply effects
    if (type === 'watering' && plot.isAlive && !plot.isHarvested) {
      plot.soilMoisture = Math.min(
        plot.soil.properties.fieldCapacity,
        plot.soilMoisture + 0.05
      );
      eventBus.emit('event_log', {
        type: 'info',
        message: `🧑‍🌾 ${plot.crop.name.ko}에 물 주기 완료`
      });
    } else if (type === 'fertilizing' && plot.isAlive && !plot.isHarvested) {
      // 작물별 비료 비율 적용 (NPK ratio differentiation)
      const ratio = plot.crop.fertilizerRatio || { N: 8, P: 4, K: 8 }; // default balanced
      const totalRatio = ratio.N + ratio.P + ratio.K;
      const totalAmount = 65; // 총 투여량 (기존 30+15+20과 유사)
      const nAdd = Math.round(totalAmount * ratio.N / totalRatio);
      const pAdd = Math.round(totalAmount * ratio.P / totalRatio);
      const kAdd = Math.round(totalAmount * ratio.K / totalRatio);
      plot.nutrientN = Math.min(200, plot.nutrientN + nAdd);
      plot.nutrientP = Math.min(100, (plot.nutrientP || 0) + pAdd);
      plot.nutrientK = Math.min(200, (plot.nutrientK || 0) + kAdd);
      eventBus.emit('event_log', {
        type: 'info',
        message: `🧑‍🌾 ${plot.crop.name.ko}에 비료 투여 완료 (N+${nAdd}, P+${pAdd}, K+${kAdd}) [${ratio.N}-${ratio.P}-${ratio.K} 배합]`
      });
    } else if (type === 'harvesting') {
      eventBus.emit('farmer_harvest', plot.id);
      eventBus.emit('event_log', {
        type: 'success',
        message: `🧑‍🌾 ${plot.crop.name.ko} 수확 작업 시작!`
      });
    }

    // Reset
    this.bodyMesh.rotation.x = 0;
    this.wateringCan.visible = false;
    this.fertilizerSack.visible = false;
    this.currentTask = null;
    this.state = STATES.IDLE;

    // Clean up particles
    this.clearActionParticles();
  }

  spawnActionParticle(color, size) {
    if (this.actionParticles && this.actionParticles.children.length > 30) return;

    if (!this.actionParticles) {
      this.actionParticles = new THREE.Group();
      this.scene.add(this.actionParticles);
    }

    const geo = new THREE.SphereGeometry(size, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const particle = new THREE.Mesh(geo, mat);
    particle.position.copy(this.position);
    particle.position.x += (Math.random() - 0.5) * 0.5;
    particle.position.y += 0.8 + Math.random() * 0.5;
    particle.position.z += (Math.random() - 0.5) * 0.5;
    particle.userData.life = 1.0;
    particle.userData.vy = -0.5 - Math.random() * 1.5;
    this.actionParticles.add(particle);
  }

  updateParticles(dt) {
    if (!this.actionParticles) return;
    const toRemove = [];
    for (const p of this.actionParticles.children) {
      p.userData.life -= dt * 0.8;
      p.position.y += p.userData.vy * dt;
      p.material.opacity = p.userData.life;
      if (p.userData.life <= 0) toRemove.push(p);
    }
    for (const p of toRemove) {
      this.actionParticles.remove(p);
      p.geometry.dispose();
      p.material.dispose();
    }
  }

  clearActionParticles() {
    if (!this.actionParticles) return;
    while (this.actionParticles.children.length > 0) {
      const c = this.actionParticles.children[0];
      this.actionParticles.remove(c);
      c.geometry.dispose();
      c.material.dispose();
    }
  }

  getState() {
    const stateNames = {
      idle: '대기 중',
      walking: '이동 중',
      watering: '물 주는 중 💧',
      fertilizing: '비료 투여 중 🌿',
      harvesting: '수확 중 🌾',
    };
    return {
      state: this.state,
      stateKo: stateNames[this.state] || this.state,
      stamina: this.stamina,
      maxStamina: MAX_STAMINA,
      pendingTasks: this.taskQueue.length,
    };
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.clearActionParticles();
    if (this.actionParticles) this.scene.remove(this.actionParticles);
  }
}

export default Farmer3D;
