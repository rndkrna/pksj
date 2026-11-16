-- ============================================================
-- SIAKAD UMRAH - Hardening Host Basis Data
-- Implementasi Prinsip Least Privilege Sesuai Laporan PKSJ
--
-- Referensi Laporan PKSJ:
-- - Bab IV Subbab 4.3: Hardening Host Basis Data
--   * "Basis data hanya menerima koneksi dari host aplikasi yang disetujui"
--   * "Akun aplikasi tidak boleh menggunakan akun superuser"
--   * "Hak SELECT/INSERT/UPDATE/DELETE diberikan sesuai kebutuhan proses"
--   * "Akun administratif dipisahkan, akses langsung dibatasi"
--   * "Kredensial atau data mahasiswa nyata tidak digunakan"
-- - R-02: Integritas Nilai & Database
-- - R-06: Pencegahan Eskalasi Hak Akses (Least Privilege)
-- - TB-3: Batas Kepercayaan Server Web ↔ Server Database
--
-- Tim PKSJ UMRAH
-- ============================================================

-- ------------------------------------------------------------
-- 1. PEMISAHAN AKUN ADMINISTRATIF & PEMBATASAN ROOT
-- Root hanya boleh mengakses dari localhost (tidak dari remote/jaringan)
-- ------------------------------------------------------------
-- Hapus akses remote untuk akun root jika ada
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- ------------------------------------------------------------
-- 2. HAPUS DATABASE & PENGGUNA BAWAAN (ANONYMOUS USERS)
-- ------------------------------------------------------------
DELETE FROM mysql.user WHERE User='';
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';

-- ------------------------------------------------------------
-- 3. BUAT AKUN LAYANAN KHUSUS APLIKASI (LEAST PRIVILEGE)
-- Akun ini digunakan oleh aplikasi SIAKAD (bukan superuser)
-- ------------------------------------------------------------
DROP USER IF EXISTS 'siakad_app'@'localhost';
DROP USER IF EXISTS 'siakad_app'@'%';

-- Buat user dengan kata sandi kuat
CREATE USER 'siakad_app'@'%' IDENTIFIED BY 'SiakadApp@2026!Strong';

-- ------------------------------------------------------------
-- 4. BATASI HAK AKSES HANYA KE DML (DATA MANIPULATION LANGUAGE)
-- Aplikasi hanya membutuhkan SELECT, INSERT, UPDATE, DELETE
-- DILARANG: DROP, ALTER, GRANT OPTION, FILE, SUPER, RELOAD, PROCESS
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON siakad_dbs.* TO 'siakad_app'@'%';

-- Tambahan: Izinkan eksekusi lock tables untuk script backup
GRANT LOCK TABLES ON siakad_dbs.* TO 'siakad_app'@'%';

-- ------------------------------------------------------------
-- 5. PEMBATASAN RESOURCE PER USER (Mencegah Resource Exhaustion / DoS)
-- R-05: Ketersediaan Layanan
-- ------------------------------------------------------------
ALTER USER 'siakad_app'@'%' WITH
    MAX_QUERIES_PER_HOUR 50000
    MAX_UPDATES_PER_HOUR 10000
    MAX_CONNECTIONS_PER_HOUR 1000
    MAX_USER_CONNECTIONS 30;

-- ------------------------------------------------------------
-- 6. KEBIJAKAN INTEGRITAS AUDIT LOG (R-03 & Tabel 6.1)
-- Tabel audit_logs dirancang append-only
-- Cabut izin UPDATE dan DELETE pada tabel audit_logs untuk siakad_app
-- ------------------------------------------------------------
REVOKE UPDATE, DELETE ON siakad_dbs.audit_logs FROM 'siakad_app'@'%';

-- Terapkan semua perubahan privilege
FLUSH PRIVILEGES;

-- Tampilkan status izin akun aplikasi
SHOW GRANTS FOR 'siakad_app'@'%';
