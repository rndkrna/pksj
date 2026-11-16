# SISTEM INFORMASI AKADEMIK (SIAKAD) UMRAH
## IMPLEMENTASI ARSITEKTUR KEAMANAN PKSJ (FASE 1 & FASE 2)

Aplikasi Web Sistem Informasi Akademik (SIAKAD) untuk **Fakultas Teknik dan Teknologi Kemaritiman (FTTK) - Universitas Maritim Raja Ali Haji (UMRAH)**, yang dibangun dengan mengimplementasikan seluruh arsitektur dan kontrol keamanan dari laporan **Project-Based Learning (PjBL) Praktikum Keamanan Sistem dan Jaringan (PKSJ)**.

---

### Tim Penyusun (Sesuai Laporan PjBL):
1. **M. Khairul Fikri** (2201020073)
2. **Imelda Cristina Sinaga** (2301020031)
3. **Laila Amelia Ulva** (2301020099)
4. **Alfin Rifaldy Siregar** (2301020125)

**Dosen Pengampu:** Hendra Kurniawan, S.Kom., M.Sc.Eng., Ph.D

---

## 🛡️ Pemetaan Kontrol Keamanan Terhadap Laporan

| ID Risiko | Skor Risiko | Kontrol Keamanan (Fase 1 & Fase 2) | Implementasi dalam Kode | Acceptance Criteria (Fase 1) & Challenge Test (Fase 2) |
| :--- | :---: | :--- | :--- | :--- |
| **R-01** | **16 (Tinggi)** | Autentikasi Kuat, Proteksi Brute-force & Account Lockout | `bcryptjs` (salt 12), `loginLimiter` (maks 5x gagal), penguncian otomatis akun 15 menit, validasi password kuat (besar, kecil, angka, simbol) | **SR-01, SR-02 / CT-01**: Percobaan lebih dari 5x memicu penguncian dan tercatat di audit log. |
| **R-02** | **15 (Tinggi)** | Integritas Data Nilai & Anti SQL Injection | Parameterized queries (`mysql2/promise`), validasi server-side skor 0-100, kalkulasi otomatis nilai akhir dan huruf mutu | **SR-03 / CT-04, CT-05**: Input tidak sah ditolak; setiap perubahan nilai dicatat lengkap beserta ID dosen penginput. |
| **R-03** | **9 (Sedang)** | Audit Logging Terpusat & Non-Repudiation | Dual-layer logging: MySQL `audit_log` + Winston file `logs/audit.log`, viewer log terpusat dengan filter | **SR-05 / CT-08**: Log audit bersifat append-only, admin pun tidak memiliki tombol hapus log. |
| **R-04** | **15 (Tinggi)** | Kerahasiaan Data & Security Headers | Helmet.js (CSP, frameguard, noSniff, xssFilter), cookie `HttpOnly` & `SameSite=lax`, penyembunyian pesan error detail | **SR-04 / CT-06**: Proteksi kebocoran kredensial dan manipulasi sniffing / XSS. |
| **R-05** | **12 (Sedang)** | Ketersediaan Layanan (Anti-DoS) | Express Rate Limit global (200 req / 15 menit), response error 429 dan 500 yang aman | **SR-07 / CT-10**: Permintaan berlebih dibatasi tanpa mengganggu stabilitas host aplikasi. |
| **R-06** | **10 (Sedang)** | Otorisasi RBAC & Isolasi Data | Middleware `requireRole` di setiap rute, verifikasi kepemilikan data (Zero Trust) | **SR-06 / CT-02, CT-03**: Mahasiswa dicegah mengakses endpoint dosen/admin atau melihat KRS/nilai milik mahasiswa lain. |
| **R-07** | **12 (Sedang)** | Manajemen Sesi & Anti-Fixation | Regenerasi Session ID saat login, idle session timeout 30 menit, pembatalan sesi saat logout | **SR-09 / CT-06**: Sesi yang telah logout atau kedaluwarsa segera dibatalkan dan tidak bisa dipakai ulang. |
| **R-08** | **10 (Sedang)** | Backup & Pemulihan Basis Data | Script cadangan `scripts/backup.js` snapshot database terisolasi | **SR-08 / CT-09**: Cadangan data tersimpan dengan waktu pembuatan untuk kepastian restore. |

