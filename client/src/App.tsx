import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import type { TabType } from './components/BottomNav';
import { JourneyPath } from './components/JourneyPath';
import { PracticeSelector } from './components/PracticeSelector';
import { DailyChallenge } from './components/DailyChallenge';
import { LeaderboardView } from './components/LeaderboardView';
import { ShopModal } from './components/ShopModal';
import { ProfileView } from './components/ProfileView';
import { LessonModal } from './components/LessonModal';
import { AuthModal } from './components/AuthModal';
import { GuestPromptModal } from './components/GuestPromptModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import type { Unit, Level, Question } from './types';
import { soundEngine } from './audio/soundEngine';

interface ActiveLessonData {
  title: string;
  unitId: number;
  levelId: number;
  questions: Question[];
  xpReward: number;
}

export function App() {
  const { user, refreshProfile, isAdmin, isGuest, mustChangePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('learn');
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [activeLesson, setActiveLesson] = useState<ActiveLessonData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [guestPromptScore, setGuestPromptScore] = useState<number | undefined>(undefined);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [todayXp, setTodayXp] = useState(0);

  const handleOpenAuth = (mode: 'login' | 'register' = 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  // Load Curriculum
  const loadCurriculum = async () => {
    try {
      const data = await api.getCurriculum();
      setUnits(data.units);
    } catch (e) {
      console.error('Failed to load curriculum:', e);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  useEffect(() => {
    loadCurriculum();
  }, [user?.id]);

  // Start a regular curriculum lesson from the journey map
  const handleStartUnitLesson = async (unitId: number, level: Level) => {
    try {
      const data = await api.getLessonQuestions(unitId, level.id);
      setActiveLesson({
        title: `${level.title}`,
        unitId,
        levelId: level.id,
        questions: data.questions,
        xpReward: level.xpReward || 25
      });
    } catch (e) {
      console.error('Failed to launch lesson:', e);
    }
  };

  // Start custom focused practice (Notes or Chords)
  const handleStartCustomPractice = async (mode: 'notes' | 'chords', subType: string) => {
    try {
      const data = await api.getCustomPractice(mode, subType, 8);
      const title =
        mode === 'notes'
          ? `Note Training: ${subType.replace('_', ' ').toUpperCase()}`
          : `Chord Training: ${subType.replace('_', ' ').toUpperCase()}`;

      setActiveLesson({
        title,
        unitId: -1,
        levelId: -1,
        questions: data.questions,
        xpReward: 30
      });
    } catch (e) {
      console.error('Failed to launch custom practice:', e);
    }
  };

  // Start Daily Challenge drill
  const handleStartDailyChallenge = async () => {
    try {
      // 8 mixed questions across directions, solfège, and chords
      const data = await api.getCustomPractice('chords', 'triad_all', 8);
      setActiveLesson({
        title: '⚡ Daily Ear Workout',
        unitId: -2,
        levelId: -2,
        questions: data.questions,
        xpReward: 50 // Double XP
      });
    } catch (e) {
      console.error('Failed to launch daily challenge:', e);
    }
  };

  const handleLessonFinished = async (result: { score: number; stars: number; xp: number }) => {
    if (!isGuest) {
      setTodayXp(prev => prev + result.xp);
      await refreshProfile();
      await loadCurriculum();
    } else {
      // Prompt guest to join as a member after completing a lesson
      setGuestPromptScore(result.score);
      setShowGuestPrompt(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Mobile-first centered frame container */}
      <div className="app-container w-full min-h-screen bg-white flex flex-col">
        {/* Top Sticky Header */}
        <Header
          onOpenProfile={() => setActiveTab('leaderboard')}
          onOpenShop={() => setActiveTab('shop')}
          onOpenAdmin={() => setShowAdminDashboard(true)}
          onOpenAuth={handleOpenAuth}
          todayXp={todayXp}
        />

        {/* Main Content Area based on Active Tab */}
        <main className="flex-1 overflow-x-hidden">
          {activeTab === 'learn' && (
            loadingCurriculum ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">
                Loading learning path... 🎵
              </div>
            ) : (
              <JourneyPath
                units={units}
                onStartLesson={handleStartUnitLesson}
              />
            )
          )}

          {activeTab === 'practice' && (
            <PracticeSelector
              onStartCustomPractice={handleStartCustomPractice}
            />
          )}

          {activeTab === 'daily' && (
            <DailyChallenge
              onStartChallenge={handleStartDailyChallenge}
            />
          )}

          {activeTab === 'leaderboard' && (
            <div className="flex flex-col">
              <LeaderboardView />
              <div className="px-4 pb-28">
                <ProfileView
                  onOpenAuth={handleOpenAuth}
                  onOpenAdmin={() => setShowAdminDashboard(true)}
                />
              </div>
            </div>
          )}

          {activeTab === 'shop' && (
            <ShopModal />
          )}
        </main>

        {/* Bottom Tab Bar */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={(tab) => {
            soundEngine.playButtonClick();
            setActiveTab(tab);
          }}
        />

        {/* Active Lesson Modal */}
        {activeLesson && (
          <LessonModal
            title={activeLesson.title}
            unitId={activeLesson.unitId}
            levelId={activeLesson.levelId}
            questions={activeLesson.questions}
            xpReward={activeLesson.xpReward}
            onClose={() => setActiveLesson(null)}
            onFinished={handleLessonFinished}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {/* Auth / Member Account Modal */}
        {showAuthModal && (
          <AuthModal
            initialMode={authMode}
            onClose={() => setShowAuthModal(false)}
          />
        )}

        {/* Post-Lesson Member Join Prompt Modal (Guest Mode) */}
        {showGuestPrompt && isGuest && (
          <GuestPromptModal
            score={guestPromptScore}
            onClose={() => setShowGuestPrompt(false)}
            onJoin={() => {
              setShowGuestPrompt(false);
              handleOpenAuth('register');
            }}
            onLogin={() => {
              setShowGuestPrompt(false);
              handleOpenAuth('login');
            }}
          />
        )}

        {/* Forced First-Time Password Change Modal */}
        {mustChangePassword && (
          <ChangePasswordModal />
        )}

        {/* Music Teacher Admin & Curriculum CMS Portal */}
        {showAdminDashboard && isAdmin && (
          <AdminDashboard
            onClose={() => {
              setShowAdminDashboard(false);
              loadCurriculum();
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;
