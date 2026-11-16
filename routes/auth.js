/**
 * Routes Autentikasi
 * R-01: Autentikasi, rate limit, account lockout
 * R-07: Sesi, regenerasi session ID, logout
 * SR-01, SR-02, SR-09, CT-01, CT-06
 */
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { isNotAuthenticated, isAuthenticated } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

// GET /auth/login
router.get('/login', isNotAuthenticated, (req, res) => {
  let successMsg = res.locals.success;
  let errorMsg = res.locals.error;
  if (req.query.msg === 'logged_out' && !successMsg) {
    successMsg = ['Anda telah berhasil keluar dari sistem.'];
  } else if (req.query.msg === 'session_expired' && !errorMsg) {
    errorMsg = ['Sesi Anda telah berakhir (30 menit idle). Silakan login kembali.'];
  }

  res.render('auth/login', {
    title: 'Masuk - SIAKAD UMRAH',
    user: null,
    error: errorMsg,
    success: successMsg,
    csrfToken: req.csrfToken()
  });
});

// POST /auth/login (R-01: Rate limited, brute-force protection, account lockout)
router.post('/login', isNotAuthenticated, loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  // 1. Validasi input sederhana di server-side (R-02)
  if (!username || !password) {
    req.flash('error', 'Username dan password wajib diisi.');
    return res.redirect('/auth/login');
  }

  try {
    // 2. Cek apakah akun sedang terkunci karena salah 5x (R-01 / SR-02)
    const isLocked = await User.isLocked(username);
    if (isLocked) {
      AuditLog.log({
        userId: null,
        username,
        role: 'GUEST',
        action: 'LOGIN_LOCKED_ACCOUNT_ATTEMPT',
        resource: '/auth/login',
        details: 'Mencoba login pada akun yang sedang terkunci (Lockout 15 Menit)',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'blocked'
      });

      req.flash('error', 'Akun Anda sedang terkunci sementara karena 5 kali percobaan gagal. Silakan tunggu 15 menit atau hubungi administrator.');
      return res.redirect('/auth/login');
    }

    // 3. Cari user dengan kueri berparameter (R-02)
    const user = await User.findByUsername(username);

    // Timing-attack prevention: jangan bocorkan apakah username ada atau tidak
    if (!user) {
      AuditLog.log({
        userId: null,
        username,
        role: 'GUEST',
        action: 'LOGIN_FAILED',
        resource: '/auth/login',
        details: 'Percobaan login dengan username tidak terdaftar',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'failed'
      });

      req.flash('error', 'Username atau password tidak sesuai.');
      return res.redirect('/auth/login');
    }

    // Cek status aktif
    if (!user.is_active) {
      AuditLog.log({
        userId: user.id,
        username: user.username,
        role: user.role,
        action: 'LOGIN_INACTIVE_USER',
        resource: '/auth/login',
        details: 'Percobaan login pada akun yang dinonaktifkan',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'blocked'
      });

      req.flash('error', 'Akun Anda dinonaktifkan oleh Administrator.');
      return res.redirect('/auth/login');
    }

    // 4. Verifikasi hash bcrypt (R-01)
    const passwordMatch = await User.verifyPassword(password, user.password);

    if (!passwordMatch) {
      const lockStatus = await User.incrementLoginAttempts(username);

      AuditLog.log({
        userId: user.id,
        username: user.username,
        role: user.role,
        action: 'LOGIN_FAILED',
        resource: '/auth/login',
        details: `Password salah. Percobaan ke-${lockStatus.attempts}${lockStatus.locked ? ' (Akun Terkunci!)' : ''}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: lockStatus.locked ? 'blocked' : 'failed'
      });

      if (lockStatus.locked) {
        req.flash('error', 'Password salah 5 kali berturut-turut! Akun Anda telah dikunci selama 15 menit demi keamanan (SR-02).');
      } else {
        const sisa = 5 - lockStatus.attempts;
        req.flash('error', `Password salah! Sisa percobaan: ${sisa} kali lagi sebelum akun dikunci.`);
      }
      return res.redirect('/auth/login');
    }

    // 5. Login Berhasil: Reset percobaan login gagal (R-01)
    await User.resetLoginAttempts(username);

    // 6. R-07 / CT-06: Regenerasi ID Sesi (Mencegah Session Fixation)
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regenerate error:', err);
        req.flash('error', 'Gagal membuat sesi aman.');
        return res.redirect('/auth/login');
      }

      // Simpan data minimisasi sesi (R-04)
      req.session.user = {
        id: user.id,
        username: user.username,
        nama_lengkap: user.nama_lengkap,
        email: user.email,
        role: user.role
      };
      req.session.lastActivity = Date.now();

      // Log sukses
      AuditLog.log({
        userId: user.id,
        username: user.username,
        role: user.role,
        action: 'LOGIN_SUCCESS',
        resource: '/auth/login',
        details: `Autentikasi berhasil sebagai peran: ${user.role}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });

      req.flash('success', `Selamat datang kembali, ${user.nama_lengkap}!`);
      res.redirect('/dashboard');
    });

  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Terjadi kesalahan internal pada server.');
    res.redirect('/auth/login');
  }
});

// POST /auth/logout (R-07 / SR-09 / CT-06: Logout membatalkan sesi dan hapus cookie)
router.post('/logout', isAuthenticated, (req, res) => {
  const user = req.session.user;

  AuditLog.log({
    userId: user?.id,
    username: user?.username || 'ANONYMOUS',
    role: user?.role || 'USER',
    action: 'LOGOUT',
    resource: '/auth/logout',
    details: 'Pengguna mengakhiri sesi',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    status: 'success'
  });

  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.clearCookie('siakad_sess');
    res.redirect('/auth/login?msg=logged_out');
  });
});

module.exports = router;

