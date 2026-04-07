# 🌾 AI 농장 시뮬레이터 (AI Farm Simulator)

> **과학적 근거에 기반한 고정밀 농업 시뮬레이션 — 8편의 학술 논문/보고서 · 6개 공공 데이터셋 · 10개 작물 · 20종 병해충 모델링**

한국의 실제 기후·토양·작물 데이터를 기반으로 설계된 농업 교육 시뮬레이터입니다. 작물의 생장(生長)부터 기상 재해, 병해충 발병, 수확까지 — 모든 시스템이 **농학 및 기상학 문헌에 근거**하여 구축되었습니다.

---

## 🎮 주요 기능

| 기능 | 설명 |
|------|------|
| **3D 농장 시각화** | Three.js 기반 실시간 3D 렌더링 (낮/밤 사이클, 기상 효과) |
| **6단계 설정 마법사** | 기후 구역 → 토양 → 작물 → 시설 → AI 로봇 → 확인 |
| **작물 생장 모델** | DSSAT CERES 기반 GDD(적산온도) + Monteith RUE 바이오매스 모델 |
| **정밀 기상 엔진** | KMA 기후평년값 기반 6종 극한이벤트 시뮬레이션 |
| **병해충 시스템** | 20종 작물별 병해 (온도·습도·생육단계 트리거) |
| **교육 이벤트 시스템** | 특수 상황 발생 시 자동 일시정지 + 원인·대응 교육 팝업 |
| **종합 분석 보고서** | 게임 종료 시 기상·작물·토양·경영 종합 보고서 |

---

## 📚 과학적 근거 (Scientific References)

이 시뮬레이터의 **모든 핵심 시스템**은 아래의 학술 논문, 공공 데이터, 국가기관 자료에 근거합니다.

### 🌱 작물 생장 모델

| 시스템 | 근거 | 적용 내용 |
|--------|------|----------|
| **바이오매스 축적** | Monteith, J.L. (1977). "Climate and the Efficiency of Crop Production in Britain." *Phil. Trans. R. Soc. Lond.* B 281: 277-294 | Radiation Use Efficiency (RUE) 모델: 실제 바이오매스 = RUE × IPAR × 스트레스 계수. 작물 카테고리별 RUE 값: 곡물 1.5, 채소 2.0, 과일 1.8, 근채류 2.2 g/MJ |
| **PAR 변환** | McCree, K.J. (1972). "The action spectrum, absorptance and quantum yield of photosynthesis in crop plants." *Agricultural Meteorology* 9: 191-216 | PAR(광합성 유효 복사) = 전일사량 × 0.48. 일사량 산출: Ångström-Prescott 공식 (a=0.25, b=0.50) |
| **적산온도 (GDD)** | McMaster, G.S. & Wilhelm, W.W. (1997). "Growing degree-days: one equation, two interpretations." *Agricultural and Forest Meteorology* 87: 291-300 | GDD = max(0, (Tmax + Tmin)/2 − Tbase). 작물별 기저온도: 벼 10°C, 딸기 5°C, 고추 10°C 등 |
| **생육 단계 모델** | DSSAT CERES-Rice/Maize 모델 프레임워크 | 6단계 phenology: 발아→유묘→영양생장→개화→결실→등숙. GDD 요구량으로 단계 전환 판정 |
| **수확지수 (HI)** | Hay, R.K.M. (2006). "Harvest index: a review of its use in plant breeding and crop physiology." *Annals of Applied Biology* 126(1): 197-216 | 작물별 HI: 벼 0.45-0.50, 감자 0.75-0.85, 딸기 0.55-0.65 등 |

### 💧 수분·증발산 모델

| 시스템 | 근거 | 적용 내용 |
|--------|------|----------|
| **증발산량 (ET₀)** | Allen, R.G. et al. (1998). "Crop evapotranspiration — Guidelines for computing crop water requirements." *FAO Irrigation and Drainage Paper No. 56* | Hargreaves-Samani 간이법 + VPD 보정. Kc = f(LAI): Kc_ini=0.3, Kc_mid=1.2 |
| **작물계수 (Kc)** | Allen et al. (1998) Table 12; Ritchie, J.T. (1972). "Model for predicting evaporation from a row crop with incomplete cover." *Water Resources Research* 8(5): 1204-1213 | LAI 기반 Kc 근사: Kc = 0.3 + 0.7 × (1 − e^(−0.5×LAI)) |
| **담수 관리** | 농진청 벼 재배기술 매뉴얼 | 본답기 담수 5-7cm 유지, 분얼 말기 중간낙수, 등숙 후기 낙수 |

