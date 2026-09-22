const db = require('./db');
const auth = require('./auth');
const curriculum = require('./curriculum');

console.log('Testing Cadence Backend & Database...');

// 1. Create a user
const testUser = db.createUser('mozart', 'mozart@classical.com', auth.hashPassword('pass123'), 'Wolfgang Amadeus', 0, '🎼');
console.log('Created user:', testUser.username, 'ID:', testUser.id, 'XP:', testUser.xp);
if (!testUser || testUser.xp !== 0) throw new Error('User creation failed');

// 2. Test password verification
const userRecord = db.getUserByUsername('mozart');
const passValid = auth.verifyPassword('pass123', userRecord.password_hash);
console.log('Password valid:', passValid);
if (!passValid) throw new Error('Password verification failed');

// 3. Test curriculum generation
const units = curriculum.UNITS;
console.log('Total curriculum units:', units.length);
if (units.length !== 7) throw new Error('Expected 7 curriculum units');

const qPitch = curriculum.generateQuestionsForLevel('pitch_direction_wide', 3);
console.log('Pitch Direction sample question:', qPitch[0].questionText, 'Options:', qPitch[0].options.map(o => o.label));

const qTriad = curriculum.generateQuestionsForLevel('triad_maj_min', 3);
console.log('Triad sample question:', qTriad[0].questionText, 'Notes:', qTriad[0].audioPrompt.notes);

const qSeventh = curriculum.generateQuestionsForLevel('seventh_master', 3);
console.log('7th Chord sample question:', qSeventh[0].questionText, 'Notes:', qSeventh[0].audioPrompt.notes);

// 4. Test lesson completion and streak update
const completion = db.recordLessonProgress(testUser.id, 0, 0, 100, 3, 25);
console.log('Lesson completed! New streak:', completion.streakResult.streakDays, 'Total XP:', completion.streakResult.totalXp, 'Gems:', completion.streakResult.totalGems);
if (completion.streakResult.streakDays !== 1 || completion.streakResult.totalXp !== 25) {
  throw new Error('Lesson progress recording failed');
}

// 5. Test guest creation & claiming
const guest = db.createUser('guest_test_999', null, null, 'Maestro Guest', 1, '🎧');
console.log('Created guest:', guest.username, 'is_guest:', guest.is_guest);
const claimed = db.claimGuestAccount(guest.id, 'claimed_user', auth.hashPassword('newpass'), 'Now Registered');
console.log('Claimed account:', claimed.username, 'is_guest:', claimed.is_guest);
if (claimed.is_guest !== 0 || claimed.username !== 'claimed_user') {
  throw new Error('Guest claim failed');
}

console.log('All backend & database tests passed with flying colors! 🎵');
