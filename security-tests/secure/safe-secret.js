/**
 * PENGUJIAN KEAMANAN - KASUS 1 (VERSI AMAN): KREDENSIAL VIA ENVIRONMENT
 * Referensi: Tabel 4.2 Laporan PKSJ (Rahasia Konfigurasi)
 */

require('dotenv').config();

// ✅ SESUAI STANDAR: Kredensial dibaca dari environment variables / Secret Store
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

const cloudApiSecret = {
  session_secret: process.env.SESSION_SECRET
};

module.exports = { dbConfig, cloudApiSecret };
