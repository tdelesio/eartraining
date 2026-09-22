export interface User {
  id: number;
  username: string;
  email?: string;
  display_name: string;
  avatar: string;
  is_guest: number;
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
  title: string;
  description: string;
  type: string;
  xpReward: number;
  completed?: boolean;
  stars?: number;
  score?: number;
  unlocked?: boolean;
}

export interface Unit {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
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
