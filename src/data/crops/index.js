// Crop Data Registry - 한국 주요 농작물 10종
// Based on: DSSAT (CERES/CROPGRO), 농촌진흥청 농사로, FAO AquaCrop, 통계청
import { Registry } from '../../utils/Registry.js';
import { GROWTH_STAGES as GS } from '../../utils/Constants.js';

export const cropRegistry = new Registry('crops');

// ===== 1. 벼 (Rice) =====
cropRegistry.register('rice', {
  name: { ko: '벼', en: 'Rice' },
  category: 'grain',
  icon: '🌾',
  phenology: {
    stages: [
      { id: GS.GERMINATION, name: { ko: '발아기', en: 'Germination' }, gddRequired: 80, duration: { min: 5, max: 10 } },
      { id: GS.SEEDLING, name: { ko: '유묘기', en: 'Seedling' }, gddRequired: 250, duration: { min: 15, max: 25 } },
      { id: GS.VEGETATIVE, name: { ko: '분얼기', en: 'Tillering' }, gddRequired: 800, duration: { min: 30, max: 45 } },
      { id: GS.FLOWERING, name: { ko: '출수기', en: 'Heading' }, gddRequired: 400, duration: { min: 10, max: 15 } },
      { id: GS.RIPENING, name: { ko: '등숙기', en: 'Grain Filling' }, gddRequired: 600, duration: { min: 30, max: 45 } },
      { id: GS.HARVEST_READY, name: { ko: '수확적기', en: 'Harvest Ready' }, gddRequired: 0, duration: { min: 7, max: 14 } },
    ],
    totalGDD: 2800,
    baseTemp: 9, // DSSAT CERES-Rice standard
  },
  requirements: {
    temperature: { min: 15, max: 40, optimal: { day: 28, night: 22 }, lethal: { cold: 5, heat: 42 } },
    water: {
      totalMm: { min: 800, max: 1200 },
      criticalStages: [GS.FLOWERING, GS.RIPENING],
      droughtTolerance: 0.2,
      waterlogTolerance: 0.9,
      needsFlooding: true,
    },
    light: { photoperiod: 'short_day', minSunHours: 5, optimalDLI: 25, shadeTolerance: 0.3 },
    nutrients: { N: 120, P: 45, K: 60, sensitivity: 'high' },
    soil: { preferredTypes: ['paddy_gley', 'loam_alluvial', 'clay_loam'], phRange: { min: 5.0, max: 7.0 }, drainagePreference: 'poor' },
  },
  yield: { potential: 600, average: 514, harvestIndex: 0.45 }, // 통계청 2024: 514kg/10a
  quality: { protein: { min: 5.5, max: 8.0, optimalLow: 6.0 }, amylose: { min: 17, max: 23 } },
  rueValue: 1.4, // Kiniry et al. 2001, C3 grass
  nutrientAbsorption: { N: 0.012, P: 0.003, K: 0.015 },
  fertilizerRatio: { N: 10, P: 4, K: 5 }, // 농진청: 벼 N 9-15, P₂O₅ 4-5, K₂O 5-7 kg/10a
  diseases: [
    { id: 'blast', name: '도열병', trigger: { tempMin: 20, tempMax: 28, humidityMin: 85 }, damageRate: 0.04, stages: ['vegetative', 'flowering'] },
    { id: 'sheath_blight', name: '문고병', trigger: { tempMin: 25, tempMax: 32, humidityMin: 80 }, damageRate: 0.03, stages: ['vegetative', 'flowering', 'ripening'] },
  ],
  sensitivity: { drought: 0.85, flood: 0.1, heat: 0.6, cold: 0.7, wind: 0.5, disease: 0.6 },
  calendar: {
    central_inland: { sowingMonth: [4, 5], transplantMonth: [5, 6], harvestMonth: [9, 10] },
    south_inland: { sowingMonth: [4, 5], transplantMonth: [5, 6], harvestMonth: [9, 10] },
    south_coastal: { sowingMonth: [4], transplantMonth: [5, 6], harvestMonth: [9, 10] },
    jeju: { sowingMonth: [4], transplantMonth: [5], harvestMonth: [9, 10] },
  },
  visualization: {
    maxHeight: 1.0,
    color: { young: '#7CCD7C', mature: '#9ACD32', ripe: '#DAA520' },
  },
});

