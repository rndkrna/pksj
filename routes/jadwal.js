/**
 * Routes Jadwal Perkuliahan
 */
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Jadwal = require('../models/Jadwal');
const Mahasiswa = require('../models/Mahasiswa');
const Dosen = require('../models/Dosen');
const { getCurrentAcademicYear } = require('../utils/helpers');

router.use(isAuthenticated);

router.get('/', async (req, res) => {
  const user = req.session.user;
  const { tahunAjaran, semesterType } = getCurrentAcademicYear();

  try {
    let jadwalList = [];

    if (user.role === 'mahasiswa') {
      const mhs = await Mahasiswa.findByUserId(user.id);
      jadwalList = await Jadwal.findByMahasiswa(mhs.id, tahunAjaran, semesterType);
    } else if (user.role === 'dosen') {
      const dsn = await Dosen.findByUserId(user.id);
      jadwalList = await Jadwal.findByDosen(dsn.id, tahunAjaran, semesterType);
    } else {
      jadwalList = await Jadwal.findAll(tahunAjaran, semesterType);
    }

    res.render('jadwal/index', {
      title: 'Jadwal Perkuliahan - SIAKAD',
      user,
      jadwal: jadwalList,
      tahunAjaran,
      semesterType,
      error: res.locals.error,
      success: res.locals.success,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('Jadwal Error:', err);
    res.status(500).render('errors/500', { title: '500 - Server Error', user: req.session.user });
  }
});

module.exports = router;

