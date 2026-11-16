/**
 * Model Mahasiswa
 */
const db = require('../config/database');

class Mahasiswa {
  static async findByUserId(userId) {
    const [rows] = await db.execute(
      `SELECT m.*, u.username, u.nama_lengkap, u.email, u.is_active, u.last_login
       FROM mahasiswa m
       JOIN users u ON m.user_id = u.id
       WHERE m.user_id = ? LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT m.*, u.username, u.nama_lengkap, u.email
       FROM mahasiswa m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  static async create({ user_id, nim, program_studi, angkatan, semester_aktif = 1 }) {
    const [result] = await db.execute(
      `INSERT INTO mahasiswa (user_id, nim, program_studi, angkatan, semester_aktif)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, nim, program_studi || 'Teknik Informatika', angkatan, semester_aktif]
    );
    return result;
  }
}

module.exports = Mahasiswa;

