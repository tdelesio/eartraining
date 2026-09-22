const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');

let mysql = null;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  // mysql2 optional if running in pure sqlite mode
}

// Database configuration
const dbType = (process.env.DB_TYPE || (process.env.DB_HOST ? 'mysql' : 'sqlite')).toLowerCase();
const isMySQL = dbType === 'mysql';

let mysqlPool = null;
let sqliteDb = null;
let isInitialized = false;

// -------------------------------------------------------------
// Database Execution Abstraction (query, queryOne, execute)
// -------------------------------------------------------------

async function query(sql, params = []) {
  if (isMySQL) {
    const [rows] = await mysqlPool.query(sql, params);
    return rows;
  } else {
    return sqliteDb.prepare(sql).all(...params);
  }
}

async function queryOne(sql, params = []) {
  if (isMySQL) {
    const [rows] = await mysqlPool.query(sql, params);
    return rows[0] || null;
  } else {
    const row = sqliteDb.prepare(sql).get(...params);
    return row || null;
  }
}

async function execute(sql, params = []) {
  if (isMySQL) {
    const [result] = await mysqlPool.query(sql, params);
    return {
      insertId: result.insertId,
      affectedRows: result.affectedRows
    };
  } else {
    const result = sqliteDb.prepare(sql).run(...params);
    return {
      insertId: Number(result.lastInsertRowid),
      affectedRows: result.changes
    };
  }
}

// -------------------------------------------------------------
// Schema Initialization & Auto-Seeding
// -------------------------------------------------------------

