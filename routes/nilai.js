/**
 * Routes Nilai
 * R-02: Integritas data nilai (skor 15 - Tinggi)
 * CT-04: Integritas nilai/KRS
 * Zero Trust: Dosen hanya mengelola kelas yang menjadi tanggung jawabnya
 */
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const Nilai = require('../models/Nilai');
const Dosen = require('../models/Dosen');
const Mahasiswa = require('../models/Mahasiswa');
const AuditLog = require('../models/AuditLog');
const { isValidScore } = require('../utils/validator');

router.use(isAuthenticated);

// GET /nilai (Halaman Indeks Nilai Sesuai Peran)
router.get('/', async (req, res) => {
  const user = req.session.user;

  try {
    if (user.role === 'mahasiswa') {
      const mhs = await Mahasiswa.findByUserId(user.id);
      const transcript = await Nilai.getTranscript(mhs.id);
      const ipk = await Nilai.calculateIPK(mhs.id);

      return res.render('nilai/index', {
        title: 'Transkrip Nilai Akademik - SIAKAD',
        user,
        role: 'mahasiswa',
        mahasiswa: mhs,
        transcript,
        ipk,
        error: res.locals.error,
        success: res.locals.success,
        csrfToken: req.csrfToken()
      });
    }

    if (user.role === 'dosen') {
      const dsn = await Dosen.findByUserId(user.id);
      const kelasList = await Dosen.getKelas(dsn.id);

      return res.render('nilai/index', {
        title: 'Pengelolaan Nilai Mahasiswa - SIAKAD',
        user,
        role: 'dosen',
        dosen: dsn,
        kelas: kelasList,
        error: res.locals.error,
        success: res.locals.success,
        csrfToken: req.csrfToken()
      });
    }

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Nilai Index Error:', err);
    res.status(500).render('errors/500', { title: '500 - Server Error', user: req.session.user });
  }
});

// GET /nilai/input/:kelasId (Form Input Nilai Mahasiswa - Dosen Only)
router.get('/input/:kelasId', requireRole('dosen'), async (req, res) => {
  const kelasId = Number(req.params.kelasId);
  const user = req.session.user;

  try {
    const dsn = await Dosen.findByUserId(user.id);
    
    // Zero Trust: Verifikasi dosen benar-benar mengampu kelas ini
    const mahasiswaList = await Nilai.findByKelas(kelasId, dsn.id);

    if (mahasiswaList.length === 0) {
      AuditLog.log({
        userId: user.id,
        username: user.username,
        role: 'dosen',
        action: 'UNAUTHORIZED_GRADE_ACCESS_ATTEMPT',
        resource: req.originalUrl,
        resourceId: kelasId,
        details: `Dosen ${user.username} mencoba mengakses input nilai kelas ID ${kelasId} yang bukan miliknya`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'blocked'
      });

      req.flash('error', 'Akses ditolak: Kelas tidak ditemukan atau Anda bukan dosen pengampu kelas ini (Zero Trust).');
      return res.redirect('/nilai');
    }

    res.render('nilai/input', {
      title: `Input Nilai - ${mahasiswaList[0].kode_mk} (${mahasiswaList[0].nama_mk})`,
      user,
      kelasId,
      mahasiswaList,
      kodeMK: mahasiswaList[0].kode_mk,
      namaMK: mahasiswaList[0].nama_mk,
      kodeKelas: mahasiswaList[0].kode_kelas,
      error: res.locals.error,
      success: res.locals.success,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('Nilai Input GET Error:', err);
    res.status(500).render('errors/500', { title: '500 - Server Error', user: req.session.user });
  }
});

// POST /nilai/save (Simpan Perubahan Nilai - Dosen Only)
router.post('/save', requireRole('dosen'), async (req, res) => {
  const { kelas_id, krs_id, nilai_tugas, nilai_uts, nilai_uas } = req.body;
  const user = req.session.user;

  try {
    const dsn = await Dosen.findByUserId(user.id);
    const kelasId = Number(kelas_id);

    // Normalisasi input jika 1 record atau array
    const krsIds = Array.isArray(krs_id) ? krs_id : [krs_id];
    const tugasList = Array.isArray(nilai_tugas) ? nilai_tugas : [nilai_tugas];
    const utsList = Array.isArray(nilai_uts) ? nilai_uts : [nilai_uts];
    const uasList = Array.isArray(nilai_uas) ? nilai_uas : [nilai_uas];

    let savedCount = 0;

    for (let i = 0; i < krsIds.length; i++) {
      const currentKrsId = Number(krsIds[i]);
      const tugas = tugasList[i];
      const uts = utsList[i];
      const uas = uasList[i];

      // Lewati jika semua nilai kosong
      if (tugas === '' && uts === '' && uas === '') continue;

      // Server-side validation (R-02 / CT-05): nilai harus angka 0 - 100
      if (!isValidScore(tugas) || !isValidScore(uts) || !isValidScore(uas)) {
        req.flash('error', `Gagal validasi: Nilai baris ${i + 1} harus berupa angka antara 0 hingga 100.`);
        return res.redirect(`/nilai/input/${kelasId}`);
      }

      const result = await Nilai.upsert({
        krsId: currentKrsId,
        tugas,
        uts,
        uas,
        inputByUserId: user.id
      });

      // R-02 & R-03: Audit trail setiap perubahan nilai (actor, time, action, object)
      AuditLog.log({
        userId: user.id,
        username: user.username,
        role: 'dosen',
        action: `GRADE_${result.action.toUpperCase()}`,
        resource: 'nilai',
        resourceId: currentKrsId,
        details: `KRS ID: ${currentKrsId} | Tugas: ${tugas}, UTS: ${uts}, UAS: ${uas} => Akhir: ${result.akhir.toFixed(2)} (${result.huruf})`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });

      savedCount++;
    }

    req.flash('success', `Berhasil menyimpan ${savedCount} nilai mahasiswa dengan integritas server.`);
    res.redirect(`/nilai/input/${kelasId}`);
  } catch (err) {
    console.error('Nilai Save POST Error:', err);
    req.flash('error', 'Terjadi kesalahan saat menyimpan nilai.');
    res.redirect(`/nilai/input/${kelas_id}`);
  }
});

module.exports = router;

