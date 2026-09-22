import type { User, AdminUser, Unit, Question, LeaderboardUser, DailyActivity } from '../types';

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
    const res = await apiFetch<{ user: User; token: string; mustChangePassword?: boolean }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName, email })
    });
    setToken(res.token);
    return res;
  },

  async login(identifier: string, password: string) {
    const res = await apiFetch<{ user: User; token: string; mustChangePassword?: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    setToken(res.token);
    return res;
  },

  async changePassword(newPassword: string) {
    const res = await apiFetch<{ success: boolean; user: User; token: string; mustChangePassword: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword })
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

  async claimAccount(username: string, password: string, displayName?: string, email?: string) {
    const res = await apiFetch<{ user: User; token: string }>('/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName, email })
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
    }>('/progress/complete-lesson', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async refillHeart() {
    return apiFetch<{ user: User }>('/shop/refill-hearts', {
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
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async getLeaderboard() {
    return apiFetch<{ leaderboard: LeaderboardUser[] }>('/leaderboard');
  },

  // ==========================================
  // ADMIN API METHODS
  // ==========================================
  async getAdminUsers() {
    return apiFetch<{ users: AdminUser[] }>('/admin/users');
  },

  async updateUserRole(userId: number, role: 'user' | 'admin') {
    return apiFetch<{ user: User }>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  },

  async getAdminCurriculum() {
    return apiFetch<{ curriculum: Unit[] }>('/admin/curriculum');
  },

  async createUnit(data: { title: string; subtitle: string; icon?: string; color?: string }) {
    return apiFetch<{ unit: Unit }>('/admin/units', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateUnit(unitId: number, data: { title?: string; subtitle?: string; icon?: string; color?: string }) {
    return apiFetch<{ unit: Unit }>(`/admin/units/${unitId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteUnit(unitId: number) {
    return apiFetch<{ success: boolean }>(`/admin/units/${unitId}`, {
      method: 'DELETE'
    });
  },

  async reorderUnits(unitIds: number[]) {
    return apiFetch<{ success: boolean }>('/admin/units/reorder', {
      method: 'POST',
      body: JSON.stringify({ unitIds })
    });
  },

  async createLesson(unitId: number, data: { title: string; description: string; type: string; config?: any; xpReward?: number }) {
    return apiFetch<{ lesson: any }>(`/admin/units/${unitId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateLesson(lessonId: number, data: { title?: string; description?: string; type?: string; config?: any; xpReward?: number }) {
    return apiFetch<{ lesson: any }>(`/admin/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteLesson(lessonId: number) {
    return apiFetch<{ success: boolean }>(`/admin/lessons/${lessonId}`, {
      method: 'DELETE'
    });
  },

  async reorderLessons(lessonIds: number[]) {
    return apiFetch<{ success: boolean }>('/admin/lessons/reorder', {
      method: 'POST',
      body: JSON.stringify({ lessonIds })
    });
  },

  async previewQuestion(type: string, config: any) {
    return apiFetch<{ question: Question }>('/admin/preview-question', {
      method: 'POST',
      body: JSON.stringify({ type, config })
    });
  }
};
