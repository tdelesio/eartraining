import React from 'react';
import { Zap, Flame, Trophy, Play } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { useAuth } from '../context/AuthContext';

interface DailyChallengeProps {
  onStartChallenge: () => void;
}

export const DailyChallenge: React.FC<DailyChallengeProps> = ({ onStartChallenge }) => {
  const { user, dailyHistory } = useAuth();
  const streak = user?.streak_days || 0;
  const dailyGoal = user?.daily_goal_xp || 30;
  const todayRecord = dailyHistory?.[0];
  const todayXp = todayRecord?.xp_earned || 0;
  const isQuotaMet = todayXp >= dailyGoal;

  return (
    <div className="pb-28 pt-4 px-4 max-w-[480px] mx-auto select-none">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-black uppercase tracking-wider mb-2">
          <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>Daily Ear Workout</span>
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Daily Streak Quest</h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Complete your daily ear training to preserve your {streak}-day streak!
        </p>
      </div>

      {/* Hero Streak Card */}
      <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden mb-6">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider bg-black/20 px-2.5 py-1 rounded-full backdrop-blur-xs">
              Daily Quota
            </span>
            <div className="text-3xl font-black mt-2">
              {todayXp} / {dailyGoal} <span className="text-sm font-bold text-amber-100">XP</span>
            </div>
            <p className="text-xs text-amber-100 font-medium mt-1">
              {isQuotaMet
                ? '🎉 Daily goal accomplished! Your streak is secured!'
                : `Earn ${Math.max(0, dailyGoal - todayXp)} more XP today to maintain your streak.`}
            </p>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Flame className="w-10 h-10 text-yellow-200 fill-yellow-200 animate-bounce" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/20 h-3 rounded-full mt-4 overflow-hidden relative z-10">
          <div
            className="bg-white h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.round((todayXp / dailyGoal) * 100))}%` }}
          />
        </div>
      </div>

      {/* Bonus Challenge Card */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl">
            ⚡
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Rapid Fire Daily Drill</h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              🔥 2X Bonus XP
            </span>
          </div>
        </div>
        <p className="text-xs font-medium text-slate-500 mb-4">
          A high-energy mix of pitch direction, solfège recognition, and chord qualities. Takes only 2 minutes!
        </p>

        <button
          onClick={() => {
            soundEngine.playSuccessChime();
            onStartChallenge();
          }}
          className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-[0_5px_0_0_#d97706] duo-btn-push flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Launch Today's Drill</span>
        </button>
      </div>

      {/* Motivation Tip */}
      <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-medium flex items-start gap-2.5">
        <Trophy className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <p>
          <strong>Scientific Fact:</strong> Ear training is like muscle memory. 5 minutes every day produces 10x better relative pitch results than 1 hour once a week!
        </p>
      </div>
    </div>
  );
};
