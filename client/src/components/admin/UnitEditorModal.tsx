import React, { useState } from 'react';
import { X, Save, Palette } from 'lucide-react';
import type { Unit } from '../../types';
import { api } from '../../services/api';
import { soundEngine } from '../../audio/soundEngine';

interface UnitEditorModalProps {
  unit?: Unit | null;
  onClose: () => void;
  onSaved: () => void;
}

const PRESET_ICONS = ['🎵', '🎼', '🎹', '🎧', '🎺', '🎸', '🎻', '🥁', '🌟', '🏆', '💡', '🎓', '🔥', '✨'];
const PRESET_COLORS = [
  '#58cc02', // Duolingo Green
  '#1cb0f6', // Duolingo Blue
  '#ff9600', // Duolingo Orange
  '#ce82ff', // Duolingo Purple
  '#ff4b4b', // Duolingo Red
  '#2b70c9', // Deep Blue
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#8b5cf6'  // Violet
];

export const UnitEditorModal: React.FC<UnitEditorModalProps> = ({ unit, onClose, onSaved }) => {
  const isEditing = Boolean(unit);
  const [title, setTitle] = useState(unit?.title || '');
  const [subtitle, setSubtitle] = useState(unit?.subtitle || '');
  const [icon, setIcon] = useState(unit?.icon || '🎵');
  const [color, setColor] = useState(unit?.color || '#58cc02');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subtitle.trim()) {
      setErrorMsg('Title and subtitle are required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (isEditing && unit) {
        await api.updateUnit(unit.id, { title, subtitle, icon, color });
      } else {
        await api.createUnit({ title, subtitle, icon, color });
      }
      soundEngine.playSuccessChime();
      onSaved();
    } catch (err: any) {
      soundEngine.playErrorSound();
      setErrorMsg(err.message || 'Failed to save unit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-2 border-slate-200 select-none animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <h2 className="text-xl font-black text-slate-800">
              {isEditing ? `Edit Unit ${unit?.id}` : 'Create New Unit'}
            </h2>
          </div>
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Unit Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Unit 8: Extended Jazzy Chords"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Unit Subtitle / Learning Goal
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Master Major 7th, Minor 7th, and Dominant 7th voicings"
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Icon Emoji
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_ICONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setIcon(emoji);
                  }}
                  className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center border-2 transition-all ${
                    icon === emoji
                      ? 'border-emerald-500 bg-emerald-50 scale-110 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or type custom emoji"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              className="w-24 px-3 py-1.5 rounded-xl border-2 border-slate-200 text-sm font-bold text-center focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Theme Color
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setColor(c);
                  }}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c ? 'ring-4 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'
                  }`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-8 h-8 rounded-full border-0 cursor-pointer"
                title="Custom color"
              />
            </div>
          </div>

          {/* Live Preview Card */}
          <div
            style={{ backgroundColor: color }}
            className="p-4 rounded-2xl text-white shadow-md flex items-center gap-3 mt-1"
          >
            <div className="text-3xl">{icon}</div>
            <div>
              <div className="text-xs uppercase font-black opacity-80">Unit Preview</div>
              <div className="text-base font-black leading-tight">{title || 'Unit Title'}</div>
              <div className="text-xs opacity-90">{subtitle || 'Unit Subtitle'}</div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-[0_3px_0_0_#047857] duo-btn-push flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : isEditing ? 'Update Unit' : 'Create Unit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
