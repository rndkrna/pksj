/**
 * PENGUJIAN KEAMANAN - KASUS 5 (VERSI AMAN): RATE LIMITING PERMINTAAN
 * Referensi: R-05 & CT-10 Laporan PKSJ
 */

const express = require('express');
const router = express.Router();
const { globalLimiter } = require('../../middleware/rateLimiter');

// ✅ SESUAI STANDAR: Endpoint dilindungi limiter untuk mencegah kehabisan resource / DoS
router.get('/heavy-export-limited', globalLimiter, (req, res) => {
  res.send('Permintaan ekspor diproses dalam batas laju yang aman.');
});

module.exports = router;
