/**
 * PENGUJIAN KEAMANAN - KASUS 4: MUTASI DATA TANPA CSRF TOKEN
 * Status: SENGAJA DIBUAT TIDAK AMAN UNTUK PENGUJIAN PIPELINE
 * 
 * Pelanggaran:
 * - R-01 & CT-05: Proteksi Cross-Site Request Forgery (CSRF)
 * - Dampak: Penyerang dapat memalsukan permintaan transfer KRS atas nama mahasiswa
 */

const express = require('express');
const router = express.Router();

// ❌ PELANGGARAN KEAMANAN: Rute POST mengubah data tanpa verifikasi token CSRF
router.post('/krs/hapus-unprotected', async (req, res) => {
  const { krsId } = req.body;
  
  // TIDAK MEMERIKSA req.csrfToken()
  // Rawan serangan CSRF jika korban membuka link penyerang
  res.send(`KRS ${krsId} berhasil dihapus tanpa perlindungan CSRF`);
});

module.exports = router;
