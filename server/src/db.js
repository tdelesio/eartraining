const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');

const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'eartraining.sqlite');
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
    role TEXT NOT NULL DEFAULT 'user',
    must_change_password INTEGER NOT NULL DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS curriculum_units (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '🎵',
    color TEXT NOT NULL DEFAULT '#58cc02',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS curriculum_lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL,
    level_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    config_json TEXT NOT NULL DEFAULT '{}',
    xp_reward INTEGER NOT NULL DEFAULT 20,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(unit_id) REFERENCES curriculum_units(id) ON DELETE CASCADE
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

// Migration columns if upgrading existing sqlite
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';`);
} catch (e) {
  // column already exists
}
try {
  db.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;`);
} catch (e) {
  // column already exists
}

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
function createUser(username, email, passwordHash, displayName, isGuest = 0, avatar = '🎧', role = 'user', mustChangePassword = 0) {
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, display_name, is_guest, avatar, role, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = insertUser.run(username, email, passwordHash, displayName, isGuest, avatar, role, mustChangePassword);
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
    SELECT u.id, u.username, u.email, u.display_name, u.avatar, u.is_guest, u.role, u.must_change_password, u.created_at,
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

function getUserByEmail(email) {
  const row = db.prepare(`
    SELECT * FROM users WHERE LOWER(email) = LOWER(?)
  `).get(email);
  return row ? { ...row } : null;
}

function getUserByUsernameOrEmail(identifier) {
  const row = db.prepare(`
    SELECT * FROM users WHERE username = ? OR LOWER(email) = LOWER(?)
  `).get(identifier, identifier);
  return row ? { ...row } : null;
}

function getAllUsers() {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.email, u.display_name, u.avatar, u.is_guest, u.role, u.must_change_password, u.created_at,
           p.xp, p.gems, p.hearts, p.streak_days, p.longest_streak, p.last_active_date
    FROM users u
    LEFT JOIN user_profiles p ON u.id = p.user_id
    ORDER BY u.id ASC
  `).all();
  return rows.map(r => ({ ...r }));
}

function updateUserRole(userId, newRole) {
  db.prepare(`
    UPDATE users SET role = ? WHERE id = ?
  `).run(newRole, userId);
  return getUserById(userId);
}

