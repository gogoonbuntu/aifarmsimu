// Firebase Firestore Database Service
import { db } from './config.js';
import {
  doc, setDoc, getDoc, getDocs,
  collection, query, orderBy, limit,
  serverTimestamp, updateDoc, increment,
} from 'firebase/firestore';
import { authService } from './auth.js';

// 농진청 공식 평균 수량 (kg/10a) — 현실 기준값
const REAL_YIELD_BENCHMARKS = {
  rice: 514,
  potato: 2800,
  grape: 1500,
  apple: 2200,
  strawberry: 3200,
  red_pepper: 250,
  napa_cabbage: 8000,
  green_onion: 4000,
  sweet_potato: 2000,
  tomato: 10000,
};

class DatabaseService {
  // ===== Save game result =====
  async saveGameResult(stats) {
    const uid = authService.getUid();
    if (!uid) return null;

    const resultId = `game_${Date.now()}`;
    const resultData = {
      uid,
      displayName: authService.getDisplayName(),
      createdAt: serverTimestamp(),

      // Core stats
      grade: stats.grade || 'D',
      totalDays: stats.totalDays || 0,
      totalRevenue: stats.totalRevenue || 0,
      totalExpenses: stats.totalExpenses || 0,
      profit: stats.profit || 0,
      reason: stats.reason || '',

      // Config — full IDs for analytics filtering
      climateName: stats.climate?.name?.ko || '',
      climateId: stats.climate?.id || '',
      soilName: stats.soil?.name?.ko || '',
      soilId: stats.soil?.id || '',
      facilityName: stats.facility?.name?.ko || '노지',
      facilityId: stats.facility?.id || 'none',
      facilityCost: stats.facility?.cost || 0,
      robotIds: (stats.robots || []).map(r => r.id),

      // Crops — enhanced with cropId for analytics
      harvestCount: stats.harvestResults?.length || 0,
      deadCrops: stats.deadCrops || 0,
      harvests: (stats.harvestResults || []).map(r => ({
        cropId: r.crop.id,
        cropName: r.crop.name.ko,
        cropIcon: r.crop.icon,
        yield: Math.round(r.yield || 0),
        yieldPer10a: Math.round(r.yieldPer10a || 0),
        grade: r.quality?.grade || '?',
        yieldComment: r.yieldComment || '',
        realBenchmark: REAL_YIELD_BENCHMARKS[r.crop.id] || null,
        matchRate: REAL_YIELD_BENCHMARKS[r.crop.id]
          ? Math.round((r.yieldPer10a / REAL_YIELD_BENCHMARKS[r.crop.id]) * 100)
          : null,
      })),

      // Weather events
      weatherEventCount: stats.weatherEvents?.length || 0,
      weatherEvents: (stats.weatherEvents || []).slice(0, 20).map(e => ({
        type: e.type,
        day: e.day,
      })),

      // Disease events — NEW
      diseaseEvents: (stats.diseaseEvents || []).slice(0, 30).map(d => ({
        day: d.day,
        cropName: d.cropName,
        diseaseName: d.diseaseName,
      })),

      // Plots summary
      crops: (stats.plots || []).map(p => ({
        cropId: p.cropId,
        name: p.cropName,
        icon: p.cropIcon,
        status: p.isHarvested ? 'harvested' : p.isAlive ? 'alive' : 'dead',
        health: Math.round(p.health || 0),
        daysSincePlanting: p.daysSincePlanting || 0,
        accumulatedGDD: Math.round(p.accumulatedGDD || 0),
        soilCondition: p.soilCondition || 0,
      })),
    };

    try {
      // Save to user's game history
      const docRef = doc(db, 'users', uid, 'games', resultId);
      await setDoc(docRef, resultData);

      // Update user profile with latest stats
      await this.updateUserProfile(stats);

      // Save to global leaderboard
      await this.saveToLeaderboard(resultData, resultId);

      // Update global analytics
      await this.updateGlobalAnalytics(resultData);

      return resultId;
    } catch (error) {
      console.error('게임 결과 저장 실패:', error);
      return null;
    }
  }

  // ===== Update user profile =====
  async updateUserProfile(stats) {
    const uid = authService.getUid();
    if (!uid) return;

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    const prev = userSnap.exists() ? userSnap.data() : {};
    const totalGames = (prev.totalGames || 0) + 1;
    const bestGrade = this.betterGrade(prev.bestGrade, stats.grade);
    const totalProfit = (prev.totalProfit || 0) + (stats.profit || 0);

    // Track owned facilities
    const ownedFacilities = prev.ownedFacilities || [];
    if (stats.facility?.id && !ownedFacilities.includes(stats.facility.id)) {
      ownedFacilities.push(stats.facility.id);
    }

    await setDoc(userRef, {
      displayName: authService.getDisplayName(),
      photoURL: authService.getPhotoURL() || '',
      lastPlayedAt: serverTimestamp(),
      totalGames,
      bestGrade,
      totalProfit,
      totalHarvests: (prev.totalHarvests || 0) + (stats.harvestResults?.length || 0),
      ownedFacilities,
    }, { merge: true });
  }

