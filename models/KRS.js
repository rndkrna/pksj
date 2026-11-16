/**
 * Model KRS (A-01: Data KRS)
 * R-02: Integritas kueri berparameter
 * R-06: Otorisasi & Isolasi Data antar-mahasiswa
 */
const db = require('../config/database');

class KRS {
  // Ambil KRS milik mahasiswa tertentu (Isolasi data CT-03)
  static async findByMahasiswa(mahasiswaId, tahunAjaran = '2026/2027', semesterType = 'ganjil') {
    const [rows] = await db.execute(
      `SELECT krs.id, krs.mahasiswa_id, krs.kelas_id, krs.tahun_ajaran, krs.semester_type, krs.status, krs.tanggal_pengisian,
              mk.kode_mk, mk.nama_mk, mk.sks, k.kode_kelas,
              u.nama_lengkap AS nama_dosen,
              n.nilai_akhir, n.huruf_mutu
       FROM krs
       JOIN kelas k ON krs.kelas_id = k.id
       JOIN mata_kuliah mk ON k.mata_kuliah_id = mk.id
       JOIN dosen d ON k.dosen_id = d.id
       JOIN users u ON d.user_id = u.id
       LEFT JOIN nilai n ON krs.id = n.krs_id
       WHERE krs.mahasiswa_id = ? AND krs.tahun_ajaran = ? AND krs.semester_type = ?
       ORDER BY mk.kode_mk ASC`,
      [mahasiswaId, tahunAjaran, semesterType]
    );
    return rows;
  }

  // Hitung total SKS yang diambil
  static async getTotalSKS(mahasiswaId, tahunAjaran = '2026/2027', semesterType = 'ganjil') {
    const [rows] = await db.execute(
      `SELECT COALESCE(SUM(mk.sks), 0) AS total_sks
       FROM krs
       JOIN kelas k ON krs.kelas_id = k.id
       JOIN mata_kuliah mk ON k.mata_kuliah_id = mk.id
       WHERE krs.mahasiswa_id = ? AND krs.tahun_ajaran = ? AND krs.semester_type = ? AND krs.status != 'ditolak'`,
      [mahasiswaId, tahunAjaran, semesterType]
    );
    return Number(rows[0].total_sks || 0);
  }

  // Ambil kelas yang tersedia untuk diambil
  static async getAvailableKelas(mahasiswaId, tahunAjaran = '2026/2027', semesterType = 'ganjil') {
    const [rows] = await db.execute(
      `SELECT k.id, k.kode_kelas, k.kapasitas,
              mk.kode_mk, mk.nama_mk, mk.sks, mk.semester,
              u.nama_lengkap AS nama_dosen,
              (SELECT COUNT(*) FROM krs WHERE kelas_id = k.id AND status != 'ditolak') AS terisi
       FROM kelas k
       JOIN mata_kuliah mk ON k.mata_kuliah_id = mk.id
       JOIN dosen d ON k.dosen_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE k.tahun_ajaran = ? AND k.semester_type = ?
         AND k.id NOT IN (
           SELECT kelas_id FROM krs WHERE mahasiswa_id = ? AND tahun_ajaran = ? AND semester_type = ?
         )
       ORDER BY mk.semester ASC, mk.kode_mk ASC`,
      [tahunAjaran, semesterType, mahasiswaId, tahunAjaran, semesterType]
    );
    return rows;
  }

  // Tambah mata kuliah ke KRS (Parameterized kueri)
  static async add({ mahasiswaId, kelasId, tahunAjaran = '2026/2027', semesterType = 'ganjil' }) {
    const [result] = await db.execute(
      `INSERT INTO krs (mahasiswa_id, kelas_id, tahun_ajaran, semester_type, status)
       VALUES (?, ?, ?, ?, 'disetujui')`,
      [mahasiswaId, kelasId, tahunAjaran, semesterType]
    );
    return result;
  }

  // Hapus KRS dengan validasi kepemilikan (R-06 / Zero Trust)
  static async remove(krsId, mahasiswaId) {
    const [result] = await db.execute(
      `DELETE FROM krs WHERE id = ? AND mahasiswa_id = ?`,
      [krsId, mahasiswaId]
    );
    return result;
  }
}

module.exports = KRS;

