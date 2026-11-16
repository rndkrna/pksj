/**
 * PENGUJIAN KEAMANAN - KASUS 3 (VERSI AMAN): AUTENTIKASI BCRYPT & LOCKOUT
 * Referensi: R-01, SR-01, SR-02, CT-01 Laporan PKSJ
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { loginLimiter } = require('../../middleware/rateLimiter');
const User = require('../../models/User');

// ✅ SESUAI STANDAR: Login rate limiter (5x), validasi password, bcrypt compare, dan lockout
router.post('/login-secure', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username dan password wajib diisi');
  }

  const user = await User.findByUsername(username);
  if (!user) {
    return res.status(401).send('Kredensial tidak valid');
  }

  // Cek status account lockout (SR-02)
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(423).send('Akun terkunci sementara karena 5 kali percobaan gagal.');
  }

  // Verifikasi hash kata sandi menggunakan bcrypt (R-01)
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    await User.incrementLoginAttempts(user.id);
    return res.status(401).send('Kredensial tidak valid');
  }

  // Reset login attempts jika sukses
  await User.resetLoginAttempts(user.id);
  res.send('Login berhasil secara aman');
});

module.exports = router;
