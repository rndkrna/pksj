/**
 * Database Backup Script (R-08 / CT-09)
 * Melakukan backup snapshot database siakad_db ke direktori backup/
 */
require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `siakad_db_backup_${timestamp}.sql`);

const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASSWORD ? `-p${process.env.DB_PASSWORD}` : '';
const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = process.env.DB_PORT || 3306;
const dbName = process.env.DB_NAME || 'siakad_dbs';

const mysqldumpCmd = `C:\\xampp\\mysql\\bin\\mysqldump.exe -h ${dbHost} -P ${dbPort} -u ${dbUser} ${dbPass} ${dbName} > "${backupFile}"`;

console.log(`📦 Memulai backup database ${dbName}...`);

exec(mysqldumpCmd, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Gagal melakukan backup:', error.message);
    return;
  }
  console.log(`✅ Backup berhasil disimpan ke: ${backupFile}`);
});

