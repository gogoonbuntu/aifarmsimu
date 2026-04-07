// AI Farm Simulation - Main Entry Point
import './style.css';
import { eventBus } from './utils/EventBus.js';
import { SimulationManager } from './engine/SimulationManager.js';
import { World3D } from './world/World3D.js';
import { Farmer3D } from './world/Farmer3D.js';
import { UIManager } from './ui/UIManager.js';

class App {
  constructor() {
    this.simulation = new SimulationManager();
    this.world = null;
    this.farmer = null;
    this.ui = new UIManager();
    this.lastTime = performance.now();
    this.isRunning = false;

    this.setupEvents();
    this.initWorld();
    
    // Start render loop immediately for background
    this.animate();
  }

  initWorld() {
    const container = document.getElementById('canvas-container');
    this.world = new World3D(container);
  }

  setupEvents() {
    // Listen for simulation start from wizard
    eventBus.on('start_simulation', (config) => {
      this.startSimulation(config);
    });

    // Speed control
    eventBus.on('set_speed', (speed) => {
      this.simulation.setSpeed(speed);
      this._currentSpeed = speed; // Track for resume after pause
    });

    // ---- Event Alert System (특수 이벤트 일시정지 + 교육 팝업) ----
    this._currentSpeed = 1;
    this._eventPaused = false;
    this._eventCooldowns = {}; // Prevent spam: { eventKey: lastTimestamp }
    this._eventAlertQueue = []; // Queue for multiple events

    // Educational content for each event type
    this._eventEducation = {
      typhoon: {
        icon: '🌪️', severity: 'danger',
        title: '태풍 접근!',
        getBody: (evt) => `<strong>풍속 ${evt.windSpeed?.toFixed(0) || '?'}m/s</strong>의 태풍이 접근 중입니다.<br><br>태풍은 한반도에 <strong>연평균 3.1회</strong> 영향을 미칩니다 (KMA 1991-2020). 강풍에 의한 <strong>도복(倒伏)</strong>과 폭우에 의한 침수가 주요 피해입니다.${evt.duration ? `<br>예상 영향 기간: <strong>${evt.duration}일</strong>` : ''}`,
        tip: '시설 재배 시 비닐 고정 상태 점검, 배수로 정비, 지주대 보강이 필요합니다. 노지 재배는 수확 가능한 작물을 조기 수확하세요.',
      },
      heatwave: {
        icon: '🔥', severity: 'danger',
        title: '폭염 경보!',
        getBody: (evt) => `일 최고기온이 <strong>33°C 이상</strong>으로 올라갑니다.<br><br>KMA 기준 전국 연평균 폭염일수는 <strong>11.8일</strong>(1991-2020)이며, 남부내륙(대구)은 최대 40일 이상입니다. 고온은 <strong>수분(受粉) 장해</strong>와 <strong>일소(日燒) 피해</strong>를 유발합니다.${evt.duration ? `<br>예상 지속: <strong>${evt.duration}일</strong>` : ''}`,
        tip: '차광막 설치, 미세 살수(스프링클러)로 엽온 낮추기, 이른 아침·저녁 관수를 권장합니다. 비닐하우스는 측창을 최대 개방하세요.',
      },
      frost: {
        icon: '❄️', severity: 'warning',
        title: '서리 경보!',
        getBody: (evt) => `최저기온 <strong>${evt.tempMin?.toFixed(1) || '?'}°C</strong>의 서리가 예상됩니다.<br><br>중부내륙 첫서리는 <strong>10월 상순</strong>, 마지막 서리는 <strong>4월 하순</strong>이 일반적입니다 (KMA). 개화기·유묘기 서리는 <strong>수확량 급감</strong>의 주원인입니다.`,
        tip: '부직포·비닐 피복으로 야간 보온, 연소법(훈증), 살수 빙결법(sprinkler)으로 잠열 방어가 가능합니다. 시설 재배는 보온커튼을 내리세요.',
      },
      hail: {
        icon: '🧊', severity: 'danger',
        title: '우박 경보!',
        getBody: (evt) => `<strong>강도 ${((evt.severity || 0.5) * 100).toFixed(0)}%</strong>의 우박이 발생했습니다.<br><br>우박은 주로 <strong>봄(3-5월)</strong>과 <strong>가을(9-11월)</strong> 대기 불안정 시 발생합니다 (KMA). 엽면과 과실에 <strong>물리적 타격</strong>을 가해 품질을 크게 저하시킵니다.`,
        tip: '방우망(防雹網) 설치가 최선의 예방책입니다. 피해 후에는 살균제 살포로 상처를 통한 2차 감염을 방지하세요.',
      },
      drought: {
        icon: '🏜️', severity: 'warning',
        title: '가뭄 경보!',
        getBody: (evt) => `<strong>${evt.duration || '?'}일</strong> 이상 강수 부족이 예상됩니다.<br><br>한국의 봄 가뭄(3-5월)은 파종기와 겹쳐 농업에 큰 영향을 미칩니다. 토양 수분이 <strong>위조점(萎凋點)</strong> 이하로 떨어지면 작물이 회복 불가능한 피해를 받습니다.`,
        tip: '💧 물주기 버튼을 눌러 수동 관수하세요! 멀칭(짚·비닐)으로 토양 수분 증발을 억제하고, 점적관수가 효율적입니다.',
      },
      monsoon: {
        icon: '⛈️', severity: 'warning',
        title: '장마 시작!',
        getBody: (evt) => `<strong>${evt.duration || '30'}일</strong>간의 장마가 시작됩니다.<br><br>한국 장마는 보통 <strong>6월 중순~7월 하순</strong>, 약 32일 지속됩니다 (KMA). 집중호우로 인한 <strong>침수·토사 유출</strong>과 과습에 의한 <strong>뿌리 질식</strong>이 주요 피해입니다.`,
        tip: '배수로를 정비하고 고랑(봉)을 높여 침수를 예방하세요. 과습 환경에서는 곰팡이 병해 발생이 급증하니 환기에 신경 쓰세요.',
      },
      disease: {
        icon: '🦠', severity: 'warning',
        title: '병해 발생!',
        getBody: (evt) => `<strong>${evt.cropName || '작물'}</strong>에 <strong>${evt.diseaseName || '병해'}</strong>가 발병했습니다!<br><br>병해는 <strong>온도·습도·생육단계</strong>가 적합할 때 발생합니다. 연작(같은 작물 연속 재배) 시 발병률이 <strong>20%씩 증가</strong>합니다 (농진청).`,
        tip: '🌿 비료주기로 작물 면역력을 높이세요. 적정 환기와 밀식 회피가 예방의 기본입니다. 심각 시 이병부 제거(적엽)가 필요합니다.',
      },
      crop_died: {
        icon: '💀', severity: 'danger',
        title: '작물 고사!',
        getBody: (evt) => `<strong>${evt.cropName || '작물'}</strong>이(가) 스트레스 누적으로 <strong>고사</strong>했습니다.<br><br>작물 고사의 주요 원인: <strong>동해(凍害)</strong>, <strong>고온 장해</strong>, <strong>수분 부족</strong>, <strong>영양 결핍</strong>, <strong>병해충 피해 누적</strong>. 건강도가 0%에 도달하면 회복이 불가능합니다.`,
        tip: '다음 재배에서는 기후·토양에 맞는 작물을 선택하고, 시설 재배로 환경을 제어하세요. 스트레스 지표를 수시로 확인하세요.',
      },
      stage_changed: {
        icon: '🌱', severity: 'success',
        title: '생육 단계 변화!',
        getBody: (evt) => `<strong>${evt.cropName || '작물'}</strong>이(가) <strong>${evt.stageName || '새 단계'}</strong>에 진입했습니다!<br><br>각 생육 단계마다 <strong>필요 양분</strong>과 <strong>수분량</strong>이 달라집니다. 개화기에는 온도 민감도가 높아지고, 결실기에는 칼리(K) 요구량이 증가합니다.`,
        tip: '새 단계에 맞춰 관수량과 비료 투입을 조정하세요. 사이드바에서 작물 상태를 확인할 수 있습니다.',
      },
    };

    // Wire event listeners for pause triggers
    eventBus.on('extreme_event', (evt) => {
      const type = evt.type; // typhoon, heatwave, frost, hail, drought, monsoon
      if (this._eventEducation[type]) {
        this.queueEventAlert(type, evt);
      }
    });

    eventBus.on('event_log', (entry) => {
      // Detect disease outbreak
      if (entry.type === 'warning' && entry.message?.includes('🦠') && entry.message?.includes('발병')) {
        const match = entry.message.match(/(.+?) \[(.+?)\] 발병/);
        if (match) {
          this.queueEventAlert('disease', {
            cropName: match[1].replace('🦠 ', ''),
            diseaseName: match[2],
          });
        }
      }
      // Detect crop death
      if (entry.type === 'danger' && entry.message?.includes('💀') && entry.message?.includes('고사')) {
        const match = entry.message.match(/💀 (.+?) 고사/);
        this.queueEventAlert('crop_died', {
          cropName: match ? match[1] : '작물',
        });
      }
    });

    eventBus.on('stage_changed', (data) => {
      if (data.stage && data.plot) {
        // Only pause for important stages (flowering, fruiting, harvest_ready)
        const importantStages = ['flowering', 'fruiting', 'harvest_ready'];
        if (importantStages.includes(data.stage.id)) {
          this.queueEventAlert('stage_changed', {
            cropName: data.plot.crop.name.ko,
            stageName: data.stage.name.ko,
          });
        }
      }
    });

    // Confirm button resumes simulation
    document.getElementById('event-alert-confirm')?.addEventListener('click', () => {
      this.dismissEventAlert();
    });

    // Hourly update -> sync day/night and farmer
    eventBus.on('hourly_update', (data) => {
      if (this.world) {
        this.world.updateDayNight(data.time);
      }
    });

    // Daily update -> sync 3D world
    eventBus.on('daily_update', (data) => {
      if (this.world) {
        this.world.updateCrops(data.plots);
        this.world.updateWeather(data.weather);
        this.world.updateDayNight(data.time);
      }
    });

    // Manual harvest from detail panel
    document.addEventListener('harvest-plot', (e) => {
      const plotId = e.detail;
      const plot = this.simulation.cropEngine.getPlots().find(p => p.id === plotId);
      if (plot) {
        this.simulation.cropEngine.harvestPlot(plot);
      }
    });

    // Farmer harvest
    eventBus.on('farmer_harvest', (plotId) => {
      const plot = this.simulation.cropEngine.getPlots().find(p => p.id === plotId);
      if (plot && plot.isAlive && !plot.isHarvested && plot.currentStage === 'harvest_ready') {
        this.simulation.cropEngine.harvestPlot(plot);
      }
    });

    // Game over
    eventBus.on('game_over', (stats) => {
      this.isRunning = false;
      this.ui.showEndingScreen(stats);
    });

    // Restart
    eventBus.on('restart_game', () => {
      this.restart();
    });
  }

