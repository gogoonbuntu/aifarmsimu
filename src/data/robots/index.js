// Robot & Drone Data Registry - AI 농업 장비 6종
import { Registry } from '../../utils/Registry.js';

export const robotRegistry = new Registry('robots');

robotRegistry.register('scout_drone', {
  name: { ko: '스카우트 드론', en: 'Scout Drone' },
  type: 'drone',
  icon: '🛸',
  description: 'AI 기반 작물 상태 모니터링 및 병해충 조기 탐지 드론. NDVI/RGB 카메라 탑재.',
  specs: {
    coverageRate: 10,        // ha/hr
    batteryLife: 30,         // minutes
    chargeTime: 60,          // minutes
    maxWindSpeed: 12,        // m/s 운용 한계 풍속
  },
  effects: {
    diseaseDetection: 0.85,  // 병해충 발견 확률 향상
    monitoringAccuracy: 0.9, // 작물 상태 파악 정확도
  },
  cost: 5000000,             // ₩500만
  maintenanceCost: 50000,    // ₩5만/월
});

robotRegistry.register('spray_drone', {
  name: { ko: '방제 드론', en: 'Spray Drone' },
  type: 'drone',
  icon: '🚁',
  description: 'DJI Agras 모델 기반 정밀 농약/비료 살포 드론. 16L 탱크, AI 경로 최적화.',
  specs: {
    coverageRate: 5,
    batteryLife: 20,
    chargeTime: 45,
    tankCapacity: 16,        // L
    sprayWidth: 6,           // m
    maxWindSpeed: 8,
  },
  effects: {
    pesticideEfficiency: 0.95,  // 농약 효율 (무인 대비)
    chemicalReduction: 0.40,    // 화학약품 사용량 절감률
    uniformity: 0.92,           // 살포 균일도
  },
  cost: 20000000,
  maintenanceCost: 200000,
});

robotRegistry.register('weeding_robot', {
  name: { ko: '제초 로봇', en: 'Weeding Robot' },
  type: 'ground_robot',
  icon: '🤖',
  description: 'AI 컴퓨터 비전 기반 잡초 인식 & 정밀 제거 로봇. 토양 경운 기능 포함.',
  specs: {
    coverageRate: 0.04,      // ha/hr (= 1ha/day)
    batteryLife: 480,        // minutes (8hr)
    chargeTime: 120,
    speed: 0.5,              // km/h
  },
  effects: {
    weedRemoval: 0.92,
    herbicideReduction: 0.97,
    soilCompaction: 0.1,     // 토양 다짐 영향 (낮을수록 좋음)
  },
  cost: 30000000,
  maintenanceCost: 300000,
});

robotRegistry.register('harvest_robot', {
  name: { ko: '수확 로봇', en: 'Harvest Robot' },
  type: 'ground_robot',
  icon: '🦾',
  description: 'AI 과실 성숙도 판별 & 비파괴 자동 수확 로봇. 딸기·토마토·사과 등 과일류 특화.',
  specs: {
    coverageRate: 0.02,      // ha/hr
    batteryLife: 360,        // 6hr
    chargeTime: 120,
    harvestSpeed: 800,       // 개/hr
    damageRate: 0.02,        // 손상률 2%
  },
  effects: {
    harvestAccuracy: 0.95,
    qualityPreservation: 0.98,
    laborReduction: 0.80,
  },
  cost: 50000000,
  maintenanceCost: 500000,
});

robotRegistry.register('irrigation_system', {
  name: { ko: '스마트 관수 시스템', en: 'Smart Irrigation' },
  type: 'fixed_system',
  icon: '💧',
  description: 'IoT 토양 수분 센서 기반 자동 점적/스프링클러 관수 시스템. 실시간 수분 모니터링.',
  specs: {
    coverageArea: 10000,     // m² (1ha)
    waterEfficiency: 0.92,
    sensors: ['soil_moisture', 'ec', 'temperature'],
    irrigationTypes: ['drip', 'sprinkler', 'flooding'],
  },
  effects: {
    waterSaving: 0.35,       // 용수 절감률
    uniformity: 0.95,
    autoPrecision: 0.90,     // 자동 관수 정밀도
  },
  cost: 10000000,            // per ha
  maintenanceCost: 100000,
});

robotRegistry.register('climate_controller', {
  name: { ko: '환경 제어기', en: 'Climate Controller' },
  type: 'fixed_system',
  icon: '🌡️',
  description: '온실 내 온습도/CO2/환기 자동 제어 시스템. AI 기반 최적 환경 유지.',
  specs: {
    sensors: ['temperature', 'humidity', 'co2', 'light', 'wind'],
    controls: ['heating', 'cooling', 'ventilation', 'co2_injection', 'shade_screen'],
    responseTime: 5,         // minutes
  },
  effects: {
    tempControl: 0.95,       // 온도 제어 정밀도
    humidityControl: 0.90,
    energySaving: 0.25,
    yieldBoost: 0.15,        // 수율 향상
  },
  cost: 20000000,
  maintenanceCost: 300000,
  requiresFacility: true,    // 온실 필수
});

export default robotRegistry;
