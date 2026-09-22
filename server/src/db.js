const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'eartraining.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for speed and reliability
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '🎧',
    is_guest INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY,
    xp INTEGER NOT NULL DEFAULT 0,
    gems INTEGER NOT NULL DEFAULT 150,
    hearts INTEGER NOT NULL DEFAULT 5,
    max_hearts INTEGER NOT NULL DEFAULT 5,
    streak_days INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_active_date TEXT,
    daily_goal_xp INTEGER NOT NULL DEFAULT 30,
    streak_freezes INTEGER NOT NULL DEFAULT 1,
    sound_preset TEXT NOT NULL DEFAULT 'grand_piano',
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS lesson_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    unit_id INTEGER NOT NULL,
    level_id INTEGER NOT NULL,
    stars INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, unit_id, level_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS daily_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    lessons_completed INTEGER NOT NULL DEFAULT 0,
    quota_met INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, date),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mistakes_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    question_type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    last_mistake_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Date helper (YYYY-MM-DD)
function getTodayString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// User operations
function createUser(username, email, passwordHash, displayName, isGuest = 0, avatar = '🎧') {
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, display_name, is_guest, avatar)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = insertUser.run(username, email, passwordHash, displayName, isGuest, avatar);
  const userId = Number(result.lastInsertRowid);

  // Initialize user profile
  db.prepare(`
    INSERT INTO user_profiles (user_id, xp, gems, hearts, max_hearts, streak_days, longest_streak, daily_goal_xp, streak_freezes, sound_preset)
    VALUES (?, 0, 150, 5, 5, 0, 0, 30, 1, 'grand_piano')
  `).run(userId);

  return getUserById(userId);
}

function getUserById(id) {
  const row = db.prepare(`
    SELECT u.id, u.username, u.email, u.display_name, u.avatar, u.is_guest, u.created_at,
           p.xp, p.gems, p.hearts, p.max_hearts, p.streak_days, p.longest_streak,
           p.last_active_date, p.daily_goal_xp, p.streak_freezes, p.sound_preset
    FROM users u
    JOIN user_profiles p ON u.id = p.user_id
    WHERE u.id = ?
  `).get(id);

  return row ? { ...row } : null;
}

function getUserByUsername(username) {
  const row = db.prepare(`
    SELECT * FROM users WHERE username = ?
  `).get(username);
  return row ? { ...row } : null;
}