  // ---- Event Alert Queue System ----
  queueEventAlert(type, data) {
    const now = Date.now();
    const cooldownKey = type === 'disease' ? `${type}_${data.diseaseName}` : type;
    const cooldownMs = type === 'stage_changed' ? 5000 : 30000; // 30s cooldown per event type

    if (this._eventCooldowns[cooldownKey] && now - this._eventCooldowns[cooldownKey] < cooldownMs) {
      return; // Still in cooldown
    }
    this._eventCooldowns[cooldownKey] = now;

    this._eventAlertQueue.push({ type, data });

    if (!this._eventPaused) {
      this.showNextEventAlert();
    }
  }

  showNextEventAlert() {
    if (this._eventAlertQueue.length === 0) return;

    const { type, data } = this._eventAlertQueue.shift();
    const edu = this._eventEducation[type];
    if (!edu) return;

    // Pause simulation
    this._speedBeforePause = this._currentSpeed || 1;
    this._eventPaused = true;
    this.simulation.setSpeed(0);

    // Update speed button UI
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    const pauseBtn = document.querySelector('.speed-btn[data-speed="0"]');
    if (pauseBtn) pauseBtn.classList.add('active');

    // Fill modal content
    const modal = document.getElementById('event-alert-modal');
    const container = modal.querySelector('.event-alert-container');
    document.getElementById('event-alert-icon').textContent = edu.icon;
    document.getElementById('event-alert-title').textContent = edu.title;
    document.getElementById('event-alert-body').innerHTML = edu.getBody(data);
    document.getElementById('event-alert-tip').textContent = edu.tip;
    container.setAttribute('data-severity', edu.severity);

    // Show modal
    modal.classList.remove('hidden');
  }

