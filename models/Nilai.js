/**
 * Model Nilai (A-01: Data Nilai)
 * R-02: Integritas nilai, validasi server-side & parameterized query
 * CT-04: Integritas nilai/KRS
 */
const db = require('../config/database');

class Nilai {
  // Hitung huruf mutu & bobot otomatis di server-side (mencegah manipulasi klien)
  static calculateGrade(akhir) {
    if (akhir >= 85) return { huruf: 'A', bobot: 4.00 };
    if (akhir >= 80) return { huruf: 'A-', bobot: 3.75 };
    if (akhir >= 75) return { huruf: 'B+', bobot: 3.50 };
    if (akhir >= 70) return { huruf: 'B', bobot: 3.00 };
    if (akhir >= 65) return { huruf: 'B-', bobot: 2.75 };
    if (akhir >= 60) return { huruf: 'C+', bobot: 2.50 };
    if (akhir >= 55) return { huruf: 'C', bobot: 2.00 };
    if (akhir >= 40) return { huruf: 'D', bobot: 1.00 };
    return { huruf: 'E', bobot: 0.00 };
  }

  // Ambil daftar nilai per kelas (Hanya untuk dosen pengampu kelas tsb - Zero Trust)
  static async findByKelas(kelasId, dosenId) {
    const [rows] = await db.execute(
      `SELECT krs.id AS krs_id, krs.mahasiswa_id,
              m.nim, u.nama_lengkap AS nama_mahasiswa,
              mk.kode_mk, mk.nama_mk, k.kode_kelas,
              n.id AS nilai_id, n.nilai_tugas, n.nilai_uts, n.nilai_uas, n.nilai_akhir, n.huruf_mutu, n.bobot, n.updated_at
       FROM krs
       JOIN kelas k ON krs.kelas_id = k.id
       JOIN mata_kuliah mk ON k.mata_kuliah_id = mk.id
       JOIN mahasiswa m ON krs.mahasiswa_id = m.id
       JOIN users u ON m.user_id = u.id
       LEFT JOIN nilai n ON krs.id = n.krs_id
       WHERE krs.kelas_id = ? AND k.dosen_id = ? AND krs.status = 'disetujui'
       ORDER BY m.nim ASC`,
      [kelasId, dosenId]
    );
    return rows;
  }

  // Simpan / update nilai dengan kalkulasi server-side
  static async upsert({ krsId, tugas, uts, uas, inputByUserId }) {
    const numTugas = Number(tugas);
    const numUts = Number(uts);
    const numUas = Number(uas);

    // Rumus: Tugas 30% + UTS 30% + UAS 40%
    const akhir = (numTugas * 0.3) + (numUts * 0.3) + (numUas * 0.4);
    const { huruf, bobot } = Nilai.calculateGrade(akhir);

    const [existing] = await db.execute(
      `SELECT id FROM nilai WHERE krs_id = ? LIMIT 1`,
      [krsId]
    );

    if (existing.length > 0) {
      await db.execute(
        `UPDATE nilai
         SET nilai_tugas = ?, nilai_uts = ?, nilai_uas = ?, nilai_akhir = ?, huruf_mutu = ?, bobot = ?, input_by = ?, updated_at = NOW()
         WHERE krs_id = ?`,
        [numTugas, numUts, numUas, akhir, huruf, bobot, inputByUserId, krsId]
      );
      return { action: 'update', akhir, huruf, bobot };
    } else {
      await db.execute(
        `INSERT INTO nilai (krs_id, nilai_tugas, nilai_uts, nilai_uas, nilai_akhir, huruf_mutu, bobot, input_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [krsId, numTugas, numUts, numUas, akhir, huruf, bobot, inputByUserId]
      );
      return { action: 'insert', akhir, huruf, bobot };
    }
  }

  // Transkrip lengkap untuk mahasiswa
  static async getTranscript(mahasiswaId) {
    const [rows] = await db.execute(
      `SELECT n.*, mk.kode_mk, mk.nama_mk, mk.sks, krs.tahun_ajaran, krs.semester_type
       FROM nilai n
       JOIN krs ON n.krs_id = krs.id
       JOIN kelas k ON krs.kelas_id = k.id
       JOIN mata_kuliah mk ON k.mata_kuliah_id = mk.id
       WHERE krs.mahasiswa_id = ?
       ORDER BY krs.tahun_ajaran DESC, krs.semester_type DESC, mk.kode_mk ASC`,
      [mahasiswaId]
    );
    return rows;
  }

  // Hitung IPK Mahasiswa
  static async calculateIPK(mahasiswaId) {
    const [rows] = await db.execute(
      `SELECT SUM(n.bobot * mk.sks) AS total_bobot, SUM(mk.sks) AS total_sks
       FROM nilai n
       JOIN krs ON n.krs_id = krs.id
       JOIN kelas k ON krs.kelas_id = k.id
       JOIN mata_kuliah mk ON k.mata_kuliah_id = mk.id
       WHERE krs.mahasiswa_id = ? AND n.huruf_mutu IS NOT NULL`,
      [mahasiswaId]
    );

    if (rows[0] && rows[0].total_sks > 0) {
      return (Number(rows[0].total_bobot) / Number(rows[0].total_sks)).toFixed(2);
    }
    return '0.00';
  }
}

module.exports = Nilai;

