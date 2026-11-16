/**
 * Role-Based Access Control (RBAC) & Zero Trust Middleware
 * R-06: Mencegah Eskalasi Hak Akses (Privilege Escalation T1068)
 * CT-02: Otorisasi lintas peran
 * CT-03: Isolasi data antar-mahasiswa
 * Zero Trust: "Never trust, always verify" pada sisi server (SR-06)
 */
const AuditLog = require('../models/AuditLog');
const Mahasiswa = require('../models/Mahasiswa');

// 1. Verifikasi Peran (CT-02)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login');
    }

    const userRole = req.session.user.role;
    if (!allowedRoles.includes(userRole)) {
      // Catat percobaan eskalasi hak akses ke audit log (R-03 / CT-02)
      AuditLog.log({
        userId: req.session.user.id,
        username: req.session.user.username,
        role: userRole,
        action: 'UNAUTHORIZED_ROLE_ACCESS_DENIED',
        resource: req.originalUrl,
        details: `Peran '${userRole}' mencoba mengakses endpoint terlarang yang membutuhkan: [${allowedRoles.join(', ')}]`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'blocked'
      });

      return res.status(403).render('errors/403', {
        title: '403 - Akses Ditolak',
        user: req.session.user,
        message: `Akses ditolak. Endpoint ini membutuhkan peran: ${allowedRoles.join(' atau ')}. (R-06 RBAC)`
      });
    }

    next();
  };
}

// 2. Verifikasi Kepemilikan Data Mahasiswa (CT-03 Isolasi data)
function verifyMahasiswaOwnership(paramIdName = 'mahasiswaId') {
  return async (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login');
    }

    // Admin & Dosen dibebaskan dari pengecekan mahasiswa
    if (req.session.user.role === 'admin' || req.session.user.role === 'dosen') {
      return next();
    }

    try {
      const currentMhs = await Mahasiswa.findByUserId(req.session.user.id);
      if (!currentMhs) {
        return res.status(403).render('errors/403', {
          title: '403 - Akses Ditolak',
          user: req.session.user,
          message: 'Data mahasiswa tidak ditemukan.'
        });
      }

      const targetId = req.params[paramIdName] || req.body[paramIdName] || req.query[paramIdName];

      // Jika ada target ID dan tidak sama dengan mahasiswa login, blokir!
      if (targetId && Number(targetId) !== currentMhs.id) {
        AuditLog.log({
          userId: req.session.user.id,
          username: req.session.user.username,
          role: 'mahasiswa',
          action: 'CROSS_STUDENT_ACCESS_BLOCKED',
          resource: req.originalUrl,
          resourceId: targetId,
          details: `Mahasiswa ${currentMhs.nim} mencoba mengakses data mahasiswa ID ${targetId}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'blocked'
        });

        return res.status(403).render('errors/403', {
          title: '403 - Akses Ditolak',
          user: req.session.user,
          message: 'Akses ditolak. Anda hanya diizinkan mengakses data diri sendiri (CT-03 Isolasi Data).'
        });
      }

      req.currentMahasiswa = currentMhs;
      next();
    } catch (err) {
      console.error('RBAC Error:', err);
      res.status(500).render('errors/500', {
        title: '500 - Server Error',
        user: req.session.user
      });
    }
  };
}

module.exports = {
  requireRole,
  verifyMahasiswaOwnership
};

