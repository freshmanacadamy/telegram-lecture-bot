const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config');

const db = new sqlite3.Database(config.DATABASE_PATH);

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'student',
    student_id TEXT,
    verification_photo TEXT,
    is_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Lectures table
  db.run(`CREATE TABLE IF NOT EXISTS lectures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lecturer_id INTEGER,
    title TEXT,
    description TEXT,
    subject TEXT,
    prerequisites TEXT,
    duration TEXT,
    proposed_times TEXT,
    status TEXT DEFAULT 'pending',
    admin_approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lecturer_id) REFERENCES users(telegram_id)
  )`);

  // Registrations table
  db.run(`CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lecture_id INTEGER,
    student_id INTEGER,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lecture_id) REFERENCES lectures(id),
    FOREIGN KEY(student_id) REFERENCES users(telegram_id)
  )`);

  // Admin actions table
  db.run(`CREATE TABLE IF NOT EXISTS admin_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action TEXT,
    target_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Database helper functions
const dbHelpers = {
  // User management
  async getUser(telegramId) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE telegram_id = ?", [telegramId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  async createUser(userData) {
    return new Promise((resolve, reject) => {
      db.run(`INSERT OR REPLACE INTO users 
              (telegram_id, username, first_name, last_name, role, student_id) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        [userData.id, userData.username, userData.first_name, userData.last_name, 'student', ''],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
    });
  },

  // Lecture management
  async createLecture(lectureData) {
    return new Promise((resolve, reject) => {
      db.run(`INSERT INTO lectures 
              (lecturer_id, title, description, subject, prerequisites, duration, proposed_times) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [lectureData.lecturer_id, lectureData.title, lectureData.description, 
         lectureData.subject, lectureData.prerequisites, lectureData.duration, 
         lectureData.proposed_times],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
    });
  },

  async getPendingLectures() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT l.*, u.username, u.first_name 
              FROM lectures l 
              JOIN users u ON l.lecturer_id = u.telegram_id 
              WHERE l.admin_approved = 0 AND l.status = 'pending'`, 
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
    });
  },

  // Registration management
  async registerForLecture(lectureId, studentId) {
    return new Promise((resolve, reject) => {
      db.run("INSERT INTO registrations (lecture_id, student_id) VALUES (?, ?)",
        [lectureId, studentId], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
    });
  },

  // Admin functions
  async approveLecture(lectureId, adminId) {
    return new Promise((resolve, reject) => {
      db.run("UPDATE lectures SET admin_approved = 1, status = 'active' WHERE id = ?",
        [lectureId], function(err) {
          if (err) reject(err);
          else {
            // Log admin action
            db.run("INSERT INTO admin_actions (admin_id, action, target_id) VALUES (?, ?, ?)",
              [adminId, 'approve_lecture', lectureId]);
            resolve(this.changes);
          }
        });
    });
  },

  // Export functions
  async getAllRegistrations() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT r.*, u.first_name, u.student_id, l.title as lecture_title
              FROM registrations r
              JOIN users u ON r.student_id = u.telegram_id
              JOIN lectures l ON r.lecture_id = l.id`, 
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
    });
  }
};

module.exports = { db, dbHelpers };
