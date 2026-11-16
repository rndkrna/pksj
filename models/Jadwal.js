/**
 * Model Jadwal Perkuliahan
 */
const db = require('../config/database');

class Jadwal {
  // Jadwal untuk mahasiswa (hanya kelas yang disetujui di KRS)
  static async findByMahasiswa(mahasiswaId, tahunAjaran = '2026/2027', semesterType = 'ganjil') {
    const [rows] = await db.execute(
      `SELECT j.*, mk.kode_mk, mk.nama_mk, mk.sks, k.kode_kelas, u.nama_lengkap AS nama_dosen
       FROM jadwal j
       JOIN kelas k ON j.kelas_id = k.id
       JOIN mata_kuliah mk ON k.mata_kuliah_id = mk.id
       JOIN dosen d ON k.dosen_id = d.id
       JOIN users u ON d.user_id = u.id
       JOIN krs ON krs.kelas_id = k.id
       WHERE krs.mahasiswa_id = ? AND krs.tahun_ajaran = ? AND krs.semester_type = ? AND krs.status = 'disetujui'
       ORDER BY FIELD(j.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'), j.jam_mulai ASC`,
      [mahasiswaId, tahunAjaran, semesterType]
    );
    return rows;
  }

  // Jadwal untuk dosen (kelas yang diajar)
  static async findByDosen(dosenId, tahunAjaran = '2026/2027', semesterType = 'ganjil') {
    const [rows] = await db.execute(
      `SELECT j.*, mk.kode_mk, mk.nama_mk, mk.sks, k.kode_kelas,
              (SELECT COUNT(*) FROM krs WHERE kelas_id = k.id AND status = 'disetujui') AS jumlah_mahasiswa
       FROM jadwal j
       JOIN kelas k ON j.kelas_id = k.id
       JOIN mata_kuliah mk ON k.mata_kuliah_id = mk.id
       WHERE k.dosen_id = ? AND k.tahun_ajaran = ? AND k.semester_type = ?
       ORDER BY FIELD(j.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'), j.jam_mulai ASC`,
      [dosenId, tahunAjaran, semesterType]
    );
    return rows;
  }

  // Semua jadwal (admin)
  static async findAll(tahunAjaran = '2026/2027', semesterType = 'ganjil') {
    const [rows] = await db.execute(
      `SELECT j.*, mk.kode_mk, mk.nama_mk, mk.sks, k.kode_kelas, u.nama_lengkap AS nama_dosen
       FROM jadwal j
       JOIN kelas k ON j.kelas_id = k.id
       JOIN mata_kuliah mk ON k.mata_kuliah_id = mk.id
       JOIN dosen d ON k.dosen_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE k.tahun_ajaran = ? AND k.semester_type = ?
       ORDER BY FIELD(j.hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'), j.jam_mulai ASC`,
      [tahunAjaran, semesterType]
    );
    return rows;
  }
}

module.exports = Jadwal;

