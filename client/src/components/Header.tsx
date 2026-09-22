import React from 'react';
import { Flame, Heart, Sparkles, User as UserIcon, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundEngine } from '../audio/soundEngine';

interface HeaderProps {
  onOpenProfile: () => void;
  onOpenShop: () => void;
  onOpenAdmin?: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  todayXp?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenProfile,
  onOpenShop,
  onOpenAdmin,
  onOpenAuth,
  todayXp = 0
}) => {
  const { user, dailyHistory, isAdmin, isGuest } = useAuth();

  const streak = user?.streak_days || 0;
  const gems = user?.gems || 0;
  const hearts = user?.hearts ?? 5;
  const maxHearts = user?.max_hearts ?? 5;
  const dailyGoal = user?.daily_goal_xp || 30;

  // Calculate today's XP from daily history if available
  const todayRecord = dailyHistory?.[0];
  const currentDailyXp = todayXp > 0 ? todayXp : (todayRecord?.xp_earned || 0);
  const goalPercent = Math.min(100, Math.round((currentDailyXp / dailyGoal) * 100));

  return (
    <div className="sticky top-0 z-30">
      {/* Obvious Guest Mode Top Banner */}
      {isGuest && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold py-1.5 px-3 flex items-center justify-between shadow-2xs select-none">
          <div className="flex items-center gap-1.5 truncate">
            <span>⚠️</span>
            <span>
              <strong className="font-black">Guest Mode:</strong> Progress & streaks are not saved
            </span>
          </div>
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onOpenAuth('register');
            }}
            className="ml-2 shrink-0 px-2.5 py-0.5 rounded-full bg-white text-amber-700 font-black text-[11px] shadow-xs hover:bg-amber-50 transition-colors cursor-pointer"
          >
            Join Free / Sign In
          </button>
        </div>
      )}

      {/* Main Header Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 flex items-center justify-between select-none">
        {/* Brand */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => soundEngine.playButtonClick()}>
          <span className="text-2xl animate-pulse-subtle">🎵</span>
          <span className="font-extrabold text-xl tracking-tight text-emerald-600">CADENCE</span>
        </div>

        {/* Stats Counters & Auth Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin Portal Button (Only visible to Admins) */}
          {isAdmin && onOpenAdmin && (
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onOpenAdmin();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-black text-xs transition-colors shadow-2xs cursor-pointer"
              title="Music Teacher & Admin Dashboard"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline">Admin CMS</span>
            </button>
          )}

          {/* Streak Flame */}
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              if (isGuest) {
                onOpenAuth('register');
              } else {
                onOpenProfile();
              }
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl border transition-colors cursor-pointer ${
              isGuest ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-orange-50 hover:bg-orange-100 border-orange-200'
            }`}
            title={isGuest ? 'Log in or join to track streaks' : `${streak} Day Streak!`}
          >
            <Flame className={`w-5 h-5 ${streak > 0 && !isGuest ? 'text-orange-500 fill-orange-500 animate-bounce' : 'text-slate-400'}`} />
            <span className={`text-sm font-black ${streak > 0 && !isGuest ? 'text-orange-600' : 'text-slate-500'}`}>
              {isGuest ? '-' : streak}
            </span>
          </button>

          {/* Gems */}
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onOpenShop();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
            title={`${gems} Gems available`}
          >
            <Sparkles className="w-4 h-4 text-sky-500 fill-sky-400" />
            <span className="text-sm font-black text-sky-600">{gems}</span>
          </button>

          {/* Hearts */}
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onOpenShop();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
            title={`${hearts}/${maxHearts} Hearts`}
          >
            <Heart className={`w-4 h-4 ${hearts > 0 ? 'text-rose-500 fill-rose-500' : 'text-slate-300'}`} />
            <span className="text-sm font-black text-rose-600">{hearts}</span>
          </button>

          {/* Daily XP Circular Indicator */}
          {!isGuest && (
            <div
              className="relative w-8 h-8 flex items-center justify-center cursor-pointer group"
              onClick={() => {
                soundEngine.playButtonClick();
                onOpenProfile();
              }}
              title={`Daily Goal: ${currentDailyXp}/${dailyGoal} XP (${goalPercent}%)`}
            >
              <svg className="w-8 h-8 -rotate-90">
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  className="text-slate-200 stroke-current"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  className="text-emerald-500 stroke-current transition-all duration-500"
                  strokeWidth="3.5"
                  strokeDasharray={81.68}
                  strokeDashoffset={81.68 - (81.68 * goalPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-[10px] font-black text-slate-700">
                {goalPercent >= 100 ? '✓' : `${goalPercent}%`}
              </span>
            </div>
          )}

          {/* Obvious Guest Action vs Member Profile Avatar */}
          {isGuest ? (
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onOpenAuth('register');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-[0_2px_0_0_#047857] duo-btn-push cursor-pointer"
              title="Create an account to save progress"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Join Free</span>
            </button>
          ) : (
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onOpenProfile();
              }}
              className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
              title="View Profile & Settings"
            >
              {user?.avatar ? (
                <span className="text-base leading-none">{user.avatar}</span>
              ) : (
                <UserIcon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          )}
        </div>
      </header>
    </div>
  );
};
