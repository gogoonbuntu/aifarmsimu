// WeatherEngine - 기상 생성 및 극한 이벤트 시뮬레이션 (Enhanced v2)
import { eventBus } from '../utils/EventBus.js';
import { randomGaussian, randomRange, rollEvent, clamp } from '../utils/MathUtils.js';
import { WEATHER_TYPES, EVENT_TYPES } from '../utils/Constants.js';

export class WeatherEngine {
  constructor(climateData) {
    this.climate = climateData;
    this.currentWeather = {
      type: WEATHER_TYPES.CLEAR,
      temperature: 15,
      tempMax: 20,
      tempMin: 10,
      humidity: 60,
      rainfall: 0,
      sunHours: 7,
      windSpeed: 2,
      snowfall: 0,       // mm of snow
      hailIntensity: 0,   // 0-1
      frostIntensity: 0,  // 0-1
      visibility: 10,     // km
    };
    this.activeEvents = [];
    this.monsoonActive = false;
    this.monsoonDaysRemaining = 0;
    this.snowAccumulation = 0;  // cm of snow on ground
    this.consecutiveFrostDays = 0;
  }

  generateDailyWeather(month, day) {
    const m = month;
    const base = this.climate.monthly;
    
    // Daily variation
    const tempVariation = randomGaussian(0, 2.5);
    const avgTemp = base.avgTemp[m] + tempVariation;
    const tempMax = base.maxTemp[m] + randomGaussian(0, 2);
    const tempMin = base.minTemp[m] + randomGaussian(0, 1.5);
    
    // Determine weather type
    const monthlyRain = base.rainfall[m];
    const dailyRainProb = Math.min(0.9, monthlyRain / 30 / 20);
    let rainToday = 0;
    let snowToday = 0;
    let weatherType = WEATHER_TYPES.CLEAR;
    
    if (this.monsoonActive) {
      if (rollEvent(0.70)) {
        rainToday = randomRange(5, 60);
        weatherType = rainToday > 30 ? WEATHER_TYPES.HEAVY_RAIN : WEATHER_TYPES.RAINY;
      } else {
        weatherType = WEATHER_TYPES.CLOUDY;
      }
      this.monsoonDaysRemaining--;
      if (this.monsoonDaysRemaining <= 0) {
        this.monsoonActive = false;
        eventBus.emit('event_log', { type: 'info', message: '장마가 종료되었습니다.' });
      }
    } else if (rollEvent(dailyRainProb)) {
      rainToday = randomRange(1, monthlyRain / 8);
      weatherType = rainToday > 25 ? WEATHER_TYPES.HEAVY_RAIN : WEATHER_TYPES.RAINY;
    } else if (rollEvent(0.3)) {
      weatherType = WEATHER_TYPES.CLOUDY;
    }

    // Snow in cold weather
    if (avgTemp < 2 && rainToday > 0) {
      weatherType = WEATHER_TYPES.SNOWY;
      snowToday = rainToday * 0.8; // rough conversion
      rainToday = 0;
    }

    // Fog probability (early morning, high humidity, low wind)
    if (weatherType === WEATHER_TYPES.CLEAR || weatherType === WEATHER_TYPES.CLOUDY) {
      const fogProb = (base.humidity[m] > 70 ? 0.15 : 0.05) * (avgTemp < 10 ? 1.5 : 1.0);
      if (rollEvent(fogProb)) {
        weatherType = WEATHER_TYPES.FOGGY;
      }
    }

    // Sun hours
    let sunHours = base.sunHours[m];
    if (weatherType === WEATHER_TYPES.RAINY || weatherType === WEATHER_TYPES.HEAVY_RAIN) {
      sunHours *= 0.3;
    } else if (weatherType === WEATHER_TYPES.CLOUDY) {
      sunHours *= 0.6;
    } else if (weatherType === WEATHER_TYPES.STORMY) {
      sunHours *= 0.1;
    } else if (weatherType === WEATHER_TYPES.FOGGY) {
      sunHours *= 0.4;
    } else if (weatherType === WEATHER_TYPES.SNOWY) {
      sunHours *= 0.35;
    }

    // Snow accumulation / melting
    if (snowToday > 0) {
      this.snowAccumulation += snowToday * 0.1; // cm
    }
    if (avgTemp > 3) {
      this.snowAccumulation = Math.max(0, this.snowAccumulation - (avgTemp - 3) * 0.5);
    }
    this.snowAccumulation = Math.min(50, this.snowAccumulation);

    // Frost tracking
    if (tempMin < 0) {
      this.consecutiveFrostDays++;
    } else {
      this.consecutiveFrostDays = 0;
    }

    // Visibility
    let visibility = 10;
    if (weatherType === WEATHER_TYPES.FOGGY) visibility = randomRange(0.2, 2);
    else if (weatherType === WEATHER_TYPES.HEAVY_RAIN) visibility = randomRange(2, 5);
    else if (weatherType === WEATHER_TYPES.STORMY) visibility = randomRange(0.5, 3);
    else if (weatherType === WEATHER_TYPES.SNOWY) visibility = randomRange(1, 4);

    this.currentWeather = {
      type: weatherType,  
      temperature: clamp(avgTemp, -20, 42),
      tempMax: clamp(tempMax, avgTemp, 45),
      tempMin: clamp(tempMin, -25, avgTemp),
      humidity: clamp(base.humidity[m] + randomGaussian(0, 5) + (rainToday > 0 ? 15 : 0), 20, 100),
      rainfall: Math.max(0, rainToday),
      snowfall: Math.max(0, snowToday),
      sunHours: clamp(sunHours, 0, 14),
      windSpeed: Math.max(0, base.windSpeed[m] + randomGaussian(0, 0.8)),
      hailIntensity: 0,
      frostIntensity: tempMin < 0 ? clamp(Math.abs(tempMin) / 10, 0, 1) : 0,
      snowAccumulation: this.snowAccumulation,
      visibility,
    };

    // Apply persistent effects from ongoing extreme events
    this.applyActiveEventEffects();

    // Check for new extreme events
    this.checkExtremeEvents(m);

    eventBus.emit('weather_updated', this.currentWeather);
    return this.currentWeather;
  }

