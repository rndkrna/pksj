-- ============================================================
-- SIAKAD Database Schema
-- Universitas Maritim Raja Ali Haji (UMRAH)
-- Teknik Informatika - Fakultas Teknik dan Teknologi Kemaritiman
-- Keamanan: Laporan PJBL PKSJ Fase 1 & Fase 2
-- ============================================================

CREATE DATABASE IF NOT EXISTS siakad_dbs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE siakad_dbs;

-- 1. Tabel Users (A-02: Basis data akun pengguna)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- bcrypt hash (R-01)
    nama_lengkap VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role ENUM('mahasiswa', 'dosen', 'admin') NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    login_attempts INT DEFAULT 0, -- R-01 & SR-02: Rate limit tracking
    locked_until DATETIME NULL, -- R-01: Account lockout
    last_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- 2. Tabel Mahasiswa
CREATE TABLE IF NOT EXISTS mahasiswa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    nim VARCHAR(20) NOT NULL UNIQUE,
    program_studi VARCHAR(100) NOT NULL DEFAULT 'Teknik Informatika',
    angkatan YEAR NOT NULL,
    semester_aktif INT DEFAULT 1,
    status ENUM('aktif', 'cuti', 'lulus', 'do') DEFAULT 'aktif',
    alamat TEXT,
    no_telp VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_nim (nim)
) ENGINE=InnoDB;

-- 3. Tabel Dosen
CREATE TABLE IF NOT EXISTS dosen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    nidn VARCHAR(20) NOT NULL UNIQUE,
    program_studi VARCHAR(100) NOT NULL DEFAULT 'Teknik Informatika',
    jabatan_fungsional VARCHAR(100),
    bidang_keahlian VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_nidn (nidn)
) ENGINE=InnoDB;

-- 4. Tabel Mata Kuliah
CREATE TABLE IF NOT EXISTS mata_kuliah (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_mk VARCHAR(20) NOT NULL UNIQUE,
    nama_mk VARCHAR(100) NOT NULL,
    sks INT NOT NULL,
    semester INT NOT NULL,
    program_studi VARCHAR(100) NOT NULL DEFAULT 'Teknik Informatika',
    deskripsi TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Tabel Kelas
CREATE TABLE IF NOT EXISTS kelas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mata_kuliah_id INT NOT NULL,
    dosen_id INT NOT NULL,
    kode_kelas VARCHAR(10) NOT NULL DEFAULT 'A',
    tahun_ajaran VARCHAR(10) NOT NULL,
    semester_type ENUM('ganjil', 'genap') NOT NULL,
    kapasitas INT DEFAULT 40,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliah(id) ON DELETE CASCADE,
    FOREIGN KEY (dosen_id) REFERENCES dosen(id) ON DELETE CASCADE,
    UNIQUE KEY unique_kelas (mata_kuliah_id, kode_kelas, tahun_ajaran, semester_type)
) ENGINE=InnoDB;

-- 6. Tabel KRS (A-01: Data KRS - R-06 Otorisasi & Kepemilikan Data)
CREATE TABLE IF NOT EXISTS krs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mahasiswa_id INT NOT NULL,
    kelas_id INT NOT NULL,
    tahun_ajaran VARCHAR(10) NOT NULL,
    semester_type ENUM('ganjil', 'genap') NOT NULL,
    status ENUM('diajukan', 'disetujui', 'ditolak') DEFAULT 'diajukan',
    tanggal_pengisian TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE,
    FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE,
    UNIQUE KEY unique_krs (mahasiswa_id, kelas_id, tahun_ajaran, semester_type)
) ENGINE=InnoDB;

