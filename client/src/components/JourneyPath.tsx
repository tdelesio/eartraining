import React from 'react';
import { Star, Lock, Play, Gift } from 'lucide-react';
import type { Unit, Level } from '../types';
import { soundEngine } from '../audio/soundEngine';
import { useAuth } from '../context/AuthContext';

interface JourneyPathProps {
  units: Unit[];
  onStartLesson: (unitId: number, level: Level) => void;
}

export const JourneyPath: React.FC<JourneyPathProps> = ({ units, onStartLesson }) => {
  const { isGuest } = useAuth();

  // Offsets for the authentic winding path
  const getHorizontalOffsetClass = (index: number) => {
    const cycle = index % 4;
    if (cycle === 0) return 'translate-x-0';
    if (cycle === 1) return '-translate-x-12';
    if (cycle === 2) return 'translate-x-0';
    return 'translate-x-12';
  };

  return (
    <div className="pb-28 pt-3 px-4 max-w-[480px] mx-auto select-none">
      {isGuest && (
        <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-2xs flex items-center gap-3">
          <span className="text-2xl shrink-0">👤</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">
              Playing as Guest
            </h3>
            <p className="text-xs text-amber-800 font-medium leading-snug">
              Explore lessons freely. Scores and daily streaks are not saved for guests.
            </p>
          </div>
        </div>
      )}
      {units.map((unit, unitIdx) => {
        const completedLevelsInUnit = unit.levels.filter(l => l.completed).length;
        const totalLevels = unit.levels.length;
        const unitProgressPct = Math.round((completedLevelsInUnit / totalLevels) * 100);

        return (
          <div key={unit.id} className="mb-10 last:mb-2">
            {/* Unit Header Banner */}
            <div
              className="rounded-2xl p-4 text-white shadow-md relative overflow-hidden mb-6"
              style={{ backgroundColor: unit.color }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{unit.icon}</span>
                    <h2 className="text-lg font-black tracking-tight">{unit.title}</h2>
                  </div>
                  <p className="text-xs font-semibold text-white/90 mt-1 max-w-[280px]">
                    {unit.subtitle}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold bg-black/20 px-2 py-1 rounded-full inline-block backdrop-blur-sm">
                    {completedLevelsInUnit}/{totalLevels} Done
                  </div>
                </div>
              </div>

              {/* Progress bar inside unit */}
              <div className="w-full bg-black/20 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-500 rounded-full"
                  style={{ width: `${unitProgressPct}%` }}
                />
              </div>
            </div>

            {/* Stepping Stones / Path Nodes */}
            <div className="flex flex-col items-center gap-5 relative">
              {unit.levels.map((level, levelIdx) => {
                const offsetClass = getHorizontalOffsetClass(levelIdx);
                const isCompleted = level.completed;
                const isUnlocked = level.unlocked !== false; // if undefined or true

                return (
                  <div
                    key={level.id}
                    className={`flex flex-col items-center transition-transform duration-200 ${offsetClass}`}
                  >
                    <button
                      onClick={() => {
                        if (isUnlocked) {
                          soundEngine.playButtonClick();
                          onStartLesson(unit.id, level);
                        } else {
                          soundEngine.playErrorSound();
                        }
                      }}
                      disabled={!isUnlocked}
                      className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center duo-btn-push transition-all ${
                        isCompleted
                          ? 'bg-amber-400 border-4 border-amber-500 shadow-[0_6px_0_0_#d97706]'
                          : isUnlocked
                          ? 'bg-emerald-500 border-4 border-emerald-600 shadow-[0_6px_0_0_#059669] animate-pulse-subtle'
                          : 'bg-slate-200 border-4 border-slate-300 shadow-[0_5px_0_0_#cbd5e1] cursor-not-allowed'
                      }`}
                    >
                      {/* Inner Node Icon */}
                      {isCompleted ? (
                        <div className="flex flex-col items-center">
                          <Star className="w-8 h-8 text-white fill-white" />
                          <div className="flex gap-0.5 mt-0.5">
                            {[1, 2, 3].map(s => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  (level.stars || 3) >= s
                                    ? 'text-white fill-white'
                                    : 'text-amber-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      ) : isUnlocked ? (
                        <Play className="w-8 h-8 text-white fill-white translate-x-0.5" />
                      ) : (
                        <Lock className="w-7 h-7 text-slate-400" />
                      )}
                    </button>

                    {/* Level Label / Title Pill */}
                    <div className="mt-2 text-center max-w-[150px]">
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-full inline-block ${
                          isUnlocked
                            ? 'text-slate-800 bg-white border border-slate-200 shadow-xs'
                            : 'text-slate-400'
                        }`}
                      >
                        {level.title}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* End of Unit Milestone Chest */}
              <div className="my-2 flex flex-col items-center">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all ${
                    completedLevelsInUnit === totalLevels
                      ? 'bg-amber-100 border-amber-400 text-amber-600 shadow-md'
                      : 'bg-slate-100 border-slate-300 text-slate-400'
                  }`}
                >
                  <Gift className="w-8 h-8" />
                </div>
                <span className="text-[11px] font-bold text-slate-500 mt-1">
                  {completedLevelsInUnit === totalLevels ? 'Unit Mastered! 🏆' : `Master Unit ${unitIdx}`}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
