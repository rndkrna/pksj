/**
 * PENGUJIAN KEAMANAN - KASUS 4 (VERSI AMAN): PROTEKSI CSRF
 * Referensi: R-01 & CT-05 Laporan PKSJ
 */

const express = require('express');
const router = express.Router();
const { csrfProtection } = require('../../middleware/csrf');

// ✅ SESUAI STANDAR: Seluruh rute mutasi POST dilindungi token anti-CSRF
router.post('/krs/hapus-protected', csrfProtection, async (req, res) => {
  const { krsId } = req.body;
  // Permintaan hanya diproses jika CSRF token valid
  res.send(`KRS ${krsId} berhasil dihapus dengan verifikasi token CSRF valid.`);
});

module.exports = router;
