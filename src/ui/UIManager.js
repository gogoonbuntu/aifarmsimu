// UI Manager - 전체 UI 관리 (Enhanced 6-Step Wizard)
import { eventBus } from '../utils/EventBus.js';
import { WEATHER_NAMES_KO, STAGE_NAMES_KO, INITIAL_FUND } from '../utils/Constants.js';
import { formatCurrency, clamp } from '../utils/MathUtils.js';
import { soilRegistry } from '../data/soils/index.js';
import { climateRegistry } from '../data/climate/index.js';
import { cropRegistry } from '../data/crops/index.js';
import { robotRegistry } from '../data/robots/index.js';
import { facilityRegistry } from '../data/facilities/index.js';
import { authService } from '../firebase/auth.js';
import { dbService } from '../firebase/db.js';

const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DRAIN_KO = { very_good:'매우양호', good:'양호', moderate:'보통', poor:'불량', very_poor:'매우불량' };

export class UIManager {
  constructor() {
    this.totalSteps = 6;
    this.wizardStep = 1;
    this.config = {
      climate: null,
      soil: null,
      crops: [],
      facility: null,
      robots: [],
      strategy: {
        irrigationMode: 'auto',
        irrigationAmount: 20,
        irrigationInterval: 3,
        startMonth: 3,
      },
    };
    this.setupWizard();
    this.setupEventListeners();
    this.setupAuth();
  }

  // ===== AUTH UI =====
  setupAuth() {
    const googleBtn = document.getElementById('auth-google-btn');
    const guestBtn = document.getElementById('auth-guest-btn');
    const logoutBtn = document.getElementById('auth-logout-btn');
    const historyBtn = document.getElementById('auth-history-btn');
    const historyClose = document.getElementById('history-close');

    googleBtn?.addEventListener('click', async () => {
      try {
        googleBtn.disabled = true;
        googleBtn.textContent = '로그인 중...';
        await authService.signInWithGoogle();
      } catch (e) {
        googleBtn.textContent = 'Google로 로그인';
      } finally {
        googleBtn.disabled = false;
      }
    });

    guestBtn?.addEventListener('click', async () => {
      try {
        await authService.signInAsGuest();
      } catch (e) { /* handled */ }
    });

    logoutBtn?.addEventListener('click', async () => {
      await authService.logout();
    });

    historyBtn?.addEventListener('click', () => this.showGameHistory());
    historyClose?.addEventListener('click', () => {
      document.getElementById('history-modal')?.classList.add('hidden');
    });

    // Listen for auth changes
    eventBus.on('auth_changed', (user) => this.updateAuthUI(user));

    // Check initial state
    authService.ready.then(user => this.updateAuthUI(user));
  }

  updateAuthUI(user) {
    const loginArea = document.getElementById('auth-login-area');
    const userInfo = document.getElementById('auth-user-info');
    const avatar = document.getElementById('auth-avatar');
    const name = document.getElementById('auth-name');

    if (user) {
      loginArea?.classList.add('hidden');
      userInfo?.classList.remove('hidden');
      if (user.photoURL) {
        avatar.src = user.photoURL;
        avatar.style.display = 'block';
      } else {
        avatar.style.display = 'none';
      }
      name.textContent = user.displayName || (user.isAnonymous ? '게스트 농부' : user.email || '농부');
    } else {
      loginArea?.classList.remove('hidden');
      userInfo?.classList.add('hidden');
    }
  }