// ===== 2. 대파 (Green Onion) =====
cropRegistry.register('green_onion', {
  name: { ko: '대파', en: 'Green Onion' },
  category: 'vegetable',
  icon: '🧅',
  phenology: {
    stages: [
      { id: GS.GERMINATION, name: { ko: '발아기', en: 'Germination' }, gddRequired: 60, duration: { min: 7, max: 14 } },
      { id: GS.SEEDLING, name: { ko: '유묘기', en: 'Seedling' }, gddRequired: 200, duration: { min: 20, max: 30 } },
      { id: GS.VEGETATIVE, name: { ko: '엽초생장기', en: 'Leaf Growth' }, gddRequired: 1200, duration: { min: 60, max: 100 } },
      { id: GS.RIPENING, name: { ko: '비대기', en: 'Thickening' }, gddRequired: 400, duration: { min: 30, max: 50 } },
      { id: GS.HARVEST_READY, name: { ko: '수확적기', en: 'Harvest Ready' }, gddRequired: 0, duration: { min: 14, max: 30 } },
    ],
    totalGDD: 2100,
    baseTemp: 4,
  },
  requirements: {
    temperature: { min: 5, max: 35, optimal: { day: 18, night: 12 }, lethal: { cold: -5, heat: 38 } },
    water: {
      totalMm: { min: 500, max: 700 },
      criticalStages: [GS.VEGETATIVE],
      droughtTolerance: 0.4,
      waterlogTolerance: 0.3,
    },
    light: { photoperiod: 'long_day', minSunHours: 5, optimalDLI: 18, shadeTolerance: 0.4 },
    nutrients: { N: 230, P: 55, K: 80, sensitivity: 'high' },
    soil: { preferredTypes: ['sandy_loam', 'loam_alluvial', 'clay_loam'], phRange: { min: 6.0, max: 7.0 }, drainagePreference: 'good' },
  },
  yield: { potential: 5000, average: 4000, harvestIndex: 0.65 }, // 통계청 기준 하향
  quality: { whitePart: { min: 20, max: 45, unit: 'cm' } },
  rueValue: 1.8, // Allium crops
  nutrientAbsorption: { N: 0.030, P: 0.004, K: 0.025 },
  fertilizerRatio: { N: 12, P: 4, K: 6 }, // 농진청: 대파 N 중심 재배
  diseases: [
    { id: 'downy_mildew', name: '노균병', trigger: { tempMin: 10, tempMax: 22, humidityMin: 85 }, damageRate: 0.03, stages: ['vegetative'] },
    { id: 'purple_blotch', name: '자반병', trigger: { tempMin: 20, tempMax: 30, humidityMin: 80 }, damageRate: 0.025, stages: ['vegetative', 'ripening'] },
  ],
  sensitivity: { drought: 0.5, flood: 0.7, heat: 0.6, cold: 0.4, wind: 0.6, disease: 0.5 },
  calendar: {
    central_inland: { sowingMonth: [3, 4, 9], transplantMonth: [5, 6, 10], harvestMonth: [9, 10, 11, 3, 4] },
    south_inland: { sowingMonth: [3, 4, 9], transplantMonth: [5, 6, 10], harvestMonth: [9, 10, 11, 3, 4] },
  },
  visualization: {
    maxHeight: 0.6,
    color: { young: '#90EE90', mature: '#228B22', ripe: '#228B22' },
  },
});

