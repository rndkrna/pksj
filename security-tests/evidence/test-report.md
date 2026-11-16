# LAPORAN PENGUJIAN KEAMANAN & BUKTI DEVSECOPS (TEST EVIDENCE REPORT)
## SISTEM INFORMASI AKADEMIK (SIAKAD) - UNIVERSITAS MARITIM RAJA ALI HAJI

---

**Mata Kuliah:** Praktikum Keamanan Sistem dan Jaringan (PKSJ)  
**Dosen Pengampu:** Hendra Kurniawan, S.Kom., M.Sc.Eng., Ph.D  
**Disusun Oleh (Tim PKSJ UMRAH):**
1. M. Khairul Fikri (NIM: 2201020073)
2. Imelda Cristina Sinaga (NIM: 2301020031)
3. Laila Amelia Ulva (NIM: 2301020099)
4. Alfin Rifaldy Siregar (NIM: 2301020125)

**Lingkungan Pengujian:** Model Staging Lokal / Docker Environment (Sesuai RoE Bab III Fase 1)  
**Tanggal Pengujian:** 16 November 2026, 20:07 WIB  
**Status Keseluruhan:** **100% PASS** (Setelah mitigasi konfigurasi tidak aman)

---

## 1. Ringkasan Eksekutif Pengujian

Pengujian ini membuktikan bahwa arsitektur keamanan yang dirancang pada **Laporan Fase 1 (Discovery & Security Requirements)** dan **Laporan Fase 2 (Security Architecture & Hardening)** bekerja secara terukur dan efektif.

Metodologi pembuktian dilakukan dalam dua tahap:
1. **Pengujian Penolakan (Negative Testing):** Memasukkan kode dan konfigurasi yang sengaja dibuat rentan (insecure) ke dalam pipeline DevSecOps. Pipeline secara otomatis mendeteksi celah tersebut dan **MENOLAK (REJECT)** proses deployment.
2. **Pengujian Kelulusan (Positive Testing):** Mengganti konfigurasi tidak aman dengan kontrol ter-hardening yang memenuhi seluruh matriks **Challenge Test (CT-01 s.d. CT-10)**. Pipeline secara otomatis memverifikasi dan menyatakan status **LOLOS (PASS)**.

---

## 2. Bagian A: Bukti Penolakan Pipeline DevSecOps (Insecure Gates)

Pada pengujian ini, script `security-tests/insecure/` dieksekusi oleh scanner. Pipeline menolak commit/deploy karena terdeteksi 5 pelanggaran kritis:

| ID Uji | Target Uji & Pelanggaran | Kontrol Dilanggar | Hasil yang Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|
| **GATE-01** | `exposed-secret.js`<br>Password DB & API Key ter-hardcode | Tabel 4.2 (Rahasia Konfigurasi) | Pipeline mendeteksi kredensial dan memblokir deploy | Terdeteksi 3 rahasia kritis: password database dan token API ter-hardcode | **FAIL (REJECTED)** |
| **GATE-02** | `sql-injection.js`<br>String concatenation pada query nilai | R-02 & CT-05 (Kueri Berparameter) | Query tanpa binding ditolak | Terdeteksi kueri `SELECT ... WHERE mahasiswa_id = ' + id` tanpa parameter binding (?) | **FAIL (REJECTED)** |
| **GATE-03** | `weak-password.js`<br>Password tanpa kompleksitas & lockout | R-01, SR-01, SR-02 (Autentikasi) | Ditolak karena tanpa bcrypt & lockout | Terdeteksi autentikasi teks polos tanpa bcrypt dan tanpa pembatasan 5 kali gagal | **FAIL (REJECTED)** |
| **GATE-04** | `no-csrf.js`<br>Endpoint mutasi KRS tanpa token CSRF | R-01 & CT-05 (Proteksi CSRF) | Ditolak karena rute POST rentan pemalsuan | Terdeteksi rute POST mutasi tanpa middleware `csrfProtection` | **FAIL (REJECTED)** |
| **GATE-05** | `no-rate-limit.js`<br>Endpoint terbuka tanpa limiter | R-05 & CT-10 (Ketersediaan Layanan) | Ditolak karena potensi serangan DoS | Terdeteksi endpoint berat tanpa `globalLimiter`, rawan flooding | **FAIL (REJECTED)** |

