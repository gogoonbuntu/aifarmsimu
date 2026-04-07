// SimulationManager - 모든 엔진을 통합 관리 (시간별 업데이트 + 게임오버)
import { eventBus } from '../utils/EventBus.js';
import { TimeManager } from './TimeManager.js';
import { WeatherEngine } from './WeatherEngine.js';
import { CropGrowthEngine } from './CropGrowthEngine.js';
import { INITIAL_FUND } from '../utils/Constants.js';

export class SimulationManager {
  constructor() {
    this.timeManager = new TimeManager();
    this.weatherEngine = null;
    this.cropEngine = new CropGrowthEngine();
    
    this.config = null;
    this.fund = INITIAL_FUND;
    this.lastDayProcessed = -1;
    this.lastHourProcessed = -1;
    this.isRunning = false;
    this.isGameOver = false;
    this.harvestResults = [];
    this.totalRevenue = 0;
    this.totalExpenses = 0;
    this.gameOverReason = '';

    // Report tracking
    this.weatherEventLog = []; // [{day, type, severity, details}]
    this.diseaseEventLog = []; // [{day, cropName, diseaseName}]
    this.stageChangeLog = []; // [{day, cropName, stageName}]
    this.dailyWeatherLog = []; // [{day, temp, rain, humidity, type}]

    // Bind events
    eventBus.on('harvest_complete', (result) => {
      this.harvestResults.push(result);
      const basePrice = this.getCropPrice(result.crop.id);
      // 등급별 가격 차등 (도매시장 실제 적용)
      const gradeMultiplier = { S: 1.3, A: 1.1, B: 1.0, C: 0.7, D: 0.4 };
      const pricePerKg = basePrice * (gradeMultiplier[result.quality.grade] || 1.0);
      const revenue = result.yield * pricePerKg;
      this.totalRevenue += revenue;
      this.fund += revenue;
      eventBus.emit('fund_changed', this.fund);
      eventBus.emit('event_log', {
        type: 'success',
        message: `💰 수익: ₩${Math.round(revenue).toLocaleString()} (${result.crop.name.ko} ${result.yield.toFixed(0)}kg × ₩${Math.round(pricePerKg)}/kg [${result.quality.grade}등급])`
      });
    });

    // Farmer harvest trigger
    eventBus.on('farmer_harvest', (plotId) => {
      const plot = this.cropEngine.getPlots().find(p => p.id === plotId);
      if (plot && plot.isAlive && !plot.isHarvested && plot.currentStage === 'harvest_ready') {
        this.cropEngine.harvestPlot(plot);
      }
    });
  }

  initialize(config) {
    this.config = config;
    this.weatherEngine = new WeatherEngine(config.climate);
    this.isGameOver = false;
    this.harvestResults = [];
    this.totalRevenue = 0;
    this.totalExpenses = 0;
    this.lastDayProcessed = -1;
    this.lastHourProcessed = -1;
    this.weatherEventLog = [];
    this.diseaseEventLog = [];
    this.stageChangeLog = [];
    this.dailyWeatherLog = [];

    // Track extreme events for report
    eventBus.on('extreme_event', (evt) => {
      this.weatherEventLog.push({
        day: Math.floor(this.timeManager.getState().totalDays),
        type: evt.type,
        severity: evt.severity,
        duration: evt.duration,
        windSpeed: evt.windSpeed,
      });
    });
    eventBus.on('stage_changed', (data) => {
      if (data.stage && data.plot) {
        this.stageChangeLog.push({
          day: Math.floor(this.timeManager.getState().totalDays),
          cropName: data.plot.crop.name.ko,
          stageName: data.stage.name.ko,
        });
      }
    });
    
    // Set latitude for day/night
    if (config.climate && config.climate.latitude) {
      this.timeManager.setLatitude(config.climate.latitude);
    }
    
    // Deduct costs
    if (config.facility && config.facility.cost) {
      this.fund -= config.facility.cost;
      this.totalExpenses += config.facility.cost;
    }
    if (config.robots) {
      for (const robot of config.robots) {
        const cost = robot.cost || 0;
        this.fund -= cost;
        this.totalExpenses += cost;
      }
    }

    // Create crop plots
    for (const cropConfig of config.crops) {
      this.cropEngine.createPlot(
        cropConfig.data,
        config.soil,
        config.facility,
        cropConfig.area || 1000
      );
    }

    this.isRunning = true;
    eventBus.emit('simulation_started', config);
    eventBus.emit('fund_changed', this.fund);
    
    // Generate initial weather
    const state = this.timeManager.getState();
    this.weatherEngine.generateDailyWeather(state.month, state.day);
  }