// ===== 3. 포도 (Grape) =====
cropRegistry.register('grape', {
  name: { ko: '포도', en: 'Grape' },
  category: 'fruit',
  icon: '🍇',
  phenology: {
    stages: [
      { id: GS.GERMINATION, name: { ko: '발아기', en: 'Bud Break' }, gddRequired: 100, duration: { min: 10, max: 20 } },
      { id: GS.VEGETATIVE, name: { ko: '신초생장기', en: 'Shoot Growth' }, gddRequired: 400, duration: { min: 30, max: 45 } },
      { id: GS.FLOWERING, name: { ko: '개화기', en: 'Flowering' }, gddRequired: 200, duration: { min: 10, max: 15 } },
      { id: GS.FRUITING, name: { ko: '과실비대기', en: 'Berry Growth' }, gddRequired: 500, duration: { min: 40, max: 60 } },
      { id: GS.RIPENING, name: { ko: '착색성숙기', en: 'Veraison & Ripening' }, gddRequired: 400, duration: { min: 30, max: 45 } },
      { id: GS.HARVEST_READY, name: { ko: '수확적기', en: 'Harvest Ready' }, gddRequired: 0, duration: { min: 7, max: 21 } },
    ],
    totalGDD: 1800,
    baseTemp: 10,
  },
  requirements: {
    temperature: { min: -15, max: 38, optimal: { day: 25, night: 15 }, lethal: { cold: -20, heat: 42 } },
    water: {
      totalMm: { min: 600, max: 800 },
      criticalStages: [GS.FLOWERING, GS.FRUITING],
      droughtTolerance: 0.5,
      waterlogTolerance: 0.2,
    },
    light: { photoperiod: 'day_neutral', minSunHours: 7, optimalDLI: 30, shadeTolerance: 0.2 },
    nutrients: { N: 80, P: 40, K: 100, sensitivity: 'medium' },
    soil: { preferredTypes: ['sandy_loam', 'loam_alluvial'], phRange: { min: 5.5, max: 7.0 }, drainagePreference: 'very_good' },
  },
  yield: { potential: 2000, average: 1500, harvestIndex: 0.40 }, // 통계 기준 하향
  quality: {
    brix: { min: 12, max: 22, optimal: 18 },
    size: { min: 3, max: 12, unit: 'g/berry' },
  },
  rueValue: 1.5, // Vitis vinifera, perennial
  nutrientAbsorption: { N: 0.018, P: 0.003, K: 0.022 },
  fertilizerRatio: { N: 5, P: 3, K: 8 }, // 농진청: 포도 K₂O 비중 높음
  diseases: [
    { id: 'gray_mold', name: '잿빛곰팡이병', trigger: { tempMin: 15, tempMax: 25, humidityMin: 85 }, damageRate: 0.05, stages: ['flowering', 'fruiting', 'ripening'] },
    { id: 'powdery_mildew_grape', name: '포도 흰가루병', trigger: { tempMin: 20, tempMax: 30, humidityMin: 60 }, damageRate: 0.03, stages: ['vegetative', 'flowering', 'fruiting'] },
  ],
  sensitivity: { drought: 0.4, flood: 0.8, heat: 0.5, cold: 0.6, wind: 0.7, disease: 0.7 },
  calendar: {
    central_inland: { sowingMonth: [3], harvestMonth: [9, 10] },
    south_inland: { sowingMonth: [3], harvestMonth: [8, 9, 10] },
  },
  visualization: {
    maxHeight: 2.0,
    isPerennial: true,
    color: { young: '#90EE90', mature: '#2E8B57', ripe: '#4B0082' },
  },
});

// ===== 4. 사과 (Apple) =====
cropRegistry.register('apple', {
  name: { ko: '사과', en: 'Apple' },
  category: 'fruit',
  icon: '🍎',
  phenology: {
    stages: [
      { id: GS.GERMINATION, name: { ko: '발아기', en: 'Bud Break' }, gddRequired: 120, duration: { min: 10, max: 20 } },
      { id: GS.VEGETATIVE, name: { ko: '엽신장기', en: 'Leaf Expansion' }, gddRequired: 300, duration: { min: 20, max: 35 } },
      { id: GS.FLOWERING, name: { ko: '개화기', en: 'Bloom' }, gddRequired: 150, duration: { min: 7, max: 14 } },
      { id: GS.FRUITING, name: { ko: '과실비대기', en: 'Fruit Growth' }, gddRequired: 800, duration: { min: 60, max: 90 } },
      { id: GS.RIPENING, name: { ko: '착색성숙기', en: 'Color & Ripening' }, gddRequired: 500, duration: { min: 30, max: 50 } },
      { id: GS.HARVEST_READY, name: { ko: '수확적기', en: 'Harvest Ready' }, gddRequired: 0, duration: { min: 14, max: 30 } },
    ],
    totalGDD: 2000,
    baseTemp: 7,
    chillHoursRequired: 1000,
  },
  requirements: {
    temperature: { min: -25, max: 35, optimal: { day: 22, night: 13 }, lethal: { cold: -30, heat: 40 } },
    water: {
      totalMm: { min: 500, max: 700 },
      criticalStages: [GS.FRUITING],
      droughtTolerance: 0.5,
      waterlogTolerance: 0.3,
    },
    light: { photoperiod: 'day_neutral', minSunHours: 6, optimalDLI: 28, shadeTolerance: 0.2 },
    nutrients: { N: 100, P: 35, K: 80, sensitivity: 'medium' },
    soil: { preferredTypes: ['loam_alluvial', 'sandy_loam', 'mountain_brown'], phRange: { min: 5.5, max: 6.5 }, drainagePreference: 'good' },
  },
  yield: { potential: 2800, average: 2200, harvestIndex: 0.35 }, // 통계 기준 하향
  quality: {
    brix: { min: 11, max: 17, optimal: 15 },
    size: { min: 200, max: 400, unit: 'g' },
    colorRatio: { min: 0.5, max: 0.95 },
  },
  rueValue: 1.6, // Malus domestica, perennial
  nutrientAbsorption: { N: 0.015, P: 0.003, K: 0.018 },
  fertilizerRatio: { N: 6, P: 4, K: 6 }, // 농진청: 사과 균형 시비
  diseases: [
    { id: 'fire_blight', name: '화상병', trigger: { tempMin: 18, tempMax: 28, humidityMin: 70 }, damageRate: 0.06, stages: ['flowering', 'fruiting'] },
    { id: 'apple_scab', name: '사과 검은별무늬병', trigger: { tempMin: 10, tempMax: 25, humidityMin: 80 }, damageRate: 0.04, stages: ['vegetative', 'flowering', 'fruiting'] },
  ],
  sensitivity: { drought: 0.4, flood: 0.7, heat: 0.5, cold: 0.3, wind: 0.6, disease: 0.6 },
  calendar: {
    central_inland: { sowingMonth: [3], harvestMonth: [9, 10, 11] },
    highland: { sowingMonth: [3], harvestMonth: [10, 11] },
  },
  visualization: {
    maxHeight: 3.5,
    isPerennial: true,
    color: { young: '#90EE90', mature: '#228B22', ripe: '#FF0000' },
  },
});

