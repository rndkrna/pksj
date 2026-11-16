/**
 * Model User (A-02: Basis data akun pengguna)
 * R-01: Autentikasi, rate limit, account lockout
 * R-02: Parameterized Queries (Anti SQLi)
 */
const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async findByUsername(username) {
    const [rows] = await db.execute(
      `SELECT * FROM users WHERE username = ? LIMIT 1`,
      [username]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT id, username, nama_lengkap, email, role, is_active, login_attempts, locked_until, last_login, created_at 
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async isLocked(username) {
    const [rows] = await db.execute(
      `SELECT locked_until FROM users WHERE username = ? LIMIT 1`,
      [username]
    );
    if (rows[0] && rows[0].locked_until) {
      return new Date(rows[0].locked_until) > new Date();
    }
    return false;
  }

  static async incrementLoginAttempts(username) {
    const maxAttempts = parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5;
    const lockoutMinutes = parseInt(process.env.LOGIN_LOCKOUT_MINUTES) || 15;

    const [rows] = await db.execute(
      `SELECT login_attempts FROM users WHERE username = ?`,
      [username]
    );

    if (rows[0]) {
      const attempts = (rows[0].login_attempts || 0) + 1;
      if (attempts >= maxAttempts) {
        await db.execute(
          `UPDATE users 
           SET login_attempts = ?, locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) 
           WHERE username = ?`,
          [attempts, lockoutMinutes, username]
        );
        return { locked: true, attempts };
      } else {
        await db.execute(
          `UPDATE users SET login_attempts = ? WHERE username = ?`,
          [attempts, username]
        );
        return { locked: false, attempts };
      }
    }
    return { locked: false, attempts: 0 };
  }

  static async resetLoginAttempts(username) {
    await db.execute(
      `UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE username = ?`,
      [username]
    );
  }

  static async findAll() {
    const [rows] = await db.execute(
      `SELECT id, username, nama_lengkap, email, role, is_active, login_attempts, locked_until, last_login, created_at 
       FROM users ORDER BY role ASC, username ASC`
    );
    return rows;
  }

  static async countByRole() {
    const [rows] = await db.execute(
      `SELECT role, COUNT(*) AS count FROM users GROUP BY role`
    );
    return rows;
  }

  static async create({ username, password, nama_lengkap, email, role }) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const [result] = await db.execute(
      `INSERT INTO users (username, password, nama_lengkap, email, role) VALUES (?, ?, ?, ?, ?)`,
      [username, hashedPassword, nama_lengkap, email || null, role]
    );
    return result;
  }

  static async update(id, { nama_lengkap, email, role, is_active }) {
    const [result] = await db.execute(
      `UPDATE users SET nama_lengkap = ?, email = ?, role = ?, is_active = ? WHERE id = ?`,
      [nama_lengkap, email || null, role, is_active ? 1 : 0, id]
    );
    return result;
  }

  static async toggleActive(id) {
    const [result] = await db.execute(
      `UPDATE users SET is_active = IF(is_active = 1, 0, 1) WHERE id = ?`,
      [id]
    );
    return result;
  }

  static async unlockAccount(id) {
    const [result] = await db.execute(
      `UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?`,
      [id]
    );
    return result;
  }
}

module.exports = User;

