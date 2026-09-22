import React, { useState } from 'react';
import { Sparkles, Heart, Shield, Volume2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { soundEngine } from '../audio/soundEngine';
import type { SoundPreset } from '../audio/soundEngine';

export const ShopModal: React.FC = () => {
  const { user, setUser, setSoundPreset } = useAuth();
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const gems = user?.gems || 0;
  const currentSound = user?.sound_preset || 'grand_piano';

  const handleBuy = async (itemType: string, cost: number) => {
    if (gems < cost) {
      soundEngine.playErrorSound();
      setFeedbackMsg('Not enough gems! Complete lessons to earn more. 💎');
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    try {
      soundEngine.playSuccessChime();
      const res = await api.purchaseShopItem(itemType);
      if (res.user) setUser(res.user);
      setFeedbackMsg(res.message);
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (e: any) {
      soundEngine.playErrorSound();
      setFeedbackMsg(e.message || 'Purchase failed');
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  const previewSound = (preset: SoundPreset) => {
    const prev = soundEngine.getPreset();
    soundEngine.setPreset(preset);
    soundEngine.playChord(['C4', 'E4', 'G4', 'B4'], 1.2, 0.08);
    setTimeout(() => {
      soundEngine.setPreset(prev);
    }, 1500);
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-[480px] mx-auto select-none">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 border border-sky-300 text-sky-800 text-xs font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 fill-sky-500 text-sky-500" />
          <span>Cadence Music Shop</span>
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gems & Upgrades</h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Use your earned gems to protect streaks and unlock instrument timbres
        </p>
      </div>

      {/* Floating feedback message */}
      {feedbackMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-500 text-white font-extrabold text-xs text-center shadow-md animate-in fade-in">
          {feedbackMsg}
        </div>
      )}

      {/* Section 1: Power-ups */}
      <div className="mb-6">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 px-1">
          Power-Ups
        </h3>

        <div className="flex flex-col gap-3">
          {/* Refill Hearts */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
                <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Refill Hearts</h4>
                <p className="text-xs font-medium text-slate-500">Restore your lives back to 5/5</p>
              </div>
            </div>

            <button
              onClick={() => handleBuy('full_hearts', 100)}
              disabled={(user?.hearts || 0) >= 5}
              className={`px-3 py-2 rounded-xl font-black text-xs duo-btn-push flex items-center gap-1 ${
                (user?.hearts || 0) >= 5
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_3px_0_0_#be123c]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              <span>100</span>
            </button>
          </div>

          {/* Streak Freeze */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-slate-800 text-sm">Streak Freeze 🧊</h4>
                  <span className="text-[10px] font-black bg-cyan-100 text-cyan-800 px-1.5 py-0.2 rounded-full">
                    Owned: {user?.streak_freezes || 0}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500">
                  Protects your streak if you miss a day
                </p>
              </div>
            </div>

            <button
              onClick={() => handleBuy('streak_freeze', 150)}
              className="px-3 py-2 rounded-xl font-black text-xs bg-cyan-500 hover:bg-cyan-600 text-white shadow-[0_3px_0_0_#0891b2] duo-btn-push flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              <span>150</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Instrument Sound Timbres */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 px-1">
          Synthesizer Instrument Themes
        </h3>

        <div className="flex flex-col gap-3">
          {[
            {
              id: 'grand_piano',
              title: 'Concert Grand Piano',
              desc: 'Harmonic acoustic piano with hammer strike',
              icon: '🎹',
              cost: 0
            },
            {
              id: 'rhodes',
              title: 'Vintage Rhodes Piano',
              desc: 'Smooth electric bell tines with FM warmth',
              icon: '🎶',
              cost: 200
            },
            {
              id: 'synth',
              title: 'Warm Analog Synth',
              desc: 'Sub-bass Sawtooth with low-pass filter',
              icon: '🎛️',
              cost: 200
            },
            {
              id: 'marimba',
              title: 'Concert Marimba',
              desc: 'Crisp wooden mallets and organic decay',
              icon: '🪵',
              cost: 200
            }
          ].map((inst) => {
            const isActive = currentSound === inst.id;

            return (
              <div
                key={inst.id}
                className={`bg-white rounded-2xl border-2 p-4 flex items-center justify-between shadow-xs transition-all ${
                  isActive ? 'border-emerald-500 ring-2 ring-emerald-300/40' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl p-2 rounded-xl bg-slate-50 border border-slate-200">
                    {inst.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-slate-800 text-sm">{inst.title}</h4>
                      {isActive && (
                        <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-500">{inst.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => previewSound(inst.id as SoundPreset)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Preview Instrument Sound"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  {isActive ? (
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  ) : inst.cost === 0 ? (
                    <button
                      onClick={() => setSoundPreset(inst.id as SoundPreset)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold duo-btn-push shadow-[0_2px_0_0_#0f172a]"
                    >
                      Use
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(`sound_${inst.id}`, inst.cost)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black duo-btn-push shadow-[0_2px_0_0_#b45309] flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-white" />
                      <span>{inst.cost}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