// ===== 5. 딸기 (Strawberry) =====
cropRegistry.register('strawberry', {
  name: { ko: '딸기', en: 'Strawberry' },
  category: 'fruit',
  icon: '🍓',
  phenology: {
    stages: [
      { id: GS.GERMINATION, name: { ko: '활착기', en: 'Establishment' }, gddRequired: 50, duration: { min: 7, max: 14 } },
      { id: GS.VEGETATIVE, name: { ko: '영양생장기', en: 'Vegetative' }, gddRequired: 200, duration: { min: 30, max: 50 } },
      { id: GS.FLOWERING, name: { ko: '개화기', en: 'Flowering' }, gddRequired: 150, duration: { min: 14, max: 21 } },
      { id: GS.FRUITING, name: { ko: '과실비대기', en: 'Fruit Dev' }, gddRequired: 200, duration: { min: 14, max: 25 } },
      { id: GS.RIPENING, name: { ko: '착색기', en: 'Coloring' }, gddRequired: 100, duration: { min: 7, max: 14 } },
      { id: GS.HARVEST_READY, name: { ko: '수확적기', en: 'Harvest Ready' }, gddRequired: 0, duration: { min: 60, max: 120 } },
    ],
    totalGDD: 1000,
    baseTemp: 5,
  },
  requirements: {
    temperature: { min: -2, max: 30, optimal: { day: 18, night: 8 }, lethal: { cold: -10, heat: 35 } },
    water: {
      totalMm: { min: 300, max: 500 },
      criticalStages: [GS.FLOWERING, GS.FRUITING],
      droughtTolerance: 0.3,
      waterlogTolerance: 0.2,
    },
    light: { photoperiod: 'short_day', minSunHours: 5, optimalDLI: 20, shadeTolerance: 0.3 },
    nutrients: { N: 80, P: 50, K: 100, sensitivity: 'high' },
    soil: { preferredTypes: ['loam_alluvial', 'sandy_loam'], phRange: { min: 5.5, max: 6.5 }, drainagePreference: 'good' },
    facilityRequired: true,
  },
  yield: { potential: 4500, average: 3500, harvestIndex: 0.55 }, // 통계 기준
  quality: {
    brix: { min: 8, max: 16, optimal: 12 },
    size: { min: 15, max: 40, unit: 'g' },
  },
  rueValue: 1.7, // Fragaria × ananassa
  fertilizerRatio: { N: 8, P: 5, K: 10 }, // 농진청: 딸기 K 비중 높음 (과실 비대)
  diseases: [
    { id: 'powdery_mildew', name: '흰가루병', trigger: { tempMin: 15, tempMax: 28, humidityMin: 50 }, damageRate: 0.04, stages: ['vegetative', 'flowering', 'fruiting'] },
    { id: 'gray_mold_straw', name: '잿빛곰팡이병', trigger: { tempMin: 15, tempMax: 25, humidityMin: 85 }, damageRate: 0.05, stages: ['flowering', 'fruiting', 'ripening'] },
  ],
  sensitivity: { drought: 0.6, flood: 0.8, heat: 0.8, cold: 0.5, wind: 0.3, disease: 0.8 },
  calendar: {
    central_inland: { transplantMonth: [9], harvestMonth: [12, 1, 2, 3, 4, 5] },
    south_inland: { transplantMonth: [9], harvestMonth: [11, 12, 1, 2, 3, 4, 5] },
  },
  visualization: {
    maxHeight: 0.3,
    color: { young: '#90EE90', mature: '#228B22', ripe: '#FF4444' },
  },
});

