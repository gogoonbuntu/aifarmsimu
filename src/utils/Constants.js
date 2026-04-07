// Game constants

export const GAME_START_DATE = new Date(2026, 2, 1); // March 1, 2026
export const HOURS_PER_DAY = 24;
export const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTH_NAMES_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

export const SPEED_LABELS = {
  0: '⏸ 정지',
  1: '▶ 1x',
  6: '▶▶ 6x',
  24: '▶▶▶ 24x',
  168: '⏩ 1주/초',
  720: '⏩⏩ 1달/초',
};

export const DRAINAGE_RATE = {
  very_good: 50,  // mm/hr
  good: 25,
  moderate: 10,
  poor: 5,
  very_poor: 2,
};

export const GROWTH_STAGES = {
  DORMANT: 'dormant',
  GERMINATION: 'germination',
  SEEDLING: 'seedling',
  VEGETATIVE: 'vegetative',
  FLOWERING: 'flowering',
  FRUITING: 'fruiting',
  RIPENING: 'ripening',
  HARVEST_READY: 'harvest_ready',
  HARVESTED: 'harvested',
  DEAD: 'dead',
};

export const STAGE_NAMES_KO = {
  dormant: '휴면',
  germination: '발아기',
  seedling: '유묘기',
  vegetative: '영양생장기',
  flowering: '개화기',
  fruiting: '결실기',
  ripening: '성숙기',
  harvest_ready: '수확 적기',
  harvested: '수확 완료',
  dead: '고사',
};

export const QUALITY_GRADES = ['S', 'A', 'B', 'C', 'D'];

export const INITIAL_FUND = 50000000; // 5천만원

export const WEATHER_TYPES = {
  CLEAR: 'clear',
  CLOUDY: 'cloudy',
  RAINY: 'rainy',
  HEAVY_RAIN: 'heavy_rain',
  STORMY: 'stormy',
  SNOWY: 'snowy',
  FOGGY: 'foggy',
};

export const WEATHER_NAMES_KO = {
  clear: '☀️ 맑음',
  cloudy: '⛅ 흐림',
  rainy: '🌧️ 비',
  heavy_rain: '⛈️ 폭우',
  stormy: '🌪️ 폭풍',
  snowy: '🌨️ 눈',
  foggy: '🌫️ 안개',
};

export const EVENT_TYPES = {
  MONSOON: 'monsoon',
  TYPHOON: 'typhoon',
  HEATWAVE: 'heatwave',
  DROUGHT: 'drought',
  FROST: 'frost',
  HAIL: 'hail',
};
