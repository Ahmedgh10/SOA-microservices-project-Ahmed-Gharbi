const BASE_URL = 'http://localhost:3000/api';

const requestJson = async (label, url, options = {}) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
};

const waitFor = async (label, check, { timeoutMs = 30000, intervalMs = 1000 } = {}) => {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await check();
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`${label} timed out${lastError ? `: ${lastError.message}` : ''}`);
};

const testE2E = async () => {
  console.log('Starting E2E Integration Test...');

  const runId = Date.now();
  let p1;
  let p2;
  let session;

  try {
    console.log('\n[1] Registering Player 1...');
    p1 = await requestJson('Register Player 1', `${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `E2E_P1_${runId}`,
        email: `p1_${runId}@test.com`,
        password: 'p1'
      })
    });
    console.log('Player 1 Created:', p1.user_id);

    console.log('\n[1.1] Registering Player 2...');
    p2 = await requestJson('Register Player 2', `${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `E2E_P2_${runId}`,
        email: `p2_${runId}@test.com`,
        password: 'p2'
      })
    });
    console.log('Player 2 Created:', p2.user_id);

    console.log('\n[2] Creating Session (Host: P1)...');
    session = await requestJson('Create Session', `${BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_name: 'Apex Duels',
        host_id: p1.user_id,
        max_players: 2
      })
    });
    console.log('Session Created:', session.session_id);

    console.log('\n[3] Player 2 Joins Session...');
    const joinResp = await requestJson('Join Session', `${BASE_URL}/sessions/${session.session_id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: p2.user_id })
    });
    console.log('Joined Successfully:', joinResp.status);

    console.log('\n[4] Ending Session (P1 wins)...');
    const endResp = await requestJson('End Session', `${BASE_URL}/sessions/${session.session_id}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winner_id: p1.user_id,
        scores: [
          { player_id: p1.user_id, score: 1000 },
          { player_id: p2.user_id, score: 500 }
        ]
      })
    });
    console.log('Session Ended:', endResp.status);

    console.log('\nWaiting for Kafka to process session.completed...');

    console.log('\n[5] Checking Leaderboard...');
    const leaderboard = await waitFor('Leaderboard update', async () => {
      const entries = await requestJson('Get Leaderboard', `${BASE_URL}/leaderboard?top_n=5`);
      const p1LeaderboardEntry = entries.find(entry => entry.player_id === p1.user_id);
      return p1LeaderboardEntry && p1LeaderboardEntry.total_score >= 1000 ? entries : null;
    });

    console.log('Leaderboard Results:', JSON.stringify(leaderboard, null, 2));

    console.log('\n[6] Checking Player 1 Stats & Achievements...');
    const stats = await waitFor('Player 1 stats update', async () => {
      const currentStats = await requestJson('Get Player 1 Stats', `${BASE_URL}/leaderboard/${p1.user_id}/stats`);
      return currentStats.total_score >= 1000 && currentStats.wins >= 1 && currentStats.games_played >= 1
        ? currentStats
        : null;
    });

    console.log('Player 1 Stats:', JSON.stringify(stats, null, 2));

    const updatedUser = await waitFor('User Service score.updated consumption', async () => {
      const currentUser = await requestJson('Get Updated Player 1', `${BASE_URL}/users/${p1.user_id}`);
      return currentUser.total_wins >= 1 ? currentUser : null;
    });
    console.log('Player 1 Profile Wins:', updatedUser.total_wins);

    const achievements = await requestJson(
      'Get Player 1 Achievements',
      `${BASE_URL}/leaderboard/${p1.user_id}/achievements`
    );
    console.log('Player 1 Achievements:', JSON.stringify(achievements, null, 2));

    console.log('\nE2E TEST COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('\nTEST FAILED:', error.message);
    process.exitCode = 1;
  }
};

testE2E();
