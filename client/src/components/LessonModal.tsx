import React, { useState, useEffect } from 'react';
import { X, Volume2, Snail, Anchor, Check, AlertCircle, Sparkles, Flame, ArrowRight, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Question, Option } from '../types';
import { soundEngine } from '../audio/soundEngine';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface LessonModalProps {
  title: string;
  unitId: number;
  levelId: number;
  questions: Question[];
  xpReward: number;
  onClose: () => void;
  onFinished: (result: { score: number; stars: number; xp: number }) => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({
  title,
  unitId,
  levelId,
  questions,
  xpReward,
  onClose,
  onFinished,
  onOpenAuth
}) => {
  const { user, setUser, isGuest } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [heartsLeft, setHeartsLeft] = useState(user?.hearts ?? 5);
  const [mistakesList, setMistakesList] = useState<any[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [streakResult, setStreakResult] = useState<any>(null);
  const [audioStatus, setAudioStatus] = useState<string | null>(null);

  const handleTestAudio = async () => {
    setAudioStatus('Testing audio...');
    const res = await soundEngine.testBeep();
    if (res.success) {
      setAudioStatus(`Audio active! (State: ${res.state})`);
    } else {
      setAudioStatus(`Audio error: ${res.error || res.state}`);
    }
    setTimeout(() => setAudioStatus(null), 5000);
  };

  const currentQuestion = questions[currentIndex] || questions[0];
  const totalQuestions = questions.length;
  const progressPct = Math.round((currentIndex / totalQuestions) * 100);

  // Play audio on question change
  useEffect(() => {
    if (!currentQuestion) return;
    setIsChecked(false);
    setSelectedOptionId(null);
    playPromptAudio(false);
  }, [currentIndex]);

  const playPromptAudio = async (slow: boolean = false) => {
    if (!currentQuestion?.audioPrompt) return;
    await soundEngine.ensureRunning();
    setIsPlayingAudio(true);
    const { type, notes, durations, delays } = currentQuestion.audioPrompt;

    if (type === 'note' && notes.length > 0) {
      soundEngine.playNote(notes[0], slow ? 1.8 : 1.0, 0, 0.85);
    } else if (type === 'chord') {
      soundEngine.playChord(notes, slow ? 2.0 : 1.4, slow ? 0.25 : 0);
    } else if (type === 'sequence') {
      const adjustedDelays = slow
        ? delays?.map(d => d * 1.6)
        : delays;
      soundEngine.playSequence(notes, durations, adjustedDelays);
    }

    setTimeout(() => {
      setIsPlayingAudio(false);
    }, slow ? 2200 : 1400);
  };

  const playTonicAnchor = () => {
    const drone = currentQuestion.tonicDrone || 'C4';
    soundEngine.playTonicDrone(drone, 2.5);
  };

  const handleSelectOption = (option: Option) => {
    if (isChecked) return;
    soundEngine.playButtonClick();
    setSelectedOptionId(option.id);
  };

  const handleCheck = () => {
    if (!selectedOptionId || isChecked) return;

    const chosenOption = currentQuestion.options.find(o => o.id === selectedOptionId);
    const correct = chosenOption ? chosenOption.isCorrect : false;

    setIsChecked(true);
    setIsCorrect(correct);

    if (correct) {
      soundEngine.playSuccessChime();
      setCorrectAnswersCount(prev => prev + 1);
    } else {
      soundEngine.playErrorSound();
      const newHearts = Math.max(0, heartsLeft - 1);
      setHeartsLeft(newHearts);
      if (user) {
        setUser(prev => prev ? { ...prev, hearts: newHearts } : null);
      }

      setMistakesList(prev => [
        ...prev,
        {
          category: currentQuestion.category,
          questionText: currentQuestion.questionText,
          userAnswer: chosenOption?.label || selectedOptionId,
          correctAnswer: currentQuestion.options.find(o => o.isCorrect)?.label || ''
        }
      ]);
    }
  };

  // Compare Sounds feature: user choice vs actual played notes
  const handleCompareSounds = () => {
    setIsComparing(true);
    const played = currentQuestion.comparison?.playedNotes || currentQuestion.audioPrompt.notes;
    // Play what was played, then user can hear it
    soundEngine.playSequence(played, [0.8, 0.8]);
    setTimeout(() => {
      setIsComparing(false);
    }, 1800);
  };

  const handleNext = async () => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Completed all questions in the lesson!
      finishLesson();
    }
  };

  const finishLesson = async () => {
    const score = Math.round((correctAnswersCount / totalQuestions) * 100);
    const stars = score >= 90 ? 3 : score >= 70 ? 2 : 1;
    const earnedXp = Math.round(xpReward * (score / 100)) + 5;

    // Trigger fireworks confetti!
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#ce82ff']
    });
    soundEngine.playStreakFanfare();
    setIsCompleted(true);

    const actualEarnedXp = isGuest ? 0 : earnedXp;

    try {
      const res = await api.submitLesson({
        unitId,
        levelId,
        score,
        stars,
        xpEarned: actualEarnedXp,
        mistakes: mistakesList
      });

      if (!isGuest && res.user) {
        setUser(res.user);
      }
      if (!isGuest && res.streakResult) {
        setStreakResult(res.streakResult);
      }
    } catch (e) {
      console.error('Failed to submit lesson progress:', e);
    }

    onFinished({ score, stars, xp: actualEarnedXp });
  };

  if (!currentQuestion) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-[480px] mx-auto select-none overflow-hidden">
      {/* Top Bar: Exit button, Progress Bar, Hearts */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
        <button
          onClick={() => {
            soundEngine.playButtonClick();
            if (confirm('Are you sure you want to exit? Your progress in this lesson will be lost.')) {
              onClose();
            }
          }}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Progress bar */}
        <div className="flex-1 mx-4 bg-slate-200 h-3 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Hearts */}
        <div className="flex items-center gap-1">
          <span className="text-rose-500 text-xl leading-none">❤️</span>
          <span className="font-extrabold text-sm text-rose-600">{heartsLeft}</span>
        </div>
      </div>

      {/* Main Question Area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col justify-between">
        <div>
          {/* Header Title & Tag */}
          <div className="mb-4">
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
              {title}
            </span>
            <h2 className="text-xl font-black text-slate-800 mt-2 leading-snug">
              {currentQuestion.questionText}
            </h2>
          </div>

          {/* Sound Controls Hub */}
          <div className="my-6 flex flex-col items-center">
            {/* Big Tactile Replay Button */}
            <button
              onClick={async () => {
                await soundEngine.unlock();
                playPromptAudio(false);
              }}
              className={`w-28 h-28 rounded-full flex flex-col items-center justify-center duo-btn-push transition-all ${
                isPlayingAudio
                  ? 'bg-emerald-400 ring-8 ring-emerald-200 shadow-[0_6px_0_0_#059669]'
                  : 'bg-emerald-500 hover:bg-emerald-600 ring-4 ring-emerald-100 shadow-[0_8px_0_0_#047857]'
              }`}
            >
              <Volume2 className={`w-12 h-12 text-white ${isPlayingAudio ? 'animate-bounce' : ''}`} />
              <span className="text-white text-xs font-black mt-1">
                {isPlayingAudio ? 'Playing...' : 'Tap to Listen'}
              </span>
            </button>

            {/* Helper Buttons: Play Slow & Tonic Drone Anchor */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={async () => {
                  await soundEngine.unlock();
                  playPromptAudio(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-colors"
                title="Play notes slowly and arpeggiated"
              >
                <Snail className="w-4 h-4 text-amber-600" />
                <span>Play Slow</span>
              </button>

              {currentQuestion.tonicDrone && (
                <button
                  onClick={async () => {
                    await soundEngine.unlock();
                    playTonicAnchor();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold transition-colors"
                  title="Play the Key Center Tonic (Do)"
                >
                  <Anchor className="w-4 h-4 text-sky-600" />
                  <span>Hear Tonic ({currentQuestion.tonicDrone})</span>
                </button>
              )}
            </div>

            {/* Test Audio Diagnostic Button */}
            <div className="flex flex-col items-center mt-3">
              <button
                onClick={handleTestAudio}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold transition-all active:scale-95"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Test Audio (Beep)</span>
              </button>

              {audioStatus && (
                <span className="mt-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                  {audioStatus}
                </span>
              )}
            </div>

            {/* Mobile Sound Advice Tip */}
            <p className="text-[11px] text-slate-400 font-medium mt-2.5 text-center px-2">
              📱 <em>On iPhone: Check that your side Silent switch is set to Ring & media volume is turned up.</em>
            </p>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOptionId === option.id;

              let cardStyle = 'border-slate-200 bg-white hover:border-slate-300 text-slate-800 shadow-[0_3px_0_0_#e2e8f0]';
              if (isSelected && !isChecked) {
                cardStyle = 'border-sky-500 bg-sky-50 text-sky-900 shadow-[0_3px_0_0_#0284c7] ring-2 ring-sky-300';
              } else if (isChecked) {
                if (option.isCorrect) {
                  cardStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-[0_3px_0_0_#059669]';
                } else if (isSelected && !option.isCorrect) {
                  cardStyle = 'border-rose-500 bg-rose-50 text-rose-900 shadow-[0_3px_0_0_#e11d48]';
                } else {
                  cardStyle = 'border-slate-200 opacity-50 bg-white';
                }
              }

              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option)}
                  disabled={isChecked}
                  className={`p-4 rounded-2xl border-2 font-black text-base transition-all text-left flex items-center justify-between duo-btn-push ${cardStyle}`}
                >
                  <span className="tracking-tight">{option.label}</span>
                  {isChecked && option.isCorrect && (
                    <Check className="w-5 h-5 text-emerald-600" />
                  )}
                  {isChecked && isSelected && !option.isCorrect && (
                    <X className="w-5 h-5 text-rose-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Action / Validation Sheet */}
      <div
        className={`p-4 border-t transition-colors ${
          !isChecked
            ? 'bg-white border-slate-200'
            : isCorrect
            ? 'bg-emerald-100 border-emerald-300'
            : 'bg-rose-100 border-rose-300'
        }`}
      >
        {!isChecked ? (
          <button
            onClick={handleCheck}
            disabled={!selectedOptionId}
            className={`w-full py-4 rounded-2xl font-black text-white text-base duo-btn-push transition-all ${
              selectedOptionId
                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_5px_0_0_#047857]'
                : 'bg-slate-300 shadow-[0_5px_0_0_#94a3b8] cursor-not-allowed text-slate-500'
            }`}
          >
            Check Answer
          </button>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-2.5">
                {isCorrect ? (
                  <div className="p-1 rounded-full bg-emerald-500 text-white">
                    <Check className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-1 rounded-full bg-rose-500 text-white">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h4
                    className={`font-black text-base ${
                      isCorrect ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    {isCorrect ? 'Spot On! 🎶' : 'Not quite!'}
                  </h4>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>

              {/* Compare Sounds Button on Mistake */}
              {!isCorrect && (
                <button
                  onClick={handleCompareSounds}
                  className="px-3 py-1.5 rounded-xl bg-white border border-rose-300 text-rose-700 text-xs font-black shadow-xs flex items-center gap-1 hover:bg-rose-50 transition-colors"
                  title="Hear the correct sound again"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isComparing ? 'animate-spin' : ''}`} />
                  <span>Rehear 👂</span>
                </button>
              )}
            </div>

            <button
              onClick={handleNext}
              className={`w-full py-4 rounded-2xl font-black text-white text-base duo-btn-push flex items-center justify-center gap-2 ${
                isCorrect
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_5px_0_0_#047857]'
                  : 'bg-rose-500 hover:bg-rose-600 shadow-[0_5px_0_0_#be123c]'
              }`}
            >
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Victory Celebration Modal */}
      {isCompleted && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl border-4 border-emerald-400 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Sparkles className="w-10 h-10 animate-bounce" />
            </div>

            <h2 className="text-2xl font-black text-slate-800">Lesson Complete!</h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Your ears are sharper than ever. Keep it up!
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 my-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5">
                <span className="text-xs font-bold text-amber-700 block">XP Gained</span>
                <span className="text-lg font-black text-amber-600">
                  {isGuest ? '0' : `+${xpReward}`}
                </span>
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-2.5">
                <span className="text-xs font-bold text-sky-700 block">Accuracy</span>
                <span className="text-lg font-black text-sky-600">
                  {Math.round((correctAnswersCount / totalQuestions) * 100)}%
                </span>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-2.5">
                <span className="text-xs font-bold text-orange-700 block">Streak</span>
                <div className="flex items-center justify-center gap-1">
                  <Flame className={`w-4 h-4 ${isGuest ? 'text-slate-400' : 'text-orange-500 fill-orange-500'}`} />
                  <span className={`text-base font-black ${isGuest ? 'text-slate-500 text-xs mt-0.5' : 'text-orange-600'}`}>
                    {isGuest ? 'Not saved' : (streakResult?.streakDays || user?.streak_days || 1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Guest Mode Callout */}
            {isGuest && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 mb-4 text-left">
                <div className="flex items-center gap-1.5 text-amber-800 font-extrabold text-xs">
                  <span>⚠️</span>
                  <span>Guest Mode: Progress Not Saved</span>
                </div>
                <p className="text-xs text-amber-700 font-medium mt-1">
                  Create a free member account to save this lesson, track XP, and build your streak!
                </p>
                {onOpenAuth && (
                  <button
                    onClick={() => {
                      soundEngine.playSuccessChime();
                      onClose();
                      onOpenAuth('register');
                    }}
                    className="mt-2.5 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-[0_2px_0_0_#047857] duo-btn-push"
                  >
                    Join Free to Save Progress
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onClose();
              }}
              className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-black text-sm shadow-[0_4px_0_0_#0f172a] duo-btn-push"
            >
              Back to Roadmap
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