### 🌡️ 기후·기상 시스템

| 시스템 | 근거 | 적용 내용 |
|--------|------|----------|
| **월별 기온/강수** | **KMA (기상청) 기후평년값 1991-2020** — 기상자료개방포털 (data.kma.go.kr) | 6개 기후 구역별 12개월 평균기온, 최고/최저, 강수량, 습도 |
| **태풍 확률** | KMA 이상기후 감시보고서 (2023). 연평균 3.1회 영향 | 월별 발생 확률: 7월 0.05, 8월 0.10, 9-10월 0.08. 풍속 범위: 17-42 m/s (KMA 태풍 등급) |
| **폭염** | KMA 기후평년값. 전국 연평균 폭염일수 11.8일 | 구역별: 남부내륙(대구) 최대 0.70, 중부내륙 0.40, 해안 0.20. 지속 3-10일 |
| **서리** | KMA 서리일수 통계. 중부 첫서리 10월 상순, 마지막 서리 4월 하순 | 월별 확률: 3월 0.30-0.45, 11월 0.25-0.40. 고냉지 5월까지 서리 가능 |
| **장마** | KMA 장마 정보. 평균 32일 (6/19~7/26) | 장마 기간 28-40일. 연평균 강수량의 약 35% 집중 |
| **우박** | KMA 기후통계. 봄(3-5월)·가을(9-11월) 편중 | 월별 확률: 4월 0.01-0.03, 10월 0.005-0.01 |

### 🧪 비료·양분 시스템

| 시스템 | 근거 | 적용 내용 |
|--------|------|----------|
| **표준 시비량** | **농촌진흥청 (NIAS) 작물별 표준시비량** — 흙토람 (soil.rda.go.kr) | 작물별 NPK 비율 (성분량 kg/10a 기준): 벼 N:P:K = 10:4:5, 배추 16:4:10, 고구마 3:5:12, 고추 8:5:6 등 |
| **양분 흡수** | Liebig의 최소량 법칙 (Law of the Minimum) | 영양 스트레스 = min(N%, P%, K%) — 가장 부족한 양분이 생장 제한 |

### 🦠 병해충 시스템

| 시스템 | 근거 | 적용 내용 |
|--------|------|----------|
| **작물별 병해** | **농촌진흥청 병해충도감** — ncpms.rda.go.kr | 10개 작물 × 2종/작물 = 20종 병해 등록. 온도·습도·생육단계 트리거 |
| **발병 확률** | 농진청 병해충 예찰 기준 | 일일 발병확률 0.08-0.15 (조건 충족 시). 연작장해: 회차당 +20% |
| **진행 모델** | 농진청 병해충도감 피해도 분류 | severity 0→1.0 진행. severity 1.0 = 수확량 50-70% 감소 수준 |

### 📊 경제·수확량 기준

| 시스템 | 근거 | 적용 내용 |
|--------|------|----------|
| **평균 수확량** | **KOSIS (통계청) 농작물생산조사 2024** | 벼 497kg/10a, 감자 2,500kg/10a, 딸기 3,800kg/10a 등 |
| **도매 가격** | **aT (한국농수산식품유통공사) 농산물 유통정보** | 벼 ₩2,400/kg, 딸기 ₩10,000/kg, 고추 ₩15,000/kg 등 |

---

## 🏗️ 시스템 아키텍처

```
src/
├── data/
│   ├── climate/    # KMA 기후 데이터 (6개 구역)
│   ├── crops/      # 10개 작물 데이터 (생육·병해·NPK)
│   ├── soils/      # 토양 유형별 물리·화학 특성
│   ├── facilities/ # 시설 유형 (노지, 비닐, 유리 온실)
│   └── robots/     # AI 농업 로봇 모듈
├── engine/
│   ├── CropGrowthEngine.js   # Monteith RUE + DSSAT 기반 생장 모델
│   ├── WeatherEngine.js      # KMA 기반 기상 생성 엔진
│   ├── SimulationManager.js  # 통합 시뮬레이션 관리
│   └── TimeManager.js        # 시간 관리 (속도 제어)
├── ui/
│   └── UIManager.js          # 6단계 마법사 + 게임 UI + 보고서
├── world/
│   ├── World3D.js            # Three.js 3D 환경
│   └── Farmer3D.js           # 캐릭터 시스템
├── utils/
│   ├── MathUtils.js          # GDD, 스트레스 계산
│   ├── EventBus.js           # 이벤트 버스
│   └── Constants.js          # 상수 정의
├── main.js                   # 앱 진입점 + 이벤트 교육 시스템
└── style.css                 # UI 스타일
```