  update(deltaMs) {
    if (!this.isRunning || this.isGameOver) return;

    this.timeManager.update(deltaMs);
    const state = this.timeManager.getState();

    // Hourly processing
    const currentHour = Math.floor(state.totalHours);
    if (currentHour > this.lastHourProcessed) {
      this.lastHourProcessed = currentHour;
      this.processHourlyUpdate(state);
    }

    // Daily processing
    const currentDay = Math.floor(state.totalDays);
    if (currentDay > this.lastDayProcessed) {
      this.lastDayProcessed = currentDay;
      this.processDailyUpdate(state);
    }
  }

  processHourlyUpdate(timeState) {
    const weather = this.weatherEngine.getCurrentWeather();
    
    eventBus.emit('hourly_update', {
      time: timeState,
      weather,
      plots: this.cropEngine.getPlots(),
      fund: this.fund,
    });
  }

  processDailyUpdate(timeState) {
    // 1. Generate weather
    const weather = this.weatherEngine.generateDailyWeather(timeState.month, timeState.day);

    // 2. Update crops
    this.cropEngine.updateDaily(weather, timeState);

    // 2b. Log daily weather for report
    if (this.dailyWeatherLog.length < 400) { // Cap to prevent memory issues
      this.dailyWeatherLog.push({
        day: Math.floor(timeState.totalDays),
        temp: weather.temperature,
        tempMax: weather.tempMax,
        tempMin: weather.tempMin,
        rain: weather.rainfall,
        humidity: weather.humidity,
        type: weather.type,
      });
    }

    // 3. Monthly maintenance costs
    if (timeState.day === 1) {
      let monthlyCost = 0;
      if (this.config.facility && this.config.facility.maintenanceCost) {
        monthlyCost += this.config.facility.maintenanceCost / 12;
      }
      if (this.config.robots) {
        for (const r of this.config.robots) {
          monthlyCost += (r.maintenanceCost || 0) / 12;
        }
      }
      if (monthlyCost > 0) {
        this.fund -= monthlyCost;
        this.totalExpenses += monthlyCost;
        eventBus.emit('fund_changed', this.fund);
      }
    }

    // 4. Auto-harvest check
    const plots = this.cropEngine.getAlivePlots();
    for (const plot of plots) {
      if (plot.currentStage === 'harvest_ready' && plot.daysSincePlanting > 20) {
        const stages = plot.crop.phenology.stages;
        const maxDays = stages.reduce((sum, s) => sum + s.duration.max, 0);
        if (plot.daysSincePlanting > maxDays + 14) {
          // Auto harvest if farmer hasn't gotten to it
          this.cropEngine.harvestPlot(plot);
        }
      }
    }

    // 5. Check game over conditions
    this.checkGameOver();

    // 6. Emit state update
    eventBus.emit('daily_update', {
      time: timeState,
      weather,
      plots: this.cropEngine.getPlots(),
      fund: this.fund,
    });
  }

  checkGameOver() {
    const allPlots = this.cropEngine.getPlots();
    if (allPlots.length === 0) return;

    // Check: all crops dead or harvested
    const alivePlots = allPlots.filter(p => p.isAlive && !p.isHarvested);
    const deadPlots = allPlots.filter(p => !p.isAlive && p.currentStage === 'dead');
    const harvestedPlots = allPlots.filter(p => p.isHarvested);

    // Game over if all crops dead (none alive, none waiting to be harvested)
    if (alivePlots.length === 0 && deadPlots.length > 0 && harvestedPlots.length === 0) {
      this.endGame('모든 작물이 고사하였습니다! 💀');
      return;
    }

    // Game over if all done (harvested + dead, none alive)
    if (alivePlots.length === 0 && (harvestedPlots.length > 0 || deadPlots.length > 0)) {
      this.endGame('모든 작물의 재배가 종료되었습니다.');
      return;
    }

    // Bankruptcy
    if (this.fund < -10000000) {
      this.endGame('자금이 부족합니다! 파산 💸');
      return;
    }
  }