  dismissEventAlert() {
    const modal = document.getElementById('event-alert-modal');
    modal.classList.add('hidden');

    // If there are more queued events, show next
    if (this._eventAlertQueue.length > 0) {
      setTimeout(() => this.showNextEventAlert(), 300);
      return;
    }

    // Resume simulation at previous speed
    this._eventPaused = false;
    const resumeSpeed = this._speedBeforePause || 1;
    this.simulation.setSpeed(resumeSpeed);
    this._currentSpeed = resumeSpeed;

    // Update speed button UI
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.speed-btn[data-speed="${resumeSpeed}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  startSimulation(config) {
    this.simulation.initialize(config);
    this.isRunning = true;

    // Set terrain color based on soil
    if (config.soil && config.soil.color) {
      this.world.updateTerrain(config.soil.color);
    }

    // Create facility in 3D
    if (config.facility) {
      this.world.createFacility(config.facility);
    }

    // Create farmer
    if (this.farmer) this.farmer.dispose();
    this.farmer = new Farmer3D(this.world.scene);

    eventBus.emit('event_log', { 
      type: 'success', 
      message: `🌱 시뮬레이션 시작! 기후: ${config.climate.name.ko}, 토양: ${config.soil.name.ko}, 작물 ${config.crops.length}종`
    });
  }

  restart() {
    // Clean up
    if (this.farmer) {
      this.farmer.dispose();
      this.farmer = null;
    }
    
    // Remove crop meshes from scene (world will recreate)
    if (this.world) {
      this.world.cropMeshes.forEach((group) => {
        this.world.scene.remove(group);
      });
      this.world.cropMeshes.clear();
      
      if (this.world.facilityMesh) {
        this.world.scene.remove(this.world.facilityMesh);
        this.world.facilityMesh = null;
      }
      
      // Remove weather particles
      if (this.world.weatherParticles) {
        this.world.scene.remove(this.world.weatherParticles);
        this.world.weatherParticles = null;
      }
    }

    // Reset simulation
    this.simulation.reset();
    this.isRunning = false;

    // Show wizard again
    this.ui.showWizard();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const deltaMs = now - this.lastTime;
    this.lastTime = now;

    const cappedDelta = Math.min(deltaMs, 100);

    // Update simulation
    if (this.isRunning) {
      this.simulation.update(cappedDelta);

      // Update farmer
      if (this.farmer) {
        const speed = this.simulation.timeManager.speed;
        this.farmer.update(cappedDelta / 1000, speed);
        this.farmer.updateParticles(cappedDelta / 1000);
        
        // Update farmer status in UI (throttled)
        this.farmerUITimer = (this.farmerUITimer || 0) + cappedDelta;
        if (this.farmerUITimer > 500) {
          this.farmerUITimer = 0;
          this.ui.updateFarmerStatus(this.farmer.getState());
        }
      }

      // Continuous day/night update
      const timeState = this.simulation.timeManager.getState();
      if (this.world) {
        this.world.updateDayNight(timeState);
      }
    }

    // Render 3D
    if (this.world) {
      this.world.render();
    }
  }
}

// Start the application
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
