const db = require('../db/sqlite');
const { v4: uuidv4 } = require('uuid');
const { publishSessionCompleted } = require('../kafka/producer');

const createSession = (call, callback) => {
  const { game_name, host_id, max_players } = call.request;

  try {
    const sessionId = uuidv4();
    const limit = max_players > 0 ? max_players : 10;
    
    // Create session
    const stmt = db.prepare('INSERT INTO sessions (session_id, game_name, host_id, max_players) VALUES (?, ?, ?, ?)');
    stmt.run(sessionId, game_name, host_id, limit);

    // Auto-join the host
    const joinStmt = db.prepare('INSERT INTO session_players (session_id, player_id) VALUES (?, ?)');
    joinStmt.run(sessionId, host_id);

    const session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId);

    callback(null, {
      session_id: session.session_id,
      game_name: session.game_name,
      host_id: session.host_id,
      status: session.status,
      created_at: session.created_at,
      player_ids: [host_id]
    });
  } catch (error) {
    callback({
      code: 13,
      message: 'Failed to create session.'
    });
  }
};

const getSession = (call, callback) => {
  const { session_id } = call.request;

  const session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(session_id);

  if (session) {
    const players = db.prepare('SELECT player_id FROM session_players WHERE session_id = ?').all(session_id);
    callback(null, {
      ...session,
      player_ids: players.map(p => p.player_id)
    });
  } else {
    callback({
      code: 5,
      message: 'Session not found'
    });
  }
};

const joinSession = (call, callback) => {
  const { session_id, player_id } = call.request;

  try {
    const session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(session_id);
    
    if (!session) {
      return callback({ code: 5, message: 'Session not found' });
    }

    if (session.status !== 'open') {
      return callback({ code: 9, message: 'Session is not open' }); /* FAILED_PRECONDITION */
    }

    const currentPlayersCount = db.prepare('SELECT COUNT(*) as count FROM session_players WHERE session_id = ?').get(session_id).count;

    if (currentPlayersCount >= session.max_players) {
       return callback({ code: 9, message: 'Session is full' });
    }

    // Check if player is already in session
    const existing = db.prepare('SELECT * FROM session_players WHERE session_id = ? AND player_id = ?').get(session_id, player_id);
    if (!existing) {
       const stmt = db.prepare('INSERT INTO session_players (session_id, player_id) VALUES (?, ?)');
       stmt.run(session_id, player_id);
    }

    const players = db.prepare('SELECT player_id FROM session_players WHERE session_id = ?').all(session_id);
    
    callback(null, {
      ...session,
      player_ids: players.map(p => p.player_id)
    });
  } catch (error) {
    callback({ code: 13, message: 'Failed to join session' });
  }
};

const endSession = async (call, callback) => {
  const { session_id, winner_id, scores } = call.request;

  try {
    const session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(session_id);
    if (!session) {
      return callback({ code: 5, message: 'Session not found' });
    }

    // Update session status and winner
    const stmt = db.prepare('UPDATE sessions SET status = ?, winner_id = ? WHERE session_id = ?');
    stmt.run('finished', winner_id, session_id);

    // Save individual scores
    const updateScoreStmt = db.prepare('UPDATE session_players SET score = ? WHERE session_id = ? AND player_id = ?');
    const getPlayersStmt = db.prepare('SELECT player_id FROM session_players WHERE session_id = ?');
    
    const playersList = getPlayersStmt.all(session_id).map(p => p.player_id);

    // Update scores in db
    for (const scoreEntry of scores) {
      updateScoreStmt.run(scoreEntry.score, session_id, scoreEntry.player_id);
    }
    
    const updatedSession = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(session_id);

    // Publish to Kafka
    await publishSessionCompleted({
       session_id,
       game_name: session.game_name,
       winner_id,
       scores: scores // {player_id, score}
    });

    callback(null, {
      session_id: updatedSession.session_id,
      game_name: updatedSession.game_name,
      host_id: updatedSession.host_id,
      status: updatedSession.status,
      winner_id: updatedSession.winner_id,
      created_at: updatedSession.created_at,
      player_ids: playersList
    });
  } catch (error) {
    callback({ code: 13, message: 'Failed to end session' });
  }
};

const listSessions = (call, callback) => {
  const { status } = call.request;
  
  let sessions;
  if (status) {
    sessions = db.prepare('SELECT * FROM sessions WHERE status = ?').all(status);
  } else {
    sessions = db.prepare('SELECT * FROM sessions').all();
  }

  // Populate players for each session
  const populatedSessions = sessions.map(session => {
    const players = db.prepare('SELECT player_id FROM session_players WHERE session_id = ?').all(session.session_id);
    return {
      ...session,
      player_ids: players.map(p => p.player_id)
    };
  });

  callback(null, { sessions: populatedSessions });
};

module.exports = {
  createSession,
  getSession,
  joinSession,
  endSession,
  listSessions
};
