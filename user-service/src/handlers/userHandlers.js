const db = require('../db/sqlite');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const createUser = (call, callback) => {
  const { username, email, password } = call.request;

  try {
    const userId = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const stmt = db.prepare('INSERT INTO users (user_id, username, email, password) VALUES (?, ?, ?, ?)');
    stmt.run(userId, username, email, hashedPassword);

    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);

    callback(null, {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      total_wins: user.total_wins,
      created_at: user.created_at
    });
  } catch (error) {
    callback({
      code: 13, // INTERNAL
      message: 'Failed to create user. Username or email might already exist.'
    });
  }
};

const getUser = (call, callback) => {
  const { user_id } = call.request;

  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(user_id);

  if (user) {
    callback(null, user);
  } else {
    callback({
      code: 5, // NOT_FOUND
      message: 'User not found'
    });
  }
};

const updateUser = (call, callback) => {
  const { user_id, username, email } = call.request;

  try {
    const stmt = db.prepare('UPDATE users SET username = ?, email = ? WHERE user_id = ?');
    const info = stmt.run(username, email, user_id);

    if (info.changes > 0) {
      const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(user_id);
      callback(null, user);
    } else {
      callback({ code: 5, message: 'User not found' });
    }
  } catch (error) {
    callback({ code: 13, message: 'Failed to update user' });
  }
};

const deleteUser = (call, callback) => {
  const { user_id } = call.request;

  const stmt = db.prepare('DELETE FROM users WHERE user_id = ?');
  const info = stmt.run(user_id);

  if (info.changes > 0) {
    callback(null, { success: true, message: 'User deleted successfully' });
  } else {
    callback({ code: 5, message: 'User not found' });
  }
};

const listUsers = (call, callback) => {
  const { page, limit } = call.request;
  const p = page > 0 ? page : 1;
  const l = limit > 0 ? limit : 10;
  const offset = (p - 1) * l;

  const users = db.prepare('SELECT * FROM users LIMIT ? OFFSET ?').all(l, offset);
  const total = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;

  callback(null, {
    users,
    total
  });
};

module.exports = {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  listUsers
};
