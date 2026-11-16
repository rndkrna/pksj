/**
 * Database Connection Pool
 * R-02: Parameterized Queries (Anti-SQLi)
 * TB-3: Koneksi DB hanya dari host aplikasi
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'siakad_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  // Hardening: Prevent multiple statements injection
  multipleStatements: false,
  timezone: '+07:00'
});

// Self-test
pool.getConnection()
  .then(conn => {
    console.log(`✅ [Database] Berhasil terhubung ke MySQL ${process.env.DB_NAME || 'siakad_db'}`);
    conn.release();
  })
  .catch(err => {
    console.error('❌ [Database] Gagal terhubung ke MySQL:', err.message);
  });

module.exports = pool;

