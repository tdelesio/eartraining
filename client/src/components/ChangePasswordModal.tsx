import React, { useState } from 'react';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { soundEngine } from '../audio/soundEngine';

export const ChangePasswordModal: React.FC = () => {
  const { changePassword, user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      soundEngine.playErrorSound();
      return;
    }

    if (newPassword === 'password') {
      setErrorMsg('Please choose a different password than "password".');
      soundEngine.playErrorSound();
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      soundEngine.playErrorSound();
      return;
    }

    setLoading(true);
    try {
      await changePassword(newPassword);
      soundEngine.playSuccessChime();
    } catch (err: any) {
      soundEngine.playErrorSound();
      setErrorMsg(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border-4 border-amber-300 select-none animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-4 text-amber-600">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Change Password Required</h2>
            <p className="text-xs font-semibold text-slate-500">First-time login security setup</p>
          </div>
        </div>

        <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800 font-medium leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Welcome, <strong>{user?.display_name || user?.username}</strong>! For your account's security, please set a new personal password before accessing Cadence.
          </span>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              placeholder="Enter new password (min. 6 characters)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-[0_4px_0_0_#d97706] duo-btn-push flex items-center justify-center gap-2"
          >
            {loading ? 'Saving...' : 'Set Password & Enter Cadence'}
          </button>
        </form>
      </div>
    </div>
  );
};
