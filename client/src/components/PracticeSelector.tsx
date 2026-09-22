import React, { useState } from 'react';
import { Volume2, Music2, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface PracticeSelectorProps {
  onStartCustomPractice: (mode: 'notes' | 'chords', subType: string) => void;
}

export const PracticeSelector: React.FC<PracticeSelectorProps> = ({ onStartCustomPractice }) => {
  const [selectedMode, setSelectedMode] = useState<'notes' | 'chords'>('notes');
  const [selectedSubType, setSelectedSubType] = useState<string>('direction');

  const noteModules = [
    {
      id: 'direction',
      title: 'Pitch Direction (Wide)',
      desc: 'Hear whether the second note went Higher ⬆️ or Lower ⬇️ (5ths & Octaves).',
      icon: '🧭',
      badge: 'Beginner'
    },
    {
      id: 'direction_close',
      title: 'Pitch Direction (Close Steps)',
      desc: 'Subtle whole tones and semitones. Can you hear the direction?',
      icon: '🔍',
      badge: 'Refined'
    },
    {
      id: 'solfege_starter',
      title: 'Do - Re - Mi (Key of C)',
      desc: 'Learn the primary 3 scale degrees of the major scale.',
      icon: '🌱',
      badge: 'Solfège'
    },
    {
      id: 'solfege_penta',
      title: 'Pentachord (Do - Re - Mi - Fa - Sol)',
      desc: 'Expand to the 5-note melodic framework.',
      icon: '🖐️',
      badge: 'Melodic'
    },
    {
      id: 'solfege_full',
      title: 'Full Diatonic Major Scale',
      desc: 'Identify all scale degrees 1 through 8 against the tonic drone.',
      icon: '🌈',
      badge: 'Full Scale'
    },
    {
      id: 'key_transposition',
      title: 'Key Transposition & Anchor Cadence',
      desc: 'Listen to a I-IV-V-I cadence in a random key, then name the degree.',
      icon: '🔑',
      badge: 'Advanced'
    }
  ];

  const chordModules = [
    {
      id: 'triad_maj_min',
      title: 'Major vs Minor Triads',
      desc: 'The fundamental harmonic duality: Bright & Happy vs Dark & Introspective.',
      icon: '🎭',
      badge: 'Triads'
    },
    {
      id: 'triad_all',
      title: 'All 4 Triad Qualities',
      desc: 'Major, Minor, Diminished (Tense), and Augmented (Dreamy).',
      icon: '🎹',
      badge: 'Harmonic'
    },
    {
      id: 'seventh_basic',
      title: 'Maj7 vs Dominant 7th',
      desc: 'Lush romantic jazz (Maj7) vs gritty blues tension (Dom7).',
      icon: '🎷',
      badge: '7th Chords'
    },
    {
      id: 'seventh_all',
      title: 'Master 7th Chords Virtuoso',
      desc: 'Identify Maj7, Dom7, Min7, Dim7, Half-Diminished (m7b5), and Aug7.',
      icon: '👑',
      badge: 'Jazz Mastery'
    }
  ];

  const currentModules = selectedMode === 'notes' ? noteModules : chordModules;

  const handleModeChange = (mode: 'notes' | 'chords') => {
    soundEngine.playButtonClick();
    setSelectedMode(mode);
    setSelectedSubType(mode === 'notes' ? 'direction' : 'triad_maj_min');
  };

  const handleStart = () => {
    soundEngine.playSuccessChime();
    onStartCustomPractice(selectedMode, selectedSubType);
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-[480px] mx-auto select-none">
      {/* Header */}
      <div className="text-center mb-5">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Focused Practice</h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Choose exactly what you want to train your ears on today
        </p>
      </div>

      {/* Mode Selector Segmented Tabs */}
      <div className="bg-slate-200/80 p-1.5 rounded-2xl flex gap-1 mb-6 border border-slate-300">
        <button
          onClick={() => handleModeChange('notes')}
          className={`flex-1 py-3 px-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            selectedMode === 'notes'
              ? 'bg-white text-emerald-600 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Music2 className="w-4 h-4" />
          <span>Note Training</span>
        </button>
        <button
          onClick={() => handleModeChange('chords')}
          className={`flex-1 py-3 px-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            selectedMode === 'chords'
              ? 'bg-white text-sky-600 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>Chord Training</span>
        </button>
      </div>

      {/* Module Cards Grid */}
      <div className="flex flex-col gap-3 mb-8">
        {currentModules.map((mod) => {
          const isSelected = selectedSubType === mod.id;
          return (
            <div
              key={mod.id}
              onClick={() => {
                soundEngine.playButtonClick();
                setSelectedSubType(mod.id);
              }}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? selectedMode === 'notes'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-md ring-2 ring-emerald-400/30'
                    : 'border-sky-500 bg-sky-50/70 shadow-md ring-2 ring-sky-400/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="text-2xl p-2 rounded-xl bg-white border border-slate-100 shadow-xs">
                    {mod.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-800 text-sm">{mod.title}</h3>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {mod.badge}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-1">{mod.desc}</p>
                  </div>
                </div>

                <div className="mt-1">
                  {isSelected ? (
                    <CheckCircle2
                      className={`w-5 h-5 ${
                        selectedMode === 'notes' ? 'text-emerald-500' : 'text-sky-500'
                      }`}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      <button
        onClick={handleStart}
        className={`w-full py-4 rounded-2xl font-black text-white text-base shadow-[0_5px_0_0_#047857] duo-btn-push flex items-center justify-center gap-2 transition-transform ${
          selectedMode === 'notes'
            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_5px_0_0_#047857]'
            : 'bg-sky-500 hover:bg-sky-600 shadow-[0_5px_0_0_#0284c7]'
        }`}
      >
        <span>Start {selectedMode === 'notes' ? 'Note' : 'Chord'} Drill</span>
        <ArrowUpRight className="w-5 h-5" />
      </button>
    </div>
  );
};
