// TimeManager - 게임 시간 관리, 배속 제어, 일출/일몰 계산
import { eventBus } from '../utils/EventBus.js';
import { GAME_START_DATE } from '../utils/Constants.js';

export class TimeManager {
  static SPEEDS = { PAUSE: 0, NORMAL: 1, FAST: 6, FASTER: 24, FASTEST: 168, ULTRA: 720 };

  constructor() {
    this.startDate = new Date(GAME_START_DATE);
    this.gameDate = new Date(this.startDate);
    this.speed = 1;
    this.totalGameHours = 0;
    this.isPaused = false;
    this.lastRealTime = performance.now();
    this.accumulatedDelta = 0;
    this.lastHourEmitted = -1;
    this.latitude = 36.5; // Default: central Korea
  }

  setStartMonth(month) {
    // month: 1-12
    this.startDate = new Date(2026, month - 1, 1);
    this.gameDate = new Date(this.startDate);
    this.totalGameHours = 0;
    this.accumulatedDelta = 0;
    this.lastHourEmitted = -1;
  }

  setLatitude(lat) {
    this.latitude = lat;
  }

  setSpeed(speed) {
    this.speed = speed;
    this.isPaused = speed === 0;
    eventBus.emit('speed_changed', { speed });
  }

  update(deltaMs) {
    if (this.isPaused) return;

    const gameHoursPerRealMs = this.speed / 1000;
    const gameHoursDelta = deltaMs * gameHoursPerRealMs;

    this.totalGameHours += gameHoursDelta;
    this.accumulatedDelta += gameHoursDelta;

    // Update game date
    const totalMs = this.totalGameHours * 3600 * 1000;
    this.gameDate = new Date(this.startDate.getTime() + totalMs);

    // Emit hourly tick
    const currentHour = Math.floor(this.totalGameHours);
    if (currentHour > this.lastHourEmitted) {
      this.lastHourEmitted = currentHour;
      const state = this.getState();
      eventBus.emit('hour_tick', state);
    }

    // Day tick (for daily processing) handled by accumulated delta
    while (this.accumulatedDelta >= 1) {
      this.accumulatedDelta -= 1;
    }
  }

  /**
   * Calculate sunrise/sunset times based on latitude and day of year.
   * Uses simplified astronomical equation.
   * @returns {{ sunrise: number, sunset: number, dayLength: number }}
   *          sunrise/sunset in decimal hours (e.g. 6.5 = 6:30 AM)
   */
  getSunTimes(dayOfYear) {
    const lat = this.latitude;
    const latRad = lat * Math.PI / 180;

    // Solar declination (simplified Spencer equation)
    const dayAngle = 2 * Math.PI * (dayOfYear - 1) / 365;
    const declination = 0.006918 - 0.399912 * Math.cos(dayAngle) +
      0.070257 * Math.sin(dayAngle) - 0.006758 * Math.cos(2 * dayAngle) +
      0.000907 * Math.sin(2 * dayAngle);

    // Hour angle at sunrise/sunset
    const cosHourAngle = -Math.tan(latRad) * Math.tan(declination);
    const clampedCos = Math.max(-1, Math.min(1, cosHourAngle));
    const hourAngle = Math.acos(clampedCos);

    // Convert to hours
    const dayLength = (2 * hourAngle * 180 / Math.PI) / 15; // hours
    const solarNoon = 12; // simplified, could add longitude correction
    const sunrise = solarNoon - dayLength / 2;
    const sunset = solarNoon + dayLength / 2;

    return {
      sunrise: Math.max(3, sunrise),
      sunset: Math.min(21, sunset),
      dayLength,
    };
  }

  /**
   * Get a daylight brightness factor for the current time.
   * Returns 0.0 (full dark) to 1.0 (full daylight).
   * Includes smooth dawn/dusk transitions.
   */
  getDaylightFactor() {
    const hour = this.gameDate.getHours() + this.gameDate.getMinutes() / 60;
    const doy = this.getDayOfYear();
    const sun = this.getSunTimes(doy);

    const dawnStart = sun.sunrise - 0.5; // 30 min before sunrise
    const dawnEnd = sun.sunrise + 0.5;   // 30 min after sunrise
    const duskStart = sun.sunset - 0.5;
    const duskEnd = sun.sunset + 0.5;

    if (hour < dawnStart || hour > duskEnd) {
      return 0.05; // Night (not pure 0 for ambient)
    } else if (hour < dawnEnd) {
      // Dawn transition
      const t = (hour - dawnStart) / (dawnEnd - dawnStart);
      return 0.05 + 0.95 * this.smoothstep(t);
    } else if (hour > duskStart) {
      // Dusk transition
      const t = (hour - duskStart) / (duskEnd - duskStart);
      return 1.0 - 0.95 * this.smoothstep(t);
    } else {
      return 1.0; // Full daylight
    }
  }

  /**
   * Get time-of-day phase for sky color calculation.
   * @returns {'night' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk'}
   */
  getTimeOfDayPhase() {
    const hour = this.gameDate.getHours() + this.gameDate.getMinutes() / 60;
    const doy = this.getDayOfYear();
    const sun = this.getSunTimes(doy);

    if (hour < sun.sunrise - 0.5) return 'night';
    if (hour < sun.sunrise + 0.5) return 'dawn';
    if (hour < 10) return 'morning';
    if (hour < 14) return 'noon';
    if (hour < sun.sunset - 0.5) return 'afternoon';
    if (hour < sun.sunset + 0.5) return 'dusk';
    return 'night';
  }

  smoothstep(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  getState() {
    const doy = this.getDayOfYear();
    const sunTimes = this.getSunTimes(doy);
    return {
      date: new Date(this.gameDate),
      year: this.gameDate.getFullYear(),
      month: this.gameDate.getMonth(),
      day: this.gameDate.getDate(),
      hour: this.gameDate.getHours(),
      minute: this.gameDate.getMinutes(),
      dayOfYear: doy,
      totalHours: this.totalGameHours,
      totalDays: this.totalGameHours / 24,
      speed: this.speed,
      daylightFactor: this.getDaylightFactor(),
      timePhase: this.getTimeOfDayPhase(),
      sunrise: sunTimes.sunrise,
      sunset: sunTimes.sunset,
      dayLength: sunTimes.dayLength,
    };
  }

  getDayOfYear() {
    const start = new Date(this.gameDate.getFullYear(), 0, 0);
    const diff = this.gameDate - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  getMonth() { return this.gameDate.getMonth(); }

  getFormattedDate() {
    const y = this.gameDate.getFullYear();
    const m = this.gameDate.getMonth() + 1;
    const d = this.gameDate.getDate();
    return `${y}년 ${m}월 ${d}일`;
  }

  getFormattedTime() {
    const h = String(this.gameDate.getHours()).padStart(2, '0');
    const m = String(this.gameDate.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

export default TimeManager;