  // ===== Global Analytics =====
  async updateGlobalAnalytics(resultData) {
    try {
      // 1) Global summary
      const globalRef = doc(db, 'analytics', 'global_summary');
      const globalSnap = await getDoc(globalRef);
      const prev = globalSnap.exists() ? globalSnap.data() : {};

      const gradeValue = { S: 0, A: 1, B: 2, C: 3, D: 4 };
      const totalGames = (prev.totalGamesPlayed || 0) + 1;
      const runningProfit = (prev.totalProfitSum || 0) + (resultData.profit || 0);
      const runningGrade = (prev.totalGradeSum || 0) + (gradeValue[resultData.grade] ?? 4);

      // Climate frequency
      const climateFreq = prev.climateFrequency || {};
      climateFreq[resultData.climateId] = (climateFreq[resultData.climateId] || 0) + 1;

      // Soil frequency
      const soilFreq = prev.soilFrequency || {};
      soilFreq[resultData.soilId] = (soilFreq[resultData.soilId] || 0) + 1;

      await setDoc(globalRef, {
        totalGamesPlayed: totalGames,
        totalProfitSum: runningProfit,
        avgProfit: Math.round(runningProfit / totalGames),
        totalGradeSum: runningGrade,
        avgGradeScore: +(runningGrade / totalGames).toFixed(2),
        climateFrequency: climateFreq,
        soilFrequency: soilFreq,
        avgSurvivalRate: +(((prev.avgSurvivalRate || 0.8) * (totalGames - 1) +
          (resultData.harvestCount / Math.max(1, resultData.harvestCount + resultData.deadCrops))) / totalGames).toFixed(3),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2) Per-crop stats
      for (const harvest of resultData.harvests || []) {
        if (!harvest.cropId) continue;
        const cropRef = doc(db, 'analytics', `crop_${harvest.cropId}`);
        const cropSnap = await getDoc(cropRef);
        const cp = cropSnap.exists() ? cropSnap.data() : {};

        const cropGames = (cp.totalGames || 0) + 1;
        const yieldSum = (cp.yieldSum || 0) + (harvest.yieldPer10a || 0);
        const avgYield = Math.round(yieldSum / cropGames);
        const realYield = REAL_YIELD_BENCHMARKS[harvest.cropId] || 0;

        // Grade distribution
        const gradeDist = cp.gradeDistribution || { S: 0, A: 0, B: 0, C: 0, D: 0 };
        const hGrade = harvest.grade || 'D';
        if (gradeDist[hGrade] !== undefined) gradeDist[hGrade]++;

        // Survival tracking
        const totalAttempts = (cp.totalAttempts || 0) + 1;
        const survivals = (cp.survivals || 0) + 1; // harvested = survived

        await setDoc(cropRef, {
          cropId: harvest.cropId,
          cropName: harvest.cropName,
          totalGames: cropGames,
          yieldSum,
          avgYieldPer10a: avgYield,
          realYieldPer10a: realYield,
          matchRate: realYield > 0 ? Math.round((avgYield / realYield) * 100) : null,
          gradeDistribution: gradeDist,
          totalAttempts,
          survivals,
          survivalRate: +(survivals / totalAttempts).toFixed(3),
          topClimate: resultData.climateId, // simplified — last seen
          topSoil: resultData.soilId,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      // 3) Climate×Soil matrix
      const matrixKey = `${resultData.climateId}_${resultData.soilId}`;
      const matrixRef = doc(db, 'analytics', `matrix_${matrixKey}`);
      const matrixSnap = await getDoc(matrixRef);
      const mx = matrixSnap.exists() ? matrixSnap.data() : {};

      const mxGames = (mx.totalGames || 0) + 1;
      const mxProfitSum = (mx.profitSum || 0) + (resultData.profit || 0);

      await setDoc(matrixRef, {
        climateId: resultData.climateId,
        soilId: resultData.soilId,
        climateName: resultData.climateName,
        soilName: resultData.soilName,
        totalGames: mxGames,
        profitSum: mxProfitSum,
        avgProfit: Math.round(mxProfitSum / mxGames),
        updatedAt: serverTimestamp(),
      }, { merge: true });

    } catch (error) {
      console.error('통계 업데이트 실패 (비치명적):', error);
    }
  }

  // ===== Leaderboard =====
  async saveToLeaderboard(resultData, resultId) {
    try {
      const lbRef = doc(db, 'leaderboard', resultId);
      await setDoc(lbRef, {
        uid: resultData.uid,
        displayName: resultData.displayName,
        grade: resultData.grade,
        profit: resultData.profit,
        totalDays: resultData.totalDays,
        climateName: resultData.climateName,
        soilName: resultData.soilName,
        harvestCount: resultData.harvestCount,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('리더보드 저장 실패:', error);
    }
  }

  async getLeaderboard(limitCount = 10) {
    try {
      const q = query(
        collection(db, 'leaderboard'),
        orderBy('profit', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('리더보드 로드 실패:', error);
      return [];
    }
  }

  // ===== User game history =====
  async getUserGames(limitCount = 10) {
    const uid = authService.getUid();
    if (!uid) return [];

    try {
      const q = query(
        collection(db, 'users', uid, 'games'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('게임 기록 로드 실패:', error);
      return [];
    }
  }

  // ===== User profile =====
  async getUserProfile() {
    const uid = authService.getUid();
    if (!uid) return null;

    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error('프로필 로드 실패:', error);
      return null;
    }
  }

  // ===== Global Analytics Readers =====
  async getGlobalSummary() {
    try {
      const snap = await getDoc(doc(db, 'analytics', 'global_summary'));
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      console.error('글로벌 통계 로드 실패:', error);
      return null;
    }
  }

  async getCropStats(cropId) {
    try {
      const snap = await getDoc(doc(db, 'analytics', `crop_${cropId}`));
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      return null;
    }
  }

  async getAllCropStats() {
    const cropIds = Object.keys(REAL_YIELD_BENCHMARKS);
    const results = {};
    for (const id of cropIds) {
      results[id] = await this.getCropStats(id);
    }
    return results;
  }

  // ===== Helpers =====
  betterGrade(a, b) {
    const order = ['S', 'A', 'B', 'C', 'D'];
    if (!a) return b;
    if (!b) return a;
    return order.indexOf(a) <= order.indexOf(b) ? a : b;
  }
}

export const dbService = new DatabaseService();
export { REAL_YIELD_BENCHMARKS };