### Cuplikan Log Penolakan Pipeline (`security-tests/evidence/pipeline-fail.log`):
```text
==============================================================
     SIAKAD UMRAH - SUITE VERIFIKASI KEAMANAN DEVSECOPS       
   Berdasarkan Matriks Challenge Test (CT-01 s.d. CT-10)     
==============================================================
Waktu Pengujian : 2026-11-16T13:06:12.374Z
Mode Pengujian  : ⚠️ UJI PENOLAKAN KODE RENTAN (INSECURE TEST)
--------------------------------------------------------------

🔍 Memindai folder security-tests/insecure untuk mendeteksi kerentanan...

❌ [GATE-01] Deteksi Kebocoran Password Ter-hardcode
    Kebutuhan: Tabel 4.2 (Rahasia Konfigurasi)
    Hasil    : FAIL - Ditemukan kata sandi & API token tertanam langsung di file exposed-secret.js!

❌ [GATE-02] Deteksi String Concatenation Query (SQL Injection)
    Kebutuhan: CT-05 & R-02 (Integritas Kueri)
    Hasil    : FAIL - Ditemukan kueri database tanpa parameter binding (?) di sql-injection.js!

❌ [GATE-03] Deteksi Password Policy & Lockout Missing
    Kebutuhan: CT-01 & SR-02 (Proteksi Autentikasi)
    Hasil    : FAIL - Ditemukan rute login tanpa enkripsi bcrypt dan tanpa mekanisme account lockout!

❌ [GATE-04] Deteksi Form Mutasi Tanpa Token CSRF
    Kebutuhan: CT-05 & R-01 (Proteksi CSRF)
    Hasil    : FAIL - Ditemukan endpoint mutasi POST tanpa validasi token anti-CSRF!

❌ [GATE-05] Deteksi Endpoint Tanpa Pembatasan Laju (Rate Limit)
    Kebutuhan: CT-10 & R-05 (Ketersediaan Layanan)
    Hasil    : FAIL - Endpoint resource-heavy tidak dilindungi limiter, rawan DoS flooding!

==============================================================
🚫 KESIMPULAN PIPELINE DEVSECOPS: DI-REJECT / GAGAL!
   Ditemukan 5 pelanggaran keamanan kritis.
   Deployment ke lingkungan staging dibatalkan secara otomatis.
==============================================================
```

---

## 3. Bagian B: Bukti Kelulusan Pipeline DevSecOps (Tabel 5.1 Challenge Test)

Setelah kode rentan diperbaiki dan disesuaikan dengan arsitektur keamanan, seluruh 10 pengujian Challenge Test (CT-01 s.d. CT-10) berhasil diverifikasi dan dinyatakan **PASS**:

| ID Uji | Kontrol / Skenario (Tabel 5.1) | Prasyarat & Langkah Uji | Expected Result | Actual Result | Status | Bukti / Catatan |
|---|---|---|---|---|---|---|
| **CT-01** | Autentikasi dan Pembatasan Login | Akun dummy mahasiswa/dosen; uji bcrypt salt 12, login limiter 5x, lockout 15 menit | Percobaan login gagal >5x memicu akun terkunci; login valid sukses | Password terenkripsi bcrypt (salt 12); IP dibatasi 5 req/15m; lockout aktif selama 15 menit | **PASS** | `routes/auth.js`, `models/User.js` |
| **CT-02** | Otorisasi Lintas Peran (RBAC) | Akun mahasiswa dummy mencoba akses rute `/admin/*` atau `/nilai/input` | Akses ditolak dengan status 403 Forbidden; redirect aman | Middleware `requireRole` menolak akses mahasiswa; insiden dicatat di log | **PASS** | `middleware/rbac.js`, `routes/admin.js` |
| **CT-03** | Isolasi Data Antar-Mahasiswa (Anti-IDOR) | Akun Mahasiswa A mencoba mengakses data nilai/KRS milik Mahasiswa B | Akses ditolak; mahasiswa hanya dapat melihat data NIM sendiri | Query KRS dan Nilai mengikat ID dari session pengguna aktif (`req.session.user.id`) | **PASS** | `routes/krs.js`, `routes/nilai.js` |
| **CT-04** | Integritas Nilai / KRS | Percobaan ubah nilai oleh mahasiswa vs penginputan oleh dosen pengampu | Peran tidak berwenang ditolak; dosen hanya menginput kelasnya | Endpoint entri nilai dilindungi `requireRole('dosen')`; mutasi dicatat di `audit_log` | **PASS** | `routes/nilai.js`, `models/Nilai.js` |
| **CT-05** | Validasi Input & Anti-SQL Injection | Uji injection input non-destruktif (`' OR 1=1 --`) & verifikasi CSRF | Input ditangani aman; kueri berparameter; token CSRF diverifikasi | Seluruh query MySQL menggunakan parameter binding (`?`); multiple statements nonaktif; form dilindungi CSRF | **PASS** | `config/database.js`, `middleware/csrf.js` |
| **CT-06** | TLS dan Manajemen Sesi | Uji atribut cookie, logout, dan kedaluwarsa sesi dummy | Cookie terlindungi (`HttpOnly`, `SameSite`); sesi dibatalkan saat logout | Cookie session berdurasi 30 menit (`SESSION_MAX_AGE`); regenerasi session ID saat login; logout menghapus sesi | **PASS** | `config/session.js`, `routes/auth.js` |
| **CT-07** | Aturan Firewall (NGFW Baseline) | Verifikasi 8 aturan firewall FW-01 s.d. FW-08 pada `firewall-rules.sh` | Default-deny aktif; publik hanya ke HTTPS; DB terisolasi | Port 443 diizinkan; koneksi publik langsung ke DB (3306) di-drop; isolasi inter-zona berjalan | **PASS** | `security/firewall-rules.sh`, Tabel 4.1 |
| **CT-08** | Log Audit Terpusat (Dual Logging) | Eksekusi mutasi KRS/nilai dan review log database serta Winston | Log mencatat waktu, aktor, aksi, objek, status; data tidak dapat diubah | Pencatatan ganda ke tabel `audit_log` dan file `logs/audit.log`; masking rahasia aktif | **PASS** | `models/AuditLog.js`, `security/logging-config.js` |
| **CT-09** | Backup dan Restore Terisolasi | Verifikasi script pencadangan otomatis `scripts/backup.js` | File dump database terbuat dengan timestamp di direktori terisolasi | Script backup menghasilkan file `.sql` otomatis pada folder `backups/` dengan timestamp ISO | **PASS** | `scripts/backup.js`, folder `backups/` |
| **CT-10** | Rate Limiting Layanan Anti-DoS | Pengiriman request berulang ke endpoint publik di staging | Ambang batas diterapkan; request normal tetap terlayani | `globalLimiter` membatasi 200 request / 15 menit per IP; status 429 Too Many Requests | **PASS** | `middleware/rateLimiter.js`, `server.js` |

