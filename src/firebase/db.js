// Firebase Firestore Database Service
import { db } from './config.js';
import {
  doc, setDoc, getDoc, getDocs,
  collection, query, orderBy, limit,
  serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { authService } from './auth.js';

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

      // Config
      climateName: stats.climate?.name?.ko || '',
      climateId: stats.climate?.id || '',
      soilName: stats.soil?.name?.ko || '',
      facilityName: stats.facility?.name?.ko || '노지',

      // Crops
      harvestCount: stats.harvestResults?.length || 0,
      deadCrops: stats.deadCrops || 0,
      harvests: (stats.harvestResults || []).map(r => ({
        cropName: r.crop.name.ko,
        cropIcon: r.crop.icon,
        yield: Math.round(r.yield || 0),
        yieldPer10a: Math.round(r.yieldPer10a || 0),
        grade: r.quality?.grade || '?',
        yieldComment: r.yieldComment || '',
      })),

      // Weather events
      weatherEventCount: stats.weatherEvents?.length || 0,
      weatherEvents: (stats.weatherEvents || []).slice(0, 20).map(e => ({
        type: e.type,
        day: e.day,
      })),

      // Plots summary
      crops: (stats.plots || []).map(p => ({
        name: p.cropName,
        icon: p.cropIcon,
        status: p.isHarvested ? 'harvested' : p.isAlive ? 'alive' : 'dead',
        health: Math.round(p.health || 0),
        daysSincePlanting: p.daysSincePlanting || 0,
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

    await setDoc(userRef, {
      displayName: authService.getDisplayName(),
      photoURL: authService.getPhotoURL() || '',
      lastPlayedAt: serverTimestamp(),
      totalGames,
      bestGrade,
      totalProfit,
      totalHarvests: (prev.totalHarvests || 0) + (stats.harvestResults?.length || 0),
    }, { merge: true });
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

  // ===== Helpers =====
  betterGrade(a, b) {
    const order = ['S', 'A', 'B', 'C', 'D'];
    if (!a) return b;
    if (!b) return a;
    return order.indexOf(a) <= order.indexOf(b) ? a : b;
  }
}

export const dbService = new DatabaseService();
