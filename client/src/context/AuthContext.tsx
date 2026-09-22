import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, DailyActivity } from '../types';
import { api, clearToken } from '../services/api';
import { soundEngine } from '../audio/soundEngine';
import type { SoundPreset } from '../audio/soundEngine';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  mustChangePassword: boolean;
  dailyHistory: DailyActivity[];
  login: (u: string, p: string) => Promise<void>;
  register: (u: string, p: string, name?: string, email?: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  claimAccount: (u: string, p: string, name?: string, email?: string) => Promise<void>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  refreshProfile: () => Promise<void>;
  setSoundPreset: (preset: SoundPreset) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dailyHistory, setDailyHistory] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const initAuth = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setDailyHistory(data.dailyHistory || []);
      if (data.user.sound_preset) {
        soundEngine.setPreset(data.user.sound_preset as SoundPreset);
      }
    } catch (err) {
      // If no valid session, auto-create guest session for instant play
      try {
        const guestData = await api.guestLogin();
        setUser(guestData.user);
      } catch (e) {
        console.error('Guest creation fallback failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (u: string, p: string) => {
    const res = await api.login(u, p);
    setUser(res.user);
    if (res.user.sound_preset) {
      soundEngine.setPreset(res.user.sound_preset as SoundPreset);
    }
  };

  const register = async (u: string, p: string, name?: string, email?: string) => {
    const res = await api.register(u, p, name, email);
    setUser(res.user);
  };

  const changePassword = async (newPassword: string) => {
    const res = await api.changePassword(newPassword);
    setUser(res.user);
  };

  const continueAsGuest = async () => {
    const res = await api.guestLogin();
    setUser(res.user);
  };

  const claimAccount = async (u: string, p: string, name?: string, email?: string) => {
    const res = await api.claimAccount(u, p, name, email);
    setUser(res.user);
  };

  const logout = () => {
    clearToken();
    continueAsGuest();
  };

  const refreshProfile = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setDailyHistory(data.dailyHistory || []);
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  };

  const setSoundPreset = async (preset: SoundPreset) => {
    soundEngine.setPreset(preset);
    if (user) {
      setUser(prev => prev ? { ...prev, sound_preset: preset } : null);
      try {
        await api.updateProfile({ soundPreset: preset });
      } catch (e) {
        // ignore
      }
    }
  };

  const isAdmin = Boolean(user && user.role === 'admin');
  const mustChangePassword = Boolean(user && (user.must_change_password === 1 || user.must_change_password === true));

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        mustChangePassword,
        dailyHistory,
        login,
        register,
        changePassword,
        continueAsGuest,
        claimAccount,
        logout,
        setUser,
        refreshProfile,
        setSoundPreset
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