function updateUserPassword(userId, passwordHash, mustChangePassword = 0) {
  db.prepare(`
    UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?
  `).run(passwordHash, mustChangePassword, userId);
  return getUserById(userId);
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

// ==========================================
// Curriculum & Lesson CMS Database Functions
// ==========================================

function getAllUnits() {
  const rows = db.prepare(`
    SELECT * FROM curriculum_units
    ORDER BY order_index ASC, id ASC
  `).all();
  return rows.map(r => ({ ...r }));
}

function getLessonsByUnit(unitId) {
  const rows = db.prepare(`
    SELECT * FROM curriculum_lessons
    WHERE unit_id = ?
    ORDER BY order_index ASC, level_number ASC, id ASC
  `).all(unitId);
  return rows.map(r => ({
    ...r,
    config: r.config_json ? JSON.parse(r.config_json) : {}
  }));
}

function getLessonById(lessonId) {
  const row = db.prepare(`
    SELECT * FROM curriculum_lessons WHERE id = ?
  `).get(lessonId);
  if (!row) return null;
  return {
    ...row,
    config: row.config_json ? JSON.parse(row.config_json) : {}
  };
}

function getLessonByUnitAndLevel(unitId, levelNumber) {
  const row = db.prepare(`
    SELECT * FROM curriculum_lessons WHERE unit_id = ? AND level_number = ?
  `).get(unitId, levelNumber);
  if (!row) return null;
  return {
    ...row,
    config: row.config_json ? JSON.parse(row.config_json) : {}
  };
}

function getCurriculumTree() {
  const units = getAllUnits();
  return units.map(u => ({
    id: u.id,
    title: u.title,
    subtitle: u.subtitle,
    icon: u.icon,
    color: u.color,
    order_index: u.order_index,
    levels: getLessonsByUnit(u.id).map(l => ({
      id: l.level_number,
      lessonDbId: l.id,
      title: l.title,
      description: l.description,
      type: l.type,
      config: l.config,
      xpReward: l.xp_reward,
      order_index: l.order_index
    }))
  }));
}

function createUnit({ id, title, subtitle, icon = '🎵', color = '#58cc02' }) {
  let targetId = id;
  if (targetId === undefined || targetId === null) {
    const maxRow = db.prepare('SELECT MAX(id) as maxId FROM curriculum_units').get();
    targetId = (maxRow?.maxId !== null && maxRow?.maxId !== undefined) ? maxRow.maxId + 1 : 0;
  }
  const maxOrder = db.prepare('SELECT MAX(order_index) as maxOrder FROM curriculum_units').get();
  const nextOrder = (maxOrder?.maxOrder !== null && maxOrder?.maxOrder !== undefined) ? maxOrder.maxOrder + 1 : 0;

  db.prepare(`
    INSERT INTO curriculum_units (id, title, subtitle, icon, color, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(targetId, title, subtitle, icon, color, nextOrder);

  return db.prepare('SELECT * FROM curriculum_units WHERE id = ?').get(targetId);
}

function updateUnit(unitId, { title, subtitle, icon, color }) {
  db.prepare(`
    UPDATE curriculum_units
    SET title = COALESCE(?, title),
        subtitle = COALESCE(?, subtitle),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color)
    WHERE id = ?
  `).run(title, subtitle, icon, color, unitId);

  return db.prepare('SELECT * FROM curriculum_units WHERE id = ?').get(unitId);
}

function deleteUnit(unitId) {
  // Cascading deletes lessons
  db.prepare('DELETE FROM curriculum_units WHERE id = ?').run(unitId);
  return true;
}

function createLesson(unitId, { title, description, type, config = {}, xpReward = 20 }) {
  // Determine next level_number and order_index in this unit
  const maxLevelRow = db.prepare('SELECT MAX(level_number) as maxLvl, MAX(order_index) as maxOrder FROM curriculum_lessons WHERE unit_id = ?').get(unitId);
  const nextLevel = (maxLevelRow?.maxLvl !== null && maxLevelRow?.maxLvl !== undefined) ? maxLevelRow.maxLvl + 1 : 0;
  const nextOrder = (maxLevelRow?.maxOrder !== null && maxLevelRow?.maxOrder !== undefined) ? maxLevelRow.maxOrder + 1 : 0;

  const res = db.prepare(`
    INSERT INTO curriculum_lessons (unit_id, level_number, title, description, type, config_json, xp_reward, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(unitId, nextLevel, title, description, type, JSON.stringify(config), xpReward, nextOrder);

  return getLessonById(Number(res.lastInsertRowid));
}

function updateLesson(lessonId, { title, description, type, config, xpReward }) {
  const existing = getLessonById(lessonId);
  if (!existing) return null;

  const newTitle = title !== undefined ? title : existing.title;
  const newDesc = description !== undefined ? description : existing.description;
  const newType = type !== undefined ? type : existing.type;
  const newConfigJson = config !== undefined ? JSON.stringify(config) : existing.config_json;
  const newXp = xpReward !== undefined ? xpReward : existing.xp_reward;

  db.prepare(`
    UPDATE curriculum_lessons
    SET title = ?, description = ?, type = ?, config_json = ?, xp_reward = ?
    WHERE id = ?
  `).run(newTitle, newDesc, newType, newConfigJson, newXp, lessonId);

  return getLessonById(lessonId);
}

function deleteLesson(lessonId) {
  db.prepare('DELETE FROM curriculum_lessons WHERE id = ?').run(lessonId);
  return true;
}

function reorderLessons(lessonIdsInOrder) {
  const stmt = db.prepare('UPDATE curriculum_lessons SET order_index = ?, level_number = ? WHERE id = ?');
  lessonIdsInOrder.forEach((id, idx) => {
    stmt.run(idx, idx, id);
  });
  return true;
}

function reorderUnits(unitIdsInOrder) {
  const stmt = db.prepare('UPDATE curriculum_units SET order_index = ? WHERE id = ?');
  unitIdsInOrder.forEach((id, idx) => {
    stmt.run(idx, id);
  });
  return true;
}

// ==========================================
// Auto-seeding of Initial Admin & Curriculum
// ==========================================

function seedInitialAdmin() {
  const existing = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get('tdelesio@gmail.com', 'tdelesio');
  if (!existing) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('password', salt);
    const res = db.prepare(`
      INSERT INTO users (username, email, password_hash, display_name, avatar, is_guest, role, must_change_password)
      VALUES (?, ?, ?, ?, ?, 0, 'admin', 1)
    `).run('tdelesio', 'tdelesio@gmail.com', hash, 'Tim Delesio', '🎵');
    const userId = Number(res.lastInsertRowid);
    db.prepare(`
      INSERT INTO user_profiles (user_id, xp, gems, hearts, max_hearts, streak_days, longest_streak, daily_goal_xp, streak_freezes, sound_preset)
      VALUES (?, 150, 500, 5, 5, 1, 1, 30, 2, 'grand_piano')
    `).run(userId);
    console.log('Seeded initial admin user: tdelesio@gmail.com (Password: password, must_change_password: 1)');
  } else if (existing.role !== 'admin') {
    // Ensure tdelesio has admin role if already registered
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
  }
}

function seedInitialCurriculum() {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM curriculum_units').get();
  if (countRow.count === 0) {
    const curriculum = require('./curriculum');
    const insertUnit = db.prepare(`
      INSERT INTO curriculum_units (id, title, subtitle, icon, color, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertLesson = db.prepare(`
      INSERT INTO curriculum_lessons (unit_id, level_number, title, description, type, config_json, xp_reward, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    curriculum.UNITS.forEach((unit, uIdx) => {
      insertUnit.run(unit.id, unit.title, unit.subtitle, unit.icon, unit.color, uIdx);
      unit.levels.forEach((lvl, lIdx) => {
        insertLesson.run(
          unit.id,
          lvl.id,
          lvl.title,
          lvl.description,
          lvl.type,
          JSON.stringify({}),
          lvl.xpReward || 20,
          lIdx
        );
      });
    });
    console.log(`Seeded ${curriculum.UNITS.length} initial curriculum units into database.`);
  }
}

// Run initial seeding
try {
  seedInitialAdmin();
  seedInitialCurriculum();
} catch (e) {
  console.error('Initial seeding warning:', e);
}

module.exports = {
  db,
  createUser,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  getUserByUsernameOrEmail,
  getAllUsers,
  updateUserRole,
  updateUserPassword,
  updateUserProfile,
  recordLessonProgress,
  recordDailyActivityAndStreak,
  getUserProgress,
  getDailyHistory,
  recordMistake,
  getMistakes,
  getLeaderboard,
  claimGuestAccount,
  getTodayString,
  // Curriculum CMS
  getAllUnits,
  getLessonsByUnit,
  getLessonById,
  getLessonByUnitAndLevel,
  getCurriculumTree,
  createUnit,
  updateUnit,
  deleteUnit,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  reorderUnits
};
