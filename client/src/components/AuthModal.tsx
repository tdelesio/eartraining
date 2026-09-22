import React, { useState } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundEngine } from '../audio/soundEngine';

interface AuthModalProps {
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, initialMode }) => {
  const { isGuest, login, register, continueAsGuest } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(
    initialMode || (isGuest ? 'register' : 'login')
  );
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(identifier.trim(), password);
      } else {
        await register(
          username.trim().toLowerCase(),
          password,
          username.trim(),
          email.trim().toLowerCase()
        );
      }
      soundEngine.playSuccessChime();
      onClose();
    } catch (err: any) {
      soundEngine.playErrorSound();
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-2 border-slate-200 select-none animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              {mode === 'login' ? 'Welcome Back!' : 'Join as a Member'}
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              {mode === 'login'
                ? 'Sign in to access your ear training journey'
                : 'Create an account to track your progress & streaks'}
            </p>
          </div>
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-black">
          <button
            type="button"
            onClick={() => {
              soundEngine.playButtonClick();
              setMode('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playButtonClick();
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Guest Mode Notice */}
        {isGuest && mode === 'register' && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center">
            ✨ Free membership saves your scores, stats & unlocks the leaderboard!
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'login' ? (
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Username or Email
              </label>
              <input
                type="text"
                required
                placeholder="Enter username or email"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. musician@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="Choose a username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-[0_4px_0_0_#047857] duo-btn-push flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Please wait...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Free Account</span>
              </>
            )}
          </button>
        </form>

        {/* Guest switch option */}
        {!isGuest && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={async () => {
                await continueAsGuest();
                onClose();
              }}
              className="text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Continue without signing in (Guest Mode)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
