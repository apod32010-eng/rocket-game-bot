const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'game.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        username TEXT,
        balance REAL DEFAULT 1000,
        total_wins INTEGER DEFAULT 0,
        total_losses INTEGER DEFAULT 0,
        total_spins INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Game history table
    db.run(`
      CREATE TABLE IF NOT EXISTS game_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        bet_amount REAL,
        result TEXT,
        multiplier REAL,
        winnings REAL,
        game_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      )
    `);

    // Gift wheel spins table
    db.run(`
      CREATE TABLE IF NOT EXISTS gift_spins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        prize_name TEXT,
        prize_amount REAL,
        spin_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
      )
    `);
  });
}

// User functions
function getUser(userId, callback) {
  db.get('SELECT * FROM users WHERE user_id = ?', [userId], callback);
}

function createUser(userId, username, callback) {
  const config = require('./config');
  db.run(
    'INSERT INTO users (user_id, username, balance) VALUES (?, ?, ?)',
    [userId, username, config.STARTING_BALANCE],
    callback
  );
}

function updateBalance(userId, amount, callback) {
  db.run(
    'UPDATE users SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
    [amount, userId],
    callback
  );
}

function updateWinLoss(userId, result, callback) {
  const column = result === 'win' ? 'total_wins' : 'total_losses';
  db.run(
    `UPDATE users SET ${column} = ${column} + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
    [userId],
    callback
  );
}

// Game history functions
function saveGameResult(userId, betAmount, result, multiplier, winnings, callback) {
  db.run(
    'INSERT INTO game_history (user_id, bet_amount, result, multiplier, winnings) VALUES (?, ?, ?, ?, ?)',
    [userId, betAmount, result, multiplier, winnings],
    callback
  );
}

function getGameHistory(userId, limit = 10, callback) {
  db.all(
    'SELECT * FROM game_history WHERE user_id = ? ORDER BY game_date DESC LIMIT ?',
    [userId, limit],
    callback
  );
}

// Gift wheel functions
function saveGiftSpin(userId, prizeName, prizeAmount, callback) {
  db.run(
    'INSERT INTO gift_spins (user_id, prize_name, prize_amount) VALUES (?, ?, ?)',
    [userId, prizeName, prizeAmount],
    callback
  );
}

function getGiftSpins(userId, limit = 5, callback) {
  db.all(
    'SELECT * FROM gift_spins WHERE user_id = ? ORDER BY spin_date DESC LIMIT ?',
    [userId, limit],
    callback
  );
}

// Leaderboard
function getLeaderboard(limit = 10, callback) {
  db.all(
    'SELECT user_id, username, balance, total_wins FROM users ORDER BY balance DESC LIMIT ?',
    [limit],
    callback
  );
}

module.exports = {
  db,
  getUser,
  createUser,
  updateBalance,
  updateWinLoss,
  saveGameResult,
  getGameHistory,
  saveGiftSpin,
  getGiftSpins,
  getLeaderboard
};
