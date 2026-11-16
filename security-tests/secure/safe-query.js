/**
 * PENGUJIAN KEAMANAN - KASUS 2 (VERSI AMAN): PARAMETERIZED QUERY (ANTI-SQLI)
 * Referensi: R-02 & CT-05 Laporan PKSJ
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/database');

// ✅ SESUAI STANDAR: Menggunakan parameterized query (?) untuk mencegah SQL Injection
router.get('/nilai-secure', async (req, res) => {
  const mahasiswaId = parseInt(req.query.id, 10);
  
  if (isNaN(mahasiswaId)) {
    return res.status(400).json({ error: 'ID Mahasiswa tidak valid' });
  }

  try {
    // Parameter binding (?) mencegah eksekusi payload berbahaya seperti ' OR '1'='1
    const [rows] = await db.execute('SELECT * FROM nilai WHERE mahasiswa_id = ?', [mahasiswaId]);
    res.json(rows);
  } catch (err) {
    // R-04: Non-disclosure of internal error details
    res.status(500).json({ error: 'Terjadi kesalahan internal pada server' });
  }
});

module.exports = router;