async function initMySQL() {
  if (!mysql) {
    throw new Error('mysql2 package is not installed');
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'dbuser';
  const password = process.env.DB_PASSWORD || 'dbpassword';
  const database = process.env.DB_NAME || 'eartraining';

  // Retry connection loop for container environments
  const maxAttempts = 15;
  const delayMs = 2000;
  let pool = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Connecting to MySQL database at ${host}:${port}/${database} (attempt ${attempt}/${maxAttempts})...`);
      pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
      });
      // Test connection
      const conn = await pool.getConnection();
      conn.release();
      console.log(`✅ Successfully connected to MySQL database: ${database}`);
      break;
    } catch (err) {
      console.warn(`MySQL connection attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxAttempts) {
        throw new Error(`Failed to connect to MySQL after ${maxAttempts} attempts: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  mysqlPool = pool;

  // Initialize MySQL Tables
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(191) NOT NULL UNIQUE,
      email VARCHAR(191),
      password_hash VARCHAR(255),
      display_name VARCHAR(255) NOT NULL,
      avatar VARCHAR(50) NOT NULL DEFAULT '🎧',
      is_guest TINYINT(1) NOT NULL DEFAULT 0,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      must_change_password TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INT PRIMARY KEY,
      xp INT NOT NULL DEFAULT 0,
      gems INT NOT NULL DEFAULT 150,
      hearts INT NOT NULL DEFAULT 5,
      max_hearts INT NOT NULL DEFAULT 5,
      streak_days INT NOT NULL DEFAULT 0,
      longest_streak INT NOT NULL DEFAULT 0,
      last_active_date VARCHAR(50),
      daily_goal_xp INT NOT NULL DEFAULT 30,
      streak_freezes INT NOT NULL DEFAULT 1,
      sound_preset VARCHAR(50) NOT NULL DEFAULT 'grand_piano',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS curriculum_units (
      id INT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(255) NOT NULL,
      icon VARCHAR(50) NOT NULL DEFAULT '🎵',
      color VARCHAR(50) NOT NULL DEFAULT '#58cc02',
      order_index INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS curriculum_lessons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      unit_id INT NOT NULL,
      level_number INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      config_json LONGTEXT NOT NULL,
      xp_reward INT NOT NULL DEFAULT 20,
      order_index INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unit_id) REFERENCES curriculum_units(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      unit_id INT NOT NULL,
      level_id INT NOT NULL,
      stars INT NOT NULL DEFAULT 0,
      score INT NOT NULL DEFAULT 0,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_unit_level (user_id, unit_id, level_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS daily_activity (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      date VARCHAR(50) NOT NULL,
      xp_earned INT NOT NULL DEFAULT 0,
      lessons_completed INT NOT NULL DEFAULT 0,
      quota_met TINYINT(1) NOT NULL DEFAULT 0,
      UNIQUE KEY unique_user_date (user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS mistakes_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      question_type VARCHAR(50) NOT NULL,
      prompt TEXT NOT NULL,
      user_answer TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      count INT NOT NULL DEFAULT 1,
      last_mistake_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('✅ MySQL schema verified and ready.');
}

async function initSQLite() {
  const { DatabaseSync } = require('node:sqlite');
  const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'eartraining.sqlite');
  console.log(`Using SQLite database at: ${dbPath}`);
  sqliteDb = new DatabaseSync(dbPath);

  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  sqliteDb.exec('PRAGMA foreign_keys = ON;');

  sqliteDb.exec(`
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

  try {
    sqliteDb.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';`);
  } catch (e) {
    // column exists
  }
  try {
    sqliteDb.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {
    // column exists
  }
}

async function seedInitialAdmin() {
  const existing = await queryOne('SELECT * FROM users WHERE email = ? OR username = ?', ['tdelesio@gmail.com', 'tdelesio']);
  if (!existing) {
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || 'password';
    const mustChange = process.env.INITIAL_ADMIN_MUST_CHANGE_PASSWORD === 'false' ? 0 : 1;
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(initialPassword, salt);

    const res = await execute(`
      INSERT INTO users (username, email, password_hash, display_name, avatar, is_guest, role, must_change_password)
      VALUES (?, ?, ?, ?, ?, 0, 'admin', ?)
    `, ['tdelesio', 'tdelesio@gmail.com', hash, 'Tim Delesio', '🎵', mustChange]);

    const userId = res.insertId;
    await execute(`
      INSERT INTO user_profiles (user_id, xp, gems, hearts, max_hearts, streak_days, longest_streak, daily_goal_xp, streak_freezes, sound_preset)
      VALUES (?, 150, 500, 5, 5, 1, 1, 30, 2, 'grand_piano')
    `, [userId]);
    console.log(`Seeded initial admin user: tdelesio@gmail.com (Password: ${initialPassword === 'password' ? 'password' : '***'}, must_change_password: ${mustChange})`);
  } else if (existing.role !== 'admin') {
    await execute("UPDATE users SET role = 'admin' WHERE id = ?", [existing.id]);
  }
}

async function seedInitialCurriculum() {
  const countRow = await queryOne('SELECT COUNT(*) as count FROM curriculum_units');
  const count = Number(countRow?.count || 0);
  if (count === 0) {
    const curriculum = require('./curriculum');
    for (const unit of curriculum.UNITS) {
      await execute(`
        INSERT INTO curriculum_units (id, title, subtitle, icon, color, order_index)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [unit.id, unit.title, unit.subtitle, unit.icon, unit.color, unit.id]);

      for (const level of unit.levels) {
        await execute(`
          INSERT INTO curriculum_lessons (unit_id, level_number, title, description, type, config_json, xp_reward, order_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          unit.id,
          level.id,
          level.title,
          level.description,
          level.type,
          JSON.stringify(level.config || {}),
          level.xpReward || 20,
          level.id
        ]);
      }
    }
    console.log(`Seeded ${curriculum.UNITS.length} initial curriculum units into database.`);
  }
}

async function init() {
  if (isInitialized) return;

  if (isMySQL) {
    await initMySQL();
  } else {
    await initSQLite();
  }

  await seedInitialAdmin();
  await seedInitialCurriculum();

  isInitialized = true;
  console.log(`Cadence database initialized successfully [Engine: ${isMySQL ? 'MySQL' : 'SQLite'}]`);
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

// -------------------------------------------------------------
// User Operations
// -------------------------------------------------------------

async function createUser(username, email, passwordHash, displayName, isGuest = 0, avatar = '🎧', role = 'user', mustChangePassword = 0) {
  const result = await execute(`
    INSERT INTO users (username, email, password_hash, display_name, is_guest, avatar, role, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [username, email, passwordHash, displayName, isGuest, avatar, role, mustChangePassword]);

  const userId = result.insertId;

  await execute(`
    INSERT INTO user_profiles (user_id, xp, gems, hearts, max_hearts, streak_days, longest_streak, daily_goal_xp, streak_freezes, sound_preset)
    VALUES (?, 0, 150, 5, 5, 0, 0, 30, 1, 'grand_piano')
  `, [userId]);

  return getUserById(userId);
}

async function getUserById(id) {
  const row = await queryOne(`
    SELECT u.id, u.username, u.email, u.display_name, u.avatar, u.is_guest, u.role, u.must_change_password, u.created_at,
           p.xp, p.gems, p.hearts, p.max_hearts, p.streak_days, p.longest_streak,
           p.last_active_date, p.daily_goal_xp, p.streak_freezes, p.sound_preset
    FROM users u
    JOIN user_profiles p ON u.id = p.user_id
    WHERE u.id = ?
  `, [id]);

  return row ? { ...row } : null;
}

async function getUserByUsername(username) {
  const row = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
  return row ? { ...row } : null;
}

async function getUserByEmail(email) {
  const row = await queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  return row ? { ...row } : null;
}

async function getUserByUsernameOrEmail(identifier) {
  const row = await queryOne('SELECT * FROM users WHERE username = ? OR LOWER(email) = LOWER(?)', [identifier, identifier]);
  return row ? { ...row } : null;
}

async function getAllUsers() {
  const rows = await query(`
    SELECT u.id, u.username, u.email, u.display_name, u.avatar, u.is_guest, u.role, u.must_change_password, u.created_at,
           p.xp, p.gems, p.hearts, p.streak_days, p.longest_streak, p.last_active_date
    FROM users u
    LEFT JOIN user_profiles p ON u.id = p.user_id
    WHERE u.is_guest = 0
    ORDER BY u.id ASC
  `);
  return rows.map(r => ({ ...r }));
}

async function updateUserRole(userId, newRole) {
  await execute('UPDATE users SET role = ? WHERE id = ?', [newRole, userId]);
  return getUserById(userId);
}

async function updateUserPassword(userId, passwordHash, mustChangePassword = 0) {
  await execute('UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?', [passwordHash, mustChangePassword, userId]);
  return getUserById(userId);
}

async function updateUserProfile(userId, updates = {}) {
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
  await execute(`UPDATE user_profiles SET ${setClauses.join(', ')} WHERE user_id = ?`, values);

  return getUserById(userId);
}

async function recordDailyActivityAndStreak(userId, xpEarned) {
  const today = getTodayString();
  const yesterday = getYesterdayString();

  const profile = await queryOne('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  if (!profile) return null;

  const existingDaily = await queryOne('SELECT * FROM daily_activity WHERE user_id = ? AND date = ?', [userId, today]);
  let newDailyXp = xpEarned;
  let newLessons = 1;
  let quotaMet = 0;

  if (existingDaily) {
    newDailyXp = existingDaily.xp_earned + xpEarned;
    newLessons = existingDaily.lessons_completed + 1;
    quotaMet = newDailyXp >= profile.daily_goal_xp ? 1 : 0;
    await execute(`
      UPDATE daily_activity
      SET xp_earned = ?, lessons_completed = ?, quota_met = ?
      WHERE id = ?
    `, [newDailyXp, newLessons, quotaMet, existingDaily.id]);
  } else {
    quotaMet = newDailyXp >= profile.daily_goal_xp ? 1 : 0;
    await execute(`
      INSERT INTO daily_activity (user_id, date, xp_earned, lessons_completed, quota_met)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, today, newDailyXp, newLessons, quotaMet]);
  }

  // Calculate streak logic
  let currentStreak = profile.streak_days;
  let freezes = profile.streak_freezes;
  const lastActive = profile.last_active_date;

  if (lastActive === today) {
    // Already active today; streak unchanged
  } else if (lastActive === yesterday) {
    currentStreak += 1;
  } else if (!lastActive) {
    currentStreak = 1;
  } else {
    if (freezes > 0) {
      freezes -= 1;
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
  }

  const longestStreak = Math.max(currentStreak, profile.longest_streak);
  const totalXp = profile.xp + xpEarned;
  const totalGems = profile.gems + 15;

  await execute(`
    UPDATE user_profiles
    SET xp = ?, gems = ?, streak_days = ?, longest_streak = ?, last_active_date = ?, streak_freezes = ?
    WHERE user_id = ?
  `, [totalXp, totalGems, currentStreak, longestStreak, today, freezes, userId]);

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

async function recordLessonProgress(userId, unitId, levelId, score, stars, xpEarned) {
  const existing = await queryOne(`
    SELECT * FROM lesson_progress WHERE user_id = ? AND unit_id = ? AND level_id = ?
  `, [userId, unitId, levelId]);

  if (existing) {
    const bestStars = Math.max(existing.stars, stars);
    const bestScore = Math.max(existing.score, score);
    await execute(`
      UPDATE lesson_progress
      SET stars = ?, score = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [bestStars, bestScore, existing.id]);
  } else {
    await execute(`
      INSERT INTO lesson_progress (user_id, unit_id, level_id, stars, score)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, unitId, levelId, stars, score]);
  }

  const streakResult = await recordDailyActivityAndStreak(userId, xpEarned);
  return {
    progress: await getUserProgress(userId),
    streakResult,
    user: await getUserById(userId)
  };
}

async function getUserProgress(userId) {
  const rows = await query(`
    SELECT unit_id, level_id, stars, score, completed_at
    FROM lesson_progress
    WHERE user_id = ?
    ORDER BY unit_id ASC, level_id ASC
  `, [userId]);
  return rows.map(r => ({ ...r }));
}

async function getDailyHistory(userId, limit = 14) {
  const rows = await query(`
    SELECT date, xp_earned, lessons_completed, quota_met
    FROM daily_activity
    WHERE user_id = ?
    ORDER BY date DESC
    LIMIT ?
  `, [userId, limit]);
  return rows.map(r => ({ ...r }));
}

async function recordMistake(userId, questionType, prompt, userAnswer, correctAnswer) {
  const existing = await queryOne(`
    SELECT * FROM mistakes_log
    WHERE user_id = ? AND question_type = ? AND prompt = ?
  `, [userId, questionType, prompt]);

  if (existing) {
    await execute(`
      UPDATE mistakes_log
      SET count = count + 1, user_answer = ?, last_mistake_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [userAnswer, existing.id]);
  } else {
    await execute(`
      INSERT INTO mistakes_log (user_id, question_type, prompt, user_answer, correct_answer)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, questionType, prompt, userAnswer, correctAnswer]);
  }
}

async function getMistakes(userId, limit = 10) {
  const rows = await query(`
    SELECT question_type, prompt, user_answer, correct_answer, count, last_mistake_at
    FROM mistakes_log
    WHERE user_id = ?
    ORDER BY count DESC, last_mistake_at DESC
    LIMIT ?
  `, [userId, limit]);
  return rows.map(r => ({ ...r }));
}

async function getLeaderboard() {
  const rows = await query(`
    SELECT u.id, u.display_name, u.avatar, p.xp, p.streak_days
    FROM users u
    JOIN user_profiles p ON u.id = p.user_id
    WHERE u.is_guest = 0
    ORDER BY p.xp DESC
    LIMIT 20
  `);
  return rows.map(r => ({ ...r }));
}

async function claimGuestAccount(guestUserId, newUsername, passwordHash, displayName) {
  await execute(`
    UPDATE users
    SET username = ?, password_hash = ?, display_name = ?, is_guest = 0
    WHERE id = ? AND is_guest = 1
  `, [newUsername, passwordHash, displayName, guestUserId]);

  return getUserById(guestUserId);
}

// -------------------------------------------------------------
// Curriculum & Lesson CMS Operations
// -------------------------------------------------------------

async function getAllUnits() {
  const rows = await query(`
    SELECT * FROM curriculum_units
    ORDER BY order_index ASC, id ASC
  `);
  return rows.map(r => ({ ...r }));
}

async function getLessonsByUnit(unitId) {
  const rows = await query(`
    SELECT * FROM curriculum_lessons
    WHERE unit_id = ?
    ORDER BY order_index ASC, level_number ASC, id ASC
  `, [unitId]);
  return rows.map(r => ({
    ...r,
    config: typeof r.config_json === 'string' ? JSON.parse(r.config_json || '{}') : (r.config_json || {})
  }));
}

async function getLessonById(lessonId) {
  const row = await queryOne('SELECT * FROM curriculum_lessons WHERE id = ?', [lessonId]);
  if (!row) return null;
  return {
    ...row,
    config: typeof row.config_json === 'string' ? JSON.parse(row.config_json || '{}') : (row.config_json || {})
  };
}

async function getLessonByUnitAndLevel(unitId, levelNumber) {
  const row = await queryOne('SELECT * FROM curriculum_lessons WHERE unit_id = ? AND level_number = ?', [unitId, levelNumber]);
  if (!row) return null;
  return {
    ...row,
    config: typeof row.config_json === 'string' ? JSON.parse(row.config_json || '{}') : (row.config_json || {})
  };
}

async function getCurriculumTree() {
  const units = await getAllUnits();
  const tree = [];
  for (const u of units) {
    const lessons = await getLessonsByUnit(u.id);
    tree.push({
      id: u.id,
      title: u.title,
      subtitle: u.subtitle,
      icon: u.icon,
      color: u.color,
      order_index: u.order_index,
      levels: lessons.map(l => ({
        id: l.level_number,
        lessonDbId: l.id,
        title: l.title,
        description: l.description,
        type: l.type,
        config: l.config,
        xpReward: l.xp_reward,
        order_index: l.order_index
      }))
    });
  }
  return tree;
}

async function createUnit({ id, title, subtitle, icon = '🎵', color = '#58cc02' }) {
  let targetId = id;
  if (targetId === undefined || targetId === null) {
    const maxRow = await queryOne('SELECT MAX(id) as maxId FROM curriculum_units');
    targetId = (maxRow?.maxId !== null && maxRow?.maxId !== undefined) ? Number(maxRow.maxId) + 1 : 0;
  }
  const maxOrder = await queryOne('SELECT MAX(order_index) as maxOrder FROM curriculum_units');
  const nextOrder = (maxOrder?.maxOrder !== null && maxOrder?.maxOrder !== undefined) ? Number(maxOrder.maxOrder) + 1 : 0;

  await execute(`
    INSERT INTO curriculum_units (id, title, subtitle, icon, color, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [targetId, title, subtitle, icon, color, nextOrder]);

  return queryOne('SELECT * FROM curriculum_units WHERE id = ?', [targetId]);
}

async function updateUnit(unitId, { title, subtitle, icon, color }) {
  await execute(`
    UPDATE curriculum_units
    SET title = COALESCE(?, title),
        subtitle = COALESCE(?, subtitle),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color)
    WHERE id = ?
  `, [title, subtitle, icon, color, unitId]);

  return queryOne('SELECT * FROM curriculum_units WHERE id = ?', [unitId]);
}

async function deleteUnit(unitId) {
  await execute('DELETE FROM curriculum_units WHERE id = ?', [unitId]);
  return true;
}

async function createLesson(unitId, { title, description, type, config = {}, xpReward = 20 }) {
  const maxLevelRow = await queryOne('SELECT MAX(level_number) as maxLvl, MAX(order_index) as maxOrder FROM curriculum_lessons WHERE unit_id = ?', [unitId]);
  const nextLevel = (maxLevelRow?.maxLvl !== null && maxLevelRow?.maxLvl !== undefined) ? Number(maxLevelRow.maxLvl) + 1 : 0;
  const nextOrder = (maxLevelRow?.maxOrder !== null && maxLevelRow?.maxOrder !== undefined) ? Number(maxLevelRow.maxOrder) + 1 : 0;

  const res = await execute(`
    INSERT INTO curriculum_lessons (unit_id, level_number, title, description, type, config_json, xp_reward, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [unitId, nextLevel, title, description, type, JSON.stringify(config), xpReward, nextOrder]);

  return getLessonById(res.insertId);
}

async function updateLesson(lessonId, { title, description, type, config, xpReward }) {
  const existing = await getLessonById(lessonId);
  if (!existing) return null;

  const newTitle = title !== undefined ? title : existing.title;
  const newDesc = description !== undefined ? description : existing.description;
  const newType = type !== undefined ? type : existing.type;
  const newConfigJson = config !== undefined ? JSON.stringify(config) : (typeof existing.config_json === 'string' ? existing.config_json : JSON.stringify(existing.config_json || {}));
  const newXp = xpReward !== undefined ? xpReward : existing.xp_reward;

  await execute(`
    UPDATE curriculum_lessons
    SET title = ?, description = ?, type = ?, config_json = ?, xp_reward = ?
    WHERE id = ?
  `, [newTitle, newDesc, newType, newConfigJson, newXp, lessonId]);

  return getLessonById(lessonId);
}

async function deleteLesson(lessonId) {
  await execute('DELETE FROM curriculum_lessons WHERE id = ?', [lessonId]);
  return true;
}

async function reorderLessons(lessonIdsInOrder) {
  for (let idx = 0; idx < lessonIdsInOrder.length; idx++) {
    await execute('UPDATE curriculum_lessons SET order_index = ?, level_number = ? WHERE id = ?', [idx, idx, lessonIdsInOrder[idx]]);
  }
  return true;
}

async function reorderUnits(unitIdsInOrder) {
  for (let idx = 0; idx < unitIdsInOrder.length; idx++) {
    await execute('UPDATE curriculum_units SET order_index = ? WHERE id = ?', [idx, unitIdsInOrder[idx]]);
  }
  return true;
}

module.exports = {
  init,
  query,
  queryOne,
  execute,
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
