/**
 * Rate Limiting Middleware
 * R-01: Pembatasan tebakan kredensial (Brute Force T1110)
 * R-05: Ketersediaan Layanan (Anti DoS T1499)
 * SR-02 & CT-01 & CT-10
 */
const rateLimit = require('express-rate-limit');
const AuditLog = require('../models/AuditLog');

// 1. Global Rate Limiter (R-05)
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 menit
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    AuditLog.log({
      userId: req.session?.user?.id || null,
      username: req.session?.user?.username || 'ANONYMOUS',
      role: req.session?.user?.role || 'GUEST',
      action: 'GLOBAL_RATE_LIMIT_EXCEEDED',
      resource: req.originalUrl,
      details: 'Permintaan melebihi ambang batas global',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'blocked'
    });

    res.status(429).render('errors/403', {
      title: '429 - Terlalu Banyak Permintaan',
      user: req.session?.user || null,
      message: 'Terlalu banyak permintaan dari IP Anda. Silakan coba lagi nanti (R-05 Rate Limiting).'
    });
  }
});

// 2. Login Rate Limiter (R-01 & SR-02: 5x gagal -> lockout)
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_LOCKOUT_MINUTES || 15) * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Hanya hitung percobaan gagal
  handler: (req, res) => {
    const attemptedUsername = req.body.username || 'unknown';

    AuditLog.log({
      userId: null,
      username: attemptedUsername,
      role: 'GUEST',
      action: 'LOGIN_BRUTE_FORCE_BLOCKED',
      resource: '/auth/login',
      details: `Percobaan login gagal mencapai batas 5x. IP dibatasi selama 15 menit.`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'blocked'
    });

    req.flash('error', 'Terlalu banyak percobaan login gagal. Demi keamanan, silakan tunggu 15 menit (SR-02).');
    res.redirect('/auth/login');
  }
});

module.exports = {
  globalLimiter,
  loginLimiter
};

