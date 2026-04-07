// Soil Data Registry - 한국 주요 농경지 토양 7종
// Based on: USDA Soil Taxonomy, 농촌진흥청 흙토람, 국립농업과학원
import { Registry } from '../../utils/Registry.js';

export const soilRegistry = new Registry('soils');

// ===== 1. 충적양토 (Alluvial Loam) =====
soilRegistry.register('loam_alluvial', {
  name: { ko: '충적양토', en: 'Alluvial Loam' },
  usdaOrder: 'Entisol (Fluvents)',
  texture: '양토 (Loam)',
  properties: {
    pH: { min: 5.5, max: 6.5, optimal: 6.0 },
    organicMatter: 2.8,
    drainage: 'good',
    drainageRate: 25,
    effectiveDepth: 90,
    CEC: 15,
    waterHoldingCapacity: 180,
    bulkDensity: 1.35,
    porosity: 48,
    fieldCapacity: 0.32,
    wiltingPoint: 0.14,
  },
  nutrients: {
    nitrogen: 120, phosphorus: 85, potassium: 150,
    calcium: 1200, magnesium: 180,
  },
  suitability: {
    rice: 0.85, vegetables: 0.9, fruits: 0.8, roots: 0.75,
  },
  description: '하천 퇴적작용으로 형성된 토양. 양분이 풍부하고 배수가 양호하여 대부분의 작물 재배에 적합.',
  regions: ['서해안 평야', '김제', '논산', '예산'],
  color: 0x8B7355,
});

// ===== 2. 사양토 (Sandy Loam) =====
soilRegistry.register('sandy_loam', {
  name: { ko: '사양토', en: 'Sandy Loam' },
  usdaOrder: 'Inceptisol',
  texture: '사양토 (Sandy Loam)',
  properties: {
    pH: { min: 5.0, max: 6.0, optimal: 5.5 },
    organicMatter: 2.0,
    drainage: 'very_good',
    drainageRate: 50,
    effectiveDepth: 70,
    CEC: 11,
    waterHoldingCapacity: 120,
    bulkDensity: 1.50,
    porosity: 42,
    fieldCapacity: 0.22,
    wiltingPoint: 0.08,
  },
  nutrients: {
    nitrogen: 80, phosphorus: 60, potassium: 100,
    calcium: 800, magnesium: 120,
  },
  suitability: {
    rice: 0.3, vegetables: 0.7, fruits: 0.85, roots: 0.9,
  },
  description: '모래 함량이 높아 배수가 매우 양호. 뿌리채소와 과수에 적합하나 보수력이 낮아 관수 관리 필요.',
  regions: ['낙동강 유역', '해안가', '경기 북부'],
  color: 0xC4A777,
});

// ===== 3. 식양토 (Clay Loam) =====
soilRegistry.register('clay_loam', {
  name: { ko: '식양토', en: 'Clay Loam' },
  usdaOrder: 'Alfisol',
  texture: '식양토 (Clay Loam)',
  properties: {
    pH: { min: 5.5, max: 7.0, optimal: 6.2 },
    organicMatter: 3.2,
    drainage: 'moderate',
    drainageRate: 10,
    effectiveDepth: 80,
    CEC: 22,
    waterHoldingCapacity: 220,
    bulkDensity: 1.30,
    porosity: 50,
    fieldCapacity: 0.38,
    wiltingPoint: 0.20,
  },
  nutrients: {
    nitrogen: 140, phosphorus: 95, potassium: 180,
    calcium: 1500, magnesium: 220,
  },
  suitability: {
    rice: 0.75, vegetables: 0.8, fruits: 0.6, roots: 0.5,
  },
  description: '점토 함량이 높아 양분 보유력 우수. 보수력이 좋으나 배수 불량 시 과습 주의.',
  regions: ['호남평야', '충청 내륙', '경기 남부'],
  color: 0x6B5B45,
});

