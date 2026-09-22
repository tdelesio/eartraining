import React from 'react';
import { X, Sparkles, Flame, Trophy, ShieldCheck, UserPlus, LogIn } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface GuestPromptModalProps {
  score?: number;
  onClose: () => void;
  onJoin: () => void;
  onLogin: () => void;
}

export const GuestPromptModal: React.FC<GuestPromptModalProps> = ({
  score,
  onClose,
  onJoin,
  onLogin
}) => {
  return (
    <div className="fixed inset-0 z-60 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-4 border-amber-300 select-none animate-in fade-in zoom-in duration-200 text-center relative">
        {/* Dismiss Button */}
        <button
          onClick={() => {
            soundEngine.playButtonClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration Graphic */}
        <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-amber-400 to-orange-400 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-200">
          <Sparkles className="w-9 h-9 animate-pulse" />
        </div>

        {/* Header */}
        <h2 className="text-xl font-black text-slate-800">
          {score !== undefined ? `Lesson Complete! (${score}%)` : 'Great Ear! 🎵'}
        </h2>
        <div className="mt-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 inline-block">
          <span className="text-xs font-black text-amber-800">
            ⚠️ Playing in Guest Mode
          </span>
        </div>

        <p className="text-xs text-slate-500 font-medium mt-3 px-1 leading-relaxed">
          Guest scores and daily streaks are <strong className="text-slate-700">not saved</strong>. Join Cadence for free to track your musical growth!
        </p>

        {/* Perks Checklist */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 my-4 text-left flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Flame className="w-4 h-4 text-orange-500 shrink-0" />
            <span>Build & protect your daily practice streak</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Climb the global ear training leaderboard</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Permanent progress tracking across devices</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              soundEngine.playSuccessChime();
              onJoin();
            }}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-[0_4px_0_0_#047857] duo-btn-push flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Free Account</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onLogin();
            }}
            className="w-full py-2.5 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Already have an account? Log In</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onClose();
            }}
            className="text-xs font-semibold text-slate-400 hover:text-slate-500 pt-1"
          >
            Continue as Guest (without saving)
          </button>
        </div>
      </div>
    </div>
  );
};