// ===== 6. 배추 (Napa Cabbage) =====
cropRegistry.register('napa_cabbage', {
  name: { ko: '배추', en: 'Napa Cabbage' },
  category: 'vegetable',
  icon: '🥬',
  phenology: {
    stages: [
      { id: GS.GERMINATION, name: { ko: '발아기', en: 'Germination' }, gddRequired: 60, duration: { min: 3, max: 7 } },
      { id: GS.SEEDLING, name: { ko: '유묘기', en: 'Seedling' }, gddRequired: 150, duration: { min: 10, max: 18 } },
      { id: GS.VEGETATIVE, name: { ko: '외엽생장기', en: 'Outer Leaf' }, gddRequired: 400, duration: { min: 20, max: 30 } },
      { id: GS.RIPENING, name: { ko: '결구기', en: 'Head Formation' }, gddRequired: 500, duration: { min: 25, max: 40 } },
      { id: GS.HARVEST_READY, name: { ko: '수확적기', en: 'Harvest Ready' }, gddRequired: 0, duration: { min: 7, max: 14 } },
    ],
    totalGDD: 1400,
    baseTemp: 4,
  },
  requirements: {
    temperature: { min: 0, max: 30, optimal: { day: 18, night: 10 }, lethal: { cold: -8, heat: 35 } },
    water: {
      totalMm: { min: 400, max: 600 },
      criticalStages: [GS.RIPENING],
      droughtTolerance: 0.3,
      waterlogTolerance: 0.3,
    },
    light: { photoperiod: 'long_day', minSunHours: 5, optimalDLI: 18, shadeTolerance: 0.4 },
    nutrients: { N: 200, P: 50, K: 100, sensitivity: 'high' },
    soil: { preferredTypes: ['loam_alluvial', 'clay_loam'], phRange: { min: 6.0, max: 7.0 }, drainagePreference: 'good' },
  },
  yield: { potential: 10000, average: 8000, harvestIndex: 0.75 }, // 통계 기준 하향
  quality: { weight: { min: 1.5, max: 4.0, unit: 'kg' } },
  rueValue: 2.0, // Brassica rapa
  fertilizerRatio: { N: 16, P: 4, K: 10 }, // 농진청: 배추 N 32, P₂O₅ 7.8, K₂O 19.6 kg/10a
  diseases: [
    { id: 'soft_rot', name: '무름병', trigger: { tempMin: 22, tempMax: 35, humidityMin: 80 }, damageRate: 0.06, stages: ['vegetative', 'ripening'] },
    { id: 'clubroot', name: '뿌리혹병', trigger: { tempMin: 18, tempMax: 25, humidityMin: 70 }, damageRate: 0.05, stages: ['seedling', 'vegetative', 'ripening'] },
  ],
  sensitivity: { drought: 0.6, flood: 0.7, heat: 0.8, cold: 0.4, wind: 0.5, disease: 0.7 },
  calendar: {
    central_inland: { sowingMonth: [8], transplantMonth: [8, 9], harvestMonth: [11, 12] },
    highland: { sowingMonth: [6, 7], transplantMonth: [7, 8], harvestMonth: [9, 10] },
  },
  visualization: {
    maxHeight: 0.4,
    color: { young: '#90EE90', mature: '#7CCD7C', ripe: '#556B2F' },
  },
});

