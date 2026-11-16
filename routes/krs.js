/**
 * Routes KRS (Kartu Rencana Studi)
 * R-02: Kueri berparameter & validasi server-side
 * R-06: Otorisasi berbasis peran (mahasiswa only) & isolasi kepemilikan
 * CT-03 & CT-04: Integritas KRS
 */
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { requireRole, verifyMahasiswaOwnership } = require('../middleware/rbac');
const KRS = require('../models/KRS');
const Mahasiswa = require('../models/Mahasiswa');
const AuditLog = require('../models/AuditLog');
const { getCurrentAcademicYear } = require('../utils/helpers');

// Semua rute KRS wajib login sebagai mahasiswa
router.use(isAuthenticated, requireRole('mahasiswa'));

// GET /krs (Lihat KRS Aktif)
router.get('/', async (req, res) => {
  try {
    const user = req.session.user;
    const mhs = await Mahasiswa.findByUserId(user.id);
    const { tahunAjaran, semesterType } = getCurrentAcademicYear();

    const krsList = await KRS.findByMahasiswa(mhs.id, tahunAjaran, semesterType);
    const totalSKS = await KRS.getTotalSKS(mhs.id, tahunAjaran, semesterType);

    res.render('krs/index', {
      title: 'Kartu Rencana Studi (KRS) - SIAKAD',
      user,
      mahasiswa: mhs,
      krs: krsList,
      totalSKS,
      tahunAjaran,
      semesterType,
      error: res.locals.error,
      success: res.locals.success,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('KRS Index Error:', err);
    res.status(500).render('errors/500', { title: '500 - Server Error', user: req.session.user });
  }
});

// GET /krs/isi (Form Pengisian KRS)
router.get('/isi', async (req, res) => {
  try {
    const user = req.session.user;
    const mhs = await Mahasiswa.findByUserId(user.id);
    const { tahunAjaran, semesterType } = getCurrentAcademicYear();

    const availableKelas = await KRS.getAvailableKelas(mhs.id, tahunAjaran, semesterType);
    const totalSKS = await KRS.getTotalSKS(mhs.id, tahunAjaran, semesterType);

    res.render('krs/isi', {
      title: 'Pengisian KRS - SIAKAD',
      user,
      mahasiswa: mhs,
      availableKelas,
      totalSKS,
      tahunAjaran,
      semesterType,
      error: res.locals.error,
      success: res.locals.success,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('KRS Isi Error:', err);
    res.status(500).render('errors/500', { title: '500 - Server Error', user: req.session.user });
  }
});

// POST /krs/add (Ambil Kelas)
router.post('/add', async (req, res) => {
  const { kelas_id } = req.body;
  const user = req.session.user;

  try {
    const mhs = await Mahasiswa.findByUserId(user.id);
    const { tahunAjaran, semesterType } = getCurrentAcademicYear();

    // Validasi SKS maksimal 24
    const currentSKS = await KRS.getTotalSKS(mhs.id, tahunAjaran, semesterType);
    if (currentSKS >= 24) {
      req.flash('error', 'Gagal: Total SKS semester ini sudah mencapai batas maksimal 24 SKS.');
      return res.redirect('/krs/isi');
    }

    await KRS.add({
      mahasiswaId: mhs.id,
      kelasId: Number(kelas_id),
      tahunAjaran,
      semesterType
    });

    AuditLog.log({
      userId: user.id,
      username: user.username,
      role: 'mahasiswa',
      action: 'KRS_ADD_COURSE',
      resource: 'krs',
      resourceId: kelas_id,
      details: `Mahasiswa ${mhs.nim} menambahkan kelas ID ${kelas_id} ke KRS`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    req.flash('success', 'Mata kuliah berhasil ditambahkan ke KRS Anda.');
    res.redirect('/krs');
  } catch (err) {
    console.error('KRS Add Error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'Mata kuliah tersebut sudah pernah diambil di KRS.');
    } else {
      req.flash('error', 'Terjadi kesalahan saat menambahkan mata kuliah.');
    }
    res.redirect('/krs/isi');
  }
});

// POST /krs/delete/:id (Batalkan Pengambilan MK)
router.post('/delete/:id', async (req, res) => {
  const krsId = Number(req.params.id);
  const user = req.session.user;

  try {
    const mhs = await Mahasiswa.findByUserId(user.id);

    // Integritas & Otorisasi: Hanya bisa hapus KRS milik sendiri (Zero Trust)
    const result = await KRS.remove(krsId, mhs.id);

    if (result.affectedRows > 0) {
      AuditLog.log({
        userId: user.id,
        username: user.username,
        role: 'mahasiswa',
        action: 'KRS_REMOVE_COURSE',
        resource: 'krs',
        resourceId: krsId,
        details: `Mahasiswa ${mhs.nim} menghapus entry KRS ID ${krsId}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
      req.flash('success', 'Mata kuliah berhasil dihapus dari KRS.');
    } else {
      AuditLog.log({
        userId: user.id,
        username: user.username,
        role: 'mahasiswa',
        action: 'KRS_UNAUTHORIZED_DELETE_ATTEMPT',
        resource: 'krs',
        resourceId: krsId,
        details: `Upaya menghapus KRS ID ${krsId} yang bukan miliknya atau tidak ditemukan`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'blocked'
      });
      req.flash('error', 'Gagal menghapus: Item KRS tidak ditemukan atau bukan milik Anda.');
    }

    res.redirect('/krs');
  } catch (err) {
    console.error('KRS Delete Error:', err);
    req.flash('error', 'Gagal memproses pembatalan KRS.');
    res.redirect('/krs');
  }
});

module.exports = router;

