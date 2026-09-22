export interface User {
  id: number;
  username: string;
  email?: string;
  display_name: string;
  avatar: string;
  is_guest: number;
  role: 'user' | 'admin';
  must_change_password?: boolean | number;
  created_at: string;
  xp: number;
  gems: number;
  hearts: number;
  max_hearts: number;
  streak_days: number;
  longest_streak: number;
  last_active_date?: string;
  daily_goal_xp: number;
  streak_freezes: number;
  sound_preset: 'grand_piano' | 'rhodes' | 'synth' | 'marimba';
}

export interface AdminUser {
  id: number;
  username: string;
  email?: string;
  display_name: string;
  avatar: string;
  is_guest: number;
  role: 'user' | 'admin';
  must_change_password: number;
  created_at: string;
  xp: number;
  gems: number;
  hearts: number;
  streak_days: number;
  longest_streak: number;
  last_active_date?: string;
}

export interface Option {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface AudioPrompt {
  type: 'note' | 'chord' | 'sequence';
  notes: string[];
  durations?: number[];
  delays?: number[];
}

export interface Question {
  id: string;
  category: string;
  questionText: string;
  audioPrompt: AudioPrompt;
  options: Option[];
  explanation: string;
  tonicDrone?: string;
  comparison?: {
    playedNotes: string[];
    correctLabel: string;
  };
}

export interface Level {
  id: number;
  lessonDbId?: number;
  title: string;
  description: string;
  type: string;
  config?: Record<string, any>;
  xpReward: number;
  completed?: boolean;
  stars?: number;
  score?: number;
  unlocked?: boolean;
  order_index?: number;
}

export interface Unit {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  order_index?: number;
  levels: Level[];
}

export interface DailyActivity {
  date: string;
  xp_earned: number;
  lessons_completed: number;
  quota_met: number;
}

export interface LeaderboardUser {
  id: number;
  display_name: string;
  avatar: string;
  xp: number;
  streak_days: number;
}