// ===== 4. 논토양-회색 (Paddy Gley) =====
soilRegistry.register('paddy_gley', {
  name: { ko: '논토양(회색)', en: 'Paddy Gley Soil' },
  usdaOrder: 'Inceptisol (Aquepts)',
  texture: '미사질양토 (Silt Loam)',
  properties: {
    pH: { min: 5.0, max: 6.5, optimal: 5.8 },
    organicMatter: 4.0,
    drainage: 'poor',
    drainageRate: 5,
    effectiveDepth: 60,
    CEC: 18,
    waterHoldingCapacity: 250,
    bulkDensity: 1.25,
    porosity: 52,
    fieldCapacity: 0.42,
    wiltingPoint: 0.22,
  },
  nutrients: {
    nitrogen: 150, phosphorus: 100, potassium: 130,
    calcium: 1000, magnesium: 200,
  },
  suitability: {
    rice: 0.95, vegetables: 0.4, fruits: 0.2, roots: 0.3,
  },
  description: '장기간 담수 관리로 형성된 환원층을 가진 논 전용 토양. 벼 재배에 최적화.',
  regions: ['전국 논 지대', '호남', '충남', '경기'],
  color: 0x7A7A6D,
});

// ===== 5. 화산회토 (Volcanic Andisol) =====
soilRegistry.register('volcanic_andisol', {
  name: { ko: '화산회토', en: 'Volcanic Andisol' },
  usdaOrder: 'Andisol',
  texture: '미사질양토',
  properties: {
    pH: { min: 4.5, max: 5.5, optimal: 5.0 },
    organicMatter: 12.0,
    drainage: 'good',
    drainageRate: 30,
    effectiveDepth: 120,
    CEC: 28,
    waterHoldingCapacity: 300,
    bulkDensity: 0.85,
    porosity: 65,
    fieldCapacity: 0.50,
    wiltingPoint: 0.25,
  },
  nutrients: {
    nitrogen: 180, phosphorus: 45, potassium: 120,
    calcium: 600, magnesium: 150,
  },
  suitability: {
    rice: 0.4, vegetables: 0.7, fruits: 0.75, roots: 0.8,
  },
  description: '화산 분출물로 형성. 유기물이 매우 높고 보수력 우수하나 인산 고정력이 높아 시비 관리 필요.',
  regions: ['제주도'],
  color: 0x4A3F35,
});

// ===== 6. 적황색토 (Red-Yellow Soil) =====
soilRegistry.register('red_yellow', {
  name: { ko: '적황색토', en: 'Red-Yellow Soil' },
  usdaOrder: 'Ultisol',
  texture: '식토~식양토',
  properties: {
    pH: { min: 4.5, max: 5.5, optimal: 5.0 },
    organicMatter: 2.2,
    drainage: 'good',
    drainageRate: 20,
    effectiveDepth: 80,
    CEC: 14,
    waterHoldingCapacity: 160,
    bulkDensity: 1.40,
    porosity: 46,
    fieldCapacity: 0.30,
    wiltingPoint: 0.16,
  },
  nutrients: {
    nitrogen: 90, phosphorus: 55, potassium: 110,
    calcium: 700, magnesium: 130,
  },
  suitability: {
    rice: 0.5, vegetables: 0.6, fruits: 0.7, roots: 0.65,
  },
  description: '온난습윤 기후에서 풍화된 산성 토양. 석회 시용으로 pH 교정 필요.',
  regions: ['경상도 구릉지', '전남 해안', '충북 산지'],
  color: 0x9B6B4A,
});

// ===== 7. 산악갈색토 (Mountain Brown Soil) =====
soilRegistry.register('mountain_brown', {
  name: { ko: '산악갈색토', en: 'Mountain Brown Soil' },
  usdaOrder: 'Inceptisol (Udepts)',
  texture: '양토~사양토',
  properties: {
    pH: { min: 4.5, max: 5.5, optimal: 5.0 },
    organicMatter: 4.5,
    drainage: 'good',
    drainageRate: 35,
    effectiveDepth: 50,
    CEC: 12,
    waterHoldingCapacity: 140,
    bulkDensity: 1.20,
    porosity: 54,
    fieldCapacity: 0.28,
    wiltingPoint: 0.12,
  },
  nutrients: {
    nitrogen: 100, phosphorus: 50, potassium: 90,
    calcium: 500, magnesium: 100,
  },
  suitability: {
    rice: 0.2, vegetables: 0.75, fruits: 0.6, roots: 0.7,
  },
  description: '산지에 분포하는 미숙한 토양. 유효토심이 얕으나 냉량 채소(배추, 감자) 재배에 적합.',
  regions: ['강원도 산간', '대관령', '평창', '태백'],
  color: 0x7A6B55,
});

export default soilRegistry;
