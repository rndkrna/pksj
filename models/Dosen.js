/**
 * Model Dosen
 */
const db = require('../config/database');

class Dosen {
  static async findByUserId(userId) {
    const [rows] = await db.execute(
      `SELECT d.*, u.username, u.nama_lengkap, u.email, u.is_active, u.last_login
       FROM dosen d
       JOIN users u ON d.user_id = u.id
       WHERE d.user_id = ? LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT d.*, u.username, u.nama_lengkap, u.email
       FROM dosen d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  // Ambil kelas yang diampu dosen ini (Zero Trust: otorisasi per dosen)
  static async getKelas(dosenId, tahunAjaran = '2026/2027', semesterType = 'ganjil') {
    const [rows] = await db.execute(
      `SELECT k.*, mk.kode_mk, mk.nama_mk, mk.sks, mk.semester,
              (SELECT COUNT(*) FROM krs WHERE kelas_id = k.id AND status = 'disetujui') AS jumlah_mahasiswa
       FROM kelas k
       JOIN mata_kuliah mk ON k.mata_kuliah_id = mk.id
       WHERE k.dosen_id = ? AND k.tahun_ajaran = ? AND k.semester_type = ?
       ORDER BY mk.kode_mk ASC`,
      [dosenId, tahunAjaran, semesterType]
    );
    return rows;
  }
}

module.exports = Dosen;

