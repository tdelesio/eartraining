import type { User, Unit, Question, LeaderboardUser, DailyActivity } from '../types';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('cadence_token');
}

export function setToken(token: string) {
  localStorage.setItem('cadence_token', token);
}

export function clearToken() {
  localStorage.removeItem('cadence_token');
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    let errMsg = `API error: ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errMsg = data.error;
    } catch (e) {
      // ignore
    }
    throw new Error(errMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  async register(username: string, password: string, displayName?: string, email?: string) {
    const res = await apiFetch<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName, email })
    });
    setToken(res.token);
    return res;
  },

  async login(username: string, password: string) {
    const res = await apiFetch<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setToken(res.token);
    return res;
  },

  async guestLogin() {
    const res = await apiFetch<{ user: User; token: string }>('/auth/guest', {
      method: 'POST'
    });
    setToken(res.token);
    return res;
  },

  async claimAccount(username: string, password: string, displayName?: string) {
    const res = await apiFetch<{ user: User; token: string }>('/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName })
    });
    setToken(res.token);
    return res;
  },

  async getMe() {
    return apiFetch<{ user: User; progress: any[]; dailyHistory: DailyActivity[] }>('/auth/me');
  },

  // Curriculum & Practice
  async getCurriculum() {
    return apiFetch<{ units: Unit[] }>('/curriculum');
  },

  async getLessonQuestions(unitId: number, levelId: number) {
    return apiFetch<{ unit: { id: number; title: string; color: string }; level: any; questions: Question[] }>(
      `/curriculum/unit/${unitId}/level/${levelId}`
    );
  },

  async getCustomPractice(mode: 'notes' | 'chords', subType: string, count: number = 8) {
    return apiFetch<{ mode: string; subType: string; questions: Question[] }>('/practice/custom', {
      method: 'POST',
      body: JSON.stringify({ mode, subType, count })
    });
  },

  async submitLesson(data: {
    unitId: number;
    levelId: number;
    score: number;
    stars: number;
    xpEarned: number;
    mistakes?: any[];
  }) {
    return apiFetch<{
      success: boolean;
      user: User;
      streakResult: any;
      progress: any[];
    }>('/lesson/complete', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async refillHeart() {
    return apiFetch<{ user: User }>('/hearts/refill', {
      method: 'POST'
    });
  },

  async purchaseShopItem(itemType: string) {
    return apiFetch<{ user: User; message: string }>('/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemType })
    });
  },

  async updateProfile(updates: { soundPreset?: string; dailyGoalXp?: number }) {
    return apiFetch<{ user: User }>('/profile/update', {
      method: 'POST',
      body: JSON.stringify(updates)
    });
  },

  async getLeaderboard() {
    return apiFetch<{ leaderboard: LeaderboardUser[] }>('/leaderboard');
  }
};