  endGame(reason) {
    this.isGameOver = true;
    this.isRunning = false;
    this.gameOverReason = reason;

    const timeState = this.timeManager.getState();
    const stats = {
      reason,
      totalDays: Math.floor(timeState.totalDays),
      totalRevenue: this.totalRevenue,
      totalExpenses: this.totalExpenses,
      finalFund: this.fund,
      profit: this.fund - INITIAL_FUND,
      harvestResults: this.harvestResults,
      deadCrops: this.cropEngine.getPlots().filter(p => p.currentStage === 'dead').length,
      harvestedCrops: this.cropEngine.getPlots().filter(p => p.isHarvested).length,
      climate: this.config.climate,
      soil: this.config.soil,
      facility: this.config.facility,

      // Detailed report data
      plots: this.cropEngine.getPlots().map(p => ({
        cropName: p.crop.name.ko,
        cropIcon: p.crop.icon,
        cropId: p.crop.id,
        isAlive: p.isAlive,
        isHarvested: p.isHarvested,
        currentStage: p.currentStage,
        health: p.health,
        daysSincePlanting: p.daysSincePlanting,
        accumulatedGDD: p.accumulatedGDD,
        totalBiomass: p.totalBiomass,
        predictedYield: p.predictedYield,
        soilCondition: p.soilCondition,
        nutrientN: p.nutrientN,
        nutrientP: p.nutrientP,
        nutrientK: p.nutrientK,
        activeDiseases: (p.activeDiseases || []).map(d => ({ name: d.name, severity: d.severity })),
        consecutiveCrops: p.consecutiveCrops || 0,
        chillHours: p.chillHours || 0,
        vernalizationMet: p.vernalizationMet,
        stressHistory: p.stressHistory || [],
        fertilizerRatio: p.crop.fertilizerRatio,
      })),
      weatherEvents: this.weatherEventLog,
      stageChanges: this.stageChangeLog,
      dailyWeather: this.dailyWeatherLog,
    };

    // Calculate grade
    const profitRatio = stats.profit / INITIAL_FUND;
    const harvestRatio = stats.harvestedCrops / Math.max(1, this.cropEngine.getPlots().length);
    const score = profitRatio * 0.5 + harvestRatio * 0.5;
    
    if (score > 0.5) stats.grade = 'S';
    else if (score > 0.3) stats.grade = 'A';
    else if (score > 0.1) stats.grade = 'B';
    else if (score > -0.1) stats.grade = 'C';
    else stats.grade = 'D';

    eventBus.emit('game_over', stats);
    eventBus.emit('event_log', {
      type: 'danger',
      message: `🏁 시뮬레이션 종료: ${reason}`
    });
  }

  getCropPrice(cropId) {
    // 2024 한국 도매시장 평균 가격 (₩/kg)
    const prices = {
      rice: 2400, green_onion: 1800, grape: 4000, apple: 3500,
      strawberry: 10000, napa_cabbage: 500, red_pepper: 15000,
      potato: 1200, sweet_potato: 2000, tomato: 3000,
    };
    return prices[cropId] || 2000;
  }

  getState() {
    return {
      time: this.timeManager.getState(),
      weather: this.weatherEngine?.getCurrentWeather(),
      plots: this.cropEngine.getPlots(),
      fund: this.fund,
      harvestResults: this.harvestResults,
      isRunning: this.isRunning,
      isGameOver: this.isGameOver,
    };
  }

  setSpeed(speed) {
    this.timeManager.setSpeed(speed);
  }

  reset() {
    this.cropEngine = new CropGrowthEngine();
    this.timeManager = new TimeManager();
    this.weatherEngine = null;
    this.fund = INITIAL_FUND;
    this.isRunning = false;
    this.isGameOver = false;
    this.harvestResults = [];
    this.totalRevenue = 0;
    this.totalExpenses = 0;
    this.lastDayProcessed = -1;
    this.lastHourProcessed = -1;
  }
}

export default SimulationManager;
