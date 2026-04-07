# 🌾 AI 농업 시뮬레이터 — 과학 문서

> 본 시뮬레이터의 모든 수치는 농촌진흥청(RDA), FAO, DSSAT CERES 모델, KMA(기상청) 관측 데이터 및 관련 논문에 근거합니다.

## 📂 문서 구조

### 🌱 작물 (10종)
| 작물 | 문서 | 분류 | 기준 수량 |
|------|------|------|-----------|
| 🌾 [벼 (Rice)](crops/rice.md) | `crops/rice.md` | 곡류 | 514 kg/10a |
| 🧅 [대파 (Green Onion)](crops/green_onion.md) | `crops/green_onion.md` | 채소 | 4,000 kg/10a |
| 🍇 [포도 (Grape)](crops/grape.md) | `crops/grape.md` | 과수 | 1,500 kg/10a |
| 🍎 [사과 (Apple)](crops/apple.md) | `crops/apple.md` | 과수 | 2,200 kg/10a |
| 🍓 [딸기 (Strawberry)](crops/strawberry.md) | `crops/strawberry.md` | 과수 | 3,500 kg/10a |
| 🥬 [배추 (Napa Cabbage)](crops/napa_cabbage.md) | `crops/napa_cabbage.md` | 채소 | 8,000 kg/10a |
| 🌶️ [고추 (Red Pepper)](crops/red_pepper.md) | `crops/red_pepper.md` | 채소 | 250 kg/10a |
| 🥔 [감자 (Potato)](crops/potato.md) | `crops/potato.md` | 근채 | 2,800 kg/10a |
| 🍠 [고구마 (Sweet Potato)](crops/sweet_potato.md) | `crops/sweet_potato.md` | 근채 | 2,100 kg/10a |
| 🍅 [토마토 (Tomato)](crops/tomato.md) | `crops/tomato.md` | 채소 | 10,000 kg/10a |

### 🌍 기후 구역 (6개)
| 구역 | 문서 | 쾨펜 분류 | 대표 지역 |
|------|------|-----------|-----------|
| [중부내륙](climate/central_inland.md) | `climate/central_inland.md` | Dwa | 서울, 수원 |
| [중부해안](climate/central_coastal.md) | `climate/central_coastal.md` | Cwa | 인천, 강릉 |
| [남부내륙](climate/south_inland.md) | `climate/south_inland.md` | Cwa | 대구, 광주 |
| [남부해안](climate/south_coastal.md) | `climate/south_coastal.md` | Cfa | 부산, 여수 |
| [고냉지](climate/highland.md) | `climate/highland.md` | Dfb | 대관령, 평창 |
| [제주](climate/jeju.md) | `climate/jeju.md` | Cfa | 제주시, 서귀포 |

### 🪨 토양 (7종)
| 토양 | 문서 | USDA 분류 | 추천 작물 |
|------|------|-----------|-----------|
| [충적양토](soils/loam_alluvial.md) | `soils/loam_alluvial.md` | Entisol | 범용 |
| [사양토](soils/sandy_loam.md) | `soils/sandy_loam.md` | Inceptisol | 근채·과수 |
| [식양토](soils/clay_loam.md) | `soils/clay_loam.md` | Alfisol | 채소 |
| [논토양(회색)](soils/paddy_gley.md) | `soils/paddy_gley.md` | Inceptisol | 벼 |
| [화산회토](soils/volcanic_andisol.md) | `soils/volcanic_andisol.md` | Andisol | 근채·과수 |
| [적황색토](soils/red_yellow.md) | `soils/red_yellow.md` | Ultisol | 과수 |
| [산악갈색토](soils/mountain_brown.md) | `soils/mountain_brown.md` | Inceptisol | 고냉지채소 |

---

## 🔬 시뮬레이션 엔진 개요

### 바이오매스 모델
본 시뮬레이터는 **Monteith 방사이용효율(RUE) 모델**을 기반으로 일별 바이오매스 축적을 계산합니다:

```
일 바이오매스 = RUE × IPAR × 스트레스 계수
```

- **RUE** (Radiation Use Efficiency): 작물별 고유값, Kiniry et al. (2001) 기반
- **IPAR** = PAR × (1 − e^(−k × LAI)), McCree (1972) Beer's Law
- **PAR** = 일사량 × 0.48, Angström-Prescott 모델

### 생육단계 모델
DSSAT CERES 모델의 **적산온도(GDD)** 기반 생육단계를 사용합니다:

```
GDD = max(0, T_avg − T_base)
```

### 증발산 모델
**FAO-56 Hargreaves-Samani** 기준증발산량(ET₀)을 사용하며, VPD 보정을 적용합니다:
- Allen et al. (1998) 작물계수(Kc) 적용
- Ritchie (1972) LAI-Kc 관계식

### 참고 문헌
1. Monteith, J.L. (1977). Climate and the efficiency of crop production in Britain. *Philosophical Transactions of the Royal Society B*, 281, 277-294.
2. Allen, R.G. et al. (1998). FAO Irrigation and Drainage Paper No. 56.
3. Kiniry, J.R. et al. (2001). Radiation-use efficiency in biomass accumulation prior to grain filling. *Agronomy Journal*, 93, 131-136.
4. 농촌진흥청 (2024). 농사로 작물재배매뉴얼.
5. 통계청 (2024). 농업면적조사/농작물생산조사.