// ===== 7. 고추 (Red Pepper) =====
cropRegistry.register('red_pepper', {
  name: { ko: '고추', en: 'Red Pepper' },
  category: 'vegetable',
  icon: '🌶️',
  phenology: {
    stages: [
      { id: GS.GERMINATION, name: { ko: '발아기', en: 'Germination' }, gddRequired: 100, duration: { min: 7, max: 14 } },
      { id: GS.SEEDLING, name: { ko: '유묘기', en: 'Seedling' }, gddRequired: 300, duration: { min: 30, max: 45 } },
      { id: GS.VEGETATIVE, name: { ko: '영양생장기', en: 'Vegetative' }, gddRequired: 500, duration: { min: 25, max: 40 } },
      { id: GS.FLOWERING, name: { ko: '개화착과기', en: 'Flowering' }, gddRequired: 400, duration: { min: 20, max: 35 } },
      { id: GS.RIPENING, name: { ko: '착색기', en: 'Coloring' }, gddRequired: 500, duration: { min: 25, max: 40 } },
      { id: GS.HARVEST_READY, name: { ko: '수확적기', en: 'Harvest Ready' }, gddRequired: 0, duration: { min: 14, max: 30 } },
    ],
    totalGDD: 2300,
    baseTemp: 10,
  },
  requirements: {
    temperature: { min: 10, max: 35, optimal: { day: 27, night: 18 }, lethal: { cold: 2, heat: 40 } },
    water: {
      totalMm: { min: 500, max: 700 },
      criticalStages: [GS.FLOWERING, GS.RIPENING],
      droughtTolerance: 0.35,
      waterlogTolerance: 0.25,
    },
    light: { photoperiod: 'day_neutral', minSunHours: 6, optimalDLI: 22, shadeTolerance: 0.3 },
    nutrients: { N: 150, P: 60, K: 120, sensitivity: 'high' },
    soil: { preferredTypes: ['loam_alluvial', 'sandy_loam'], phRange: { min: 6.0, max: 7.0 }, drainagePreference: 'good' },
  },
  yield: { potential: 350, average: 250, harvestIndex: 0.30 },
  quality: {
    capsaicin: { min: 0.1, max: 0.5, unit: '%' },
    color: { min: 80, max: 160, unit: 'ASTA' },
  },
  rueValue: 1.9, // Capsicum annuum
  fertilizerRatio: { N: 8, P: 5, K: 6 }, // 농진청: 고추 N 19.0, P₂O₅ 11.2, K₂O 14.9 kg/10a
  diseases: [
    { id: 'anthracnose', name: '탄저병', trigger: { tempMin: 25, tempMax: 35, humidityMin: 85 }, damageRate: 0.06, stages: ['fruiting', 'ripening'] },
    { id: 'phytophthora', name: '역병', trigger: { tempMin: 20, tempMax: 30, humidityMin: 90 }, damageRate: 0.07, stages: ['vegetative', 'flowering', 'fruiting'] },
  ],
  sensitivity: { drought: 0.6, flood: 0.8, heat: 0.5, cold: 0.9, wind: 0.7, disease: 0.8 },
  calendar: {
    central_inland: { sowingMonth: [2, 3], transplantMonth: [5], harvestMonth: [7, 8, 9, 10] },
    south_inland: { sowingMonth: [2, 3], transplantMonth: [4, 5], harvestMonth: [7, 8, 9, 10] },
  },
  visualization: {
    maxHeight: 0.8,
    color: { young: '#90EE90', mature: '#228B22', ripe: '#FF2200' },
  },
});

