const express = require('express');
const cors = require('cors');
const path = require('node:path');
const db = require('./db');
const auth = require('./auth');
const curriculum = require('./curriculum');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// ==========================================
// AUTH ROUTES
// ==========================================

// Register new user
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, displayName, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = db.getUserByUsername(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const passwordHash = auth.hashPassword(password);
    const user = db.createUser(
      cleanUsername,
      email || null,
      passwordHash,
      displayName || username,
      0,
      '🎧'
    );

    const token = auth.generateToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const userRecord = db.getUserByUsername(cleanUsername);
    if (!userRecord || !auth.verifyPassword(password, userRecord.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = db.getUserById(userRecord.id);
    const token = auth.generateToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Instant Guest Login (1-click fast start)
app.post('/api/auth/guest', (req, res) => {
  try {
    const guestNumber = Math.floor(1000 + Math.random() * 9000);
    const guestUsername = `guest_${Date.now()}_${guestNumber}`;
    const displayName = `Maestro ${guestNumber}`;
    const randomAvatars = ['🎧', '🎹', '🎵', '🎶', '🎷', '🎸', '🎺', '🎻'];
    const avatar = randomAvatars[Math.floor(Math.random() * randomAvatars.length)];

    const user = db.createUser(guestUsername, null, null, displayName, 1, avatar);
    const token = auth.generateToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error('Guest creation error:', err);
    res.status(500).json({ error: 'Failed to create guest session' });
  }
});

// Convert Guest account to permanent registered account
app.post('/api/auth/claim', auth.authMiddleware, (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = db.getUserByUsername(cleanUsername);
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const passwordHash = auth.hashPassword(password);
    const updatedUser = db.claimGuestAccount(req.user.id, cleanUsername, passwordHash, displayName || username);
    const token = auth.generateToken(updatedUser);

    res.json({ user: updatedUser, token });
  } catch (err) {
    console.error('Claim guest error:', err);
    res.status(500).json({ error: 'Failed to claim account' });
  }
});

// Get Current User Profile & Progress
app.get('/api/auth/me', auth.authMiddleware, (req, res) => {
  try {
    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const progress = db.getUserProgress(req.user.id);
    const dailyHistory = db.getDailyHistory(req.user.id, 14);
    res.json({ user, progress, dailyHistory });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// ==========================================
// CURRICULUM & LESSON ROUTES
// ==========================================

// Get entire curriculum tree
app.get('/api/curriculum', auth.optionalAuthMiddleware, (req, res) => {
  try {
    const units = curriculum.UNITS;
    let userProgress = [];
    if (req.user) {
      userProgress = db.getUserProgress(req.user.id);
    }

    // Merge progress into curriculum structure
    const progressMap = new Map();
    userProgress.forEach(p => {
      progressMap.set(`${p.unit_id}_${p.level_id}`, p);
    });

    // Determine lock/unlock states (all unlocked by default for testing; can enforce sequential with UNLOCK_ALL_LEVELS=false)
    const unlockAll = process.env.UNLOCK_ALL_LEVELS !== 'false';
    let previousCompleted = true; // Unit 0 Level 0 is unlocked by default
    const unitsWithStatus = units.map((unit) => {
      const levelsWithStatus = unit.levels.map((level) => {
        const key = `${unit.id}_${level.id}`;
        const record = progressMap.get(key);
        const isCompleted = record ? record.stars > 0 : false;
        const isUnlocked = unlockAll || previousCompleted;
        if (!isCompleted) {
          previousCompleted = false;
        }
        return {
          ...level,
          completed: isCompleted,
          stars: record ? record.stars : 0,
          score: record ? record.score : 0,
          unlocked: isUnlocked
        };
      });

      return {
        ...unit,
        levels: levelsWithStatus
      };
    });

    res.json({ units: unitsWithStatus });
  } catch (err) {
    console.error('Curriculum error:', err);
    res.status(500).json({ error: 'Failed to load curriculum' });
  }
});

// Get questions for a specific curriculum lesson
app.get('/api/curriculum/unit/:unitId/level/:levelId', (req, res) => {
  try {
    const unitId = parseInt(req.params.unitId, 10);
    const levelId = parseInt(req.params.levelId, 10);

    const unit = curriculum.UNITS.find(u => u.id === unitId);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    const level = unit.levels.find(l => l.id === levelId);
    if (!level) return res.status(404).json({ error: 'Level not found' });

    const questions = curriculum.generateQuestionsForLevel(level.type, 7);

    res.json({
      unit: { id: unit.id, title: unit.title, color: unit.color },
      level,
      questions
    });
  } catch (err) {
    console.error('Lesson questions error:', err);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

// Custom Practice Generator (Selectable Notes vs Chords)
app.post('/api/practice/custom', (req, res) => {
  try {
    const { mode, subType, count = 8 } = req.body;
    // mode: 'notes' | 'chords'
    let levelType = 'solfege_do_re_mi';

    if (mode === 'notes') {
      if (subType === 'direction') levelType = 'pitch_direction_wide';
      else if (subType === 'direction_close') levelType = 'pitch_direction_close';
      else if (subType === 'solfege_penta') levelType = 'solfege_pentachord_intro';
      else if (subType === 'solfege_full') levelType = 'solfege_full_scale';
      else if (subType === 'key_transposition') levelType = 'key_random';
      else levelType = 'solfege_do_re_mi';
    } else if (mode === 'chords') {
      if (subType === 'triad_maj_min') levelType = 'triad_maj_min';
      else if (subType === 'triad_all') levelType = 'triad_4way';
      else if (subType === 'seventh_basic') levelType = 'seventh_maj_dom';
      else if (subType === 'seventh_all') levelType = 'seventh_master';
      else levelType = 'triad_maj_min';
    }

    const questions = curriculum.generateQuestionsForLevel(levelType, count);
    res.json({ mode, subType, levelType, questions });
  } catch (err) {
    console.error('Custom practice error:', err);
    res.status(500).json({ error: 'Failed to generate custom practice' });
  }
});

// Complete Lesson & Save Progress
app.post('/api/lesson/complete', auth.authMiddleware, (req, res) => {
  try {
    const { unitId, levelId, score, stars, xpEarned, mistakes = [] } = req.body;
    const userId = req.user.id;

    // Record lesson progress & streak update
    const result = db.recordLessonProgress(userId, unitId, levelId, score, stars, xpEarned);

    // Record any mistakes to power adaptive review
    if (Array.isArray(mistakes)) {
      mistakes.forEach(m => {
        db.recordMistake(userId, m.category || 'general', m.questionText || '', m.userAnswer || '', m.correctAnswer || '');
      });
    }

    res.json({
      success: true,
      user: result.user,
      streakResult: result.streakResult,
      progress: result.progress
    });
  } catch (err) {
    console.error('Complete lesson error:', err);
    res.status(500).json({ error: 'Failed to complete lesson' });
  }
});

// Practice to Refill Hearts (Free, no penalty practice)
app.post('/api/hearts/refill', auth.authMiddleware, (req, res) => {
  try {
    const profile = db.getUserById(req.user.id);
    if (!profile) return res.status(404).json({ error: 'User not found' });

    const newHearts = Math.min(profile.max_hearts, profile.hearts + 1);
    const updated = db.updateUserProfile(req.user.id, { hearts: newHearts });
    res.json({ user: updated });
  } catch (err) {
    console.error('Heart refill error:', err);
    res.status(500).json({ error: 'Failed to refill heart' });
  }
});

// In-App Shop Purchases (using Gems)
app.post('/api/shop/purchase', auth.authMiddleware, (req, res) => {
  try {
    const { itemType } = req.body;
    const user = db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (itemType === 'full_hearts') {
      const COST = 100;
      if (user.gems < COST) return res.status(400).json({ error: 'Not enough gems' });
      const updated = db.updateUserProfile(user.id, {
        gems: user.gems - COST,
        hearts: user.max_hearts
      });
      return res.json({ user: updated, message: 'Hearts fully restored! ❤️❤️❤️❤️❤️' });
    }

    if (itemType === 'streak_freeze') {
      const COST = 150;
      if (user.gems < COST) return res.status(400).json({ error: 'Not enough gems' });
      const updated = db.updateUserProfile(user.id, {
        gems: user.gems - COST,
        streak_freezes: user.streak_freezes + 1
      });
      return res.json({ user: updated, message: 'Streak Freeze purchased! 🧊' });
    }

    if (['sound_rhodes', 'sound_synth', 'sound_marimba'].includes(itemType)) {
      const COST = 200;
      const soundPreset = itemType.replace('sound_', '');
      if (user.gems < COST) return res.status(400).json({ error: 'Not enough gems' });
      const updated = db.updateUserProfile(user.id, {
        gems: user.gems - COST,
        sound_preset: soundPreset
      });
      return res.json({ user: updated, message: `Sound theme set to ${soundPreset}! 🎶` });
    }

    res.status(400).json({ error: 'Unknown shop item' });
  } catch (err) {
    console.error('Shop purchase error:', err);
    res.status(500).json({ error: 'Failed to process purchase' });
  }
});

// Update Profile Settings (e.g. sound preset, daily goal)
app.post('/api/profile/update', auth.authMiddleware, (req, res) => {
  try {
    const { soundPreset, dailyGoalXp } = req.body;
    const updates = {};
    if (soundPreset) updates.sound_preset = soundPreset;
    if (dailyGoalXp) updates.daily_goal_xp = parseInt(dailyGoalXp, 10);

    const updated = db.updateUserProfile(req.user.id, updates);
    res.json({ user: updated });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  try {
    const board = db.getLeaderboard();
    // Fill with friendly simulated bot rivals if fewer than 5 registered users
    const mockRivals = [
      { id: -1, display_name: 'Wolfgang M.', avatar: '🎼', xp: 450, streak_days: 12 },
      { id: -2, display_name: 'Clara S.', avatar: '🎹', xp: 380, streak_days: 8 },
      { id: -3, display_name: 'Miles D.', avatar: '🎺', xp: 290, streak_days: 5 },
      { id: -4, display_name: 'Jimi H.', avatar: '🎸', xp: 210, streak_days: 3 },
      { id: -5, display_name: 'Ella F.', avatar: '🎙️', xp: 160, streak_days: 4 }
    ];

    const combined = [...board];
    mockRivals.forEach(r => {
      if (!combined.some(c => c.display_name === r.display_name)) {
        combined.push(r);
      }
    });

    combined.sort((a, b) => b.xp - a.xp);
    res.json({ leaderboard: combined.slice(0, 15) });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// Serve frontend build in production
const distPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  const indexHtml = path.join(distPath, 'index.html');
  res.sendFile(indexHtml);
});

app.listen(PORT, () => {
  console.log(`🎶 Cadence Ear Training Server running on http://localhost:${PORT}`);
});
