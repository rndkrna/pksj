/**
 * CSRF Protection Middleware
 * R-01: Perlindungan form dari serangan Cross-Site Request Forgery
 */
const csrf = require('csurf');
const AuditLog = require('../models/AuditLog');

const csrfProtection = csrf({ cookie: false });

function csrfErrorHandler(err, req, res, next) {
  if (err.code === 'EBADCSRFTOKEN') {
    AuditLog.log({
      userId: req.session?.user?.id || null,
      username: req.session?.user?.username || 'ANONYMOUS',
      role: req.session?.user?.role || 'GUEST',
      action: 'CSRF_ATTACK_DETECTED',
      resource: req.originalUrl,
      details: 'Token CSRF tidak valid atau tidak ditemukan pada form pengiriman data',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'blocked'
    });

    return res.status(403).render('errors/403', {
      title: '403 - Token Keamanan Tidak Valid',
      user: req.session?.user || null,
      message: 'Token keamanan (CSRF) tidak valid atau telah kedaluwarsa. Silakan muat ulang halaman.'
    });
  }
  next(err);
}

module.exports = {
  csrfProtection,
  csrfErrorHandler
};