### Cuplikan Log Kelulusan Pipeline (`security-tests/evidence/pipeline-pass.log`):
```text
==============================================================
     SIAKAD UMRAH - SUITE VERIFIKASI KEAMANAN DEVSECOPS       
   Berdasarkan Matriks Challenge Test (CT-01 s.d. CT-10)     
==============================================================
Waktu Pengujian : 2026-11-16T13:07:03.034Z
Mode Pengujian  : 🛡️ VERIFIKASI APLIKASI UTAMA (SECURE PIPELINE)
--------------------------------------------------------------

✅ [CT-01] Autentikasi dan Pembatasan Login
    Kebutuhan: R-01, SR-01, SR-02
    Hasil    : PASS - Bcrypt salt rounds >= 12 aktif, login limiter 5x aktif, dan mekanisme lockout 15 menit terverifikasi.

✅ [CT-02] Otorisasi Lintas Peran (RBAC)
    Kebutuhan: R-06, SR-03
    Hasil    : PASS - RBAC memverifikasi role di server-side. Rute administratif tertutup bagi mahasiswa/dosen.

✅ [CT-03] Isolasi Data Antar-Mahasiswa (Anti-IDOR)
    Kebutuhan: SR-04, ZT-01
    Hasil    : PASS - Query KRS dan Nilai mahasiswa diikat langsung ke session ID pengguna aktif, mencegah akses objek lintas akun.

✅ [CT-04] Integritas Nilai dan KRS
    Kebutuhan: R-02, SR-06
    Hasil    : PASS - Penginputan dan pembaruan nilai dikunci hanya untuk peran dosen dengan pencatatan audit log.

✅ [CT-05] Validasi Input, CSRF & Anti-SQL Injection
    Kebutuhan: R-01, R-02, CT-05
    Hasil    : PASS - CSRF protection aktif pada seluruh form mutasi; multiple statements dimatikan; kueri menggunakan parameterized query.

✅ [CT-06] TLS dan Manajemen Sesi
    Kebutuhan: R-07, SR-09, Tabel 4.2
    Hasil    : PASS - Session cookie dikonfigurasi HttpOnly, SameSite lax, durasi max 30 menit (SR-09), dan regenerasi ID saat login.

✅ [CT-07] Baseline Aturan Firewall Default-Deny
    Kebutuhan: Tabel 4.1, FW-01 s.d. FW-08
    Hasil    : PASS - Script firewall mengimplementasikan default-deny, isolasi basis data (FW-04/FW-05), dan akses web resmi (FW-01).

✅ [CT-08] Audit Logging (Dual: DB + Immutable File)
    Kebutuhan: R-03, SR-05, CT-08
    Hasil    : PASS - Pencatatan peristiwa mencatat aktor, waktu, aksi, objek, dan status secara ganda pada database dan file log Winston.

✅ [CT-09] Backup dan Restore Terisolasi
    Kebutuhan: R-08, SR-08, Tabel 4.2
    Hasil    : PASS - Mekanisme pencadangan data otomatis tersedia pada scripts/backup.js dengan penamaan timestamp.

✅ [CT-10] Rate Limiting Layanan (Anti-Flooding)
    Kebutuhan: R-05, CT-10
    Hasil    : PASS - Global limiter (200 req/15m) dan Login limiter (5 req/15m) aktif melindungi ketersediaan layanan.

==============================================================
📊 RINGKASAN VALIDASI: 10 PASS, 0 FAIL dari 10 Challenge Tests
🎉 PIPELINE DEVSECOPS LOLOS: Seluruh kontrol keamanan terverifikasi!
   Aplikasi SIAKAD UMRAH siap untuk tahap deployment.
==============================================================
```

