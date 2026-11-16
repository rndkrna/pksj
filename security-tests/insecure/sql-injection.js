/**
 * PENGUJIAN KEAMANAN - KASUS 2: SQL INJECTION (KUERI TANPA PARAMETER)
 * Status: SENGAJA DIBUAT TIDAK AMAN UNTUK PENGUJIAN PIPELINE
 * 
 * Pelanggaran:
 * - R-02: Integritas Nilai & Database
 * - CT-05: Validasi Input dan Kueri Berparameter
 * - Dampak: Penyerang dapat menyuntikkan ' OR '1'='1 untuk memanipulasi nilai mahasiswa
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/database');

// ❌ PELANGGARAN KEAMANAN: Penggabungan string langsung (String Concatenation SQL Injection)
router.get('/nilai-vulnerable', async (req, res) => {
  const mahasiswaId = req.query.id;
  
  // VULNERABLE: Input pengguna digabungkan langsung tanpa parameter binding (?)
  const rawQuery = "SELECT * FROM nilai WHERE mahasiswa_id = '" + mahasiswaId + "'";
  
  try {
    const [rows] = await db.query(rawQuery);
    res.json(rows);
  } catch (err) {
    res.status(500).send("Database error: " + err.message); // Membocorkan detail error internal
  }
});

module.exports = router;
