// Facility Data Registry - 시설 유형 4종
import { Registry } from '../../utils/Registry.js';

export const facilityRegistry = new Registry('facilities');

facilityRegistry.register('open_field', {
  name: { ko: '노지', en: 'Open Field' },
  icon: '🌿',
  type: 'none',
  description: '시설 없이 야외에서 직접 재배. 기후 영향을 직접 받음.',
  effects: {
    tempModifier: 0,
    rainProtection: 0,
    windProtection: 0,
    frostProtection: 0,
    typhoonProtection: 0,
    lightTransmission: 1.0,
  },
  cost: 0,
  maintenanceCost: 0,
  durability: Infinity,
  areaM2: 0,
});

facilityRegistry.register('vinyl_single', {
  name: { ko: '단동 비닐하우스', en: 'Single-span Vinyl House' },
  icon: '🏠',
  type: 'greenhouse',
  description: '가장 보편적인 비닐하우스. 초기비용 저렴, 소규모 채소·딸기 재배에 적합.',
  effects: {
    tempModifier: 6,           // °C 상승
    tempMinBoost: 5,           // 최저 온도 +5°C
    rainProtection: 0.85,      // 85% 빗물 차단
    windProtection: 0.60,
    frostProtection: 0.70,
    typhoonProtection: 0.35,
    lightTransmission: 0.85,
    humidityIncrease: 10,      // +10% 습도
  },
  cost: 8000000,               // ₩800만/동(300평≈1,000m²)
  maintenanceCost: 500000,     // ₩50만/년
  durability: 4,               // 년
  areaM2: 1000,
  vinylReplacementCost: 2000000,
});

facilityRegistry.register('vinyl_multi', {
  name: { ko: '연동 비닐하우스', en: 'Multi-span Vinyl House' },
  icon: '🏗️',
  type: 'greenhouse',
  description: '여러 동을 연결한 대형 비닐하우스. 규모화 재배, 환경 제어 용이.',
  effects: {
    tempModifier: 10,
    tempMinBoost: 8,
    rainProtection: 0.92,
    windProtection: 0.75,
    frostProtection: 0.85,
    typhoonProtection: 0.55,
    lightTransmission: 0.82,
    humidityIncrease: 15,
  },
  cost: 30000000,
  maintenanceCost: 1500000,
  durability: 7,
  areaM2: 1650,               // 500평≈1,650m²
});

facilityRegistry.register('glass_venlo', {
  name: { ko: '벤로형 유리온실', en: 'Venlo Glass Greenhouse' },
  icon: '🏛️',
  type: 'greenhouse',
  description: '네덜란드식 고급 유리온실. 완전 환경제어, 스마트팜 최적. 고부가가치 작물용.',
  effects: {
    tempModifier: 15,
    tempMinBoost: 15,
    rainProtection: 0.99,
    windProtection: 0.95,
    frostProtection: 0.98,
    typhoonProtection: 0.85,
    lightTransmission: 0.90,
    humidityIncrease: 5,
    co2Control: true,
  },
  cost: 200000000,             // ₩2억/동(1,000평≈3,300m²)
  maintenanceCost: 5000000,
  durability: 18,
  areaM2: 3300,
});

export default facilityRegistry;
