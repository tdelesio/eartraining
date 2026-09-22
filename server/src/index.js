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

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register New Account
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email ? email.trim().toLowerCase() : null;

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUsername = await db.getUserByUsername(cleanUsername);
    if (existingUsername) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    if (cleanEmail) {
      const existingEmail = await db.getUserByEmail(cleanEmail);
      if (existingEmail) {
        return res.status(409).json({ error: 'Email is already registered' });
      }
    }

    const passwordHash = auth.hashPassword(password);
    const user = await db.createUser(
      cleanUsername,
      cleanEmail,
      passwordHash,
      displayName || username,
      0,
      '🎧',
      'user',
      0
    );

    const token = auth.generateToken(user);
    res.json({
      user,
      token,
      mustChangePassword: false
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login (Supports either Username OR Email)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, email, identifier, password } = req.body;
    const loginIdentifier = (identifier || username || email || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const userRecord = await db.getUserByUsernameOrEmail(loginIdentifier);
    if (!userRecord || !auth.verifyPassword(password, userRecord.password_hash)) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const user = await db.getUserById(userRecord.id);
    const token = auth.generateToken(user);
    const mustChangePassword = Boolean(userRecord.must_change_password);

    res.json({
      user,
      token,
      mustChangePassword
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Force / Change Password
app.post('/api/auth/change-password', auth.authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hash = auth.hashPassword(newPassword);
    const updatedUser = await db.updateUserPassword(req.user.id, hash, 0);
    const newToken = auth.generateToken(updatedUser);

    res.json({
      success: true,
      user: updatedUser,
      token: newToken,
      mustChangePassword: false
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Instant Guest Login (1-click fast start)
app.post('/api/auth/guest', async (req, res) => {
  try {
    const guestNumber = Math.floor(1000 + Math.random() * 9000);
    const guestUsername = `guest_${Date.now()}_${guestNumber}`;
    const displayName = `Maestro ${guestNumber}`;
    const randomAvatars = ['🎧', '🎹', '🎵', '🎶', '🎷', '🎸', '🎺', '🎻'];
    const avatar = randomAvatars[Math.floor(Math.random() * randomAvatars.length)];

    const user = await db.createUser(guestUsername, null, null, displayName, 1, avatar, 'user', 0);
    const token = auth.generateToken(user);
    res.json({ user, token, mustChangePassword: false });
  } catch (err) {
    console.error('Guest creation error:', err);
    res.status(500).json({ error: 'Failed to create guest session' });
  }
});

// Convert Guest account to permanent registered account
app.post('/api/auth/claim', auth.authMiddleware, async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await db.getUserByUsername(cleanUsername);
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    if (email) {
      const existingEmail = await db.getUserByEmail(email.trim().toLowerCase());
      if (existingEmail && existingEmail.id !== req.user.id) {
        return res.status(409).json({ error: 'Email is already registered' });
      }
    }

    const passwordHash = auth.hashPassword(password);
    const updatedUser = await db.claimGuestAccount(req.user.id, cleanUsername, passwordHash, displayName || username);
    const token = auth.generateToken(updatedUser);

    res.json({ user: updatedUser, token, mustChangePassword: false });
  } catch (err) {
    console.error('Claim guest error:', err);
    res.status(500).json({ error: 'Failed to claim account' });
  }
});

// Get Current User Profile & Progress
app.get('/api/auth/me', auth.authMiddleware, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const progress = await db.getUserProgress(req.user.id);
    const dailyHistory = await db.getDailyHistory(req.user.id, 14);
    res.json({ user, progress, dailyHistory });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// ==========================================
// CURRICULUM & LESSON ROUTES (DB-BACKED)
// ==========================================

// Get entire curriculum tree
app.get('/api/curriculum', auth.optionalAuthMiddleware, async (req, res) => {
  try {
    const units = await db.getCurriculumTree();
    let userProgress = [];
    if (req.user && req.user.is_guest !== 1 && req.user.isGuest !== 1) {
      userProgress = await db.getUserProgress(req.user.id);
    }

    // Merge progress into curriculum structure
    const progressMap = new Map();
    userProgress.forEach(p => {
      progressMap.set(`${p.unit_id}_${p.level_id}`, p);
    });

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
app.get('/api/curriculum/unit/:unitId/level/:levelId', async (req, res) => {
  try {
    const unitId = parseInt(req.params.unitId, 10);
    const levelId = parseInt(req.params.levelId, 10);

    // Look up from DB first
    const dbLesson = await db.getLessonByUnitAndLevel(unitId, levelId);
    if (dbLesson) {
      const dbUnits = await db.getAllUnits();
      const dbUnit = dbUnits.find(u => u.id === unitId) || { id: unitId, title: `Unit ${unitId}`, color: '#58cc02' };
      const questions = curriculum.generateQuestionsForLevel(dbLesson.type, 7, dbLesson.config);

      return res.json({
        unit: { id: dbUnit.id, title: dbUnit.title, color: dbUnit.color },
        level: {
          id: dbLesson.level_number,
          title: dbLesson.title,
          description: dbLesson.description,
          type: dbLesson.type,
          xpReward: dbLesson.xp_reward,
          config: dbLesson.config
        },
        questions
      });
    }

    // Fallback to static UNITS
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
    let questions = [];

    if (mode === 'notes') {
      const typeMap = {
        direction: 'pitch_direction_boss',
        solfege_starter: 'solfege_do_re_mi',
        solfege_pentatonic: 'solfege_pentatonic',
        diatonic_scale: 'diatonic_scale_degrees',
        perfect_octave: 'perfect_octave_discovery',
        intervals_stepwise: 'stepwise_intervals',
        intervals_all: 'interval_challenge'
      };
      const resolvedType = typeMap[subType] || 'diatonic_scale_degrees';
      questions = curriculum.generateQuestionsForLevel(resolvedType, count);
    } else if (mode === 'chords') {
      const typeMap = {
        major_minor: 'major_vs_minor_chords',
        diminished_augmented: 'dim_aug_color',
        four_qualities: 'four_chord_qualities',
        chord_inversions: 'triad_inversions'
      };
      const resolvedType = typeMap[subType] || 'major_vs_minor_chords';
      questions = curriculum.generateQuestionsForLevel(resolvedType, count);
    } else {
      questions = curriculum.generateQuestionsForLevel('diatonic_scale_degrees', count);
    }

    res.json({
      unit: { id: -1, title: 'Custom Practice', color: '#3b82f6' },
      level: { id: -1, title: `${mode === 'chords' ? 'Chord' : 'Note'} Practice`, xpReward: 15 },
      questions
    });
  } catch (err) {
    console.error('Custom practice generation error:', err);
    res.status(500).json({ error: 'Failed to generate practice session' });
  }
});

// ==========================================
// ADMIN & CURRICULUM CMS API ROUTES
// (Protected by authMiddleware + requireAdmin)
// ==========================================

// Get all registered users
app.get('/api/admin/users', auth.authMiddleware, auth.requireAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// Update user role (elevate to admin or demote to user)
app.patch('/api/admin/users/:userId/role', auth.authMiddleware, auth.requireAdmin, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: "Role must be 'user' or 'admin'" });
    }

    // Safety: prevent admin from demoting themselves
    if (targetUserId === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot revoke your own admin status' });
    }

    const updated = await db.updateUserRole(targetUserId, role);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: updated });
  } catch (err) {
    console.error('Admin update role error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get editable curriculum tree
app.get('/api/admin/curriculum', auth.authMiddleware, auth.requireAdmin, async (req, res) => {
  try {
    const curriculumTree = await db.getCurriculumTree();
    res.json({ curriculum: curriculumTree });
  } catch (err) {
    console.error('Admin get curriculum error:', err);
    res.status(500).json({ error: 'Failed to load curriculum' });
  }
});

// Create Unit
app.post('/api/admin/units', auth.authMiddleware, auth.requireAdmin, async (req, res) => {
  try {
    const { title, subtitle, icon, color } = req.body;
    if (!title || !subtitle) {
      return res.status(400).json({ error: 'Title and subtitle are required' });
    }
    const unit = await db.createUnit({ title, subtitle, icon, color });
    res.json({ unit });
  } catch (err) {
    console.error('Admin create unit error:', err);
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

// Update Unit
app.put('/api/admin/units/:unitId', auth.authMiddleware, auth.requireAdmin, async (req, res) => {
  try {
    const unitId = parseInt(req.params.unitId, 10);
    const { title, subtitle, icon, color } = req.body;
    const unit = await db.updateUnit(unitId, { title, subtitle, icon, color });
    res.json({ unit });
  } catch (err) {
    console.error('Admin update unit error:', err);
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

// Delete Unit
app.delete('/api/admin/units/:unitId', auth.authMiddleware, auth.requireAdmin, async (req, res) => {
  try {
    const unitId = parseInt(req.params.unitId, 10);
    await db.deleteUnit(unitId);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete unit error:', err);
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

// Reorder Units
app.post('/api/admin/units/reorder', auth.authMiddleware, auth.requireAdmin, async (req, res) => {
  try {
    const { unitIds } = req.body;
    if (!Array.isArray(unitIds)) {
      return res.status(400).json({ error: 'unitIds must be an array' });
    }
    await db.reorderUnits(unitIds);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin reorder units error:', err);
    res.status(500).json({ error: 'Failed to reorder units' });
  }
});

// Create Lesson in Unit
app.post('/api/admin/units/:unitId/lessons', auth.authMiddleware, auth.requireAdmin, async (req, res) => {
  try {
    const unitId = parseInt(req.params.unitId, 10);
    const { title, description, type, config, xpReward } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    const lesson = await db.createLesson(unitId, {
      title,
      description,
      type: type || 'custom',
      config: config || {},
      xpReward: xpReward || 20
    });
    res.json({ lesson });
  } catch (err) {
    console.error('Admin create lesson error:', err);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// Update Lesson
app.put('/api/admin/lessons/:lessonId', auth.authMiddleware, auth.requireAdmin, async (req, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId, 10);
    const { title, description, type, config, xpReward } = req.body;
    const lesson = await db.updateLesson(lessonId, { title, description, type, config, xpReward });
    res.json({ lesson });
  } catch (err) {
    console.error('Admin update lesson error:', err);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// Delete Lesson
app.delete('/api/admin/lessons/:lessonId', auth.authMiddleware, auth.requireAdmin, async (req, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId, 10);
    await db.deleteLesson(lessonId);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete lesson error:', err);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// Reorder Lessons
app.post('/api/admin/lessons/reorder', auth.authMiddleware, auth.requireAdmin, async (req, res) => {
  try {
    const { lessonIds } = req.body;
    if (!Array.isArray(lessonIds)) {
      return res.status(400).json({ error: 'lessonIds must be an array' });
    }
    await db.reorderLessons(lessonIds);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin reorder lessons error:', err);
    res.status(500).json({ error: 'Failed to reorder lessons' });
  }
});

// Test Question Generator for Music Teacher Preview
app.post('/api/admin/preview-question', auth.authMiddleware, auth.requireAdmin, (req, res) => {
  try {
    const { type = 'custom', config = {} } = req.body;
    const question = curriculum.generateSingleQuestion(type, 0, config);
    res.json({ question });
  } catch (err) {
    console.error('Preview question error:', err);
    res.status(500).json({ error: 'Failed to generate preview question' });
  }
});

// ==========================================
// STUDENT PROGRESS & GAMEPLAY ROUTES
// ==========================================

// Submit Lesson Completion
app.post(['/api/progress/complete-lesson', '/api/lesson/complete'], auth.authMiddleware, async (req, res) => {
  try {
    const { unitId, levelId, score, stars, xpEarned = 20, mistakes = [] } = req.body;

    // Do NOT track progress as a guest
    if (req.user && (req.user.is_guest === 1 || req.user.isGuest === 1)) {
      const guestUser = await db.getUserById(req.user.id);
      return res.json({
        success: true,
        isGuest: true,
        message: 'Guest session: progress is not tracked',
        user: guestUser,
        streakResult: null,
        progress: []
      });
    }

    const result = await db.recordLessonProgress(
      req.user.id,
      parseInt(unitId, 10),
      parseInt(levelId, 10),
      parseInt(score, 10) || 100,
      parseInt(stars, 10) || 3,
      parseInt(xpEarned, 10) || 20
    );

    if (Array.isArray(mistakes)) {
      for (const m of mistakes) {
        await db.recordMistake(
          req.user.id,
          m.questionType || 'unknown',
          m.prompt || '',
          m.userAnswer || '',
          m.correctAnswer || ''
        );
      }
    }

    res.json({
      success: true,
      user: result.user,
      streakResult: result.streakResult,
      progress: result.progress
    });
  } catch (err) {
    console.error('Complete lesson error:', err);
    res.status(500).json({ error: 'Failed to record lesson completion' });
  }
});

// Update Profile Settings
app.patch('/api/profile/update', auth.authMiddleware, async (req, res) => {
  try {
    const { displayName, avatar, soundPreset, dailyGoalXp } = req.body;
    const updates = {};
    if (soundPreset) updates.sound_preset = soundPreset;
    if (dailyGoalXp) updates.daily_goal_xp = parseInt(dailyGoalXp, 10);

    const updatedUser = await db.updateUserProfile(req.user.id, updates);
    res.json({ user: updatedUser });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Refill Hearts with Gems
app.post('/api/shop/refill-hearts', auth.authMiddleware, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const HEART_COST = 50;
    if (user.gems < HEART_COST) {
      return res.status(400).json({ error: 'Not enough gems to refill hearts' });
    }

    const updated = await db.updateUserProfile(req.user.id, {
      gems: user.gems - HEART_COST,
      hearts: user.max_hearts
    });

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Refill hearts error:', err);
    res.status(500).json({ error: 'Failed to refill hearts' });
  }
});

// Purchase Streak Freeze
app.post('/api/shop/buy-freeze', auth.authMiddleware, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const FREEZE_COST = 100;
    if (user.gems < FREEZE_COST) {
      return res.status(400).json({ error: 'Not enough gems to purchase a freeze' });
    }

    const updated = await db.updateUserProfile(req.user.id, {
      gems: user.gems - FREEZE_COST,
      streak_freezes: user.streak_freezes + 1
    });

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Buy freeze error:', err);
    res.status(500).json({ error: 'Failed to buy streak freeze' });
  }
});

// Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const board = await db.getLeaderboard();
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

async function startServer() {
  await db.init();
  app.listen(PORT, () => {
    console.log(`🎶 Cadence Ear Training Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
