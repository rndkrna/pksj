/**
 * Routes Dashboard
 * Role-tailored dashboards with Zero Trust least privilege
 */
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Mahasiswa = require('../models/Mahasiswa');
const Dosen = require('../models/Dosen');
const User = require('../models/User');
const KRS = require('../models/KRS');
const Nilai = require('../models/Nilai');
const AuditLog = require('../models/AuditLog');
const { getCurrentAcademicYear } = require('../utils/helpers');

router.get('/', isAuthenticated, async (req, res) => {
  const user = req.session.user;
  const { tahunAjaran, semesterType } = getCurrentAcademicYear();

  try {
    if (user.role === 'mahasiswa') {
      const mhs = await Mahasiswa.findByUserId(user.id);
      const krsList = await KRS.findByMahasiswa(mhs.id, tahunAjaran, semesterType);
      const totalSKS = await KRS.getTotalSKS(mhs.id, tahunAjaran, semesterType);
      const ipk = await Nilai.calculateIPK(mhs.id);

      return res.render('dashboard/mahasiswa', {
        title: 'Dashboard Mahasiswa - SIAKAD',
        user,
        mahasiswa: mhs,
        krs: krsList,
        totalSKS,
        ipk,
        tahunAjaran,
        semesterType,
        csrfToken: req.csrfToken()
      });
    }

    if (user.role === 'dosen') {
      const dsn = await Dosen.findByUserId(user.id);
      const kelasList = await Dosen.getKelas(dsn.id, tahunAjaran, semesterType);

      return res.render('dashboard/dosen', {
        title: 'Dashboard Dosen - SIAKAD',
        user,
        dosen: dsn,
        kelas: kelasList,
        tahunAjaran,
        semesterType,
        csrfToken: req.csrfToken()
      });
    }

    if (user.role === 'admin') {
      const userCounts = await User.countByRole();
      const recentLogs = await AuditLog.getRecent(10);
      const logCounts = await AuditLog.countByStatus();

      return res.render('dashboard/admin', {
        title: 'Dashboard Administrator - SIAKAD',
        user,
        userCounts,
        recentLogs,
        logCounts,
        tahunAjaran,
        semesterType,
        csrfToken: req.csrfToken()
      });
    }

    res.redirect('/auth/login');
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).render('errors/500', {
      title: '500 - Server Error',
      user
    });
  }
});

module.exports = router;

