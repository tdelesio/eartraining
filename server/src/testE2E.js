// End-to-End Integration Verification Test
const http = require('node:http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runE2ETests() {
  console.log('--- STARTING E2E INTEGRATION TEST SUITE ---');

  // Step 1: Create Guest Session
  console.log('\n[1] Creating Guest User...');
  const guestRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/guest',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (guestRes.status !== 200 || !guestRes.data.token) {
    throw new Error(`Guest creation failed: ${JSON.stringify(guestRes)}`);
  }
  const token = guestRes.data.token;
  const guestUser = guestRes.data.user;
  console.log(`✓ Guest created: ${guestUser.username} (${guestUser.display_name}), Hearts: ${guestUser.hearts}, Streak: ${guestUser.streak_days}`);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Step 2: Fetch Curriculum
  console.log('\n[2] Fetching Curriculum Tree...');
  const currRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/curriculum',
    method: 'GET',
    headers: authHeaders
  });

  if (currRes.status !== 200 || !currRes.data.units) {
    throw new Error('Failed to load curriculum');
  }
  console.log(`✓ Curriculum loaded: ${currRes.data.units.length} Units total.`);
  const unit0 = currRes.data.units[0];
  console.log(`  Unit 0: "${unit0.title}" has ${unit0.levels.length} levels.`);
  if (!unit0.levels[0].unlocked) {
    throw new Error('First level should be unlocked by default');
  }
  console.log(`✓ First level "${unit0.levels[0].title}" is unlocked.`);

  // Step 3: Fetch Questions for Unit 0 Level 0
  console.log('\n[3] Generating Questions for Unit 0 Level 0...');
  const qRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/curriculum/unit/0/level/0',
    method: 'GET',
    headers: authHeaders
  });
  if (qRes.status !== 200 || !qRes.data.questions || qRes.data.questions.length === 0) {
    throw new Error('Failed to generate level questions');
  }
  console.log(`✓ Generated ${qRes.data.questions.length} questions.`);
  console.log(`  Sample prompt: "${qRes.data.questions[0].questionText}" (Notes: ${qRes.data.questions[0].audioPrompt.notes.join(', ')})`);

  // Step 4: Complete Lesson & Earn XP
  console.log('\n[4] Submitting Completed Lesson (100% accuracy)...');
  const completeRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/lesson/complete',
    method: 'POST',
    headers: authHeaders
  }, {
    unitId: 0,
    levelId: 0,
    score: 100,
    stars: 3,
    xpEarned: 35,
    mistakes: []
  });

  if (completeRes.status !== 200 || !completeRes.data.success) {
    throw new Error('Failed to record lesson completion');
  }
  const updatedUser = completeRes.data.user;
  console.log(`✓ Lesson recorded! XP: ${updatedUser.xp}, Streak: ${updatedUser.streak_days} days, Gems: ${updatedUser.gems}`);

  // Step 5: Test Custom Chord Practice Mode
  console.log('\n[5] Testing User-Selectable Chord Practice (Maj7 vs Dom7)...');
  const chordPracticeRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/practice/custom',
    method: 'POST',
    headers: authHeaders
  }, {
    mode: 'chords',
    subType: 'seventh_basic',
    count: 5
  });

  if (chordPracticeRes.status !== 200 || chordPracticeRes.data.questions.length !== 5) {
    throw new Error('Failed to generate custom chord practice');
  }
  console.log(`✓ Generated ${chordPracticeRes.data.questions.length} 7th chord questions.`);

  // Step 6: Claim Guest Account to Permanent Account
  console.log('\n[6] Claiming Guest Account to Permanent Account...');
  const permanentUsername = `maestro_${Date.now()}`;
  const claimRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/claim',
    method: 'POST',
    headers: authHeaders
  }, {
    username: permanentUsername,
    password: 'securePassword123!',
    displayName: 'Virtuoso Ear Trainer'
  });

  if (claimRes.status !== 200 || claimRes.data.user.is_guest !== 0) {
    throw new Error(`Failed to claim guest account: ${JSON.stringify(claimRes)}`);
  }
  console.log(`✓ Account successfully registered! Username: ${claimRes.data.user.username}, is_guest: ${claimRes.data.user.is_guest}`);
  console.log(`✓ Preserved XP: ${claimRes.data.user.xp}, Streak: ${claimRes.data.user.streak_days}`);

  console.log('\n=============================================');
  console.log('🎉 ALL END-TO-END INTEGRATION TESTS PASSED! 🎉');
  console.log('=============================================');
}

runE2ETests().catch(err => {
  console.error('E2E TEST FAILURE:', err);
  process.exit(1);
});