  applyActiveEventEffects() {
    for (const evt of this.activeEvents) {
      if (evt.type === 'heatwave' && evt.tempBoost) {
        this.currentWeather.tempMax += evt.tempBoost;
        this.currentWeather.temperature += evt.tempBoost * 0.6;
        this.currentWeather.humidity = Math.max(15, this.currentWeather.humidity - 8);
      }
      if (evt.type === 'drought') {
        // 가뭄 기간 동안 강수 억제 + 습도 저하
        this.currentWeather.rainfall = Math.max(0, this.currentWeather.rainfall * 0.1);
        this.currentWeather.humidity = Math.max(20, this.currentWeather.humidity - 15);
        this.currentWeather.sunHours = Math.min(12, this.currentWeather.sunHours * 1.2);
      }
      if (evt.type === 'frost' && evt.tempMin !== undefined) {
        this.currentWeather.tempMin = Math.min(this.currentWeather.tempMin, evt.tempMin + (evt.duration || 0) * 0.5);
        this.currentWeather.frostIntensity = Math.max(this.currentWeather.frostIntensity, evt.severity * 0.7);
      }
    }
  }

  checkExtremeEvents(month) {
    const events = this.climate.extremeEvents;
    
    // Monsoon (June-July)
    if ((month === 5 || month === 6) && !this.monsoonActive) {
      if (rollEvent(events.heavyRainProb[month] * 0.5)) {
        this.monsoonActive = true;
        this.monsoonDaysRemaining = Math.floor(randomRange(28, 40)); // KMA 장마 평균 ~32일 (6/19~7/26)
        const evt = {
          type: EVENT_TYPES.MONSOON,
          severity: randomRange(0.3, 0.8),
          duration: this.monsoonDaysRemaining,
          cropDamage: randomRange(0.15, 0.40),
          facilityDamage: randomRange(0.10, 0.25),
        };
        this.activeEvents.push(evt);
        eventBus.emit('extreme_event', evt);
        eventBus.emit('event_log', { 
          type: 'danger', 
          message: `⛈️ 장마 시작! ${this.monsoonDaysRemaining}일간 집중호우 예상` 
        });
      }
    }

    // Typhoon
    if (rollEvent(events.typhoonProb[month] / 30)) {
      // KMA 태풍 등급: 강(17-24m/s), 매우강(25-32m/s), 초강력(33m/s+)
      const windSpeed = randomRange(17, 42); // KMA 영향태풍 풍속 범위
      const rainfall = randomRange(50, 300); // KMA 태풍 일강수 50-300mm
      const evt = {
        type: EVENT_TYPES.TYPHOON,
        severity: randomRange(0.4, 1.0),
        duration: Math.floor(randomRange(1, 3)),
        cropDamage: randomRange(0.20, 0.60),
        facilityDamage: randomRange(0.15, 0.50),
        windSpeed,
      };
      this.activeEvents.push(evt);
      this.currentWeather.type = WEATHER_TYPES.STORMY;
      this.currentWeather.windSpeed = windSpeed;
      this.currentWeather.rainfall = rainfall;
      this.currentWeather.visibility = randomRange(0.3, 1.5);
      eventBus.emit('extreme_event', evt);
      eventBus.emit('event_log', { 
        type: 'danger', 
        message: `🌪️ 태풍 접근! 풍속 ${windSpeed.toFixed(0)}m/s, 강수 ${rainfall.toFixed(0)}mm, ${evt.duration}일간 영향`
      });
    }

    // Heatwave
    if (rollEvent(events.heatwaveProb[month] / 30)) {
      // KMA: 폭염 = 일최고기온 33°C 이상, 보통 +2~6°C 편차
      const tempBoost = randomRange(2, 6);
      const evt = {
        type: EVENT_TYPES.HEATWAVE,
        severity: randomRange(0.3, 0.8),
        duration: Math.floor(randomRange(3, 10)), // KMA 폭염 지속 평균 3-10일
        tempBoost,
      };
      this.activeEvents.push(evt);
      this.currentWeather.tempMax += tempBoost;
      this.currentWeather.temperature += tempBoost * 0.6;
      eventBus.emit('extreme_event', evt);
      eventBus.emit('event_log', { 
        type: 'warning', 
        message: `🔥 폭염 경보! ${evt.duration}일간 ${this.currentWeather.tempMax.toFixed(1)}°C 예상`
      });
    }

    // Frost
    if (rollEvent(events.frostProb[month] / 30)) {
      if (this.currentWeather.tempMin < 2) {
        const frostTemp = this.currentWeather.tempMin - randomRange(2, 5);
        const intensity = clamp(Math.abs(frostTemp) / 8, 0.3, 1.0);
        const evt = {
          type: EVENT_TYPES.FROST,
          severity: intensity,
          tempMin: frostTemp,
          duration: Math.floor(randomRange(1, 4)),
        };
        this.activeEvents.push(evt);
        this.currentWeather.frostIntensity = intensity;
        this.currentWeather.tempMin = frostTemp;
        eventBus.emit('extreme_event', evt);
        eventBus.emit('event_log', { 
          type: 'warning', 
          message: `❄️ ${intensity > 0.6 ? '강' : '약'}서리 경보! 최저 ${frostTemp.toFixed(1)}°C (${this.consecutiveFrostDays}일 연속)`
        });
      }
    }

    // Hail
    if (rollEvent(events.hailProb[month] / 30)) {
      const intensity = randomRange(0.3, 1.0);
      const evt = {
        type: EVENT_TYPES.HAIL,
        severity: intensity,
        duration: 1,
        cropDamage: randomRange(0.10, 0.40),
      };
      this.activeEvents.push(evt);
      this.currentWeather.hailIntensity = intensity;
      this.currentWeather.type = WEATHER_TYPES.STORMY;
      eventBus.emit('extreme_event', evt);
      eventBus.emit('event_log', { 
        type: 'danger', 
        message: `🧊 우박 경보! 강도 ${(intensity * 100).toFixed(0)}%, 작물 피해 우려`
      });
    }

    // Drought
    if (rollEvent(events.droughtProb[month] / 30)) {
      const evt = {
        type: EVENT_TYPES.DROUGHT,
        severity: randomRange(0.3, 0.7),
        duration: Math.floor(randomRange(7, 30)),
      };
      this.activeEvents.push(evt);
      this.currentWeather.humidity = Math.max(15, this.currentWeather.humidity - 20);
      eventBus.emit('extreme_event', evt);
      eventBus.emit('event_log', { 
        type: 'warning', 
        message: `🏜️ 가뭄 경보! ${evt.duration}일간 강수 부족 예상`
      });
    }

    // Clean up expired events
    this.activeEvents = this.activeEvents.filter(e => {
      if (e.duration !== undefined) {
        e.duration--;
        return e.duration > 0;
      }
      return false;
    });
  }

  getCurrentWeather() {
    return { ...this.currentWeather };
  }

  getActiveEvents() {
    return [...this.activeEvents];
  }
}

export default WeatherEngine;