---

## 👥 Data Akun Dummy (Sesuai Dokumen Laporan)

Seluruh akun dummy menggunakan password default: **`Password123!`**

| No | Peran | Username / NIM | Nama Lengkap | Keterangan / Scope Akses |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **Admin** | `admin` | Administrator SIAKAD UMRAH | Manajemen akun, pembukaan lockout, Audit Log viewer |
| 2 | **Dosen** | `hendra.kurniawan` | Hendra Kurniawan, S.Kom., M.Sc.Eng., Ph.D | Dosen Pengampu PKSJ, Pemrograman Web, Jaringan Komputer |
| 3 | **Dosen** | `ahmad.fauzi` | Dr. Ahmad Fauzi, M.Kom. | Dosen Pengampu Kecerdasan Buatan, Basis Data Lanjut |
| 4 | **Mahasiswa** | `2201020073` | M. Khairul Fikri | Mahasiswa Semester 7 (Angkatan 2022) |
| 5 | **Mahasiswa** | `2301020031` | Imelda Cristina Sinaga | Mahasiswa Semester 5 (Angkatan 2023) |
| 6 | **Mahasiswa** | `2301020099` | Laila Amelia Ulva | Mahasiswa Semester 5 (Angkatan 2023) |
| 7 | **Mahasiswa** | `2301020125` | Alfin Rifaldy Siregar | Mahasiswa Semester 5 (Angkatan 2023) |

---

## 🚀 Panduan Menjalankan Sistem

### 1. Prasyarat:
- **Node.js**: Versi 18 atau lebih tinggi
- **MySQL / MariaDB**: XAMPP MySQL berjalan di port `3306`

### 2. Inisialisasi Database:
Jalankan perintah berikut untuk membuat database `siakad_db`, seluruh tabel, dan seed data dummy:
```bash
npm run init-db
```

### 3. Menjalankan Server:
```bash
npm start
```
Buka browser dan akses: **`http://localhost:3000`**

### 4. Menjalankan Backup (R-08):
```bash
npm run backup
```

---

## 🧪 Skenario Pengujian Validasi (Challenge Test - Bab V Laporan Fase 2)

1. **CT-01 (Autentikasi & Lockout)**:
   - Coba login dengan username `admin` dan password salah sebanyak 5 kali.
   - Pada percobaan ke-5, akun akan dikunci selama 15 menit.
   - Buka dashboard admin untuk melihat alert dan membuka kunci (unlock).
2. **CT-02 (Otorisasi Lintas Peran)**:
   - Login sebagai mahasiswa (`2201020073`).
   - Coba buka URL khusus admin/dosen secara manual: `http://localhost:3000/admin/users` atau `http://localhost:3000/nilai/input/1`.
   - Sistem akan menolak dengan halaman `403 Akses Ditolak` dan mencatat insiden ke Audit Log.
3. **CT-03 (Isolasi Data Mahasiswa)**:
   - Mahasiswa hanya dapat melihat transkrip dan KRS miliknya sendiri.
4. **CT-04 & CT-05 (Integritas Nilai & Kueri Berparameter)**:
   - Login sebagai dosen `hendra.kurniawan`.
   - Masukkan nilai mahasiswa pada kelas yang diampu.
   - Coba masukkan nilai tidak valid (misal: `-10` atau `150`), sistem akan menolak di sisi server.
   - Setelah nilai disimpan, periksa log audit untuk melihat jejak digital nilai sebelum dan sesudah diubah.
5. **CT-08 (Audit Log Non-Repudiation)**:
   - Login sebagai admin, kunjungi menu **Audit Log Sistem**.
   - Periksa seluruh riwayat aktivitas yang tercatat secara real-time.