// ===== 8. 감자 (Potato) =====
cropRegistry.register('potato', {
  name: { ko: '감자', en: 'Potato' },
  category: 'root',
  icon: '🥔',
  phenology: {
    stages: [
      { id: GS.GERMINATION, name: { ko: '발아출현기', en: 'Emergence' }, gddRequired: 100, duration: { min: 10, max: 20 } },
      { id: GS.VEGETATIVE, name: { ko: '경엽생장기', en: 'Vegetative' }, gddRequired: 400, duration: { min: 20, max: 35 } },
      { id: GS.FLOWERING, name: { ko: '개화기', en: 'Flowering' }, gddRequired: 200, duration: { min: 10, max: 15 } },
      { id: GS.FRUITING, name: { ko: '괴경비대기', en: 'Tuber Bulking' }, gddRequired: 500, duration: { min: 30, max: 45 } },
      { id: GS.RIPENING, name: { ko: '성숙기', en: 'Maturity' }, gddRequired: 200, duration: { min: 10, max: 20 } },
      { id: GS.HARVEST_READY, name: { ko: '수확적기', en: 'Harvest Ready' }, gddRequired: 0, duration: { min: 7, max: 14 } },
    ],
    totalGDD: 1600,
    baseTemp: 4,
  },
  requirements: {
    temperature: { min: 5, max: 30, optimal: { day: 22, night: 12 }, lethal: { cold: -2, heat: 35 } },
    water: {
      totalMm: { min: 400, max: 600 },
      criticalStages: [GS.FRUITING],
      droughtTolerance: 0.4,
      waterlogTolerance: 0.3,
    },
    light: { photoperiod: 'long_day', minSunHours: 5, optimalDLI: 20, shadeTolerance: 0.4 },
    nutrients: { N: 100, P: 60, K: 120, sensitivity: 'medium' },
    soil: { preferredTypes: ['sandy_loam', 'loam_alluvial', 'mountain_brown'], phRange: { min: 5.0, max: 6.5 }, drainagePreference: 'good' },
  },
  yield: { potential: 3500, average: 2800, harvestIndex: 0.75 },
  quality: { size: { min: 50, max: 200, unit: 'g' }, starch: { min: 12, max: 20, unit: '%' } },
  rueValue: 2.3, // Solanum tuberosum
  fertilizerRatio: { N: 5, P: 5, K: 6 }, // 농진청: 감자 N 10, P₂O₅ 10, K₂O 12 kg/10a
  diseases: [
    { id: 'late_blight', name: '감자역병', trigger: { tempMin: 12, tempMax: 22, humidityMin: 85 }, damageRate: 0.07, stages: ['vegetative', 'flowering', 'fruiting'] },
    { id: 'common_scab', name: '더뎅이병', trigger: { tempMin: 18, tempMax: 28, humidityMin: 40, humidityMax: 65 }, damageRate: 0.03, stages: ['fruiting'] },
  ],
  sensitivity: { drought: 0.6, flood: 0.7, heat: 0.7, cold: 0.5, wind: 0.3, disease: 0.7 },
  calendar: {
    central_inland: { sowingMonth: [3, 4], harvestMonth: [6, 7] },
    highland: { sowingMonth: [4, 5], harvestMonth: [8, 9] },
  },
  visualization: {
    maxHeight: 0.6,
    color: { young: '#90EE90', mature: '#228B22', ripe: '#8B8B00' },
  },
});

// ===== 9. 고구마 (Sweet Potato) =====
cropRegistry.register('sweet_potato', {
  name: { ko: '고구마', en: 'Sweet Potato' },
  category: 'root',
  icon: '🍠',
  phenology: {
    stages: [
      { id: GS.GERMINATION, name: { ko: '활착기', en: 'Establishment' }, gddRequired: 80, duration: { min: 7, max: 14 } },
      { id: GS.VEGETATIVE, name: { ko: '만경생장기', en: 'Vine Growth' }, gddRequired: 600, duration: { min: 30, max: 50 } },
      { id: GS.FRUITING, name: { ko: '괴근비대기', en: 'Root Bulking' }, gddRequired: 1200, duration: { min: 50, max: 70 } },
      { id: GS.RIPENING, name: { ko: '성숙기', en: 'Maturity' }, gddRequired: 400, duration: { min: 20, max: 30 } },
      { id: GS.HARVEST_READY, name: { ko: '수확적기', en: 'Harvest Ready' }, gddRequired: 0, duration: { min: 7, max: 14 } },
    ],
    totalGDD: 3200,
    baseTemp: 15,
  },
  requirements: {
    temperature: { min: 15, max: 38, optimal: { day: 28, night: 22 }, lethal: { cold: 5, heat: 42 } },
    water: {
      totalMm: { min: 500, max: 700 },
      criticalStages: [GS.FRUITING],
      droughtTolerance: 0.6,
      waterlogTolerance: 0.2,
    },
    light: { photoperiod: 'short_day', minSunHours: 6, optimalDLI: 25, shadeTolerance: 0.3 },
    nutrients: { N: 60, P: 40, K: 150, sensitivity: 'medium' },
    soil: { preferredTypes: ['sandy_loam', 'loam_alluvial'], phRange: { min: 5.5, max: 6.5 }, drainagePreference: 'very_good' },
  },
  yield: { potential: 2600, average: 2100, harvestIndex: 0.60 }, // 통계 기준
  quality: {
    brix: { min: 10, max: 28, optimal: 22 },
    size: { min: 100, max: 500, unit: 'g' },
  },
  rueValue: 2.2, // Ipomoea batatas
  fertilizerRatio: { N: 3, P: 5, K: 12 }, // 농진청: 고구마 N 低, K₂O 高 (괴근 비대)
  diseases: [
    { id: 'root_rot', name: '덩굴쪼김병', trigger: { tempMin: 22, tempMax: 32, humidityMin: 75 }, damageRate: 0.05, stages: ['vegetative', 'fruiting'] },
    { id: 'black_rot', name: '검은무늬병', trigger: { tempMin: 18, tempMax: 28, humidityMin: 70 }, damageRate: 0.04, stages: ['fruiting', 'ripening'] },
  ],
  sensitivity: { drought: 0.3, flood: 0.8, heat: 0.2, cold: 0.9, wind: 0.3, disease: 0.5 },
  calendar: {
    central_inland: { transplantMonth: [5, 6], harvestMonth: [9, 10] },
    south_inland: { transplantMonth: [4, 5, 6], harvestMonth: [9, 10] },
    south_coastal: { transplantMonth: [4, 5], harvestMonth: [9, 10] },
  },
  visualization: {
    maxHeight: 0.4,
    color: { young: '#90EE90', mature: '#228B22', ripe: '#8B6914' },
  },
});

