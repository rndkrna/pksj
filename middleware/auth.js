/**
 * Authentication Middleware
 * R-07: Sesi pengguna & masa berlaku sesi
 * SR-01 & SR-09: Verifikasi sebelum akses halaman terlindungi
 */
const AuditLog = require('../models/AuditLog');

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    // Cek session idle expiry (SR-09)
    const now = Date.now();
    const maxAge = parseInt(process.env.SESSION_MAX_AGE) || 1800000; // 30 menit

    if (req.session.lastActivity && (now - req.session.lastActivity > maxAge)) {
      const expiredUser = req.session.user;
      req.session.destroy(() => {
        AuditLog.log({
          userId: expiredUser.id,
          username: expiredUser.username,
          role: expiredUser.role,
          action: 'SESSION_EXPIRED',
          resource: req.originalUrl,
          details: 'Sesi berakhir otomatis karena timeout 30 menit (SR-09)',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'success'
        });
        res.clearCookie('siakad_sess');
        return res.redirect('/auth/login?msg=session_expired');
      });
      return;
    }

    req.session.lastActivity = now;
    return next();
  }

  req.flash('error', 'Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk.');
  res.redirect('/auth/login');
}

function isNotAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = {
  isAuthenticated,
  isNotAuthenticated
};

