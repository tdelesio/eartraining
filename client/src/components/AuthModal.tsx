import React, { useState } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundEngine } from '../audio/soundEngine';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { user, login, register, claimAccount, continueAsGuest } = useAuth();
  const isGuest = user?.is_guest === 1;

  const [mode, setMode] = useState<'login' | 'register' | 'claim'>(
    isGuest ? 'claim' : 'login'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(isGuest ? user?.display_name || '' : '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(username, password);
      } else if (mode === 'register') {
        await register(username, password, displayName || username);
      } else if (mode === 'claim') {
        await claimAccount(username, password, displayName || username);
      }
      soundEngine.playSuccessChime();
      onClose();
    } catch (err: any) {
      soundEngine.playErrorSound();
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-2 border-slate-200 select-none animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-800">
            {mode === 'login'
              ? 'Welcome Back!'
              : mode === 'register'
              ? 'Create Your Account'
              : 'Save Guest Progress'}
          </h2>
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onClose();
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
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

          {isGuest ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playButtonClick();
                setMode('claim');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'claim'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Claim Progress
            </button>
          ) : (
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
              Sign Up
            </button>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {(mode === 'register' || mode === 'claim') && (
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Display Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Ear Trainer Extraordinaire"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Choose a username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-[0_4px_0_0_#047857] duo-btn-push flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Saving...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Save & Continue</span>
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
              Continue without signing in (Guest)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
