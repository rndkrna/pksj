/**
 * PENGUJIAN KEAMANAN - KASUS 5: ENDPOINT TANPA RATE LIMITING
 * Status: SENGAJA DIBUAT TIDAK AMAN UNTUK PENGUJIAN PIPELINE
 * 
 * Pelanggaran:
 * - R-05 & CT-10: Ketersediaan Layanan & Perlindungan terhadap DoS / Flooding
 */

const express = require('express');
const router = express.Router();

// ❌ PELANGGARAN KEAMANAN: Endpoint terbuka tanpa middleware pembatas laju permintaan
router.get('/heavy-export-unlimited', (req, res) => {
  // Tidak ada rate limiter! Penyerang dapat memborbardir jutaan request untuk menghabiskan memori server
  res.send('Export data diproses tanpa rate limit');
});

module.exports = router;
