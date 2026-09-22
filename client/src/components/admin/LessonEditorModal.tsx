import React, { useState } from 'react';
import { X, Volume2, Save, Sparkles, Sliders, CheckSquare, Square } from 'lucide-react';
import type { Level, Question } from '../../types';
import { api } from '../../services/api';
import { soundEngine } from '../../audio/soundEngine';

interface LessonEditorModalProps {
  unitId: number;
  unitTitle: string;
  lesson?: Level | null;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = [
  { id: 'solfege', label: 'Solfège (Do-Re-Mi Notes)', icon: '🎵', desc: 'Identify relative pitch notes against a tonal center' },
  { id: 'triad', label: 'Triad Chords', icon: '🎹', desc: 'Identify Major, Minor, Diminished, or Augmented qualities' },
  { id: 'seventh', label: '7th Chords', icon: '🎷', desc: 'Identify Major 7, Dominant 7, Minor 7, etc.' },
  { id: 'interval', label: 'Intervals', icon: '📏', desc: 'Recognize harmonic and melodic distance between two notes' },
  { id: 'pitch_direction', label: 'Pitch Direction', icon: '↕️', desc: 'Distinguish whether the second note is Higher or Lower' }
];

const COMPLEXITY_LEVELS = [
  { id: 'easy', label: 'Gentle (Easy)', desc: '2 answer choices, distinct pitches' },
  { id: 'medium', label: 'Moderate (Medium)', desc: '3 answer choices, standard intervals' },
  { id: 'hard', label: 'Advanced (Hard)', desc: '4 answer choices, nuanced harmonic variations' },
  { id: 'master', label: 'Master (Boss)', desc: 'Full range, rapid recognition challenge' }
];

const SOLFEGE_SYLLABLES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'];
const KEY_CENTERS = ['C', 'G', 'F', 'D', 'A', 'Bb', 'Eb'];

const TRIAD_TYPES = [
  { id: 'major', label: 'Major Triad ☀️' },
  { id: 'minor', label: 'Minor Triad 🌧️' },
  { id: 'diminished', label: 'Diminished Triad ⚡' },
  { id: 'augmented', label: 'Augmented Triad 🚀' }
];

const SEVENTH_TYPES = [
  { id: 'dom7', label: 'Dominant 7th (Bluesy)' },
  { id: 'maj7', label: 'Major 7th (Dreamy / Jazzy)' },
  { id: 'min7', label: 'Minor 7th (Mellow / Soul)' },
  { id: 'dim7', label: 'Diminished 7th (Tense Drama)' }
];

const INTERVAL_TYPES = [
  { semitones: 1, label: 'Minor 2nd (Jaws half step)' },
  { semitones: 2, label: 'Major 2nd (Whole step)' },
  { semitones: 3, label: 'Minor 3rd (Greensleeves)' },
  { semitones: 4, label: 'Major 3rd (Oh When the Saints)' },
  { semitones: 5, label: 'Perfect 4th (Here Comes the Bride)' },
  { semitones: 6, label: 'Tritone (The Simpsons)' },
  { semitones: 7, label: 'Perfect 5th (Star Wars / Twinkle)' },
  { semitones: 8, label: 'Minor 6th (In My Life)' },
  { semitones: 9, label: 'Major 6th (NBC / Dashing)' },
  { semitones: 10, label: 'Minor 7th (Star Trek)' },
  { semitones: 11, label: 'Major 7th (Take On Me)' },
  { semitones: 12, label: 'Octave (Somewhere Over Rainbow)' }
];

export const LessonEditorModal: React.FC<LessonEditorModalProps> = ({
  unitId,
  unitTitle,
  lesson,
  onClose,
  onSaved
}) => {
  const isEditing = Boolean(lesson);

  const [title, setTitle] = useState(lesson?.title || '');
  const [description, setDescription] = useState(lesson?.description || '');
  const [xpReward, setXpReward] = useState(lesson?.xpReward || 20);

  // Lesson Generator State
  const initialConfig = lesson?.config || {};
  const [category, setCategory] = useState<string>(
    initialConfig.category || (lesson?.type?.startsWith('triad') ? 'triad' : lesson?.type?.startsWith('seventh') ? 'seventh' : lesson?.type?.startsWith('pitch_direction') ? 'pitch_direction' : 'solfege')
  );
  const [complexity, setComplexity] = useState<string>(initialConfig.complexity || 'medium');
  const [keyCenter, setKeyCenter] = useState<string>(initialConfig.keyCenter || 'C');
  const [notesPool, setNotesPool] = useState<string[]>(
    initialConfig.notesPool || ['Do', 'Re', 'Mi', 'Fa', 'Sol']
  );
  const [chordPool, setChordPool] = useState<string[]>(
    initialConfig.chordPool || ['major', 'minor']
  );
  const [seventhPool, setSeventhPool] = useState<string[]>(
    initialConfig.seventhPool || ['maj7', 'dom7', 'min7']
  );
  const [intervalPool, setIntervalPool] = useState<number[]>(
    initialConfig.intervalPool || [3, 4, 7]
  );
  const [playStyle, setPlayStyle] = useState<'chord' | 'arpeggio' | 'both'>(
    initialConfig.playStyle || 'both'
  );
  const [direction, setDirection] = useState<'ascending' | 'harmonic'>(
    initialConfig.direction || 'ascending'
  );

  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Build current config object
  const buildCurrentConfig = () => {
    return {
      category,
      complexity,
      keyCenter,
      notesPool,
      chordPool,
      seventhPool,
      intervalPool,
      playStyle,
      direction
    };
  };

  // Preview Audio & Question Generator
  const handlePreviewAudio = async () => {
    soundEngine.playButtonClick();
    setPreviewLoading(true);
    setErrorMsg(null);

    try {
      const config = buildCurrentConfig();
      const res = await api.previewQuestion('custom', config);
      setPreviewQuestion(res.question);
      // Play generated sound
      soundEngine.playQuestionPrompt(res.question.audioPrompt, res.question.tonicDrone);
    } catch (err: any) {
      soundEngine.playErrorSound();
      setErrorMsg(err.message || 'Failed to preview question audio');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Lesson title and description are required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const config = buildCurrentConfig();

    try {
      if (isEditing && lesson?.lessonDbId) {
        await api.updateLesson(lesson.lessonDbId, {
          title,
          description,
          type: 'custom',
          config,
          xpReward
        });
      } else {
        await api.createLesson(unitId, {
          title,
          description,
          type: 'custom',
          config,
          xpReward
        });
      }
      soundEngine.playSuccessChime();
      onSaved();
    } catch (err: any) {
      soundEngine.playErrorSound();
      setErrorMsg(err.message || 'Failed to save lesson');
    } finally {
      setLoading(false);
    }
  };

  const toggleSyllable = (syl: string) => {
    soundEngine.playButtonClick();
    if (notesPool.includes(syl)) {
      if (notesPool.length > 2) {
        setNotesPool(notesPool.filter(s => s !== syl));
      }
    } else {
      setNotesPool([...notesPool, syl]);
    }
  };

  const toggleChord = (cId: string) => {
    soundEngine.playButtonClick();
    if (chordPool.includes(cId)) {
      if (chordPool.length > 2) {
        setChordPool(chordPool.filter(c => c !== cId));
      }
    } else {
      setChordPool([...chordPool, cId]);
    }
  };

  const toggleSeventh = (sId: string) => {
    soundEngine.playButtonClick();
    if (seventhPool.includes(sId)) {
      if (seventhPool.length > 2) {
        setSeventhPool(seventhPool.filter(s => s !== sId));
      }
    } else {
      setSeventhPool([...seventhPool, sId]);
    }
  };

  const toggleInterval = (semi: number) => {
    soundEngine.playButtonClick();
    if (intervalPool.includes(semi)) {
      if (intervalPool.length > 2) {
        setIntervalPool(intervalPool.filter(i => i !== semi));
      }
    } else {
      setIntervalPool([...intervalPool, semi]);
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border-2 border-slate-200 select-none animate-in fade-in zoom-in duration-200 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-emerald-600">
              {unitTitle}
            </div>
            <h2 className="text-xl font-black text-slate-800">
              {isEditing ? `Edit Lesson: ${lesson?.title}` : 'Add New Lesson to Unit'}
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
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-4 flex flex-col gap-5 pr-1">
          {/* Lesson Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Lesson Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Major vs Minor Triad Workout"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                XP Reward
              </label>
              <input
                type="number"
                min={10}
                max={100}
                value={xpReward}
                onChange={e => setXpReward(parseInt(e.target.value, 10) || 20)}
                className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-200 text-sm font-bold text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Student Instruction / Description
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Listen closely and tell if the harmony sounds happy (major) or sad (minor)."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Section: Pedagogical Category */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              1. Curriculum Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setCategory(cat.id);
                  }}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                    category === cat.id
                      ? 'border-emerald-500 bg-emerald-50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-lg mb-1">{cat.icon}</div>
                  <div className="text-xs font-black text-slate-800 leading-tight">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Complexity Level */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-600" />
              2. Complexity & Difficulty
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COMPLEXITY_LEVELS.map(comp => (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setComplexity(comp.id);
                  }}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                    complexity === comp.id
                      ? 'border-emerald-500 bg-emerald-50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-black text-slate-800">{comp.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{comp.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Category Specific Music Teacher Controls */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
            <label className="text-xs font-black uppercase tracking-wider text-emerald-800 block mb-3">
              3. Music Teacher Settings & Note Randomization Pool
            </label>

            {/* Solfège Category Controls */}
            {category === 'solfege' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">Key Center (Tonic):</span>
                  <select
                    value={keyCenter}
                    onChange={e => setKeyCenter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border-2 border-emerald-300 bg-white text-xs font-bold focus:outline-none"
                  >
                    {KEY_CENTERS.map(k => (
                      <option key={k} value={k}>Key of {k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-600 block mb-1.5">
                    Include Note Syllables (Randomized in questions):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SOLFEGE_SYLLABLES.map(syl => {
                      const selected = notesPool.includes(syl);
                      return (
                        <button
                          key={syl}
                          type="button"
                          onClick={() => toggleSyllable(syl)}
                          className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black transition-all flex items-center gap-1.5 ${
                            selected
                              ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {selected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          {syl}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Triad Category Controls */}
            {category === 'triad' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">Playback Style:</span>
                  <select
                    value={playStyle}
                    onChange={e => setPlayStyle(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl border-2 border-emerald-300 bg-white text-xs font-bold focus:outline-none"
                  >
                    <option value="both">Both (Random Mix)</option>
                    <option value="chord">Block Chord (Simultaneous)</option>
                    <option value="arpeggio">Arpeggiated (Note by note)</option>
                  </select>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-600 block mb-1.5">
                    Included Triad Qualities:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {TRIAD_TYPES.map(t => {
                      const selected = chordPool.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleChord(t.id)}
                          className={`px-3 py-2 rounded-xl border-2 text-xs font-black transition-all flex items-center gap-1.5 ${
                            selected
                              ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {selected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 7th Chords Controls */}
            {category === 'seventh' && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-600 block mb-1">
                  Included 7th Chords:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {SEVENTH_TYPES.map(s => {
                    const selected = seventhPool.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSeventh(s.id)}
                        className={`px-3 py-2 rounded-xl border-2 text-xs font-black transition-all flex items-center gap-1.5 ${
                          selected
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {selected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interval Controls */}
            {category === 'interval' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">Interval Mode:</span>
                  <select
                    value={direction}
                    onChange={e => setDirection(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl border-2 border-emerald-300 bg-white text-xs font-bold focus:outline-none"
                  >
                    <option value="ascending">Ascending Sequence (Melodic)</option>
                    <option value="harmonic">Harmonic (Together)</option>
                  </select>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-600 block mb-1.5">
                    Select Intervals to Practice:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {INTERVAL_TYPES.map(int => {
                      const selected = intervalPool.includes(int.semitones);
                      return (
                        <button
                          key={int.semitones}
                          type="button"
                          onClick={() => toggleInterval(int.semitones)}
                          className={`p-2 rounded-xl border-2 text-left text-xs font-black transition-all flex items-center gap-1.5 ${
                            selected
                              ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {selected ? <CheckSquare className="w-3.5 h-3.5 shrink-0" /> : <Square className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate">{int.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Pitch Direction Controls */}
            {category === 'pitch_direction' && (
              <div className="text-xs text-slate-600 font-medium">
                Pitches are dynamically randomized between octaves 3 and 5. The interval distance between notes is automatically calibrated by the selected <strong>{complexity.toUpperCase()}</strong> complexity tier.
              </div>
            )}
          </div>

          {/* Section: Live Teacher Audio Audition */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                  Teacher Live Audio Preview
                </h3>
                <p className="text-[11px] text-amber-700">
                  Generate and audition a sample question with current settings
                </p>
              </div>
              <button
                type="button"
                onClick={handlePreviewAudio}
                disabled={previewLoading}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-[0_3px_0_0_#d97706] duo-btn-push flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4" />
                <span>{previewLoading ? 'Generating...' : 'Audition Audio 🔊'}</span>
              </button>
            </div>

            {previewQuestion && (
              <div className="mt-3 p-3 rounded-xl bg-white border border-amber-200 text-xs">
                <div className="font-bold text-slate-800 mb-1">{previewQuestion.questionText}</div>
                <div className="flex flex-wrap gap-2 my-2">
                  {previewQuestion.options.map(opt => (
                    <span
                      key={opt.id}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        opt.isCorrect
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {opt.label} {opt.isCorrect && '✔ (Correct)'}
                    </span>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 italic mt-1">
                  Sample Explanation: {previewQuestion.explanation}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-[0_3px_0_0_#047857] duo-btn-push flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : isEditing ? 'Update Lesson' : 'Save New Lesson'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