---

## 4. Bagian C: Evaluasi Risiko Residual (Pembaruan Tabel 6.1 Fase 2)

Dengan telah terlaksananya pengujian berbasis acceptance criteria, risiko residual dapat dievaluasi secara terukur:

| ID Risiko | Risiko Awal (K×D) | Kontrol yang Diterapkan & Teruji | Bukti Uji Terpenuhi | Status Risiko Residual |
|---|---|---|---|---|
| **R-01** (Autentikasi Portal) | 4 × 4 = 16 (Tinggi) | Bcrypt 12, Login Limiter (5x), Account Lockout 15m | CT-01 Lolos | **TURUN KE RENDAH (2 × 2 = 4)** |
| **R-02** (Integritas Nilai) | 3 × 5 = 15 (Tinggi) | Parameterized query, RBAC per endpoint dosen, Audit trail | CT-02, CT-04, CT-05 Lolos | **TURUN KE RENDAH (1 × 4 = 4)** |
| **R-04** (Kerahasiaan Akun) | 3 × 5 = 15 (Tinggi) | TLS reverse proxy, Helmets, cookie HttpOnly & SameSite | CT-06 Lolos | **TURUN KE RENDAH (1 × 3 = 3)** |
| **R-03** (Log Audit) | 3 × 3 = 9 (Sedang) | Dual logging (DB append-only + Winston file), Log sanitization | CT-08 Lolos | **TURUN KE RENDAH (1 × 2 = 2)** |
| **R-05** (Ketersediaan Layanan) | 3 × 4 = 12 (Sedang) | Rate Limiter, Docker CPU/Mem limits, HPA Kubernetes | CT-10 Lolos | **TURUN KE RENDAH (2 × 2 = 4)** |
| **R-06** (Eskalasi Hak Akses) | 2 × 5 = 10 (Sedang) | RBAC server-side, Object ownership check, Least privilege DB user | CT-02, CT-03 Lolos | **TURUN KE RENDAH (1 × 3 = 3)** |

---

## 5. Bagian D: Checklist Deliverable Repositori (Pembaruan Tabel 7.1 Fase 2)

| Deliverable Laporan Fase 2 | Lokasi File di Repositori | Status Aktual |
|---|---|---|
| **Arsitektur Keamanan & Zero Trust** | `security/access-control-policy.md`, `docker-compose.yml` | **LENGKAP & TERVERIFIKASI** |
| **Baseline Firewall / NGFW (FW-01 s.d. FW-08)** | `security/firewall-rules.sh`, `k8s/networkpolicy.yaml` | **LENGKAP & TERVERIFIKASI** |
| **Host Hardening Server Aplikasi & Basis Data** | `security/host-hardening.sh`, `security/db-hardening.sql` | **LENGKAP & TERVERIFIKASI** |
| **Pengelolaan Rahasia (Secret Management)** | `security/secret-management.md`, `scripts/secret-scan.js` | **LENGKAP & TERVERIFIKASI** |
| **Logging Terpusat (Centralized Logging)** | `security/logging-config.js`, `logs/audit.log` | **LENGKAP & TERVERIFIKASI** |
| **Kontainerisasi & Hardening Docker** | `Dockerfile`, `.dockerignore`, `docker-compose.yml` | **LENGKAP & TERVERIFIKASI** |
| **Orkestrasi & Keamanan Kubernetes** | Folder `k8s/` (`deployment`, `networkpolicy`, `secret`, dll.) | **LENGKAP & TERVERIFIKASI** |
| **Pipeline Otomatis DevSecOps** | `.github/workflows/devsecops.yml`, `scripts/security-check.js` | **LENGKAP & TERVERIFIKASI** |
| **Bukti Pengujian & Penolakan (Challenge Tests)** | `security-tests/evidence/test-report.md`, `*.log` | **LENGKAP & TERVERIFIKASI** |
