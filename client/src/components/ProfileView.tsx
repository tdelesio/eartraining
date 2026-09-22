import React, { useState } from 'react';
import { Flame, Sparkles, Trophy, Calendar, Shield, Settings, LogOut, UserPlus, Check, ShieldCheck, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { soundEngine } from '../audio/soundEngine';

interface ProfileViewProps {
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenAdmin?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenAuth, onOpenAdmin }) => {
  const { user, dailyHistory, logout, setUser, isAdmin, isGuest } = useAuth();
  const [dailyGoal, setDailyGoal] = useState<number>(user?.daily_goal_xp || 30);
  const [savedGoalMsg, setSavedGoalMsg] = useState(false);

  const handleUpdateGoal = async (newGoal: number) => {
    soundEngine.playButtonClick();
    setDailyGoal(newGoal);
    try {
      const res = await api.updateProfile({ dailyGoalXp: newGoal });
      if (res.user) setUser(res.user);
      setSavedGoalMsg(true);
      setTimeout(() => setSavedGoalMsg(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-[480px] mx-auto select-none">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 mb-5 shadow-sm text-center relative">
        <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-white shadow-md mx-auto flex items-center justify-center text-4xl mb-3">
          {isGuest ? '👤' : (user?.avatar || '🎧')}
        </div>

        <h2 className="text-xl font-black text-slate-800">
          {isGuest ? 'Guest Musician' : (user?.display_name || 'Maestro')}
        </h2>
        <div className="flex items-center justify-center gap-1.5 mt-0.5">
          <p className="text-xs font-bold text-slate-400">
            {isGuest ? '@guest' : `@${user?.username || 'user'}`}
          </p>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
              <ShieldCheck className="w-3 h-3" />
              Admin
            </span>
          )}
        </div>

        {/* Admin Shortcut in Profile if user is admin */}
        {isAdmin && onOpenAdmin && (
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onOpenAdmin();
            }}
            className="mt-3 w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 text-purple-700 font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Open Music Teacher & Admin Portal</span>
          </button>
        )}

        {isGuest && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-left">
            <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
              <span>⚠️</span>
              <span>Guest Mode — Progress Not Saved</span>
            </div>
            <p className="text-xs text-amber-800 font-medium mt-1 leading-relaxed">
              You are currently playing as a guest. Your scores, streaks, and lesson completions are <strong>not tracked</strong>. Join Cadence for free to record your ear training journey!
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  onOpenAuth('register');
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs duo-btn-push flex items-center justify-center gap-1.5 shadow-[0_3px_0_0_#047857] cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Free Account</span>
              </button>
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  onOpenAuth('login');
                }}
                className="py-2.5 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Matrix */}
      <div className="mb-6">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 px-1">
          {isGuest ? 'Mastery Statistics (Disabled in Guest Mode)' : 'Mastery Statistics'}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-500">
              <Flame className="w-5 h-5 fill-orange-500" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">Streak</span>
              <span className="text-lg font-black text-slate-800">
                {isGuest ? '-' : `${user?.streak_days || 0} Days`}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-slate-200 p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
              <Trophy className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">Best Streak</span>
              <span className="text-lg font-black text-slate-800">
                {isGuest ? '-' : `${user?.longest_streak || 0} Days`}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-slate-200 p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500">
              <Sparkles className="w-5 h-5 fill-emerald-500" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">Total XP</span>
              <span className="text-lg font-black text-slate-800">
                {isGuest ? '-' : (user?.xp || 0)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-slate-200 p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">Freezes</span>
              <span className="text-lg font-black text-slate-800">
                {isGuest ? '-' : `${user?.streak_freezes || 0} Active`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Calendar / Activity */}
      {!isGuest && (
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h3 className="font-extrabold text-slate-800 text-sm">Recent Activity</h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">Last 14 Days</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 14 }).map((_, idx) => {
              const dateObj = new Date();
              dateObj.setDate(dateObj.getDate() - (13 - idx));
              const dateStr = dateObj.toISOString().split('T')[0];
              const record = dailyHistory.find(d => d.date === dateStr);
              const isCompleted = record && record.xp_earned > 0;
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });

              return (
                <div
                  key={dateStr}
                  className={`p-1.5 rounded-xl border text-center transition-all ${
                    isCompleted
                      ? 'bg-orange-50 border-orange-300 text-orange-600'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                  title={`${dateStr}: ${record?.xp_earned || 0} XP`}
                >
                  <span className="text-[10px] font-black block">{dayName}</span>
                  <span className="text-sm mt-0.5 block">
                    {isCompleted ? '🔥' : '·'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily XP Goal Setting */}
      {!isGuest && (
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" />
              <h3 className="font-extrabold text-slate-800 text-sm">Daily Goal Quota</h3>
            </div>
            {savedGoalMsg && (
              <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved!
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Casual', xp: 20 },
              { label: 'Regular', xp: 30 },
              { label: 'Serious', xp: 60 },
              { label: 'Intense', xp: 100 }
            ].map(goal => (
              <button
                key={goal.xp}
                onClick={() => handleUpdateGoal(goal.xp)}
                className={`p-2.5 rounded-2xl border-2 text-center transition-all duo-btn-push cursor-pointer ${
                  dailyGoal === goal.xp
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[0_2px_0_0_#059669]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-black block">{goal.label}</span>
                <span className="text-xs font-extrabold mt-0.5 block">{goal.xp} XP</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Account Actions */}
      <div className="flex flex-col gap-2">
        {!isGuest ? (
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              logout();
            }}
            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        ) : (
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onOpenAuth('register');
            }}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-colors shadow-[0_3px_0_0_#0f172a] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Free Account / Sign In</span>
          </button>
        )}
      </div>
    </div>
  );
};
