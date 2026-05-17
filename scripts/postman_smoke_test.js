const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const state = {
  runId: Date.now(),
  userId: null,
  playerTwoId: null,
  sessionId: null
};

const requestJson = async (name, path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.errors) {
    throw new Error(`${name} failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  }

  console.log(`PASS ${name}`);
  return body;
};

const postJson = (name, path, body) => requestJson(name, path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const putJson = (name, path, body) => requestJson(name, path, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const graphQL = (name, query, variables = {}) => postJson(name, '/graphql', { query, variables });

const waitFor = async (name, check, timeoutMs = 30000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const value = await check();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`${name} timed out`);
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  const p1 = await postJson('REST Create User', '/api/users', {
    username: `postman_p1_${state.runId}`,
    email: `postman_p1_${state.runId}@arena.com`,
    password: 'secure123'
  });
  state.userId = p1.user_id;
  assert(state.userId, 'Create User did not return user_id');

  const p2 = await postJson('REST Create Second User', '/api/users', {
    username: `postman_p2_${state.runId}`,
    email: `postman_p2_${state.runId}@arena.com`,
    password: 'secure123'
  });
  state.playerTwoId = p2.user_id;
  assert(state.playerTwoId, 'Create Second User did not return user_id');

  const users = await requestJson('REST List Users', '/api/users?page=1&limit=10');
  assert(Array.isArray(users.users), 'List Users did not return users array');

  const user = await requestJson('REST Get User', `/api/users/${state.userId}`);
  assert(user.user_id === state.userId, 'Get User returned the wrong user');

  const updated = await putJson('REST Update User', `/api/users/${state.userId}`, {
    username: `postman_p1_updated_${state.runId}`,
    email: `postman_p1_updated_${state.runId}@arena.com`
  });
  assert(updated.username.includes('updated'), 'Update User did not update username');

  const session = await postJson('REST Create Session', '/api/sessions', {
    game_name: 'Valorant',
    host_id: state.userId,
    max_players: 5
  });
  state.sessionId = session.session_id;
  assert(state.sessionId, 'Create Session did not return session_id');

  const sessions = await requestJson('REST List Sessions', '/api/sessions?status=open');
  assert(Array.isArray(sessions.sessions), 'List Sessions did not return sessions array');

  const fetchedSession = await requestJson('REST Get Session', `/api/sessions/${state.sessionId}`);
  assert(fetchedSession.session_id === state.sessionId, 'Get Session returned the wrong session');

  const joinedSession = await postJson('REST Join Session', `/api/sessions/${state.sessionId}/join`, {
    player_id: state.playerTwoId
  });
  assert(joinedSession.player_ids.includes(state.playerTwoId), 'Join Session did not include second player');

  const endedSession = await postJson('REST End Session', `/api/sessions/${state.sessionId}/end`, {
    winner_id: state.userId,
    scores: [
      { player_id: state.userId, score: 1000 },
      { player_id: state.playerTwoId, score: 500 }
    ]
  });
  assert(endedSession.status === 'finished', 'End Session did not finish the session');

  const leaderboard = await waitFor('REST Get Leaderboard', async () => {
    const entries = await requestJson('REST Get Leaderboard', '/api/leaderboard?top_n=10&game=Valorant');
    return entries.find(entry => entry.player_id === state.userId && entry.total_score >= 1000) ? entries : null;
  });
  assert(Array.isArray(leaderboard), 'Leaderboard did not return an array');

  const stats = await waitFor('REST Get Player Stats', async () => {
    const currentStats = await requestJson('REST Get Player Stats', `/api/leaderboard/${state.userId}/stats`);
    return currentStats.total_score >= 1000 && currentStats.wins >= 1 ? currentStats : null;
  });
  assert(stats.player_id === state.userId, 'Player stats returned the wrong player');

  const achievements = await requestJson('REST Get Player Achievements', `/api/leaderboard/${state.userId}/achievements`);
  assert(Array.isArray(achievements), 'Achievements did not return an array');

  const gqlLeaderboard = await graphQL(
    'GraphQL Leaderboard Query',
    'query { getLeaderboard(top_n: 10) { rank player_id username total_score wins } }'
  );
  assert(Array.isArray(gqlLeaderboard.data.getLeaderboard), 'GraphQL leaderboard did not return an array');

  const gqlDashboard = await graphQL(
    'GraphQL Player Dashboard Query',
    'query PlayerDashboard($playerId: ID!) { getPlayerStats(player_id: $playerId) { player_id total_score wins games_played rank } getPlayerAchievements(player_id: $playerId) { title description unlocked_at } }',
    { playerId: state.userId }
  );
  assert(gqlDashboard.data.getPlayerStats.player_id === state.userId, 'GraphQL dashboard returned wrong stats');

  const gqlCreatedUser = await graphQL(
    'GraphQL Create User Mutation',
    'mutation CreateUser($username: String!, $email: String!) { createUser(username: $username, email: $email, password: "secure123") { user_id username email total_wins created_at } }',
    {
      username: `graphql_player_${state.runId}`,
      email: `graphql_${state.runId}@arena.com`
    }
  );
  assert(gqlCreatedUser.data.createUser.user_id, 'GraphQL createUser did not return user_id');

  const gqlEndedSession = await graphQL(
    'GraphQL End Session Mutation',
    'mutation EndSession($sessionId: ID!, $winnerId: ID!) { endSession(session_id: $sessionId, winner_id: $winnerId, scores: [{ player_id: $winnerId, score: 1000 }]) { session_id status winner_id player_ids } }',
    { sessionId: state.sessionId, winnerId: state.userId }
  );
  assert(gqlEndedSession.data.endSession.status === 'finished', 'GraphQL endSession did not finish session');

  const deleted = await requestJson('REST Delete User', `/api/users/${state.userId}`, { method: 'DELETE' });
  assert(deleted.success, 'Delete User did not return success');

  console.log('\nAll Postman smoke requests passed.');
};

run().catch(error => {
  console.error(`\nFAIL ${error.message}`);
  process.exitCode = 1;
});