function updateUserProfile(userId, updates = {}) {
  const allowed = [
    'xp', 'gems', 'hearts', 'max_hearts', 'streak_days',
    'longest_streak', 'last_active_date', 'daily_goal_xp',
    'streak_freezes', 'sound_preset'
  ];

  const setClauses = [];
  const values = [];

  for (const [key, val] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (setClauses.length === 0) return getUserById(userId);

  values.push(userId);
  const query = `UPDATE user_profiles SET ${setClauses.join(', ')} WHERE user_id = ?`;
  db.prepare(query).run(...values);

  return getUserById(userId);
}

function recordDailyActivityAndStreak(userId, xpEarned) {
  const today = getTodayString();
  const yesterday = getYesterdayString();

  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
  if (!profile) return null;

  // Insert or update daily activity
  const existingDaily = db.prepare('SELECT * FROM daily_activity WHERE user_id = ? AND date = ?').get(userId, today);
  let newDailyXp = xpEarned;
  let newLessons = 1;
  let quotaMet = 0;

  if (existingDaily) {
    newDailyXp = existingDaily.xp_earned + xpEarned;
    newLessons = existingDaily.lessons_completed + 1;
    quotaMet = newDailyXp >= profile.daily_goal_xp ? 1 : 0;
    db.prepare(`
      UPDATE daily_activity
      SET xp_earned = ?, lessons_completed = ?, quota_met = ?
      WHERE id = ?
    `).run(newDailyXp, newLessons, quotaMet, existingDaily.id);
  } else {
    quotaMet = newDailyXp >= profile.daily_goal_xp ? 1 : 0;
    db.prepare(`
      INSERT INTO daily_activity (user_id, date, xp_earned, lessons_completed, quota_met)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, today, newDailyXp, newLessons, quotaMet);
  }

  // Calculate streak logic
  let currentStreak = profile.streak_days;
  let freezes = profile.streak_freezes;
  const lastActive = profile.last_active_date;

  if (lastActive === today) {
    // Already active today; streak unchanged
  } else if (lastActive === yesterday) {
    // Active yesterday; streak increments by 1
    currentStreak += 1;
  } else if (!lastActive) {
    // First day ever!
    currentStreak = 1;
  } else {
    // Missed a day or more: check if we have a streak freeze
    if (freezes > 0) {
      freezes -= 1; // Consume freeze to preserve streak!
      currentStreak += 1;
    } else {
      currentStreak = 1; // Streak reset
    }
  }

  const longestStreak = Math.max(currentStreak, profile.longest_streak);
  const totalXp = profile.xp + xpEarned;
  // Award 15 bonus gems on lesson completion
  const totalGems = profile.gems + 15;

  db.prepare(`
    UPDATE user_profiles
    SET xp = ?, gems = ?, streak_days = ?, longest_streak = ?, last_active_date = ?, streak_freezes = ?
    WHERE user_id = ?
  `).run(totalXp, totalGems, currentStreak, longestStreak, today, freezes, userId);

  return {
    streakDays: currentStreak,
    longestStreak,
    todayXp: newDailyXp,
    quotaMet: quotaMet === 1,
    dailyGoalXp: profile.daily_goal_xp,
    totalXp,
    totalGems
  };
}

function recordLessonProgress(userId, unitId, levelId, score, stars, xpEarned) {
  // Upsert lesson progress
  const existing = db.prepare(`
    SELECT * FROM lesson_progress WHERE user_id = ? AND unit_id = ? AND level_id = ?
  `).get(userId, unitId, levelId);

  if (existing) {
    const bestStars = Math.max(existing.stars, stars);
    const bestScore = Math.max(existing.score, score);
    db.prepare(`
      UPDATE lesson_progress
      SET stars = ?, score = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(bestStars, bestScore, existing.id);
  } else {
    db.prepare(`
      INSERT INTO lesson_progress (user_id, unit_id, level_id, stars, score)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, unitId, levelId, stars, score);
  }

  const streakResult = recordDailyActivityAndStreak(userId, xpEarned);
  return {
    progress: getUserProgress(userId),
    streakResult,
    user: getUserById(userId)
  };
}

function getUserProgress(userId) {
  const rows = db.prepare(`
    SELECT unit_id, level_id, stars, score, completed_at
    FROM lesson_progress
    WHERE user_id = ?
    ORDER BY unit_id ASC, level_id ASC
  `).all(userId);
  return rows.map(r => ({ ...r }));
}

function getDailyHistory(userId, limit = 14) {
  const rows = db.prepare(`
    SELECT date, xp_earned, lessons_completed, quota_met
    FROM daily_activity
    WHERE user_id = ?
    ORDER BY date DESC
    LIMIT ?
  `).all(userId, limit);
  return rows.map(r => ({ ...r }));
}

function recordMistake(userId, questionType, prompt, userAnswer, correctAnswer) {
  const existing = db.prepare(`
    SELECT * FROM mistakes_log
    WHERE user_id = ? AND question_type = ? AND prompt = ?
  `).get(userId, questionType, prompt);

  if (existing) {
    db.prepare(`
      UPDATE mistakes_log
      SET count = count + 1, user_answer = ?, last_mistake_at = datetime('now')
      WHERE id = ?
    `).run(userAnswer, existing.id);
  } else {
    db.prepare(`
      INSERT INTO mistakes_log (user_id, question_type, prompt, user_answer, correct_answer)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, questionType, prompt, userAnswer, correctAnswer);
  }
}

function getMistakes(userId, limit = 10) {
  const rows = db.prepare(`
    SELECT question_type, prompt, user_answer, correct_answer, count, last_mistake_at
    FROM mistakes_log
    WHERE user_id = ?
    ORDER BY count DESC, last_mistake_at DESC
    LIMIT ?
  `).all(userId, limit);
  return rows.map(r => ({ ...r }));
}

function getLeaderboard() {
  const rows = db.prepare(`
    SELECT u.id, u.display_name, u.avatar, p.xp, p.streak_days
    FROM users u
    JOIN user_profiles p ON u.id = p.user_id
    ORDER BY p.xp DESC
    LIMIT 20
  `).all();
  return rows.map(r => ({ ...r }));
}

function claimGuestAccount(guestUserId, newUsername, passwordHash, displayName) {
  db.prepare(`
    UPDATE users
    SET username = ?, password_hash = ?, display_name = ?, is_guest = 0
    WHERE id = ? AND is_guest = 1
  `).run(newUsername, passwordHash, displayName, guestUserId);

  return getUserById(guestUserId);
}

module.exports = {
  db,
  createUser,
  getUserById,
  getUserByUsername,
  updateUserProfile,
  recordLessonProgress,
  recordDailyActivityAndStreak,
  getUserProgress,
  getDailyHistory,
  recordMistake,
  getMistakes,
  getLeaderboard,
  claimGuestAccount,
  getTodayString
};
