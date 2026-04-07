// CropGrowthEngine - DSSAT/APSIM 기반 작물 성장 시뮬레이션 엔진
import { eventBus } from '../utils/EventBus.js';
import { calculateGDD, temperatureStress, waterStress, lightInterception, clamp, randomGaussian } from '../utils/MathUtils.js';
import { GROWTH_STAGES as GS, STAGE_NAMES_KO } from '../utils/Constants.js';

export class CropGrowthEngine {
  constructor() {
    this.plots = []; // Active crop plots
  }

  createPlot(cropData, soilData, facilityData, area = 1000) {
    const stages = cropData.phenology.stages;
    const plot = {
      id: `plot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      crop: cropData,
      soil: soilData,
      facility: facilityData,
      area: area,               // m²

      // Growth state
      currentStageIndex: 0,
      currentStage: stages[0].id,
      accumulatedGDD: 0,
      stageGDD: 0,
      daysSincePlanting: 0,
      isAlive: true,
      isHarvested: false,

      // Biomass model — 종자/모종이 가진 초기 에너지로 자엽(cotyledon) 생성
      totalBiomass: 5,            // g/m² (seed reserves → initial shoots)
      leafBiomass: 3,             // g/m² (cotyledon leaves)
      stemBiomass: 1,             // g/m²
      fruitBiomass: 0,
      rootBiomass: 1,             // g/m² (radicle)
      LAI: 0.1,                   // Leaf Area Index (cotyledon stage)
      maxLAI: 0,

      // Stress tracking
      stressHistory: [],
      currentStress: {
        water: 1.0,             // 1=no stress, 0=max stress
        temperature: 1.0,
        nutrient: 1.0,
        light: 1.0,
        overall: 1.0,
      },

      // Water/Nutrient state
      soilMoisture: soilData.properties.fieldCapacity * 0.8,
      nutrientN: soilData.nutrients.nitrogen,
      nutrientP: soilData.nutrients.phosphorus,
      nutrientK: soilData.nutrients.potassium,
      organicMatter: soilData.properties.organicMatter || 3.5, // %
      soilCondition: 100, // 0-100 overall soil health

      // Resting/Fallow
      isResting: false,
      restingDays: 0,

      // Health
      health: 100,
      diseaseRisk: 0,
      activeDiseases: [], // 현재 발생 중인 병해 [{id, name, severity, daysSinceOnset}]

      // Vernalization (춘화처리/저온요구)
      chillHours: 0, // 7°C 이하 누적 시간
      vernalizationMet: !cropData.phenology.chillHoursRequired, // 춘화 불필요한 작물은 true

      // Continuous cropping (연작)
      consecutiveCrops: 0, // 같은 작물 연속 재배 횟수

      // Quality tracking
      accumulatedSunHours: 0,
      accumulatedTempRange: 0,
      tempRangeCount: 0,
      waterStressIntegral: 0,

      // Yield prediction
      predictedYield: cropData.yield.average,
      predictedQuality: { brix: 0, size: 0, grade: 'B' },

      // Strategy
      strategy: {
        irrigationMode: 'auto',
        irrigationAmount: 20,    // mm per event
        irrigationInterval: 3,   // days
        fertilizerApplied: { N: 0, P: 0, K: 0 },
      },
    };

    this.plots.push(plot);
    eventBus.emit('plot_created', plot);
    return plot;
  }

  updateDaily(weather, timeState) {
    for (const plot of this.plots) {
      if (!plot.isAlive || plot.isHarvested) continue;

      plot.daysSincePlanting++;
      const crop = plot.crop;
      const soil = plot.soil;
      const facility = plot.facility;

      // 1. Apply facility modifiers
      let effectiveTemp = weather.temperature;
      let effectiveTempMax = weather.tempMax;
      let effectiveTempMin = weather.tempMin;
      let effectiveRain = weather.rainfall;
      let effectiveSun = weather.sunHours;
      let effectiveWind = weather.windSpeed;

      if (facility && facility.effects) {
        let tempMod = facility.effects.tempModifier || 0;
        let tempMinBoost = facility.effects.tempMinBoost || 0;
        
        // 여름 환기 모델: 외기온 25°C 이상 시 측창 개방 → 승온 효과 감소
        if (weather.temperature > 30 && tempMod > 0) {
          tempMod = Math.min(2, tempMod * 0.2); // 30°C+ → 승온 80% 감소
          tempMinBoost = Math.min(2, tempMinBoost * 0.3);
        } else if (weather.temperature > 25 && tempMod > 0) {
          tempMod *= 0.4; // 25~30°C → 승온 60% 감소 (환기)
          tempMinBoost *= 0.5;
        }
        
        effectiveTemp += tempMod;
        effectiveTempMax += tempMod;
        effectiveTempMin += tempMinBoost;
        effectiveRain *= (1 - (facility.effects.rainProtection || 0));
        effectiveSun *= (facility.effects.lightTransmission || 1.0);
        effectiveWind *= (1 - (facility.effects.windProtection || 0));
      }
      // 1b. Vernalization (저온 요구량 누적)
      const chillReq = crop.phenology.chillHoursRequired;
      if (chillReq && !plot.vernalizationMet) {
        // 0~7°C 범위에서 시간 누적 (하루 = ~12시간 유효)
        if (effectiveTempMin <= 7 && effectiveTempMin >= -2) {
          const chillableHours = Math.max(0, Math.min(12, (7 - effectiveTempMin) * 2));
          plot.chillHours += chillableHours;
        }
        if (plot.chillHours >= chillReq) {
          plot.vernalizationMet = true;
          eventBus.emit('event_log', {
            type: 'success',
            message: `❄️→🌸 ${crop.name.ko} 저온 요구량 충족! (${plot.chillHours.toFixed(0)}h ≥ ${chillReq}h) 발아 준비 완료`
          });
        }
      }

      // 1c. Track dayLength for photoperiod sensitivity
      if (timeState && timeState.dayLength) {
        plot._lastDayLength = timeState.dayLength;
      }

      // 2. Calculate GDD
      const dailyGDD = calculateGDD(effectiveTempMax, effectiveTempMin, crop.phenology.baseTemp);
      plot.accumulatedGDD += dailyGDD;
      plot.stageGDD += dailyGDD;

      // 3. Check stage advancement
      this.checkStageAdvancement(plot);

      // 4. Calculate stress factors
      // Temperature stress
      const req = crop.requirements.temperature;
      const tempStress = temperatureStress(
        effectiveTemp,
        req.min, req.optimal.day - 3, req.optimal.day + 3, req.max
      );

      // Water balance (유효토심 반영)
      const effectiveDepthMM = soil.properties.effectiveDepth * 10; // cm → mm
      plot.soilMoisture += effectiveRain / effectiveDepthMM;
      // Irrigation
      if (this.shouldIrrigate(plot, timeState)) {
        plot.soilMoisture += plot.strategy.irrigationAmount / effectiveDepthMM;
        eventBus.emit('event_log', { type: 'info', message: `💧 ${crop.name.ko} 관수 실행 (${plot.strategy.irrigationAmount}mm)` });
      }

      // 벼 담수 재배 관리 (Paddy flooding management)
      if (crop.requirements.water.needsFlooding) {
        const stage = plot.currentStage;
        // 육묘기~분얼기~출수기: 담수 유지 (실제 논 관리: 이앙 직후부터 담수)
        if (stage === 'germination' || stage === 'seedling' || stage === 'vegetative' || stage === 'flowering') {
          if (plot.soilMoisture < soil.properties.fieldCapacity * 1.1) {
            plot.soilMoisture = soil.properties.fieldCapacity * 1.2; // Auto-flooding
          }
        } else if (stage === 'ripening' && plot.stageGDD > 200) {
          // 등숙 후기: 낙수 (수확 준비를 위해 배수)
          plot.soilMoisture = Math.min(plot.soilMoisture, soil.properties.fieldCapacity * 0.7);
        }
        // 분얼 말기 중간낙수: 과도한 분얼 억제 + 뿌리 활력 회복
        if (stage === 'vegetative' && plot.stageGDD > plot.crop.phenology.stages[2].gddRequired * 0.7) {
          plot.soilMoisture = Math.min(plot.soilMoisture, soil.properties.fieldCapacity * 0.6);
        }
      }

      // Evapotranspiration (FAO-56 simplified)
      const ET = this.calculateET(effectiveTemp, effectiveSun, weather.humidity, effectiveWind, plot.LAI, effectiveDepthMM);
      plot.soilMoisture -= ET;
      // Drainage
      if (plot.soilMoisture > soil.properties.fieldCapacity) {
        // 벼는 배수를 억제 (담수 유지)
        const drainMult = crop.requirements.water.needsFlooding ? 0.3 : 1.0;
        const excess = plot.soilMoisture - soil.properties.fieldCapacity;
        plot.soilMoisture -= excess * (soil.properties.drainageRate / 100) * drainMult;
      }
      plot.soilMoisture = clamp(plot.soilMoisture, 0, soil.properties.fieldCapacity * 1.5);

      const watStress = waterStress(
        plot.soilMoisture,
        soil.properties.wiltingPoint,
        soil.properties.fieldCapacity
      );

      // Nutrient stress — Liebig's Law of Minimum (N, P, K)
      const reqN = crop.requirements.nutrients.N || 100;
      const reqP = crop.requirements.nutrients.P || 40;
      const reqK = crop.requirements.nutrients.K || 80;
      const nStress = clamp(plot.nutrientN / Math.max(1, reqN), 0, 1);
      const pStress = clamp(plot.nutrientP / Math.max(1, reqP), 0, 1);
      const kStress = clamp(plot.nutrientK / Math.max(1, reqK), 0, 1);
      const nutStress = Math.min(nStress, pStress, kStress); // 가장 부족한 양분이 제한

      // Light stress
      const lightStress = clamp(effectiveSun / Math.max(1, crop.requirements.light.minSunHours), 0, 1);

      // Overall stress
      const overallStress = Math.min(tempStress, watStress, nutStress) * lightStress;

      plot.currentStress = {
        water: watStress,
        temperature: tempStress,
        nutrient: nutStress,
        light: lightStress,
        overall: overallStress,
      };

      // 5. Biomass accumulation (Monteith equation — 작물별 RUE)
      const defaultRUE = { grain: 1.5, vegetable: 2.0, fruit: 1.8, root: 2.2 };
      const RUE = crop.rueValue || defaultRUE[crop.category] || 2.0; // g/MJ
      // PAR = 일사량 × 0.48 (PAR fraction)
      // 근거: Monteith (1977), 한국 평균 일사량 = sunHours × 2.0~3.0 MJ/m²/h
      // KMA 근거: 한국 연평균 일사량 ~14.5 MJ/m²/day (맑은날 7h 기준)
      // → sunHours × 2.07 ≈ 14.5 MJ/m²/day
      const solarRadiation = effectiveSun * 2.1; // MJ/m²/day (Angström-Prescott: a=0.25, b=0.50)
      const PAR = solarRadiation * 0.48; // McCree (1972): PAR = 0.48 × Rs
      const IPAR = PAR * lightInterception(plot.LAI, 0.5);
      const potentialBiomass = RUE * IPAR;
      const actualBiomass = potentialBiomass * overallStress;

      plot.totalBiomass += actualBiomass;

      // Partition biomass by growth stage
      this.partitionBiomass(plot, actualBiomass);

      // 6. Update LAI
      this.updateLAI(plot, overallStress);

      // 7. Nutrient consumption (작물별 양분 흡수 계수)
      const absRate = crop.nutrientAbsorption || { N: 0.025, P: 0.004, K: 0.020 };
      const nConsumption = actualBiomass * absRate.N;
      const pConsumption = actualBiomass * absRate.P;
      const kConsumption = actualBiomass * absRate.K;
      plot.nutrientN = Math.max(0, plot.nutrientN - nConsumption);
      plot.nutrientP = Math.max(0, plot.nutrientP - pConsumption);
      plot.nutrientK = Math.max(0, plot.nutrientK - kConsumption);

      // Organic matter slow depletion
      plot.organicMatter = Math.max(0.5, plot.organicMatter - 0.002);

      // Update soil condition score
      this.updateSoilCondition(plot);

      // 8. Quality tracking
      plot.accumulatedSunHours += effectiveSun;
      const dailyTempRange = effectiveTempMax - effectiveTempMin;
      plot.accumulatedTempRange += dailyTempRange;
      plot.tempRangeCount++;
      if (watStress < 0.5) plot.waterStressIntegral++;

      // 9. Health check
      this.updateHealth(plot, weather, effectiveWind);

      // 10. Update yield prediction
      this.updateYieldPrediction(plot);

      // 11. Check for death
      if (plot.health <= 0) {
        plot.isAlive = false;
        plot.currentStage = GS.DEAD;
        eventBus.emit('event_log', { type: 'danger', message: `💀 ${crop.name.ko} 고사! 스트레스 누적으로 작물이 죽었습니다.` });
        eventBus.emit('crop_died', plot);
      }
    }
  }

  checkStageAdvancement(plot) {
    const stages = plot.crop.phenology.stages;
    const currentStageData = stages[plot.currentStageIndex];
    
    if (!currentStageData || plot.currentStage === GS.HARVEST_READY) return;

    // Vernalization gate: 과수류는 저온 요구량 충족 전까지 발아 지연
    const chillReq = plot.crop.phenology.chillHoursRequired;
    if (chillReq && !plot.vernalizationMet) {
      if (plot.currentStageIndex === 0) {
        // 발아기에서 머물러야 함 — 저온 누적 부족
        if (plot.daysSincePlanting % 30 === 0 && plot.daysSincePlanting > 0) {
          eventBus.emit('event_log', {
            type: 'info',
            message: `❄️ ${plot.crop.name.ko} 저온 요구량 ${plot.chillHours.toFixed(0)}/${chillReq}h — 발아 대기 중`
          });
        }
        return; // Block advancement
      }
    }

    if (plot.stageGDD >= currentStageData.gddRequired && currentStageData.gddRequired > 0) {
      // Photoperiod gate: 개화기 진입 시 일장 조건 확인
      const nextStageIndex = plot.currentStageIndex + 1;
      if (nextStageIndex < stages.length) {
        const nextStage = stages[nextStageIndex];
        if (nextStage.id === GS.FLOWERING && plot.crop.requirements.light.photoperiod) {
          const dayLength = plot._lastDayLength || 12;
          const pp = plot.crop.requirements.light.photoperiod;
          if (pp === 'short_day' && dayLength > 13.5) {
            return; // 단일식물: 일장 13.5h 이하에서만 개화
          }
          if (pp === 'long_day' && dayLength < 12) {
            return; // 장일식물: 일장 12h 이상에서만 개화
          }
        }
      }

      plot.currentStageIndex++;
      if (plot.currentStageIndex < stages.length) {
        const newStage = stages[plot.currentStageIndex];
        plot.currentStage = newStage.id;
        plot.stageGDD = 0;
        eventBus.emit('event_log', { 
          type: 'success', 
          message: `🌱 ${plot.crop.name.ko} → ${newStage.name.ko} 단계 진입` 
        });
        eventBus.emit('stage_changed', { plot, stage: newStage });
      }
    }
  }

  partitionBiomass(plot, biomass) {
    const stage = plot.currentStage;
    // Partitioning coefficients by stage (fraction to leaf/stem/root/fruit)
    let pLeaf = 0.4, pStem = 0.3, pRoot = 0.3, pFruit = 0;

    switch (stage) {
      case GS.GERMINATION:
      case GS.SEEDLING:
        pLeaf = 0.35; pStem = 0.15; pRoot = 0.50; pFruit = 0;
        break;
      case GS.VEGETATIVE:
        pLeaf = 0.50; pStem = 0.30; pRoot = 0.20; pFruit = 0;
        break;
      case GS.FLOWERING:
        pLeaf = 0.20; pStem = 0.25; pRoot = 0.10; pFruit = 0.45;
        break;
      case GS.FRUITING:
        pLeaf = 0.10; pStem = 0.10; pRoot = 0.05; pFruit = 0.75;
        break;
      case GS.RIPENING:
      case GS.HARVEST_READY:
        pLeaf = 0.05; pStem = 0.05; pRoot = 0.05; pFruit = 0.85;
        break;
    }

    plot.leafBiomass += biomass * pLeaf;
    plot.stemBiomass += biomass * pStem;
    plot.rootBiomass += biomass * pRoot;
    plot.fruitBiomass += biomass * pFruit;
  }

  updateLAI(plot, stress) {
    // LAI based on leaf biomass (SLA = specific leaf area, ~25 m²/kg)
    const SLA = 25;
    plot.LAI = (plot.leafBiomass / 1000) * SLA * stress;
    
    // LAI decay after flowering
    if (plot.currentStage === GS.RIPENING || plot.currentStage === GS.HARVEST_READY) {
      plot.LAI *= 0.95; // Senescence
    }
    
    plot.LAI = clamp(plot.LAI, 0, 8);
    plot.maxLAI = Math.max(plot.maxLAI, plot.LAI);
  }

  calculateET(temp, sunHours, humidity, wind, LAI, effectiveDepthMM = 900) {
    // FAO-56 Hargreaves-Samani reference ET (improved)
    // Ra approximation: Clear-sky radiation based on sunHours (max ~12h/day in Korea)
    const sunFraction = clamp(sunHours / 12, 0, 1);
    const Ra = 15 + sunFraction * 20; // MJ/m²/day (range 15~35, latitude-dependent)
    const Rs = Ra * (0.25 + 0.50 * sunFraction); // Solar radiation (Angstrom)

    // Hargreaves ET₀
    const ET0_Hargreaves = 0.0023 * (temp + 17.8) * Math.sqrt(Math.max(1, Rs)) * Rs * 0.01;

    // VPD correction (vapor pressure deficit influence)
    const es = 0.6108 * Math.exp(17.27 * temp / (temp + 237.3)); // saturation VP
    const ea = es * (humidity / 100); // actual VP
    const VPD = Math.max(0, es - ea);
    const vpdFactor = 1.0 + VPD * 0.15; // Higher VPD → more ET

    const ET0 = ET0_Hargreaves * vpdFactor;

    // FAO-56 Kc: Allen et al. (1998) Table 12
    // Kc_ini=0.3~0.5, Kc_mid=0.85~1.2, Kc_end=0.4~0.95
    // LAI 관계: Ritchie (1972) Kc = f(LAI) 근사식
    const Kc = clamp(0.3 + 0.7 * (1 - Math.exp(-0.5 * LAI)), 0.3, 1.2);

    // Convert mm to soil moisture fraction
    const ETmm = Math.max(0, ET0 * Kc);
    return ETmm / effectiveDepthMM;
  }

  updateHealth(plot, weather, windSpeed) {
    const stress = plot.currentStress.overall;
    if (stress < 0.3) plot.health -= (0.3 - stress) * 5;
    if (stress < 0.1) plot.health -= 3;

    // Wind damage
    if (windSpeed > 15) {
      const windDmg = (windSpeed - 15) * plot.crop.sensitivity.wind * 2;
      plot.health -= windDmg;
      if (windSpeed > 30) {
        // Lodging (도복) - stems break
        plot.health -= (windSpeed - 30) * 0.5;
        if (windSpeed > 40 && plot.currentStage !== 'germination' && plot.currentStage !== 'seedling') {
          eventBus.emit('event_log', {
            type: 'danger',
            message: `💨 ${plot.crop.name.ko} 강풍 도복 피해! 풍속 ${windSpeed.toFixed(0)}m/s`
          });
        }
      }
    }

    // Temperature extremes
    const temp = weather.temperature;
    if (temp <= plot.crop.requirements.temperature.lethal.cold) {
      plot.health -= 15 * plot.crop.sensitivity.cold;
    }
    if (temp >= plot.crop.requirements.temperature.lethal.heat) {
      plot.health -= 10 * plot.crop.sensitivity.heat;
    }

    // ---- Frost damage (서리 피해) ----
    if (weather.frostIntensity > 0) {
      let frostDamage = weather.frostIntensity * plot.crop.sensitivity.cold * 8;
      // Flowering/fruiting stage is extremely vulnerable to frost
      if (plot.currentStage === 'flowering' || plot.currentStage === 'fruiting') {
        frostDamage *= 3.0; // 꽃/열매 동해
        if (weather.frostIntensity > 0.5) {
          eventBus.emit('event_log', {
            type: 'danger',
            message: `❄️ ${plot.crop.name.ko} 개화기 동해! 수확량 급감 우려`
          });
        }
      }
      // Seedlings very vulnerable
      if (plot.currentStage === 'seedling' || plot.currentStage === 'germination') {
        frostDamage *= 2.0;
      }
      plot.health -= frostDamage;
    }

    // ---- Hail damage (우박 피해) ----
    if (weather.hailIntensity > 0) {
      // Physical damage to leaves and fruits
      const hailDamage = weather.hailIntensity * 15;
      plot.health -= hailDamage;
      // LAI reduction (leaf shredding)
      plot.LAI = Math.max(0.1, plot.LAI * (1 - weather.hailIntensity * 0.3));
      // Fruit damage during fruiting/ripening
      if (plot.currentStage === 'fruiting' || plot.currentStage === 'ripening') {
        plot.fruitBiomass *= (1 - weather.hailIntensity * 0.2);
      }
    }

    // ---- Waterlogging from excessive rain (침수 피해) ----
    if (weather.rainfall > 80 && plot.soilMoisture > plot.soil.properties.fieldCapacity * 1.3) {
      const waterlogDamage = 3.0; // root oxygen deficiency
      plot.health -= waterlogDamage;
      plot.rootBiomass *= 0.98; // root damage
    }

    // ---- Crop-specific disease system (작물별 병해충 분화) ----
    const diseases = plot.crop.diseases || [];
    const consecutivePenalty = 1 + (plot.consecutiveCrops || 0) * 0.2; // 연작장해: 병해 20% 증가/회차

    for (const disease of diseases) {
      const trigger = disease.trigger;
      const inTempRange = temp >= trigger.tempMin && temp <= trigger.tempMax;
      const humidityOk = weather.humidity >= trigger.humidityMin;
      const humidityMaxOk = trigger.humidityMax === undefined || weather.humidity <= trigger.humidityMax;
      const stageOk = disease.stages.includes(plot.currentStage);

      // Check if this disease is already active
      let active = plot.activeDiseases.find(d => d.id === disease.id);

      if (inTempRange && humidityOk && humidityMaxOk && stageOk) {
        if (!active) {
          // 병해 발병 확률: 농진청 병해충도감 기준
          // 일일 발병확률 = 0.08~0.15 (damageRate의 2배 기준)
          const onsetChance = Math.min(0.20, disease.damageRate * 2.0) * consecutivePenalty;
          if (Math.random() < onsetChance) {
            active = { id: disease.id, name: disease.name, severity: 0.1, daysSinceOnset: 0 };
            plot.activeDiseases.push(active);
            eventBus.emit('event_log', {
              type: 'warning',
              message: `🦠 ${plot.crop.name.ko} [${disease.name}] 발병! (${trigger.tempMin}~${trigger.tempMax}°C, 습도 ${weather.humidity.toFixed(0)}%)`
            });
          }
        }
        if (active) {
          // 병해 진행: 일일 severity += damageRate × 0.3 (농진청 병해충도감)
          // 심각도 1.0 도달 시 수확량 50-70% 감소 수준
          active.severity = Math.min(1.0, active.severity + disease.damageRate * 0.3 * consecutivePenalty);
          active.daysSinceOnset++;
        }
      } else if (active) {
        // Recovery when conditions are unfavorable
        active.severity = Math.max(0, active.severity - 0.02);
        if (active.severity <= 0) {
          plot.activeDiseases = plot.activeDiseases.filter(d => d.id !== disease.id);
        }
      }
    }

    // Apply cumulative disease damage
    let totalDiseaseDamage = 0;
    for (const active of plot.activeDiseases) {
      totalDiseaseDamage += active.severity * plot.crop.sensitivity.disease * 2;
      if (active.severity > 0.5 && active.daysSinceOnset % 7 === 0) {
        eventBus.emit('event_log', {
          type: 'danger',
          message: `🦠 ${plot.crop.name.ko} [${active.name}] 심각! 피해도 ${(active.severity * 100).toFixed(0)}% — 방제 필요`
        });
      }
    }
    plot.health -= totalDiseaseDamage;
    // Update overall diseaseRisk for grade calculation
    plot.diseaseRisk = plot.activeDiseases.length > 0
      ? plot.activeDiseases.reduce((sum, d) => sum + d.severity, 0) / plot.activeDiseases.length
      : Math.max(0, plot.diseaseRisk - 0.01);

    // Natural recovery
    if (stress > 0.8) plot.health = Math.min(100, plot.health + 0.5);

    plot.health = clamp(plot.health, 0, 100);
  }


  updateYieldPrediction(plot) {
    const crop = plot.crop;
    const HI = crop.yield.harvestIndex;
    
    // Predicted yield = total biomass × harvest index × area conversion
    const yieldGM2 = plot.totalBiomass * HI;
    // Convert g/m² to kg/10a (= kg/1000m²)
    plot.predictedYield = (yieldGM2 * plot.area) / 1000;

    // Quality prediction
    if (crop.quality && crop.quality.brix) {
      const avgTempRange = plot.tempRangeCount > 0 ? plot.accumulatedTempRange / plot.tempRangeCount : 10;
      const sunRatio = plot.accumulatedSunHours / Math.max(1, plot.daysSincePlanting * crop.requirements.light.minSunHours);
      
      let brix = crop.quality.brix.min;
      brix += (crop.quality.brix.optimal - crop.quality.brix.min) * clamp(sunRatio, 0, 1) * 0.4;
      brix += clamp(avgTempRange / 15, 0, 1) * (crop.quality.brix.optimal - crop.quality.brix.min) * 0.3;
      // Mild water stress can increase sugar content
      const waterStressBonus = plot.waterStressIntegral / Math.max(1, plot.daysSincePlanting);
      brix += waterStressBonus * 2;
      brix += randomGaussian(0, 0.5);
      brix = clamp(brix, crop.quality.brix.min, crop.quality.brix.max);
      
      plot.predictedQuality.brix = brix;
    }

    // Grade calculation
    const healthScore = plot.health / 100;
    const stressScore = plot.stressHistory.length > 0 
      ? plot.stressHistory.reduce((a, b) => a + b, 0) / plot.stressHistory.length 
      : plot.currentStress.overall;
    const diseasePenalty = Math.min(0.2, plot.diseaseRisk * 0.3);
    const totalScore = (healthScore * 0.4 + stressScore * 0.4 + 0.2) - diseasePenalty;

    if (totalScore > 0.9) plot.predictedQuality.grade = 'S';
    else if (totalScore > 0.75) plot.predictedQuality.grade = 'A';
    else if (totalScore > 0.55) plot.predictedQuality.grade = 'B';
    else if (totalScore > 0.35) plot.predictedQuality.grade = 'C';
    else plot.predictedQuality.grade = 'D';

    // Track stress for grade calc
    if (plot.stressHistory.length > 30) plot.stressHistory.shift();
    plot.stressHistory.push(plot.currentStress.overall);
  }

  shouldIrrigate(plot, timeState) {
    if (plot.strategy.irrigationMode === 'auto') {
      // Auto: irrigate when soil moisture drops below 50% of field capacity
      return plot.soilMoisture < plot.soil.properties.fieldCapacity * 0.5;
    } else if (plot.strategy.irrigationMode === 'schedule') {
      return plot.daysSincePlanting % plot.strategy.irrigationInterval === 0;
    }
    return false;
  }

  harvestPlot(plot) {
    if (!plot.isAlive || plot.isHarvested) return null;
    
    plot.isHarvested = true;
    plot.currentStage = GS.HARVESTED;

    const result = {
      crop: plot.crop,
      yield: plot.predictedYield,
      yieldPer10a: (plot.predictedYield / plot.area) * 1000,
      quality: { ...plot.predictedQuality },
      health: plot.health,
      daysSincePlanting: plot.daysSincePlanting,
      totalGDD: plot.accumulatedGDD,
      averageStress: plot.stressHistory.length > 0
        ? plot.stressHistory.reduce((a, b) => a + b, 0) / plot.stressHistory.length
        : 1,
    };

    // Compare to average
    const avgYield = plot.crop.yield.average;
    result.yieldRatio = result.yieldPer10a / avgYield;
    result.yieldComment = result.yieldRatio > 1.1 ? '평균 이상 🎉' 
      : result.yieldRatio > 0.9 ? '평균 수준' 
      : '평균 이하 ⚠️';

    eventBus.emit('harvest_complete', result);
    eventBus.emit('event_log', {
      type: 'success',
      message: `🎉 ${plot.crop.name.ko} 수확 완료! ${result.yieldPer10a.toFixed(0)}kg/10a (${result.yieldComment})`
    });

    return result;
  }

  updateSoilCondition(plot) {
    const soil = plot.soil;
    const nScore = clamp(plot.nutrientN / (soil.nutrients.nitrogen || 100), 0, 1);
    const pScore = clamp(plot.nutrientP / (soil.nutrients.phosphorus || 50), 0, 1);
    const kScore = clamp(plot.nutrientK / (soil.nutrients.potassium || 100), 0, 1);
    const omScore = clamp(plot.organicMatter / 5.0, 0, 1);
    const moistureScore = clamp(plot.soilMoisture / soil.properties.fieldCapacity, 0, 1);

    plot.soilCondition = Math.round(
      (nScore * 25 + pScore * 15 + kScore * 20 + omScore * 25 + moistureScore * 15)
    );

    // Emit warning if soil is depleted
    if (plot.soilCondition < 30 && !plot.isResting && plot.isAlive) {
      if (plot.daysSincePlanting % 10 === 0) { // Don't spam
        eventBus.emit('event_log', {
          type: 'warning',
          message: `⚠️ ${plot.crop.name.ko} 토양 컨디션 심각! (${plot.soilCondition}%) 휴경을 고려하세요.`
        });
      }
    }
  }

  startResting(plotId) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot) return;
    if (plot.isAlive && !plot.isHarvested && plot.currentStage !== 'dead') return; // Cannot rest while active
    
    plot.isResting = true;
    plot.restingDays = 0;
    eventBus.emit('event_log', {
      type: 'info',
      message: `🌿 토양 휴경 시작. 자연 회복이 진행됩니다.`
    });
  }

  stopResting(plotId) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot || !plot.isResting) return;
    plot.isResting = false;
    eventBus.emit('event_log', {
      type: 'info',
      message: `🌿 토양 휴경 종료. (${plot.restingDays}일간 휴경)`
    });
  }

  updateResting(weather) {
    for (const plot of this.plots) {
      if (!plot.isResting) continue;
      plot.restingDays++;

      // Soil recovery during rest
      const soil = plot.soil;
      plot.nutrientN = Math.min(soil.nutrients.nitrogen * 1.2, plot.nutrientN + 0.8);
      plot.nutrientP = Math.min(soil.nutrients.phosphorus * 1.2, plot.nutrientP + 0.3);
      plot.nutrientK = Math.min(soil.nutrients.potassium * 1.2, plot.nutrientK + 0.5);
      plot.organicMatter = Math.min(5.0, plot.organicMatter + 0.01);
      
      // Rain helps recovery
      if (weather && weather.rainfall > 0) {
        plot.soilMoisture = Math.min(soil.properties.fieldCapacity, plot.soilMoisture + weather.rainfall / 1000);
      }
      
      this.updateSoilCondition(plot);
    }
  }

  getPlots() { return this.plots; }
  getAlivePlots() { return this.plots.filter(p => p.isAlive && !p.isHarvested); }
}

export default CropGrowthEngine;