---

## 🔬 핵심 모델 수식

### 1. 바이오매스 축적 (Monteith 1977)
```
일일 바이오매스 (g/m²) = RUE × IPAR × σ_stress

where:
  RUE   = Radiation Use Efficiency (작물별 1.5-2.2 g/MJ)
  IPAR  = PAR × (1 − e^(−k × LAI))
  PAR   = Rs × 0.48                    ← McCree (1972)
  Rs    = sunHours × 2.1 MJ/m²/day     ← Ångström-Prescott
  σ     = min(σ_temp, σ_water, σ_nutrient) × σ_light
```

### 2. 증발산량 (FAO-56, Allen et al. 1998)
```
ET₀ = 0.0023 × (T + 17.8) × √(Rs) × Rs × 0.01 × VPD_factor

ETc = ET₀ × Kc

where:
  Kc = 0.3 + 0.7 × (1 − e^(−0.5 × LAI))
  VPD_factor = 1.0 + VPD × 0.15
```

### 3. 적산온도 (GDD)
```
GDD = max(0, (Tmax + Tmin) / 2 − Tbase)

작물 기저온도: 벼 10°C, 고추 10°C, 딸기 5°C, 포도 10°C
```

### 4. 병해 발병 모델
```
일일 발병확률 = min(0.20, damageRate × 2.0) × (1 + 연작횟수 × 0.2)

발병 조건:
  tempMin ≤ T ≤ tempMax
  humidity ≥ humidityMin
  생육단계 ∈ 취약단계 목록
```

---

## 📑 참고 문헌 (Full References)

1. **Allen, R.G., Pereira, L.S., Raes, D., & Smith, M.** (1998). *Crop evapotranspiration — Guidelines for computing crop water requirements.* FAO Irrigation and Drainage Paper No. 56. Rome: FAO.

2. **McCree, K.J.** (1972). The action spectrum, absorptance and quantum yield of photosynthesis in crop plants. *Agricultural Meteorology*, 9, 191-216.

3. **McMaster, G.S. & Wilhelm, W.W.** (1997). Growing degree-days: one equation, two interpretations. *Agricultural and Forest Meteorology*, 87(4), 291-300.

4. **Monteith, J.L.** (1977). Climate and the efficiency of crop production in Britain. *Philosophical Transactions of the Royal Society of London. B*, 281(980), 277-294.

5. **Ritchie, J.T.** (1972). Model for predicting evaporation from a row crop with incomplete cover. *Water Resources Research*, 8(5), 1204-1213.

6. **기상청 (KMA)** (2021). *기후평년값 1991-2020*. 기상자료개방포털. https://data.kma.go.kr

7. **기상청 (KMA)** (2023). *이상기후 감시 보고서*. 기상청 기후예측과.

8. **농촌진흥청 (NIAS)** (2020). *작물별 표준시비량*. 흙토람. https://soil.rda.go.kr

9. **농촌진흥청 (NIAS)**. *병해충도감*. 농촌진흥청 국립농업과학원. https://ncpms.rda.go.kr

10. **통계청 (KOSTAT)** (2024). *농작물생산조사*. KOSIS. https://kosis.kr

11. **한국농수산식품유통공사 (aT)**. *농산물 유통정보*. KAMIS. https://www.kamis.or.kr

12. **Jones, J.W. et al.** (2003). The DSSAT cropping system model. *European Journal of Agronomy*, 18(3-4), 235-265.

---

## 🚀 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 빌드
npm run build
```

---

## 📝 라이선스

MIT License

---

<p align="center">
  <em>이 시뮬레이터는 학술 연구 및 공공 데이터에 기반하여 설계되었으며,<br>
  한국 농업의 현실을 가능한 한 정밀하게 반영하는 것을 목표로 합니다.</em>
</p>
