// Math utilities for simulation calculations

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

export function inverseLerp(a, b, value) {
  if (a === b) return 0;
  return clamp((value - a) / (b - a), 0, 1);
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

// Gaussian random (Box-Muller transform)
export function randomGaussian(mean = 0, stddev = 1) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stddev + mean;
}

// GDD (Growing Degree Days) calculation
export function calculateGDD(tmax, tmin, tbase, tceil = 40) {
  const tavg = (Math.min(tmax, tceil) + Math.max(tmin, tbase)) / 2;
  return Math.max(0, tavg - tbase);
}

// Trapezoidal temperature stress function
export function temperatureStress(temp, tmin, topt_low, topt_high, tmax) {
  if (temp <= tmin || temp >= tmax) return 0;
  if (temp >= topt_low && temp <= topt_high) return 1;
  if (temp < topt_low) return (temp - tmin) / (topt_low - tmin);
  return (tmax - temp) / (tmax - topt_high);
}

// Water stress coefficient (FAO approach)
export function waterStress(soilMoisture, wiltingPoint, fieldCapacity) {
  if (soilMoisture <= wiltingPoint) return 0;
  if (soilMoisture >= fieldCapacity) return 1;
  return (soilMoisture - wiltingPoint) / (fieldCapacity - wiltingPoint);
}

// Light interception (Beer-Lambert law)
export function lightInterception(LAI, k = 0.5) {
  return 1 - Math.exp(-k * LAI);
}

// Format number with commas
export function formatNumber(num) {
  return Math.round(num).toLocaleString('ko-KR');
}

// Format currency
export function formatCurrency(num) {
  if (num >= 100000000) return `₩${(num / 100000000).toFixed(1)}억`;
  if (num >= 10000) return `₩${(num / 10000).toFixed(0)}만`;
  return `₩${formatNumber(num)}`;
}

// Day of year
export function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Random event based on probability
export function rollEvent(probability) {
  return Math.random() < probability;
}
