/**
 * Script Inisialisasi Database SIAKAD
 * Mengeksekusi schema.sql ke MySQL
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  const dbName = process.env.DB_NAME || 'siakad_db';
  console.log(`🔄 Memulai inisialisasi database ${dbName}...`);

  // Koneksi awal tanpa memilih database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    let sqlContent = fs.readFileSync(schemaPath, 'utf8');

    // Menyesuaikan nama database di schema.sql secara dinamis mengikuti .env
    sqlContent = sqlContent.replace(/\bsiakad_db\b/g, dbName);

    console.log(`⚙️ Mengeksekusi file schema.sql ke database ${dbName}...`);
    await connection.query(sqlContent);

    console.log(`✅ Database ${dbName} dan tabel-tabel berhasil dibuat!`);
    console.log('✅ Data dummy mahasiswa, dosen, kelas, krs, nilai, dan jadwal berhasil diisi!');
  } catch (err) {
    console.error('❌ Gagal menginisialisasi database:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initDatabase();