-- 7. Tabel Nilai (A-01: Data Nilai - R-02 Integritas Data Nilai)
CREATE TABLE IF NOT EXISTS nilai (
    id INT AUTO_INCREMENT PRIMARY KEY,
    krs_id INT NOT NULL UNIQUE,
    nilai_tugas DECIMAL(5,2) DEFAULT NULL,
    nilai_uts DECIMAL(5,2) DEFAULT NULL,
    nilai_uas DECIMAL(5,2) DEFAULT NULL,
    nilai_akhir DECIMAL(5,2) DEFAULT NULL,
    huruf_mutu CHAR(2) DEFAULT NULL,
    bobot DECIMAL(3,2) DEFAULT NULL,
    input_by INT NOT NULL, -- Menjaga integritas & accountability (R-02)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (krs_id) REFERENCES krs(id) ON DELETE CASCADE,
    FOREIGN KEY (input_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- 8. Tabel Jadwal Perkuliahan
CREATE TABLE IF NOT EXISTS jadwal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kelas_id INT NOT NULL,
    hari ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu') NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    ruangan VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Tabel Audit Log (A-05: Log audit sistem - R-03 Keterlacakan & Non-repudiation)
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    username VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(150),
    resource_id VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    status ENUM('success', 'failed', 'blocked') DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA DUMMY SESUAI DOKUMEN LAPORAN PKSJ
-- Password default semua akun: Password123!
-- Hashed dengan bcrypt (12 salt rounds)
-- ============================================================

-- Bersihkan data lama jika re-run
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_log;
TRUNCATE TABLE nilai;
TRUNCATE TABLE jadwal;
TRUNCATE TABLE krs;
TRUNCATE TABLE kelas;
TRUNCATE TABLE mata_kuliah;
TRUNCATE TABLE dosen;
TRUNCATE TABLE mahasiswa;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Users
INSERT INTO users (id, username, password, nama_lengkap, email, role) VALUES
(1, 'admin', '$2a$12$Ay8c.kut7k19wP5XbmbphuJ25bWR4hD5g2EeFGAHacPHFW3rbsyM2', 'Administrator SIAKAD UMRAH', 'admin@umrah.ac.id', 'admin'),
(2, 'hendra.kurniawan', '$2a$12$Ay8c.kut7k19wP5XbmbphuJ25bWR4hD5g2EeFGAHacPHFW3rbsyM2', 'Hendra Kurniawan, S.Kom., M.Sc.Eng., Ph.D', 'hendra@umrah.ac.id', 'dosen'),
(3, 'ahmad.fauzi', '$2a$12$Ay8c.kut7k19wP5XbmbphuJ25bWR4hD5g2EeFGAHacPHFW3rbsyM2', 'Dr. Ahmad Fauzi, M.Kom.', 'ahmad.fauzi@umrah.ac.id', 'dosen'),
(4, '2201020073', '$2a$12$Ay8c.kut7k19wP5XbmbphuJ25bWR4hD5g2EeFGAHacPHFW3rbsyM2', 'M. Khairul Fikri', 'khairul.fikri@student.umrah.ac.id', 'mahasiswa'),
(5, '2301020031', '$2a$12$Ay8c.kut7k19wP5XbmbphuJ25bWR4hD5g2EeFGAHacPHFW3rbsyM2', 'Imelda Cristina Sinaga', 'imelda.sinaga@student.umrah.ac.id', 'mahasiswa'),
(6, '2301020099', '$2a$12$Ay8c.kut7k19wP5XbmbphuJ25bWR4hD5g2EeFGAHacPHFW3rbsyM2', 'Laila Amelia Ulva', 'laila.ulva@student.umrah.ac.id', 'mahasiswa'),
(7, '2301020125', '$2a$12$Ay8c.kut7k19wP5XbmbphuJ25bWR4hD5g2EeFGAHacPHFW3rbsyM2', 'Alfin Rifaldy Siregar', 'alfin.siregar@student.umrah.ac.id', 'mahasiswa');

-- Data Dosen
INSERT INTO dosen (id, user_id, nidn, program_studi, jabatan_fungsional, bidang_keahlian) VALUES
(1, 2, '0012345601', 'Teknik Informatika', 'Lektor Kepala', 'Praktikum Keamanan Sistem dan Jaringan, Arsitektur Keamanan'),
(2, 3, '0012345602', 'Teknik Informatika', 'Lektor', 'Basis Data, Rekayasa Perangkat Lunak');

-- Data Mahasiswa (Anggota Kelompok PKSJ)
INSERT INTO mahasiswa (id, user_id, nim, program_studi, angkatan, semester_aktif, status, alamat, no_telp) VALUES
(1, 4, '2201020073', 'Teknik Informatika', 2022, 7, 'aktif', 'Jl. Politeknik Senggarang, Tanjungpinang', '081234567801'),
(2, 5, '2301020031', 'Teknik Informatika', 2023, 5, 'aktif', 'Jl. Ahmad Yani No. 12, Tanjungpinang', '081234567802'),
(3, 6, '2301020099', 'Teknik Informatika', 2023, 5, 'aktif', 'Jl. D.I. Panjaitan Km. 8, Tanjungpinang', '081234567803'),
(4, 7, '2301020125', 'Teknik Informatika', 2023, 5, 'aktif', 'Jl. Basuki Rahmat, Tanjungpinang', '081234567804');

-- Mata Kuliah
INSERT INTO mata_kuliah (id, kode_mk, nama_mk, sks, semester, program_studi, deskripsi) VALUES
(1, 'TI401', 'Praktikum Keamanan Sistem dan Jaringan (PKSJ)', 3, 7, 'Teknik Informatika', 'Analisis, Threat Modeling, Hardening, dan Security Architecture'),
(2, 'TI402', 'Kecerdasan Buatan', 3, 7, 'Teknik Informatika', 'Machine Learning, Neural Network, dan Aplikasi AI'),
(3, 'TI301', 'Basis Data Lanjut', 3, 5, 'Teknik Informatika', 'Optimasi Query, Replikasi, NoSQL, dan Keamanan Basis Data'),
(4, 'TI302', 'Pemrograman Web Berbasis Komponen', 3, 5, 'Teknik Informatika', 'Arsitektur Web Modern, RESTful API, dan Keamanan Web'),
(5, 'TI303', 'Jaringan Komputer dan Komunikasi Data', 3, 5, 'Teknik Informatika', 'Protokol TCP/IP, Routing, Firewall, dan Switching'),
(6, 'TI304', 'Rekayasa Perangkat Lunak', 3, 5, 'Teknik Informatika', 'Metodologi Agile, Analisis Kebutuhan, dan Testing');

-- Kelas Perkuliahan (TA 2026/2027 Ganjil)
INSERT INTO kelas (id, mata_kuliah_id, dosen_id, kode_kelas, tahun_ajaran, semester_type, kapasitas) VALUES
(1, 1, 1, 'A', '2026/2027', 'ganjil', 40),
(2, 2, 2, 'A', '2026/2027', 'ganjil', 40),
(3, 3, 2, 'A', '2026/2027', 'ganjil', 40),
(4, 4, 1, 'A', '2026/2027', 'ganjil', 40),
(5, 5, 1, 'A', '2026/2027', 'ganjil', 40),
(6, 6, 2, 'A', '2026/2027', 'ganjil', 40);

-- KRS Mahasiswa
-- M. Khairul Fikri (Semester 7)
INSERT INTO krs (id, mahasiswa_id, kelas_id, tahun_ajaran, semester_type, status) VALUES
(1, 1, 1, '2026/2027', 'ganjil', 'disetujui'),
(2, 1, 2, '2026/2027', 'ganjil', 'disetujui');

-- Imelda Cristina Sinaga (Semester 5)
INSERT INTO krs (id, mahasiswa_id, kelas_id, tahun_ajaran, semester_type, status) VALUES
(3, 2, 3, '2026/2027', 'ganjil', 'disetujui'),
(4, 2, 4, '2026/2027', 'ganjil', 'disetujui'),
(5, 2, 5, '2026/2027', 'ganjil', 'disetujui');

-- Laila Amelia Ulva (Semester 5)
INSERT INTO krs (id, mahasiswa_id, kelas_id, tahun_ajaran, semester_type, status) VALUES
(6, 3, 3, '2026/2027', 'ganjil', 'disetujui'),
(7, 3, 4, '2026/2027', 'ganjil', 'disetujui'),
(8, 3, 6, '2026/2027', 'ganjil', 'disetujui');

-- Alfin Rifaldy Siregar (Semester 5)
INSERT INTO krs (id, mahasiswa_id, kelas_id, tahun_ajaran, semester_type, status) VALUES
(9, 4, 3, '2026/2027', 'ganjil', 'disetujui'),
(10, 4, 5, '2026/2027', 'ganjil', 'disetujui'),
(11, 4, 6, '2026/2027', 'ganjil', 'disetujui');

-- Data Nilai Mahasiswa (R-02 Integritas)
INSERT INTO nilai (krs_id, nilai_tugas, nilai_uts, nilai_uas, nilai_akhir, huruf_mutu, bobot, input_by) VALUES
(1, 88.00, 85.00, 90.00, 87.90, 'A', 4.00, 2),
(2, 82.00, 80.00, 85.00, 82.60, 'A-', 3.75, 3),
(3, 90.00, 88.00, 92.00, 90.20, 'A', 4.00, 3),
(4, 85.00, 82.00, 86.00, 84.50, 'A', 4.00, 2),
(5, 80.00, 78.00, 83.00, 80.60, 'A-', 3.75, 2),
(6, 86.00, 84.00, 88.00, 86.20, 'A', 4.00, 3),
(7, 88.00, 86.00, 90.00, 88.20, 'A', 4.00, 2),
(9, 84.00, 82.00, 85.00, 83.80, 'A-', 3.75, 3);

-- Jadwal Kuliah
INSERT INTO jadwal (id, kelas_id, hari, jam_mulai, jam_selesai, ruangan) VALUES
(1, 1, 'Senin', '08:00:00', '10:30:00', 'Lab Jaringan & Keamanan FTTK'),
(2, 2, 'Selasa', '08:00:00', '10:30:00', 'Ruang Kuliah 301'),
(3, 3, 'Rabu', '08:00:00', '10:30:00', 'Lab Basis Data Lt. 2'),
(4, 4, 'Rabu', '13:00:00', '15:30:00', 'Lab Rekayasa Web'),
(5, 5, 'Kamis', '08:00:00', '10:30:00', 'Lab Jaringan & Keamanan FTTK'),
(6, 6, 'Jumat', '08:00:00', '10:30:00', 'Ruang Kuliah 302');

-- Inisialisasi Audit Log (R-03)
INSERT INTO audit_log (user_id, username, role, action, resource, details, ip_address, status) VALUES
(1, 'admin', 'admin', 'SYSTEM_INITIALIZATION', 'database', 'Database SIAKAD UMRAH diinisialisasi dengan aturan keamanan PKSJ Fase 1 & 2', '127.0.0.1', 'success');