  async showGameHistory() {
    const modal = document.getElementById('history-modal');
    const content = document.getElementById('history-content');
    modal?.classList.remove('hidden');
    content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">로딩 중...</div>';

    try {
      const [profile, games, leaderboard] = await Promise.all([
        dbService.getUserProfile(),
        dbService.getUserGames(10),
        dbService.getLeaderboard(10),
      ]);

      const gradeColors = { S: '#f59e0b', A: '#10b981', B: '#3b82f6', C: '#94a3b8', D: '#ef4444' };

      // Profile summary
      const profileHTML = profile ? `
        <div style="display:flex;gap:16px;align-items:center;padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:20px;">
          <div style="font-size:40px;">🧑‍🌾</div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;color:var(--text-primary);">${profile.displayName || '농부'}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
              총 ${profile.totalGames || 0}회 플레이 · 최고 등급 <span style="color:${gradeColors[profile.bestGrade] || '#fff'};font-weight:700;">${profile.bestGrade || '-'}</span> · 수확 ${profile.totalHarvests || 0}회
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:var(--text-muted);">누적 수익</div>
            <div style="font-size:16px;font-weight:700;color:${(profile.totalProfit||0) >= 0 ? 'var(--accent-green)' : '#ef4444'};">₩${Math.round(profile.totalProfit||0).toLocaleString()}</div>
          </div>
        </div>` : '';

      // Game history
      const gamesHTML = games.length > 0 ? `
        <h3 style="font-size:14px;margin-bottom:10px;color:var(--accent-green);">📋 최근 게임 기록</h3>
        ${games.map(g => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:6px;border:1px solid rgba(255,255,255,0.05);">
            <span style="font-size:20px;font-weight:800;color:${gradeColors[g.grade] || '#fff'};min-width:28px;text-align:center;">${g.grade}</span>
            <div style="flex:1;font-size:12px;">
              <div style="color:var(--text-primary);font-weight:600;">${g.climateName} · ${g.facilityName}</div>
              <div style="color:var(--text-muted);">${g.totalDays}일 · 수확 ${g.harvestCount}건 · 고사 ${g.deadCrops}건</div>
            </div>
            <span style="font-size:13px;font-weight:700;color:${(g.profit||0) >= 0 ? 'var(--accent-green)' : '#ef4444'};">₩${Math.round(g.profit||0).toLocaleString()}</span>
          </div>
        `).join('')}` : '<div style="color:var(--text-muted);font-size:13px;">아직 게임 기록이 없습니다.</div>';

      // Leaderboard
      const lbHTML = leaderboard.length > 0 ? `
        <h3 style="font-size:14px;margin:20px 0 10px;color:var(--accent-amber);">🏆 리더보드 (수익 TOP 10)</h3>
        ${leaderboard.map((l, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:4px;border:1px solid rgba(255,255,255,0.05);">
            <span style="font-size:14px;font-weight:800;min-width:24px;color:${i < 3 ? '#f59e0b' : 'var(--text-muted)'};">${i + 1}</span>
            <div style="flex:1;font-size:12px;">
              <span style="color:var(--text-primary);">${l.displayName || '익명'}</span>
              <span style="color:var(--text-muted);margin-left:8px;">${l.climateName || ''}</span>
            </div>
            <span style="font-size:12px;font-weight:700;color:var(--accent-green);">₩${Math.round(l.profit||0).toLocaleString()}</span>
          </div>
        `).join('')}` : '';

      content.innerHTML = profileHTML + gamesHTML + lbHTML;
    } catch (e) {
      content.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">기록을 불러올 수 없습니다.</div>';
    }
  }

  // ===== SETUP WIZARD =====
  setupWizard() {
    this.buildWizardStepIndicators();
    this.renderWizardStep(1);
    this.setupPresets();

    document.getElementById('wizard-next').addEventListener('click', () => {
      if (this.wizardStep < this.totalSteps) {
        if (this.validateWizardStep()) {
          this.wizardStep++;
          this.updateWizardSteps();
          this.renderWizardStep(this.wizardStep);
          // scroll wizard content to top
          document.getElementById('wizard-content').scrollTop = 0;
        }
      } else {
        if (this.validateWizardStep()) {
          this.startSimulation();
        }
      }
    });

    document.getElementById('wizard-prev').addEventListener('click', () => {
      if (this.wizardStep > 1) {
        this.wizardStep--;
        this.updateWizardSteps();
        this.renderWizardStep(this.wizardStep);
      }
    });
  }

  // ===== PRESET RECIPES =====
  setupPresets() {
    // 각 프리셋의 startMonth는 해당 작물의 calendar 데이터 기반
    const presets = [
      {
        name: '🍓 딸기 S등급', tag: '수익 최고', color: '#10b981',
        desc: '중부내륙 + 충적양토 + 단동 비닐하우스 + 딸기 3000m²',
        climate: 'central_inland', soil: 'loam_alluvial', facility: 'vinyl_single',
        crops: [{ id: 'strawberry', area: 3000 }], startMonth: 9,
      },
      {
        name: '🌾 벼 안정 수익', tag: '안정', color: '#3b82f6',
        desc: '남부내륙 + 논 글라이토 + 노지 + 벼 5000m²',
        climate: 'south_inland', soil: 'paddy_gley', facility: 'open_field',
        crops: [{ id: 'rice', area: 5000 }], startMonth: 4,
      },
      {
        name: '🌶️ 고추 고수익', tag: '고위험 고수익', color: '#f59e0b',
        desc: '남부내륙 + 충적양토 + 비닐하우스 + 고추 2000m²',
        climate: 'south_inland', soil: 'loam_alluvial', facility: 'vinyl_single',
        crops: [{ id: 'red_pepper', area: 2000 }], startMonth: 4,
      },
      {
        name: '🍇 포도 프리미엄', tag: '장기 투자', color: '#8b5cf6',
        desc: '남부내륙 + 사양토 + 유리온실 + 포도 2000m²',
        climate: 'south_inland', soil: 'sandy_loam', facility: 'glass_venlo',
        crops: [{ id: 'grape', area: 2000 }], startMonth: 3,
      },
      {
        name: '🥔 감자 초보용', tag: '쉬움', color: '#ec4899',
        desc: '고냉지(대관령) + 산악갈색토 + 노지 + 감자 3000m²',
        climate: 'highland', soil: 'mountain_brown', facility: 'open_field',
        crops: [{ id: 'potato', area: 3000 }], startMonth: 5,
      },
      {
        name: '🌾🥬 복합 영농', tag: '분산 투자', color: '#06b6d4',
        desc: '중부내륙 + 충적양토 + 비닐하우스 + 벼·배추·대파',
        climate: 'central_inland', soil: 'loam_alluvial', facility: 'vinyl_single',
        crops: [{ id: 'rice', area: 2000 }, { id: 'napa_cabbage', area: 1500 }, { id: 'green_onion', area: 1500 }],
        startMonth: 4,
      },
    ];

    const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    const panel = document.getElementById('preset-panel');
    panel.innerHTML = presets.map((p, i) => `
      <div class="preset-card" data-idx="${i}" style="border-left:3px solid ${p.color};">
        <div class="preset-card-header">
          <strong>${p.name}</strong>
          <span class="preset-tag" style="background:${p.color}20;color:${p.color};">${p.tag}</span>
        </div>
        <div class="preset-card-desc">${p.desc}</div>
        <div style="font-size:10px;margin-top:4px;color:${p.color};font-weight:700;">📅 파종: ${monthNames[p.startMonth - 1]}</div>
      </div>
    `).join('');

    document.getElementById('preset-btn')?.addEventListener('click', () => {
      panel.classList.toggle('hidden');
    });

    panel.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx);
        const preset = presets[idx];
        this.config.climate = climateRegistry.get(preset.climate);
        this.config.soil = soilRegistry.get(preset.soil);
        this.config.facility = facilityRegistry.get(preset.facility);
        this.config.crops = preset.crops.map(c => ({ data: cropRegistry.get(c.id), area: c.area }));
        this.config.robots = [];
        this.config.strategy.startMonth = preset.startMonth;
        panel.classList.add('hidden');
        this.wizardStep = 6;
        this.updateWizardSteps();
        this.renderWizardStep(6);
        document.getElementById('wizard-content').scrollTop = 0;
      });
    });
  }

  buildWizardStepIndicators() {
    const stepsContainer = document.querySelector('.wizard-steps');
    const stepDefs = [
      { num: 1, label: '지역 선택' },
      { num: 2, label: '토양 선택' },
      { num: 3, label: '작물 선택' },
      { num: 4, label: '시설 선택' },
      { num: 5, label: 'AI 장비' },
      { num: 6, label: '최종 확인' },
    ];
    stepsContainer.innerHTML = stepDefs.map(s => `
      <div class="wizard-step ${s.num === 1 ? 'active' : ''}" data-step="${s.num}">
        <span class="step-num">${s.num}</span> ${s.label}
      </div>
    `).join('');
  }

  updateWizardSteps() {
    document.querySelectorAll('.wizard-step').forEach(el => {
      const step = parseInt(el.dataset.step);
      el.classList.remove('active', 'completed');
      if (step === this.wizardStep) el.classList.add('active');
      else if (step < this.wizardStep) el.classList.add('completed');
    });

    document.getElementById('wizard-prev').disabled = this.wizardStep === 1;
    const nextBtn = document.getElementById('wizard-next');
    nextBtn.textContent = this.wizardStep === this.totalSteps ? '🌱 시뮬레이션 시작!' : '다음 ▶';
    if (this.wizardStep === this.totalSteps) {
      nextBtn.classList.add('btn-start');
    } else {
      nextBtn.classList.remove('btn-start');
    }
  }

  validateWizardStep() {
    let msg = '';
    switch (this.wizardStep) {
      case 1: if (!this.config.climate) msg = '기후 구역을 선택해주세요!'; break;
      case 2: if (!this.config.soil) msg = '토양 유형을 선택해주세요!'; break;
      case 3: if (this.config.crops.length === 0) msg = '최소 1개 이상의 작물을 선택해주세요!'; break;
      case 4: if (!this.config.facility) msg = '시설 유형을 선택해주세요!'; break;
      case 5: break; // robots optional
      case 6: break; // confirmation
    }
    if (msg) {
      this.showValidationMsg(msg);
      return false;
    }
    return true;
  }

  showValidationMsg(msg) {
    // Remove old
    document.querySelector('.validation-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'validation-toast';
    toast.textContent = '⚠️ ' + msg;
    document.querySelector('.wizard-container').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  renderWizardStep(step) {
    const content = document.getElementById('wizard-content');
    switch (step) {
      case 1: this.renderStep1_Climate(content); break;
      case 2: this.renderStep2_Soil(content); break;
      case 3: this.renderStep3_Crops(content); break;
      case 4: this.renderStep4_Facility(content); break;
      case 5: this.renderStep5_Robots(content); break;
      case 6: this.renderStep6_Confirm(content); break;
    }
  }

  // ===== STEP 1: Climate =====
  renderStep1_Climate(container) {
    const climates = climateRegistry.getAll();
    container.innerHTML = `
      <div class="step-header">
        <h3>🌍 기후 구역 선택</h3>
        <p>농장이 위치할 기후 구역을 선택하세요. 기후에 따라 재배 가능한 작물과 생장 조건이 달라집니다.</p>
      </div>
      <div class="card-grid">
        ${climates.map(c => `
          <div class="select-card ${this.config.climate?.id === c.id ? 'selected' : ''}" data-id="${c.id}">
            <div class="card-icon">${this.getClimateIcon(c.id)}</div>
            <div class="card-title">${c.name.ko}</div>
            <div class="card-desc">${c.regions.join(', ')}</div>
            <div class="card-stats">
              <span>🌡️ ${c.annualTemp}°C</span>
              <span>🌧️ ${c.annualRainfall}mm</span>
            </div>
            <div class="card-stats">
              <span>☀️ ${c.sunHoursPerYear}hr/년</span>
              <span>❄️ 무상일 ${c.frostFreeDays}일</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div id="climate-detail" class="selection-detail"></div>
    `;

    container.querySelectorAll('.select-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.config.climate = climateRegistry.get(card.dataset.id);
        this.showClimateDetail(this.config.climate);
        setTimeout(() => document.getElementById('climate-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      });
    });

    // Show detail if already selected
    if (this.config.climate) this.showClimateDetail(this.config.climate);
  }

  showClimateDetail(climate) {
    const el = document.getElementById('climate-detail');
    if (!el) return;
    const m = climate.monthly;
    el.innerHTML = `
      <div class="detail-box">
        <h4>${climate.name.ko} (${climate.name.en}) — ${climate.koppen} 기후</h4>
        <div class="detail-grid">
          <div>
            <strong>월별 평균 기온</strong>
            <div class="mini-chart">${m.avgTemp.map((t,i) => `<div class="bar-wrap"><div class="bar" style="height:${Math.max(2, (t+10)*2)}px;background:${t>25?'#ef4444':t>15?'#f59e0b':t>5?'#10b981':'#3b82f6'}"></div><span>${MONTH_KO[i].replace('월','')}</span></div>`).join('')}</div>
          </div>
          <div>
            <strong>월별 강수량 (mm)</strong>
            <div class="mini-chart">${m.rainfall.map((r,i) => `<div class="bar-wrap"><div class="bar" style="height:${Math.max(2, r/8)}px;background:${r>200?'#3b82f6':r>100?'#60a5fa':'#93c5fd'}"></div><span>${MONTH_KO[i].replace('월','')}</span></div>`).join('')}</div>
          </div>
        </div>
        <div class="detail-tags">
          <span class="tag tag-warning">🌪️ 태풍 발생 확률: ${(climate.extremeEvents.typhoonProb.reduce((a,b)=>a+b,0)*100/12).toFixed(1)}%/월</span>
          <span class="tag tag-danger">⛈️ 집중호우 확률: ${(climate.extremeEvents.heavyRainProb.reduce((a,b)=>a+b,0)*100/12).toFixed(1)}%/월</span>
          <span class="tag tag-info">🔥 폭염 확률: ${(climate.extremeEvents.heatwaveProb.reduce((a,b)=>a+b,0)*100/12).toFixed(1)}%/월</span>
        </div>
      </div>
    `;
  }

  // ===== STEP 2: Soil =====
  getRecommendedSoils(climateId) {
    // Region → common soils mapping based on Korean agricultural data
    const regionSoils = {
      central_inland: ['loam_alluvial', 'clay_loam', 'paddy_gley', 'red_yellow'],
      central_east: ['sandy_loam', 'mountain_brown', 'loam_alluvial'],
      south_inland: ['loam_alluvial', 'clay_loam', 'paddy_gley', 'red_yellow'],
      south_coastal: ['loam_alluvial', 'sandy_loam', 'clay_loam'],
      jeju: ['volcanic_andisol', 'red_yellow'],
      highland: ['mountain_brown', 'sandy_loam'],
    };
    return regionSoils[climateId] || [];
  }

  renderStep2_Soil(container) {
    let soils = soilRegistry.getAll();
    const recIds = this.config.climate ? this.getRecommendedSoils(this.config.climate.id) : [];
    // Sort: recommended soils first
    soils = soils.sort((a, b) => {
      const aRec = recIds.includes(a.id) ? 0 : 1;
      const bRec = recIds.includes(b.id) ? 0 : 1;
      return aRec - bRec;
    });

    container.innerHTML = `
      <div class="step-header">
        <h3>🏔️ 토양 유형 선택</h3>
        <p>농장의 토양을 선택하세요. 토양에 따라 배수, 양분, 보수력이 다르며 적합한 작물이 달라집니다.</p>
        ${this.config.climate ? `<div class="context-badge">🌍 ${this.config.climate.name.ko} 지역에서 많이 분포하는 토양을 상단에 추천합니다</div>` : ''}
      </div>
      <div class="card-grid">
        ${soils.map(s => {
          const colorHex = '#' + s.color.toString(16).padStart(6, '0');
          const isRec = recIds.includes(s.id);
          return `
          <div class="select-card ${this.config.soil?.id === s.id ? 'selected' : ''}" data-id="${s.id}">
            ${isRec ? '<span class="rec-badge">⭐ 이 지역 추천</span>' : ''}
            <div class="soil-color-icon" style="background:${colorHex}"></div>
            <div class="card-title">${s.name.ko}</div>
            <div class="card-desc">${s.texture}</div>
            <div class="card-stats">
              <span>pH ${s.properties.pH.min}~${s.properties.pH.max}</span>
              <span>유기물 ${s.properties.organicMatter}%</span>
            </div>
            <div class="card-stats">
              <span>배수 ${DRAIN_KO[s.properties.drainage]}</span>
              <span>토심 ${s.properties.effectiveDepth}cm</span>
            </div>
            <div class="card-desc" style="font-size:10px;margin-top:4px;">${s.regions.join(', ')}</div>
          </div>`;
        }).join('')}
      </div>
      <div id="soil-detail" class="selection-detail"></div>
    `;

    container.querySelectorAll('.select-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.config.soil = soilRegistry.get(card.dataset.id);
        this.showSoilDetail(this.config.soil);
        setTimeout(() => document.getElementById('soil-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      });
    });

    if (this.config.soil) this.showSoilDetail(this.config.soil);
  }

  showSoilDetail(soil) {
    const el = document.getElementById('soil-detail');
    if (!el) return;
    const p = soil.properties;
    el.innerHTML = `
      <div class="detail-box">
        <h4>${soil.name.ko} (${soil.name.en}) — ${soil.usdaOrder}</h4>
        <p style="color:var(--text-secondary);margin-bottom:12px;">${soil.description}</p>
        <div class="detail-grid four-col">
          <div class="stat-card">
            <div class="stat-card-label">보수력</div>
            <div class="stat-card-value">${p.waterHoldingCapacity} mm/m</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">CEC (양이온교환)</div>
            <div class="stat-card-value">${p.CEC} cmol/kg</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">용적밀도</div>
            <div class="stat-card-value">${p.bulkDensity} g/cm³</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-label">공극률</div>
            <div class="stat-card-value">${p.porosity}%</div>
          </div>
        </div>
        <div style="margin-top:12px;">
          <strong style="font-size:12px;">작물군 적합도</strong>
          <div class="suitability-bars">
            ${Object.entries(soil.suitability).map(([k,v]) => {
              const label = k === 'rice' ? '🌾 벼' : k === 'vegetables' ? '🥬 채소' : k === 'fruits' ? '🍎 과수' : '🥔 근채';
              const pct = Math.round(v * 100);
              const color = v > 0.7 ? '#10b981' : v > 0.4 ? '#f59e0b' : '#ef4444';
              return `<div class="suit-row"><span>${label}</span><div class="suit-bar"><div class="suit-fill" style="width:${pct}%;background:${color}"></div></div><span>${pct}%</span></div>`;
            }).join('')}
          </div>
        </div>
        <div style="margin-top:12px;">
          <strong style="font-size:12px;">🌱 이 토양에 추천하는 작물</strong>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
            ${this.getRecommendedCropsForSoil(soil.id).map(c => 
              `<span class="selected-chip">${c.icon} ${c.name.ko}</span>`
            ).join('')}
          </div>
        </div>
      </div>
    `;
  }

  getRecommendedCropsForSoil(soilId) {
    return cropRegistry.getAll().filter(c => 
      c.requirements.soil.preferredTypes.includes(soilId)
    );
  }

  // ===== STEP 3: Crops =====
  renderStep3_Crops(container) {
    const crops = cropRegistry.getAll();
    const catMap = { grain: '🌾 곡물', vegetable: '🥬 채소', fruit: '🍎 과일', root: '🥔 근채류' };
    const categories = ['grain', 'vegetable', 'fruit', 'root'];
    const recCropIds = this.config.soil ? this.getRecommendedCropsForSoil(this.config.soil.id).map(c => c.id) : [];

    container.innerHTML = `
      <div class="step-header">
        <h3>🌱 재배 작물 선택</h3>
        <p>재배할 작물을 선택하세요. 복수 선택 가능하며, 각 작물의 재배 면적(평)을 설정하세요.</p>
        ${this.config.soil ? `<div class="context-badge">토양: ${this.config.soil.name.ko} | 기후: ${this.config.climate?.name.ko || '-'} | ⭐ 토양에 적합한 작물이 상단에 표시됩니다</div>` : ''}
      </div>
      ${categories.map(cat => {
        let catCrops = crops.filter(c => c.category === cat);
        if (catCrops.length === 0) return '';
        // Sort: recommended crops first
        catCrops = catCrops.sort((a, b) => {
          const aRec = recCropIds.includes(a.id) ? 0 : 1;
          const bRec = recCropIds.includes(b.id) ? 0 : 1;
          return aRec - bRec;
        });
        return `
          <div class="crop-category">
            <h4 class="crop-cat-title">${catMap[cat]}</h4>
            <div class="crop-detail-list">
              ${catCrops.map(c => {
                const sel = this.config.crops.find(cc => cc.data.id === c.id);
                const diff = this.calculateDifficulty(c);
                const diffClass = diff < 0.35 ? 'easy' : diff < 0.65 ? 'medium' : 'hard';
                const diffText = diff < 0.35 ? '쉬움 ✅' : diff < 0.65 ? '보통 🟡' : '어려움 🔴';
                const isRec = recCropIds.includes(c.id);
                const req = c.requirements;
                const minDays = c.phenology.stages.reduce((s, st) => s + st.duration.min, 0);
                const maxDays = c.phenology.stages.reduce((s, st) => s + st.duration.max, 0);
                let recMonths = '';
                if (this.config.climate) {
                  const cal = c.calendar[this.config.climate.id];
                  if (cal) {
                    const months = cal.sowingMonth || cal.transplantMonth || [];
                    recMonths = months.map(m => MONTH_KO[m-1]).join(', ');
                  }
                }
                const area = sel ? sel.area : 1000;
                const minMonths = Math.ceil(minDays / 30);
                const maxMonths = Math.ceil(maxDays / 30);
                const durationText = minMonths === maxMonths ? `약 ${minMonths}개월` : `약 ${minMonths}~${maxMonths}개월`;
                let harvestMonths = '';
                if (this.config.climate) {
                  const cal = c.calendar[this.config.climate.id];
                  if (cal && cal.harvestMonth) {
                    harvestMonths = cal.harvestMonth.map(m => MONTH_KO[m-1]).join(', ');
                  }
                }
                // Sensitivity summary
                const sens = c.sensitivity || {};
                const sensItems = [];
                if (sens.cold >= 0.7) sensItems.push('❄️ 추위약함');
                if (sens.heat >= 0.7) sensItems.push('🔥 고온약함');
                if (sens.drought >= 0.7) sensItems.push('🏜️ 가뭄약함');
                if (sens.flood >= 0.7) sensItems.push('🌊 침수약함');
                if (sens.disease >= 0.7) sensItems.push('🦠 병해약함');
                if (sens.wind >= 0.7) sensItems.push('💨 바람약함');
                return `
                <div class="crop-detail-card ${sel ? 'selected' : ''}" data-id="${c.id}">
                  <div class="crop-card-left">
                    <div class="crop-big-icon">${c.icon}</div>
                    <div class="crop-select-check">${sel ? '✓' : ''}</div>
                  </div>
                  <div class="crop-card-body">
                    <div class="crop-card-top">
                      <span class="crop-name-big">${isRec ? '<span class="rec-badge">⭐ 추천</span> ' : ''}${c.name.ko} <small style="color:var(--text-muted)">${c.name.en}</small></span>
                      <span class="difficulty ${diffClass}">${diffText}</span>
                    </div>
                    <div class="crop-info-row">
                      <span>🌡️ 적온 ${req.temperature.optimal.day}°C</span>
                      <span>💧 ${req.water.totalMm.min}~${req.water.totalMm.max}mm</span>
                      <span class="crop-duration-badge">⏱ ${durationText} (${minDays}~${maxDays}일)</span>
                    </div>
                    <div class="crop-info-row">
                      <span>📊 평균 ${c.yield.average}kg/10a</span>
                      ${c.quality.brix ? `<span>🍬 당도 ${c.quality.brix.min}~${c.quality.brix.max}°Bx</span>` : ''}
                      ${req.facilityRequired ? '<span style="color:var(--accent-purple)">🏠 시설 필수</span>' : ''}
                    </div>
                    <div class="crop-info-row">
                      ${recMonths ? `<span>🗓️ 파종: ${recMonths}</span>` : `<span style="color:var(--accent-amber)">⚠️ 이 기후에 재배 데이터 없음</span>`}
                      ${harvestMonths ? `<span>🌾 수확: ${harvestMonths}</span>` : ''}
                    </div>
                    ${sensItems.length > 0 ? `
                    <div class="crop-extra-info">
                      ${sensItems.map(s => `<span class="info-chip">${s}</span>`).join('')}
                    </div>` : ''}
                    ${sel ? `
                    <div class="crop-area-control" onclick="event.stopPropagation()">
                      <label>재배 면적:</label>
                      <button class="area-btn" data-delta="-500">-</button>
                      <span class="area-display">${area}m² (${Math.round(area/3.3)}평)</span>
                      <button class="area-btn" data-delta="500">+</button>
                    </div>` : ''}
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
      ${this.config.crops.length > 0 ? `
        <div class="selected-summary">
          <strong>선택된 작물 ${this.config.crops.length}종:</strong>
          ${this.config.crops.map(c => `<span class="selected-chip">${c.data.icon} ${c.data.name.ko} (${c.area}m²)</span>`).join('')}
          <div style="margin-top:8px;font-size:12px;color:var(--text-muted);">총 면적: ${this.config.crops.reduce((s,c)=>s+c.area,0).toLocaleString()}m²</div>
        </div>
      ` : ''}
    `;

    // Crop card click (toggle selection)
    container.querySelectorAll('.crop-detail-card').forEach(card => {
      card.addEventListener('click', () => {
        const cropId = card.dataset.id;
        const existing = this.config.crops.findIndex(c => c.data.id === cropId);
        if (existing >= 0) {
          this.config.crops.splice(existing, 1);
        } else {
          this.config.crops.push({ data: cropRegistry.get(cropId), area: 1000 });
        }
        this.renderStep3_Crops(container); // re-render
      });
    });

    // Area +/- buttons
    container.querySelectorAll('.area-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.crop-detail-card');
        const cropId = card.dataset.id;
        const cropEntry = this.config.crops.find(c => c.data.id === cropId);
        if (!cropEntry) return;
        const delta = parseInt(btn.dataset.delta);
        cropEntry.area = Math.max(100, Math.min(10000, cropEntry.area + delta));
        this.renderStep3_Crops(container);
      });
    });
  }

  // ===== STEP 4: Facility =====
  renderStep4_Facility(container) {
    const facilities = facilityRegistry.getAll();
    const needsFacility = this.config.crops.some(c => c.data.requirements.facilityRequired);

    container.innerHTML = `
      <div class="step-header">
        <h3>🏗️ 재배 시설 선택</h3>
        <p>농장 시설을 선택하세요. 시설은 기후 영향을 줄이고 수확량을 높여줍니다.</p>
        ${needsFacility ? '<div class="context-badge" style="background:var(--accent-amber-dim);color:var(--accent-amber)">⚠️ 선택한 작물 중 시설 재배가 권장되는 작물이 있습니다!</div>' : ''}
        <div class="context-badge">💰 보유 자금: ${formatCurrency(INITIAL_FUND)}</div>
      </div>
      <div class="facility-list">
        ${facilities.map(f => {
          const isSelected = this.config.facility?.id === f.id;
          const eff = f.effects;
          return `
          <div class="facility-card ${isSelected ? 'selected' : ''}" data-id="${f.id}">
            <div class="facility-icon">${f.icon}</div>
            <div class="facility-body">
              <div class="facility-name">${f.name.ko} <small>${f.name.en}</small></div>
              <div class="facility-desc">${f.description}</div>
              <div class="facility-effects">
                ${eff.tempModifier ? `<span class="effect-tag good">🌡️ +${eff.tempModifier}°C</span>` : '<span class="effect-tag neutral">🌡️ 없음</span>'}
                <span class="effect-tag ${eff.rainProtection > 0.5 ? 'good' : 'neutral'}">🌧️ 빗물 차단 ${Math.round(eff.rainProtection*100)}%</span>
                <span class="effect-tag ${eff.typhoonProtection > 0.5 ? 'good' : 'neutral'}">🌪️ 태풍 방호 ${Math.round(eff.typhoonProtection*100)}%</span>
                <span class="effect-tag ${eff.frostProtection > 0.5 ? 'good' : 'neutral'}">❄️ 서리 방호 ${Math.round(eff.frostProtection*100)}%</span>
                <span class="effect-tag">💡 광투과율 ${Math.round(eff.lightTransmission*100)}%</span>
              </div>
              <div class="facility-cost">
                <span>${f.cost > 0 ? `설치비 ${formatCurrency(f.cost)}` : '비용 없음'}</span>
                ${f.maintenanceCost > 0 ? `<span>유지비 ${formatCurrency(f.maintenanceCost)}/년</span>` : ''}
                ${f.durability < Infinity ? `<span>내구 ${f.durability}년</span>` : ''}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('.facility-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.facility-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.config.facility = facilityRegistry.get(card.dataset.id);
      });
    });

    if (!this.config.facility) {
      this.config.facility = facilityRegistry.get('open_field');
      container.querySelector('[data-id="open_field"]')?.classList.add('selected');
    }
  }

  // ===== STEP 5: Robots =====
  renderStep5_Robots(container) {
    const robots = robotRegistry.getAll();
    let totalRobotCost = this.config.robots.reduce((s, r) => s + r.cost, 0);
    let facilityCost = this.config.facility?.cost || 0;
    let remaining = INITIAL_FUND - facilityCost - totalRobotCost;

    container.innerHTML = `
      <div class="step-header">
        <h3>🤖 AI 농업 장비 선택</h3>
        <p>AI 로봇과 드론을 선택하세요. 장비는 관수, 방제, 수확을 자동화하여 노동력을 줄여줍니다. (선택 사항)</p>
        <div class="context-badge">💰 잔여 자금: ${formatCurrency(remaining)} (시설비 ${formatCurrency(facilityCost)} 차감 후)</div>
      </div>
      <div class="robot-select-list">
        ${robots.map(r => {
          const sel = this.config.robots.find(rr => rr.id === r.id);
          const canAfford = remaining >= r.cost || sel;
          const needsFacility = r.requiresFacility && (!this.config.facility || this.config.facility.type === 'none');
          return `
          <div class="robot-select-card ${sel ? 'selected' : ''} ${!canAfford && !sel ? 'disabled' : ''} ${needsFacility ? 'disabled' : ''}" data-id="${r.id}">
            <div class="robot-select-icon">${r.icon}</div>
            <div class="robot-select-body">
              <div class="robot-select-name">${r.name.ko} <small>${r.name.en}</small></div>
              <div class="robot-select-type">${r.type === 'drone' ? '🛸 드론' : r.type === 'ground_robot' ? '🤖 지상 로봇' : '📡 고정 설비'}</div>
              <div class="robot-select-desc">${r.description}</div>
              <div class="robot-select-specs">
                ${r.specs.coverageRate ? `<span>📐 처리속도 ${r.specs.coverageRate} ha/hr</span>` : ''}
                ${r.specs.batteryLife ? `<span>🔋 배터리 ${r.specs.batteryLife}분</span>` : ''}
                ${r.specs.waterEfficiency ? `<span>💧 용수효율 ${Math.round(r.specs.waterEfficiency*100)}%</span>` : ''}
              </div>
              <div class="robot-select-effects">
                ${Object.entries(r.effects).map(([k,v]) => {
                  const label = { waterSaving:'절수', pesticideEfficiency:'방제효율', weedRemoval:'제초율', harvestAccuracy:'수확정밀도', yieldBoost:'수율향상', tempControl:'온도제어' }[k] || k;
                  if (typeof v !== 'number') return '';
                  return `<span class="effect-tag good">${label} ${Math.round(v*100)}%</span>`;
                }).join('')}
              </div>
              <div class="robot-select-price">
                <span class="price-main">${formatCurrency(r.cost)}</span>
                <span class="price-sub">유지비 ${formatCurrency(r.maintenanceCost)}/월</span>
              </div>
              ${needsFacility ? '<div style="color:var(--accent-amber);font-size:11px;margin-top:4px;">⚠️ 온실 시설이 필요합니다</div>' : ''}
            </div>
            <div class="robot-check">${sel ? '✓' : ''}</div>
          </div>`;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('.robot-select-card:not(.disabled)').forEach(card => {
      card.addEventListener('click', () => {
        const robotId = card.dataset.id;
        const existing = this.config.robots.findIndex(r => r.id === robotId);
        if (existing >= 0) {
          this.config.robots.splice(existing, 1);
        } else {
          const robot = robotRegistry.get(robotId);
          this.config.robots.push(robot);
        }
        this.renderStep5_Robots(container);
      });
    });
  }

  // ===== STEP 6: Confirmation =====
  renderStep6_Confirm(container) {
    const climate = this.config.climate;
    const soil = this.config.soil;
    const crops = this.config.crops;
    const facility = this.config.facility;
    const robots = this.config.robots;
    
    const facilityCost = facility?.cost || 0;
    const robotCost = robots.reduce((s, r) => s + r.cost, 0);
    const totalCost = facilityCost + robotCost;
    const remaining = INITIAL_FUND - totalCost;

    container.innerHTML = `
      <div class="step-header">
        <h3>✅ 최종 확인</h3>
        <p>선택한 내용을 확인하고 시뮬레이션을 시작하세요.</p>
      </div>
      <div class="confirm-grid" style="grid-template-columns:repeat(5,1fr);">
        <div class="confirm-section">
          <div class="confirm-icon">🌍</div>
          <h4>기후 구역</h4>
          <div class="confirm-value">${climate?.name.ko || '-'}</div>
          <div class="confirm-sub">${climate?.regions.join(', ') || ''} · ${climate?.annualTemp}°C</div>
        </div>
        <div class="confirm-section">
          <div class="confirm-icon" style="width:32px;height:32px;border-radius:50%;background:#${(soil?.color || 0).toString(16).padStart(6,'0')};margin:0 auto 8px"></div>
          <h4>토양</h4>
          <div class="confirm-value">${soil?.name.ko || '-'}</div>
          <div class="confirm-sub">${soil?.texture || ''} · pH ${soil?.properties.pH.min}~${soil?.properties.pH.max}</div>
        </div>
        <div class="confirm-section">
          <div class="confirm-icon">${facility?.icon || '🌿'}</div>
          <h4>시설</h4>
          <div class="confirm-value">${facility?.name.ko || '노지'}</div>
          <div class="confirm-sub">${facilityCost > 0 ? formatCurrency(facilityCost) : '무료'}</div>
        </div>
        <div class="confirm-section">
          <div class="confirm-icon">📅</div>
          <h4>파종 시작</h4>
          <select id="start-month-select" style="padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:var(--text-primary);font-size:13px;font-weight:700;text-align:center;cursor:pointer;width:100%;">
            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `<option value="${m}" ${m === (this.config.strategy.startMonth || 3) ? 'selected' : ''}>${m}월</option>`).join('')}
          </select>
          <div class="confirm-sub" id="start-month-temp" style="margin-top:4px;"></div>
        </div>
        <div class="confirm-section">
          <div class="confirm-icon">💰</div>
          <h4>잔여 자금</h4>
          <div class="confirm-value" style="color:${remaining > 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${formatCurrency(remaining)}</div>
          <div class="confirm-sub">총 투자: ${formatCurrency(totalCost)}</div>
        </div>
      </div>

      <div class="confirm-crops">
        <h4 style="margin-bottom:12px;">🌱 재배 작물 (${crops.length}종)</h4>
        <div class="confirm-crop-list">
          ${crops.map(c => {
            const diff = this.calculateDifficulty(c.data);
            const diffText = diff < 0.35 ? '쉬움' : diff < 0.65 ? '보통' : '어려움';
            return `
            <div class="confirm-crop-item">
              <span class="crop-big-icon">${c.data.icon}</span>
              <div>
                <strong>${c.data.name.ko}</strong>
                <div style="font-size:11px;color:var(--text-muted);">
                  ${c.area}m² (${Math.round(c.area/3.3)}평) · 난이도: ${diffText} · 평균수량 ${c.data.yield.average}kg/10a
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      ${robots.length > 0 ? `
      <div class="confirm-crops">
        <h4 style="margin-bottom:12px;">🤖 AI 장비 (${robots.length}종)</h4>
        <div class="confirm-crop-list">
          ${robots.map(r => `
            <div class="confirm-crop-item">
              <span class="crop-big-icon">${r.icon}</span>
              <div>
                <strong>${r.name.ko}</strong>
                <div style="font-size:11px;color:var(--text-muted);">${formatCurrency(r.cost)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      ${this.renderFacilityWarnings(crops, facility)}

      <div style="margin:16px 0;">
        <button id="success-tips-toggle" style="width:100%;padding:12px 16px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;color:var(--accent-green);font-size:14px;font-weight:700;cursor:pointer;text-align:left;transition:all 0.2s;">
          📗 성공 공식 보기 (추천 조합) ▼
        </button>
        <div id="success-tips-content" class="hidden" style="margin-top:8px;padding:16px;background:rgba(255,255,255,0.02);border-radius:12px;border:1px solid rgba(255,255,255,0.06);font-size:12px;line-height:1.8;color:var(--text-secondary);">
          <div style="font-size:14px;font-weight:700;color:var(--accent-green);margin-bottom:12px;">🏆 S등급 추천 조합</div>

          <div style="display:grid;gap:8px;">
            <div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid #10b981;">
              <div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">🍓 딸기 S등급 공식 <span style="font-size:10px;color:var(--accent-green);">(수익 최고)</span></div>
              <div>🌍 중부내륙/남부내륙 + 🟤 충적양토 + 🏠 <strong>단동 비닐하우스 필수</strong> + 🤖 자동관수</div>
              <div style="color:var(--text-muted);font-size:11px;">9~10월 정식 → 이듬해 연속수확. 시설 없으면 동사! 시설비 투자 대비 수익률 최상</div>
            </div>

            <div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid #3b82f6;">
              <div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">🌾 벼 안정 공식 <span style="font-size:10px;color:#3b82f6;">(안정 수익)</span></div>
              <div>🌍 남부내륙/남부해안 + 🟤 논 글라이토 or 충적양토 + 🌿 <strong>노지 OK</strong></div>
              <div style="color:var(--text-muted);font-size:11px;">4~5월 파종, 9~10월 수확. 담수 관리가 핵심. 태풍 시기(8월)만 주의</div>
            </div>

            <div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid #f59e0b;">
              <div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">🌶️ 고추 고수익 공식 <span style="font-size:10px;color:#f59e0b;">(고위험 고수익)</span></div>
              <div>🌍 남부내륙(대구) + 🟤 충적양토/사양토 + 🏠 <strong>비닐하우스 추천</strong> + 🤖 방제드론</div>
              <div style="color:var(--text-muted);font-size:11px;">3~4월 모종, 7~10월 수확. 병해충 多 → 방제 필수. kg당 ₩15,000 고가</div>
            </div>

            <div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid #8b5cf6;">
              <div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">🍇 포도 프리미엄 공식 <span style="font-size:10px;color:#8b5cf6;">(장기 투자)</span></div>
              <div>🌍 남부내륙 + 🟤 사양토 (배수 양호) + 🏠 <strong>유리 온실 최적</strong></div>
              <div style="color:var(--text-muted);font-size:11px;">3월 발아 → 8~9월 수확. 생육 기간 길지만 kg당 ₩8,000. 저온 요구량 충족 필수</div>
            </div>

            <div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid #ec4899;">
              <div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">🥔 감자 초보 공식 <span style="font-size:10px;color:#ec4899;">(쉬움)</span></div>
              <div>🌍 고냉지/중부내륙 + 🟤 사양토/산악갈색토 + 🌿 <strong>노지 OK</strong></div>
              <div style="color:var(--text-muted);font-size:11px;">3~4월 파종, 6~7월 수확. 재배 쉬움. 배수 좋은 땅이 핵심. 연작 피할 것</div>
            </div>

            <div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid #06b6d4;">
              <div style="font-weight:700;color:var(--text-primary);margin-bottom:4px;">🍅 토마토 시설재배 공식 <span style="font-size:10px;color:#06b6d4;">(시설 필수)</span></div>
              <div>🌍 중부내륙/남부내륙 + 🟤 충적양토 + 🏠 <strong>연동 비닐하우스 필수</strong> + 🤖 자동관수</div>
              <div style="color:var(--text-muted);font-size:11px;">2~3월 정식. 시설 필수 작물. 연중 수확 가능. 병해 관리가 핵심</div>
            </div>
          </div>

          <div style="margin-top:12px;padding:10px;background:rgba(245,158,11,0.06);border-radius:8px;border:1px solid rgba(245,158,11,0.15);">
            <strong style="color:var(--accent-amber);">⚠️ 공통 주의사항:</strong> 
            연작(같은 작물 연속 재배) 시 병해 확률 <strong>+20%/회</strong> 증가. 
            노지 재배는 태풍·우박 피해 100% 노출. 
            시설비 투자는 1년 이상 운영 시 회수 가능.
          </div>
        </div>
      </div>

      <div class="confirm-ready">
        <div class="ready-icon">🌾</div>
        <div class="ready-text">준비 완료! 시뮬레이션을 시작하면 시간이 흐르면서 작물이 성장합니다.</div>
        <div class="ready-sub">시간 배속을 조절하여 빠르게 결과를 확인할 수 있습니다.</div>
      </div>
    `;

    // Toggle success tips
    document.getElementById('success-tips-toggle')?.addEventListener('click', () => {
      const content = document.getElementById('success-tips-content');
      const btn = document.getElementById('success-tips-toggle');
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        btn.textContent = '📗 성공 공식 접기 ▲';
        content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        content.classList.add('hidden');
        btn.textContent = '📗 성공 공식 보기 ▼';
      }
    });

    // Start month selector
    const monthSelect = document.getElementById('start-month-select');
    const updateMonthInfo = () => {
      const m = parseInt(monthSelect.value);
      this.config.strategy.startMonth = m;
      const tempEl = document.getElementById('start-month-temp');
      if (climate?.monthly?.avgTemp) {
        const t = climate.monthly.avgTemp[m - 1];
        const tMin = climate.monthly.minTemp[m - 1];
        tempEl.innerHTML = `평균 ${t}°C / 최저 ${tMin}°C`;
        tempEl.style.color = tMin < 0 ? '#ef4444' : tMin < 5 ? '#f59e0b' : 'var(--accent-green)';
      }
    };
    monthSelect?.addEventListener('change', updateMonthInfo);
    updateMonthInfo(); // Show initial value
  }

  renderFacilityWarnings(crops, facility) {
    const hasFacility = facility && facility.type && facility.type !== 'none';
    const needFacility = crops.filter(c => c.data.requirements.facilityRequired);
    
    if (needFacility.length === 0) return '';
    
    const cropNames = needFacility.map(c => `${c.data.icon} ${c.data.name.ko}`).join(', ');
    
    if (!hasFacility) {
      return `
        <div style="margin:16px 0;padding:14px 16px;border-radius:12px;background:rgba(239,68,68,0.15);border:2px solid rgba(239,68,68,0.4);animation:fadeIn 0.3s ease;">
          <div style="font-size:14px;font-weight:800;color:#fca5a5;margin-bottom:8px;">
            🚨 시설 미설치 경고!
          </div>
          <div style="font-size:12px;color:#fca5a5;line-height:1.6;">
            <strong>${cropNames}</strong>은(는) <strong>비닐하우스 등 온도 보존 시설</strong>이 필수적인 작물입니다.<br>
            시설 없이 노지 재배 시 온도 스트레스로 인해 <strong>심각한 수확량 감소 및 고사 위험</strong>이 있습니다.<br>
            <span style="color:#fcd34d;">💡 이전 단계로 돌아가 시설을 선택하는 것을 강력히 권장합니다.</span>
          </div>
        </div>
      `;
    } else {
      return `
        <div style="margin:16px 0;padding:10px 14px;border-radius:10px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);">
          <div style="font-size:12px;color:#6ee7b7;">
            ✅ ${cropNames} → <strong>${facility.name.ko}</strong> 시설 내 재배 (온도 보호 적용)
          </div>
        </div>
      `;
    }
  }

  // ===== Utility =====
  calculateDifficulty(crop) {
    if (!this.config.soil || !this.config.climate) return 0.5;
    const soilMatch = crop.requirements.soil.preferredTypes.includes(this.config.soil.id) ? 0.8 : 0.3;
    const calMatch = crop.calendar[this.config.climate?.id] ? 0.8 : 0.3;
    const needsFacility = crop.requirements.facilityRequired && (!this.config.facility || this.config.facility.type === 'none') ? 0.3 : 0.8;
    const score = (soilMatch + calMatch + needsFacility) / 3;
    return 1 - score;
  }

  getClimateIcon(id) {
    const icons = {
      central_inland: '🏙️', central_east: '🌊', south_inland: '🌾',
      south_coastal: '⛵', jeju: '🏝️', highland: '⛰️',
    };
    return icons[id] || '🌍';
  }

  startSimulation() {
    document.getElementById('setup-wizard').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    eventBus.emit('start_simulation', this.config);
  }

  // ===== GAME UI =====
  setupEventListeners() {
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        eventBus.emit('set_speed', parseInt(btn.dataset.speed));
      });
    });

    document.getElementById('strategy-toggle')?.addEventListener('click', () => {
      const panel = document.getElementById('strategy-panel');
      panel.classList.toggle('expanded');
      panel.classList.toggle('collapsed');
    });

    eventBus.on('daily_update', (data) => this.updateGameUI(data));
    eventBus.on('hourly_update', (data) => this.updateTimeDisplay(data));
    eventBus.on('fund_changed', (fund) => this.updateFund(fund));
    eventBus.on('event_log', (entry) => this.addLogEntry(entry));
    eventBus.on('harvest_complete', (result) => this.showHarvestResult(result));
    eventBus.on('game_over', (stats) => this.showEndingScreen(stats));

    // Farmer manual action buttons
    document.getElementById('btn-manual-water')?.addEventListener('click', () => {
      eventBus.emit('farmer_manual_action', { type: 'watering' });
    });
    document.getElementById('btn-manual-fertilize')?.addEventListener('click', () => {
      eventBus.emit('farmer_manual_action', { type: 'fertilizing' });
    });
    document.getElementById('btn-manual-harvest')?.addEventListener('click', () => {
      eventBus.emit('farmer_manual_action', { type: 'harvesting' });
    });
  }

  updateGameUI(data) {
    const { time, weather, plots, fund } = data;

    document.getElementById('game-date').textContent = `📅 ${time.year}년 ${time.month + 1}월 ${time.day}일`;
    document.getElementById('game-time').textContent = `🕐 ${String(time.hour).padStart(2, '0')}:${String(time.minute || 0).padStart(2, '0')}`;
    document.getElementById('game-weather').textContent = 
      `${WEATHER_NAMES_KO[weather.type] || '☀️ 맑음'} ${weather.temperature.toFixed(1)}°C`;
    document.getElementById('game-humidity').textContent = `💧 ${Math.round(weather.humidity)}%`;

    // Sunrise/Sunset times
    const sunEl = document.getElementById('game-sun-times');
    if (sunEl && time.sunrise !== undefined) {
      const srH = Math.floor(time.sunrise);
      const srM = Math.round((time.sunrise % 1) * 60);
      const ssH = Math.floor(time.sunset);
      const ssM = Math.round((time.sunset % 1) * 60);
      sunEl.textContent = `🌅 ${String(srH).padStart(2,'0')}:${String(srM).padStart(2,'0')} 🌇 ${String(ssH).padStart(2,'0')}:${String(ssM).padStart(2,'0')}`;
    }

    // Day/night indicator on time badge
    const timeEl = document.getElementById('game-time');
    if (timeEl && time.timePhase) {
      const phaseIcons = { night: '🌙', dawn: '🌅', morning: '🌤️', noon: '☀️', afternoon: '🌤️', dusk: '🌇' };
      timeEl.textContent = `${phaseIcons[time.timePhase] || '🕐'} ${String(time.hour).padStart(2, '0')}:${String(time.minute || 0).padStart(2, '0')}`;
    }

    // Weather banner
    const temp = weather.temperature;
    const tempColor = temp > 35 ? '#ef4444' : temp > 28 ? '#f59e0b' : temp > 15 ? '#10b981' : temp > 5 ? '#3b82f6' : '#8b5cf6';
    const tempEl = document.getElementById('temp-value');
    if (tempEl) {
      tempEl.textContent = temp.toFixed(1);
      tempEl.style.color = tempColor;
    }
    const tempMinEl = document.getElementById('temp-min');
    const tempMaxEl = document.getElementById('temp-max');
    if (tempMinEl && weather.tempMin !== undefined) tempMinEl.textContent = `↓ ${weather.tempMin.toFixed(0)}°C`;
    if (tempMaxEl && weather.tempMax !== undefined) tempMaxEl.textContent = `↑ ${weather.tempMax.toFixed(0)}°C`;
    const weatherIconEl = document.getElementById('weather-icon-display');
    if (weatherIconEl) {
      const icons = { clear: '☀️', cloudy: '⛅', rainy: '🌧️', heavy_rain: '⛈️', snowy: '❄️', stormy: '🌪️', foggy: '🌫️' };
      weatherIconEl.textContent = icons[weather.type] || '☀️';
    }

    const statsEl = document.getElementById('farm-stats');
    const alivePlots = plots.filter(p => p.isAlive && !p.isHarvested);
    const deadPlots = plots.filter(p => p.currentStage === 'dead');
    const harvestedPlots = plots.filter(p => p.isHarvested);
    statsEl.innerHTML = `
      <div class="stat-row"><span class="stat-label">재배 면적</span><span class="stat-value">${alivePlots.reduce((s, p) => s + p.area, 0).toLocaleString()}m²</span></div>
      <div class="stat-row"><span class="stat-label">재배 중</span><span class="stat-value">${alivePlots.length}종</span></div>
      <div class="stat-row"><span class="stat-label">수확 완료</span><span class="stat-value" style="color:var(--accent-green)">${harvestedPlots.length}종</span></div>
      ${deadPlots.length > 0 ? `<div class="stat-row"><span class="stat-label">고사</span><span class="stat-value" style="color:var(--accent-red)">${deadPlots.length}종</span></div>` : ''}
      <div class="stat-row"><span class="stat-label">경과 일수</span><span class="stat-value">${Math.floor(time.totalDays)}일</span></div>
    `;

    const cropEl = document.getElementById('crop-status');
    cropEl.innerHTML = alivePlots.map(p => {
      const healthColor = p.health > 70 ? '#10b981' : p.health > 40 ? '#f59e0b' : '#ef4444';
      const stageKo = STAGE_NAMES_KO[p.currentStage] || p.currentStage;
      // Quick stress hints
      const hints = [];
      if (p.currentStress.water < 0.5) hints.push('💧 물 필요');
      if (p.currentStress.nutrient < 0.5) hints.push('🌿 비료 필요');
      if (p.currentStress.temperature < 0.4) hints.push('🌡️ 온도 주의');
      if (p.currentStage === 'harvest_ready') hints.push('🌾 수확 가능!');
      // Active diseases
      const diseaseInfo = (p.activeDiseases || []).map(d => 
        `🦠 ${d.name} ${(d.severity * 100).toFixed(0)}%`
      ).join(' · ');
      // Vernalization progress
      const chillReq = p.crop.phenology.chillHoursRequired;
      const vernInfo = chillReq && !p.vernalizationMet 
        ? `❄️ 저온 ${p.chillHours.toFixed(0)}/${chillReq}h` : '';
      const stressPct = ((1 - p.currentStress.overall) * 100).toFixed(0);
      return `
        <div class="crop-card" data-plot-id="${p.id}">
          <div class="crop-card-header">
            <span class="crop-card-name">${p.crop.icon} ${p.crop.name.ko}</span>
            <span class="crop-card-stage">${stageKo}</span>
          </div>
          <div style="font-size:11px;color:var(--text-secondary);margin:4px 0;">
            건강도 ${Math.round(p.health)}% · 스트레스 ${stressPct}%
          </div>
          <div class="health-bar">
            <div class="health-bar-fill" style="width:${p.health}%;background:${healthColor}"></div>
          </div>
          ${hints.length > 0 ? `<div style="font-size:10px;margin-top:4px;color:${p.currentStress.overall < 0.4 ? '#fca5a5' : '#fcd34d'};">${hints.join(' · ')}</div>` : ''}
          ${diseaseInfo ? `<div style="font-size:10px;margin-top:3px;color:#f87171;font-weight:500;">${diseaseInfo}</div>` : ''}
          ${vernInfo ? `<div style="font-size:10px;margin-top:3px;color:#93c5fd;">${vernInfo}</div>` : ''}
          <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">
            예상 수량: ${p.predictedYield.toFixed(0)}kg · ${p.predictedQuality.grade}등급
            ${p.predictedQuality.brix ? ` · ${p.predictedQuality.brix.toFixed(1)}°Bx` : ''}
          </div>
        </div>
      `;
    }).join('');

    cropEl.querySelectorAll('.crop-card').forEach(card => {
      card.addEventListener('click', () => {
        const plot = plots.find(p => p.id === card.dataset.plotId);
        if (plot) this.showCropDetail(plot);
      });
    });

    const robotEl = document.getElementById('robot-status');
    if (this.config.robots.length > 0) {
      robotEl.innerHTML = this.config.robots.map(r => {
        const status = Math.random() > 0.3 ? 'active' : 'idle';
        return `
          <div class="robot-item">
            <span class="robot-status-dot ${status}"></span>
            <span>${r.icon} ${r.name.ko}</span>
            <span style="margin-left:auto;font-size:10px;color:var(--text-muted);">${status === 'active' ? '작동중' : '대기'}</span>
          </div>
        `;
      }).join('');
    } else {
      robotEl.innerHTML = '<div style="font-size:11px;color:var(--text-muted);">장비 없음</div>';
    }

    // Update soil status
    this.updateSoilStatus(plots);
  }

  updateFund(fund) {
    const el = document.getElementById('game-fund');
    if (el) el.textContent = `💰 ${formatCurrency(fund)}`;
  }

  addLogEntry(entry) {
    const logsEl = document.getElementById('log-entries');
    if (!logsEl) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const div = document.createElement('div');
    div.className = `log-entry ${entry.type || ''}`;
    div.innerHTML = `<span class="log-time">[${timeStr}]</span> ${entry.message}`;
    logsEl.insertBefore(div, logsEl.firstChild);
    while (logsEl.children.length > 50) logsEl.removeChild(logsEl.lastChild);
  }

  showCropDetail(plot) {
    const panel = document.getElementById('crop-detail');
    const content = document.getElementById('detail-content');
    panel.classList.remove('hidden');
    const crop = plot.crop;
    const stress = plot.currentStress;
    const stageKo = STAGE_NAMES_KO[plot.currentStage] || plot.currentStage;

    content.innerHTML = `
      <div class="detail-header">
        <div class="detail-icon">${crop.icon}</div>
        <div class="detail-name">${crop.name.ko}</div>
        <div class="detail-stage">${stageKo}</div>
      </div>
      <div class="detail-section">
        <h4>📊 생육 현황</h4>
        <div class="stat-row"><span class="stat-label">재배 일수</span><span class="stat-value">${plot.daysSincePlanting}일</span></div>
        <div class="stat-row"><span class="stat-label">누적 GDD</span><span class="stat-value">${plot.accumulatedGDD.toFixed(0)} / ${crop.phenology.totalGDD}°C·일</span></div>
        <div class="stat-row"><span class="stat-label">LAI</span><span class="stat-value">${plot.LAI.toFixed(2)}</span></div>
        <div class="stat-row"><span class="stat-label">바이오매스</span><span class="stat-value">${plot.totalBiomass.toFixed(1)} g/m²</span></div>
      </div>
      <div class="detail-section">
        <h4>💪 스트레스 지수</h4>
        ${this.renderMeter('온도', stress.temperature, stress.temperature > 0.7 ? 'green' : stress.temperature > 0.4 ? 'amber' : 'red')}
        ${this.renderMeter('수분', stress.water, stress.water > 0.7 ? 'blue' : stress.water > 0.4 ? 'amber' : 'red')}
        ${this.renderMeter('영양', stress.nutrient, stress.nutrient > 0.7 ? 'green' : stress.nutrient > 0.4 ? 'amber' : 'red')}
        ${this.renderMeter('광합성', stress.light, stress.light > 0.7 ? 'green' : 'amber')}
        ${this.renderStressGuide(stress, plot)}
      </div>
      <div class="detail-section">
        <h4>🎯 예측</h4>
        <div class="stat-row"><span class="stat-label">예상 수량</span><span class="stat-value">${plot.predictedYield.toFixed(0)} kg</span></div>
        <div class="stat-row"><span class="stat-label">수량/10a</span><span class="stat-value">${((plot.predictedYield / plot.area) * 1000).toFixed(0)} kg</span></div>
        ${plot.predictedQuality.brix ? `<div class="stat-row"><span class="stat-label">예상 당도</span><span class="stat-value">${plot.predictedQuality.brix.toFixed(1)}°Bx</span></div>` : ''}
        <div class="stat-row"><span class="stat-label">예상 등급</span><span class="stat-value grade-${plot.predictedQuality.grade}" style="font-weight:800;font-size:16px;">${plot.predictedQuality.grade}</span></div>
      </div>
      <div class="detail-section">
        <h4>🌱 토양 상태</h4>
        ${this.renderMeter('토양 수분', plot.soilMoisture / plot.soil.properties.fieldCapacity, 'blue')}
        <div class="stat-row"><span class="stat-label">질소(N)</span><span class="stat-value">${plot.nutrientN.toFixed(0)} mg/kg</span></div>
        <div class="stat-row"><span class="stat-label">인(P)</span><span class="stat-value">${(plot.nutrientP || 0).toFixed(0)} mg/kg</span></div>
        <div class="stat-row"><span class="stat-label">칼륨(K)</span><span class="stat-value">${(plot.nutrientK || 0).toFixed(0)} mg/kg</span></div>
      </div>
      <div class="detail-section" style="margin-top:12px;">
        <h4>🧑‍🌾 수동 작업</h4>
        <div class="farmer-actions" style="justify-content:center;">
          <button class="farmer-btn water-btn" onclick="document.dispatchEvent(new CustomEvent('manual-action',{detail:{type:'watering',plotId:'${plot.id}'}}))">💧 물주기</button>
          <button class="farmer-btn fert-btn" onclick="document.dispatchEvent(new CustomEvent('manual-action',{detail:{type:'fertilizing',plotId:'${plot.id}'}}))">🌿 비료</button>
          ${plot.currentStage === 'harvest_ready' 
            ? `<button class="farmer-btn harvest-btn" onclick="document.dispatchEvent(new CustomEvent('manual-action',{detail:{type:'harvesting',plotId:'${plot.id}'}}))">🌾 수확</button>` 
            : ''}
        </div>
      </div>
    `;
    document.getElementById('close-detail').onclick = () => panel.classList.add('hidden');
  }

  renderMeter(label, value, colorClass) {
    const pct = Math.round(clamp(value, 0, 1) * 100);
    return `
      <div class="meter">
        <div class="meter-label"><span>${label}</span><span>${pct}%</span></div>
        <div class="meter-bar"><div class="meter-fill ${colorClass}" style="width:${pct}%"></div></div>
      </div>
    `;
  }

  renderStressGuide(stress, plot) {
    const actions = [];
    const overallStress = 1 - stress.overall;
    
    if (stress.water < 0.5) {
      const moisture = plot.soilMoisture / plot.soil.properties.fieldCapacity;
      if (moisture < 0.4) {
        actions.push({ icon: '💧', text: '토양 수분 부족! → 💧 물주기 버튼으로 관수하세요', urgent: moisture < 0.2 });
      } else if (moisture > 1.2) {
        actions.push({ icon: '🚰', text: '과습 상태! → 배수가 될 때까지 관수를 중지하세요', urgent: false });
      }
    }
    if (stress.nutrient < 0.5) {
      if (plot.nutrientN < 40) {
        actions.push({ icon: '🌿', text: `질소(N) 부족 (${plot.nutrientN.toFixed(0)}mg/kg) → 🌿 비료주기 버튼 클릭!`, urgent: plot.nutrientN < 20 });
      }
      if ((plot.nutrientK || 0) < 30) {
        actions.push({ icon: '🧪', text: '칼륨(K) 부족 → 비료 투여 필요', urgent: false });
      }
    }
    if (stress.temperature < 0.5) {
      const temp = plot.currentStress._temp || 0;
      actions.push({ icon: '🌡️', text: '온도 스트레스 발생 → 시설(하우스) 설치로 완화 가능. 현재 자연 회복을 기다리세요.', urgent: stress.temperature < 0.3 });
    }
    if (stress.light < 0.6) {
      actions.push({ icon: '☀️', text: '일조량 부족 → 흐린 날이 계속되고 있습니다. 자연 회복 대기', urgent: false });
    }
    if (plot.health < 40) {
      actions.push({ icon: '🏥', text: `건강도 위험(${Math.round(plot.health)}%)! → 물/비료를 즉시 투여하고, 시설 보호를 확인하세요`, urgent: true });
    }
    if (plot.currentStage === 'harvest_ready') {
      actions.push({ icon: '🌾', text: '수확 적기입니다! → 🌾 수확 버튼을 눌러주세요', urgent: false });
    }
    if (plot.soilCondition < 30) {
      actions.push({ icon: '🏔️', text: '토양 고갈 상태! → 수확 후 휴경이 필요합니다', urgent: true });
    }

    if (actions.length === 0) return '';

    const hasUrgent = actions.some(a => a.urgent);
    return `
      <div class="stress-guide ${hasUrgent ? 'danger' : 'warning'}">
        <div class="guide-title">${hasUrgent ? '🚨 긴급 조치 필요!' : '💡 권장 조치'}</div>
        ${actions.map(a => `
          <div class="guide-action">
            <span>${a.icon}</span>
            <span>${a.text}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  updateSoilStatus(plots) {
    const soilEl = document.getElementById('soil-status');
    if (!soilEl) return;
    const alivePlots = plots.filter(p => p.isAlive && !p.isHarvested);
    if (alivePlots.length === 0) {
      soilEl.innerHTML = '<div style="font-size:11px;color:var(--text-muted);">재배 중인 작물 없음</div>';
      return;
    }
    const plot = alivePlots[0]; // Show first plot soil
    const soil = plot.soil;
    const nPct = clamp(plot.nutrientN / (soil.nutrients.nitrogen || 100), 0, 1);
    const pPct = clamp(plot.nutrientP / (soil.nutrients.phosphorus || 50), 0, 1);
    const kPct = clamp(plot.nutrientK / (soil.nutrients.potassium || 100), 0, 1);
    const condColor = plot.soilCondition > 60 ? 'green' : plot.soilCondition > 30 ? 'amber' : 'red';

    soilEl.innerHTML = `
      ${this.renderMeter('종합 컨디션', plot.soilCondition / 100, condColor)}
      ${this.renderMeter('질소 (N)', nPct, nPct > 0.4 ? 'green' : nPct > 0.2 ? 'amber' : 'red')}
      ${this.renderMeter('인 (P)', pPct, pPct > 0.4 ? 'blue' : pPct > 0.2 ? 'amber' : 'red')}
      ${this.renderMeter('칼륨 (K)', kPct, kPct > 0.4 ? 'green' : kPct > 0.2 ? 'amber' : 'red')}
      <div class="stat-row"><span class="stat-label">유기물</span><span class="stat-value">${plot.organicMatter !== undefined ? plot.organicMatter.toFixed(1) : '3.5'}%</span></div>
      ${plot.soilCondition < 30 ? '<div style="color:#ef4444;font-size:11px;margin-top:4px;">⚠️ 토양 고갈! 휴경 권장</div>' : ''}
    `;
  }

  updateFarmerStatus(farmerState) {
    const el = document.getElementById('farmer-status');
    if (!el || !farmerState) return;
    const staminaPct = (farmerState.stamina / farmerState.maxStamina * 100);
    const staminaColor = staminaPct > 50 ? 'green' : staminaPct > 25 ? 'amber' : 'red';
    el.innerHTML = `
      <div class="stat-row"><span class="stat-label">상태</span><span class="stat-value">${farmerState.stateKo}</span></div>
      ${this.renderMeter('체력', farmerState.stamina / farmerState.maxStamina, staminaColor)}
      <div class="stat-row"><span class="stat-label">대기 작업</span><span class="stat-value">${farmerState.pendingTasks}건</span></div>
    `;
  }

  updateTimeDisplay(data) {
    const { time } = data;
    const timeEl = document.getElementById('game-time');
    if (timeEl && time.timePhase) {
      const phaseIcons = { night: '🌙', dawn: '🌅', morning: '🌤️', noon: '☀️', afternoon: '🌤️', dusk: '🌇' };
      timeEl.textContent = `${phaseIcons[time.timePhase] || '🕐'} ${String(time.hour).padStart(2, '0')}:${String(time.minute || 0).padStart(2, '0')}`;
    }
  }

  showEndingScreen(stats) {
    const screen = document.getElementById('ending-screen');
    const content = document.getElementById('ending-content');
    if (!screen || !content) return;
    screen.classList.remove('hidden');

    const gradeEmojis = { S: '🏆', A: '🎉', B: '👍', C: '😐', D: '😢' };
    const gradeMessages = {
      S: '최고의 농부! 전설적인 시즌이었습니다!',
      A: '훌륭한 성과! 뛰어난 농업 경영이었습니다.',
      B: '괜찮은 시즌이었습니다. 다음에는 더 잘할 수 있어요!',
      C: '아쉬운 결과입니다. 전략을 재고해보세요.',
      D: '힘든 시즌이었습니다. 포기하지 마세요!',
    };
    const eventTypeKo = {
      typhoon: '태풍 🌪️', heatwave: '폭염 🔥', frost: '서리 ❄️',
      hail: '우박 🧊', drought: '가뭄 🏜️', monsoon: '장마 ⛈️',
    };
    const stageKo = {
      germination: '발아기', seedling: '유묘기', vegetative: '영양생장',
      flowering: '개화기', fruiting: '결실기', ripening: '등숙기',
      harvest_ready: '수확적기', dead: '고사',
    };

    const profit = stats.profit;
    const profitColor = profit >= 0 ? 'var(--accent-green)' : '#ef4444';

    // Weather analysis
    const wLog = stats.dailyWeather || [];
    const avgTemp = wLog.length > 0 ? (wLog.reduce((s, d) => s + d.temp, 0) / wLog.length) : 0;
    const maxTemp = wLog.length > 0 ? Math.max(...wLog.map(d => d.tempMax)) : 0;
    const minTemp = wLog.length > 0 ? Math.min(...wLog.map(d => d.tempMin)) : 0;
    const totalRain = wLog.reduce((s, d) => s + (d.rain || 0), 0);
    const rainyDays = wLog.filter(d => d.rain > 0.1).length;

    const wEvents = stats.weatherEvents || [];
    const eventCounts = {};
    for (const e of wEvents) { eventCounts[e.type] = (eventCounts[e.type] || 0) + 1; }

    // Crop reports
    const plots = stats.plots || [];
    const cropReportHTML = plots.map(p => {
      const stressArr = p.stressHistory || [];
      const avgStress = stressArr.length > 0 ? (stressArr.reduce((a, b) => a + b, 0) / stressArr.length) : 1;
      const stressLabel = avgStress > 0.8 ? '양호 🟢' : avgStress > 0.5 ? '주의 🟡' : '위험 🔴';
      const nRatio = p.fertilizerRatio || {};
      const diseasesHTML = (p.activeDiseases && p.activeDiseases.length > 0)
        ? p.activeDiseases.map(d => `<span style="color:#ef4444;">🦠 ${d.name} (${(d.severity*100).toFixed(0)}%)</span>`).join(', ')
        : '<span style="color:var(--accent-green);">없음 ✅</span>';
      return `
        <div class="report-crop-card">
          <div class="report-crop-header">
            <span style="font-size:28px;">${p.cropIcon || '🌱'}</span>
            <div><strong style="font-size:16px;">${p.cropName}</strong>
            <div style="font-size:12px;color:var(--text-muted);">${stageKo[p.currentStage] || p.currentStage} · ${p.daysSincePlanting}일 재배</div></div>
            <span class="report-status-badge" style="background:${p.isHarvested ? 'var(--accent-green)' : p.isAlive ? 'var(--accent-blue)' : '#ef4444'};">
              ${p.isHarvested ? '수확 완료' : p.isAlive ? '생육중' : '고사'}
            </span>
          </div>
          <div class="report-crop-grid">
            <div class="rp-m"><span>건강도</span><span>${p.health?.toFixed(0) || 0}%</span></div>
            <div class="rp-m"><span>적산온도</span><span>${p.accumulatedGDD?.toFixed(0) || 0}°C·일</span></div>
            <div class="rp-m"><span>바이오매스</span><span>${p.totalBiomass?.toFixed(0) || 0} g/m²</span></div>
            <div class="rp-m"><span>스트레스</span><span>${stressLabel}</span></div>
            <div class="rp-m"><span>토양 컨디션</span><span>${p.soilCondition || 0}%</span></div>
            <div class="rp-m"><span>연작 횟수</span><span>${p.consecutiveCrops}회</span></div>
          </div>
          <div style="font-size:12px;line-height:1.8;color:var(--text-secondary);padding:8px 0;">
            <strong>🧪 잔여 양분:</strong> N ${p.nutrientN?.toFixed(0) || 0} · P ${p.nutrientP?.toFixed(0) || 0} · K ${p.nutrientK?.toFixed(0) || 0}
            · <strong>권장 NPK:</strong> ${nRatio.N || '?'}:${nRatio.P || '?'}:${nRatio.K || '?'} (농진청)
            <br><strong>🦠 병해:</strong> ${diseasesHTML}
            ${p.chillHours > 0 ? ` · <strong>❄️ 저온:</strong> ${p.chillHours?.toFixed(0)}h ${p.vernalizationMet ? '✅' : '❌'}` : ''}
          </div>
        </div>`;
    }).join('');

    // Timeline
    const stageChanges = stats.stageChanges || [];
    const timelineHTML = stageChanges.length > 0 ? stageChanges.slice(-20).map(s =>
      `<div style="display:flex;gap:8px;padding:3px 0;font-size:12px;"><span style="color:var(--accent-blue);min-width:50px;">Day ${s.day}</span><span>${s.cropName} → <strong>${s.stageName}</strong></span></div>`
    ).join('') : '<div style="color:var(--text-muted);font-size:13px;">기록 없음</div>';

    // Event chips
    const eventSummaryHTML = Object.keys(eventCounts).length > 0
      ? Object.entries(eventCounts).map(([k, v]) => `<span style="display:inline-block;padding:3px 10px;border-radius:8px;font-size:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);margin:2px;">${eventTypeKo[k] || k} × ${v}</span>`).join('')
      : '<span style="color:var(--text-muted);">없음</span>';

    content.innerHTML = `
      <div style="max-height:80vh;overflow-y:auto;padding:10px;">
        <div class="ending-header">
          <div class="ending-grade">${gradeEmojis[stats.grade] || '🌾'}</div>
          <h1 class="ending-title">📋 농업 시뮬레이션 분석 보고서</h1>
          <p class="ending-reason">${stats.reason}</p>
        </div>
        <div class="ending-grade-display">
          <div class="grade-letter grade-${stats.grade}">${stats.grade}</div>
          <div class="grade-message">${gradeMessages[stats.grade] || ''}</div>
        </div>

        <div style="margin:20px 0;"><h3 style="font-size:15px;margin-bottom:12px;color:var(--accent-green);">💰 경영 성과</h3>
        <div class="ending-stats">
          <div class="ending-stat-card"><div class="ending-stat-icon">📅</div><div class="ending-stat-label">운영 기간</div><div class="ending-stat-value">${stats.totalDays}일</div></div>
          <div class="ending-stat-card"><div class="ending-stat-icon">💰</div><div class="ending-stat-label">총 수익</div><div class="ending-stat-value" style="color:var(--accent-green)">₩${Math.round(stats.totalRevenue).toLocaleString()}</div></div>
          <div class="ending-stat-card"><div class="ending-stat-icon">📉</div><div class="ending-stat-label">총 지출</div><div class="ending-stat-value" style="color:#ef4444">₩${Math.round(stats.totalExpenses).toLocaleString()}</div></div>
          <div class="ending-stat-card"><div class="ending-stat-icon">${profit >= 0 ? '📈' : '📉'}</div><div class="ending-stat-label">순이익</div><div class="ending-stat-value" style="color:${profitColor}">₩${Math.round(profit).toLocaleString()}</div></div>
        </div></div>

        <div style="margin:20px 0;"><h3 style="font-size:15px;margin-bottom:12px;color:var(--accent-green);">🌾 수확 기록 (${stats.harvestResults.length}건)</h3>
        ${stats.harvestResults.length > 0 ? stats.harvestResults.map(r => `
          <div class="ending-harvest-row"><span>${r.crop.icon} ${r.crop.name.ko}</span><span>${r.yield.toFixed(0)}kg · ${r.quality.grade}등급 · ${r.yieldPer10a?.toFixed(0) || '?'}kg/10a (${r.yieldComment || ''})</span></div>
        `).join('') : '<div style="color:var(--text-muted);font-size:13px;">수확 기록 없음</div>'}
        ${stats.deadCrops > 0 ? `<div class="ending-dead"><span>💀 고사한 작물: ${stats.deadCrops}종</span></div>` : ''}
        </div>

        <div style="margin:20px 0;"><h3 style="font-size:15px;margin-bottom:12px;color:var(--accent-blue);">🌤️ 기상 분석</h3>
        <div style="font-size:13px;line-height:1.8;color:var(--text-secondary);padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
          <strong>기후 구역:</strong> ${stats.climate?.name?.ko || '?'} (${stats.climate?.koppen || '?'})
          <br><strong>평균기온:</strong> ${avgTemp.toFixed(1)}°C (${minTemp.toFixed(1)}°C ~ ${maxTemp.toFixed(1)}°C)
          <br><strong>총 강수량:</strong> ${totalRain.toFixed(0)}mm (${rainyDays}일)
          <br><strong>극한 이벤트:</strong> ${eventSummaryHTML}
        </div></div>

        <div style="margin:20px 0;"><h3 style="font-size:15px;margin-bottom:12px;color:var(--accent-amber);">🔬 작물별 상세 분석</h3>
        ${cropReportHTML}
        </div>

        <div style="margin:20px 0;"><h3 style="font-size:15px;margin-bottom:12px;color:var(--text-secondary);">📈 생육 타임라인 (최근 20건)</h3>
        <div style="padding:8px 14px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
        ${timelineHTML}</div></div>

        <div style="margin:20px 0;"><h3 style="font-size:15px;margin-bottom:12px;color:var(--text-secondary);">🏔️ 환경 조건</h3>
        <div style="font-size:13px;line-height:1.8;color:var(--text-secondary);padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
          <strong>토양:</strong> ${stats.soil?.name?.ko || '?'} (pH ${stats.soil?.properties?.pH || '?'}, 유기물 ${stats.soil?.properties?.organicMatter || '?'}%)
          <br><strong>시설:</strong> ${stats.facility?.name?.ko || '노지(맨땅)'}
          <br><strong>무상기간:</strong> ${stats.climate?.frostFreeDays || '?'}일 · <strong>연강수:</strong> ${stats.climate?.annualRainfall || '?'}mm
        </div></div>

        <div style="margin:20px 0;"><h3 style="font-size:15px;margin-bottom:12px;color:var(--text-muted);">📚 시뮬레이션 과학적 근거</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">
          <div style="padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05);"><strong style="color:var(--text-primary);">기후</strong><br><span style="color:var(--text-muted);">KMA 기후평년값 1991-2020</span></div>
          <div style="padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05);"><strong style="color:var(--text-primary);">작물모델</strong><br><span style="color:var(--text-muted);">Monteith (1977) RUE, DSSAT</span></div>
          <div style="padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05);"><strong style="color:var(--text-primary);">증발산</strong><br><span style="color:var(--text-muted);">FAO-56 Allen et al. (1998)</span></div>
          <div style="padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05);"><strong style="color:var(--text-primary);">PAR</strong><br><span style="color:var(--text-muted);">McCree (1972), 0.48×Rs</span></div>
          <div style="padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05);"><strong style="color:var(--text-primary);">비료NPK</strong><br><span style="color:var(--text-muted);">농진청 표준시비량</span></div>
          <div style="padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05);"><strong style="color:var(--text-primary);">병해충</strong><br><span style="color:var(--text-muted);">농진청 병해충도감</span></div>
          <div style="padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05);"><strong style="color:var(--text-primary);">수확량</strong><br><span style="color:var(--text-muted);">KOSIS 2024 통계청</span></div>
          <div style="padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05);"><strong style="color:var(--text-primary);">태풍·폭염</strong><br><span style="color:var(--text-muted);">KMA 연3.1회, 11.8일/년</span></div>
        </div></div>

        <div class="ending-actions">
          <button id="restart-btn" class="btn btn-primary btn-lg">🔄 다시 시작</button>
        </div>
      </div>
    `;

    document.getElementById('restart-btn').addEventListener('click', () => {
      screen.classList.add('hidden');
      eventBus.emit('restart_game');
    });
  }

  showWizard() {
    // Reset wizard state
    this.wizardStep = 1;
    this.config = {
      climate: null, soil: null, crops: [], facility: null, robots: [],
      strategy: { irrigationMode: 'auto', irrigationAmount: 20, irrigationInterval: 3, startMonth: 3 },
    };
    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('setup-wizard').classList.remove('hidden');
    this.updateWizardSteps();
    this.renderWizardStep(1);
  }

  showHarvestResult(result) {
    const panel = document.getElementById('results-panel');
    const content = document.getElementById('results-content');
    panel.classList.remove('hidden');
    const yieldPer10a = result.yieldPer10a;

    content.innerHTML = `
      <div class="detail-icon" style="font-size:48px;margin-bottom:8px;">${result.crop.icon}</div>
      <h3 style="margin-bottom:16px;">${result.crop.name.ko} 수확 결과</h3>
      <div class="result-grade grade-${result.quality.grade}">${result.quality.grade}</div>
      <div class="result-row"><span>총 수확량</span><span style="font-weight:600;">${result.yield.toFixed(0)} kg</span></div>
      <div class="result-row"><span>수량 (10a당)</span><span style="font-weight:600;">${yieldPer10a.toFixed(0)} kg</span></div>
      <div class="result-row"><span>평균 대비</span><span style="font-weight:600;color:${result.yieldRatio > 1 ? 'var(--accent-green)' : 'var(--accent-red)'}">
        ${(result.yieldRatio * 100).toFixed(0)}% (${result.yieldComment})</span></div>
      ${result.quality.brix ? `<div class="result-row"><span>당도</span><span style="font-weight:600;">${result.quality.brix.toFixed(1)}°Bx</span></div>` : ''}
      <div class="result-row"><span>최종 건강도</span><span style="font-weight:600;">${result.health.toFixed(0)}%</span></div>
      <div class="result-row"><span>재배 기간</span><span style="font-weight:600;">${result.daysSincePlanting}일</span></div>
      <div class="result-row"><span>총 GDD</span><span style="font-weight:600;">${result.totalGDD.toFixed(0)}°C·일</span></div>
    `;
    document.getElementById('results-close').onclick = () => panel.classList.add('hidden');
  }
}

export default UIManager;