// ===== 10. 토마토 (Tomato) =====
cropRegistry.register('tomato', {
  name: { ko: '토마토', en: 'Tomato' },
  category: 'vegetable',
  icon: '🍅',
  phenology: {
    stages: [
      { id: GS.GERMINATION, name: { ko: '발아기', en: 'Germination' }, gddRequired: 70, duration: { min: 5, max: 10 } },
      { id: GS.SEEDLING, name: { ko: '유묘기', en: 'Seedling' }, gddRequired: 200, duration: { min: 15, max: 25 } },
      { id: GS.VEGETATIVE, name: { ko: '영양생장기', en: 'Vegetative' }, gddRequired: 350, duration: { min: 20, max: 30 } },
      { id: GS.FLOWERING, name: { ko: '개화착과기', en: 'Flowering' }, gddRequired: 200, duration: { min: 10, max: 18 } },
      { id: GS.FRUITING, name: { ko: '과실비대기', en: 'Fruit Growth' }, gddRequired: 300, duration: { min: 20, max: 35 } },
      { id: GS.RIPENING, name: { ko: '착색기', en: 'Ripening' }, gddRequired: 200, duration: { min: 10, max: 20 } },
      { id: GS.HARVEST_READY, name: { ko: '수확적기', en: 'Harvest Ready' }, gddRequired: 0, duration: { min: 30, max: 60 } },
    ],
    totalGDD: 1500,
    baseTemp: 10,
  },
  requirements: {
    temperature: { min: 10, max: 35, optimal: { day: 25, night: 18 }, lethal: { cold: 2, heat: 40 } },
    water: {
      totalMm: { min: 400, max: 600 },
      criticalStages: [GS.FLOWERING, GS.FRUITING],
      droughtTolerance: 0.4,
      waterlogTolerance: 0.2,
    },
    light: { photoperiod: 'day_neutral', minSunHours: 6, optimalDLI: 25, shadeTolerance: 0.2 },
    nutrients: { N: 120, P: 60, K: 150, sensitivity: 'high' },
    soil: { preferredTypes: ['loam_alluvial', 'sandy_loam'], phRange: { min: 5.5, max: 7.0 }, drainagePreference: 'good' },
    facilityRequired: true,
  },
  yield: { potential: 12000, average: 10000, harvestIndex: 0.60 }, // 통계 기준 하향
  quality: {
    brix: { min: 3.5, max: 12, optimal: 6 },
    size: { min: 10, max: 300, unit: 'g' },
  },
  rueValue: 2.5, // Solanum lycopersicum (Heuvelink 2005)
  fertilizerRatio: { N: 8, P: 4, K: 8 }, // 농진청: 토마토 균형 시비 (시설재배)
  diseases: [
    { id: 'tomato_blight', name: '역병', trigger: { tempMin: 15, tempMax: 25, humidityMin: 85 }, damageRate: 0.06, stages: ['vegetative', 'flowering', 'fruiting'] },
    { id: 'leaf_mold', name: '잎곰팡이병', trigger: { tempMin: 20, tempMax: 30, humidityMin: 80 }, damageRate: 0.04, stages: ['vegetative', 'flowering', 'fruiting'] },
  ],
  sensitivity: { drought: 0.5, flood: 0.8, heat: 0.6, cold: 0.8, wind: 0.5, disease: 0.7 },
  calendar: {
    central_inland: { sowingMonth: [2, 3], transplantMonth: [4, 5], harvestMonth: [6, 7, 8, 9, 10] },
    south_inland: { sowingMonth: [1, 2, 3], transplantMonth: [3, 4, 5], harvestMonth: [5, 6, 7, 8, 9, 10, 11] },
  },
  visualization: {
    maxHeight: 1.5,
    color: { young: '#90EE90', mature: '#228B22', ripe: '#FF4500' },
  },
});

export default cropRegistry;
