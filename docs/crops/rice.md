# 🌾 벼 (Rice, *Oryza sativa* L.)

![벼 논](https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Banaue_Rice_Terraces%2C_Ifugao.jpg/640px-Banaue_Rice_Terraces%2C_Ifugao.jpg)
*논 담수 재배 (Wikimedia Commons)*

## 분류
- **과**: 벼과 (Poaceae)
- **속**: 벼속 (*Oryza*)
- **카테고리**: 곡류 (C₃ 작물)
- **원산지**: 양쯔강 유역 (약 9,000년 전 재배화)

## 한국 벼 재배 현황
- 재배면적: 약 73만 ha (2024, 통계청)
- 전국 평균 수량: **514 kg/10a** (통계청 2024)
- 잠재 수량: 600 kg/10a (최적 조건)
- 수확지수(HI): 0.45 (Kiniry et al., 2001)

---

## 생육 모델

### 적산온도 (GDD) 기반 생육단계

본 시뮬레이터는 **DSSAT CERES-Rice** 모델의 GDD 체계를 사용합니다.

| 생육단계 | GDD 요구량 | 기간 | 설명 |
|----------|-----------|------|------|
| 발아기 (Germination) | 80°C·일 | 5~10일 | 종자 출아, 유근 신장 |
| 유묘기 (Seedling) | 250°C·일 | 15~25일 | 1~3엽기, 모판 또는 직파 |
| 분얼기 (Tillering) | 800°C·일 | 30~45일 | 분얼수 증가, LAI 급증 |
| 출수기 (Heading) | 400°C·일 | 10~15일 | 수잉기~출수, 화분 비산 |
| 등숙기 (Grain Filling) | 600°C·일 | 30~45일 | 전분 축적, 수분함량 감소 |
| 수확적기 | — | 7~14일 | 수분함량 20~25% |

- **기본온도(T_base)**: 9°C (DSSAT CERES-Rice standard)
- **총 GDD**: 2,800°C·일

### 바이오매스 모델
- **RUE**: 1.4 g/MJ (Kiniry et al., 2001, C₃ grass)
- **LAI 최대**: 5~7 (분얼 최성기)
- **수확지수**: 0.45

---

## 환경 요구조건

### 온도
| 항목 | 값 | 근거 |
|------|------|------|
| 최저 생육온도 | 15°C | 직파 발아 한계 |
| 최적 주간 | 28°C | Yoshida (1981) |
| 최적 야간 | 22°C | 호흡 억제 + 전분 전류 |
| 최고 한계 | 40°C | 출수기 불임 증가 |
| 치사 저온 | **5°C** | 유묘기 냉해, Satake & Yoshida (1978) |
| 치사 고온 | 42°C | 화분 불활성화 |

> **출수기 고온 장해**: 출수기 일최고기온 35°C 이상 시 화분활력 급감, 등숙률 10~30% 감소 (Kim et al., 2013)

### 수분
| 항목 | 값 |
|------|------|
| 총 필요 수량 | 800~1,200 mm |
| 담수 요구 | **필수** (논 관개) |
| 가뭄 내성 | 0.2 (매우 약함) |
| 과습 내성 | 0.9 (매우 강함) |
| 임계 생육단계 | 출수기, 등숙기 |

#### 담수 관리 (Paddy Water Management)
- **육묘기~분얼기**: 담수 5~7cm 유지
- **분얼 말기**: 중간낙수 (과 분얼 억제, 뿌리 활력 회복)
- **출수~등숙 전기**: 간단관개
- **등숙 후기**: 낙수 (수확 준비)

### 양분
| 성분 | 요구량 (mg/kg) | 시비 권장 (kg/10a) |
|------|---------------|-------------------|
| 질소(N) | 120 | 9~15 |
| 인산(P₂O₅) | 45 | 4~5 |
| 칼리(K₂O) | 60 | 5~7 |

> **NPK 비율**: 10:4:5 (농촌진흥청 벼 시비 기준)

### 토양
- **적합 토양**: 논토양(회색), 충적양토, 식양토
- **pH 범위**: 5.0~7.0
- **배수**: 불량 선호 (담수 유지)

### 광합성
- **광주기**: 단일성 (Short-day plant)
- **최소 일조**: 5시간/일
- **최적 DLI**: 25 mol/m²/일

---

## 병해 모델

| 병해 | 트리거 조건 | 일 피해율 | 감수성 생육단계 |
|------|-----------|----------|---------------|
| 도열병 (*Magnaporthe oryzae*) | 20~28°C, RH≥85% | 4% | 분얼기, 출수기 |
| 문고병 (*Rhizoctonia solani*) | 25~32°C, RH≥80% | 3% | 분얼기, 출수기, 등숙기 |

---

![벼 수확](https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Rice_harvest.jpg/640px-Rice_harvest.jpg)
*벼 수확 풍경 (Wikimedia)*

## 재배력 (농진청 기준)

| 기후 구역 | 파종 | 이앙 | 수확 |
|-----------|------|------|------|
| 중부내륙 | 4~5월 | 5~6월 | 9~10월 |
| 남부내륙 | 4~5월 | 5~6월 | 9~10월 |
| 남부해안 | 4월 | 5~6월 | 9~10월 |
| 제주 | 4월 | 5월 | 9~10월 |

---

## 참고 문헌
1. Yoshida, S. (1981). *Fundamentals of Rice Crop Science*. IRRI, Los Baños.
2. Satake, T. & Yoshida, S. (1978). High temperature-induced sterility in indica rices at flowering. *Japanese Journal of Crop Science*, 47(1), 6-17.
3. Kim, J. et al. (2013). High temperature effects on rice quality and countermeasures. *Korean Journal of Crop Science*, 58(3), 264-272.
4. Kiniry, J.R. et al. (2001). Radiation-use efficiency. *Agronomy Journal*, 93, 131-136.
5. 농촌진흥청 (2024). 벼 재배매뉴얼. 농사로.
6. 통계청 (2024). 농작물생산조사. KOSIS.
