/**
 * PENGUJIAN KEAMANAN - KASUS 3: KATA SANDI LEMAH & TANPA ACCOUNT LOCKOUT
 * Status: SENGAJA DIBUAT TIDAK AMAN UNTUK PENGUJIAN PIPELINE
 * 
 * Pelanggaran:
 * - R-01: Autentikasi Pengguna & Penanganan Kredensial
 * - SR-01: Kebijakan kata sandi kuat (panjang min 8, kombinasi karakter)
 * - SR-02 & CT-01: Pembatasan percobaan login (lockout setelah 5 kali gagal)
 */

const express = require('express');
const router = express.Router();

// ❌ PELANGGARAN KEAMANAN: Memperbolehkan password tanpa syarat dan tanpa pembatasan brute force
router.post('/login-insecure', async (req, res) => {
  const { username, password } = req.body;

  // TIDAK ADA validasi panjang dan kompleksitas password
  // TIDAK ADA rate limiting atau pelacakan login_attempts
  // TIDAK ADA account lockout
  
  if (password === '123456') { // Password lemah diperbolehkan
    return res.send('Login berhasil tanpa proteksi!');
  }

  // Gagal login tanpa meningkatkan counter lockout
  res.status(401).send('Kredensial salah');
});

module.exports = router;
