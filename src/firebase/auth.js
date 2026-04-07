// Firebase Auth Service
import { auth, googleProvider } from './config.js';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth';
import { eventBus } from '../utils/EventBus.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this._readyResolve = null;
    this.ready = new Promise(resolve => { this._readyResolve = resolve; });

    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      if (this._readyResolve) {
        this._readyResolve(user);
        this._readyResolve = null;
      }
      eventBus.emit('auth_changed', user);
    });
  }

  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Google 로그인 실패:', error);
      throw error;
    }
  }

  async signInAsGuest() {
    try {
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (error) {
      console.error('게스트 로그인 실패:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await signOut(auth);
      this.currentUser = null;
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  }

  getUser() {
    return this.currentUser;
  }

  getUid() {
    return this.currentUser?.uid || null;
  }

  getDisplayName() {
    if (!this.currentUser) return '게스트';
    return this.currentUser.displayName || this.currentUser.email || '익명 농부';
  }

  getPhotoURL() {
    return this.currentUser?.photoURL || null;
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  isAnonymous() {
    return this.currentUser?.isAnonymous || false;
  }
}

export const authService = new AuthService();
