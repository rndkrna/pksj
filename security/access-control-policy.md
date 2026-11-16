# Kebijakan Pengendalian Hak Akses (Access Control Policy)
## Berdasarkan Arsitektur Zero Trust SIAKAD UMRAH

**Referensi Laporan PKSJ:**
- **Fase 2 Bab III Subbab 3.2 Tabel 3.2:** *Matriks Kebijakan Zero Trust*
- **Fase 2 Bab III Subbab 3.3:** *Siklus Keputusan Akses (4 Langkah Evaluasi)*
- **Fase 1 Bab VII:** *SR-03 (RBAC), SR-04 (Isolasi Objek), SR-09 (Sesi), SR-10 (Prinsip Hak Minimum)*
- **Prinsip Dasar:** *"Never trust, always verify" — setiap permintaan wajib diverifikasi identitas, peran, konteks, dan kepemilikan objek.*

---

## 1. Matriks Kebijakan Zero Trust (Tabel 3.2)

Setiap permintaan HTTP yang masuk dievaluasi berdasarkan matriks berikut:

| No | Subjek / Peran | Sumber & Konteks | Sumber Daya (Resource) | Keputusan Target | Syarat & Kontrol Verifikasi |
|---|---|---|---|---|---|
| **ZT-01** | **Mahasiswa** | Perangkat pengguna melalui HTTPS (TB-1) | Profil sendiri, KRS sendiri, jadwal & nilai milik sendiri | **ALLOW TERBATAS** | Sesi aktif valid; pengecekan kepemilikan objek di server (`req.session.user.id == target_id`); mutasi dibatasi periode KRS. |
| **ZT-02** | **Dosen** | Akun dosen terverifikasi melalui HTTPS | Kelas pengampu & entri nilai mahasiswa bimbingan | **ALLOW TERBATAS** | Peran `dosen`; otorisasi berdasarkan penugasan kelas (`dosen_id`); setiap perubahan nilai dicatat di `audit_log` (R-02, R-03). |
| **ZT-03** | **Administrator** | Jalur administrasi yang disetujui (Jaringan internal / VPN) | Manajemen pengguna, role, data master, audit log | **ALLOW KONTROL KUAT** | Peran `admin`; validasi sesi terisolasi; log audit mutasi administratif tanpa toleransi; review berkala. |
| **ZT-04** | **Akun Layanan Aplikasi** | Host aplikasi terdaftar (`siakad_app`) | Basis data MySQL (Port 3306) | **ALLOW OPERASI WAJIB** | Kredensial via environment/secret store; hanya hak DML (SELECT, INSERT, UPDATE, DELETE); tanpa izin DROP/ALTER; dilarang login interaktif. |
| **ZT-05** | **Pengguna Tanpa Sesi / Anonim** | Sumber mana pun di internet | Endpoint terlindungi (`/dashboard`, `/krs`, `/nilai`, `/admin`) | **DENY** | Ditolak oleh middleware `isAuthenticated`; dialihkan ke halaman login dengan pesan status 401/403. |
| **ZT-06** | **Mahasiswa Akses Fungsi Dosen/Admin** | Sesi mahasiswa valid | Endpoint dosen (`/nilai/input`) atau admin (`/admin/*`) | **DENY** | Ditolak oleh middleware `authorizeRole('dosen')` / `authorizeRole('admin')`; insiden eskalasi dicatat ke security alert log (R-06). |
| **ZT-07** | **Akses Admin dari Luar Jalur Disetujui** | IP publik tanpa VPN manajemen | Panel admin (`/admin`) | **DENY / BLOCKED** | Ditolak oleh aturan firewall FW-07 dan middleware inspeksi jaringan manajemen. |

---

## 2. Siklus 4-Langkah Keputusan Akses (Subbab 3.3)

Setiap rute pada SIAKAD UMRAH menerapkan siklus evaluasi:

```
┌────────────────────────────────────────────────────────────────┐
│ Langkah 1: Identifikasi Subjek & Validasi Sesi                  │
│ • Periksa session cookie HttpOnly, SameSite, regenerasi ID     │
│ • Pastikan akun tidak berstatus terkunci (locked_until = NULL)  │
└───────────────────────────────┬────────────────────────────────┘
                                │ (Valid)
┌───────────────────────────────▼────────────────────────────────┐
│ Langkah 2: Evaluasi Peran & Konteks                            │
│ • Middleware authorizeRole(['admin', 'dosen', 'mahasiswa'])     │
│ • Evaluasi IP / asal jaringan (TB-1 s.d. TB-3)                 │
└───────────────────────────────┬────────────────────────────────┘
                                │ (Authorized Role)
┌───────────────────────────────▼────────────────────────────────┐
│ Langkah 3: Verifikasi Kepemilikan Objek (Anti-IDOR)            │
│ • Mahasiswa hanya dapat melihat data NIM miliknya (CT-03)      │
│ • Dosen hanya dapat menginput nilai mata kuliah yang diampu    │
└───────────────────────────────┬────────────────────────────────┘
                                │ (Ownership Verified)
┌───────────────────────────────▼────────────────────────────────┐
│ Langkah 4: Keputusan Izin & Pencatatan Audit                   │
│ • Izinkan operasi minimum (SELECT / INSERT)                    │
│ • Catat waktu, user, aksi, objek, IP ke AuditLog (R-03)        │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementasi Kode Middleware

1. **Autentikasi & Lockout:** `middleware/auth.js` (`isAuthenticated`)
2. **Otorisasi Berbasis Peran (RBAC):** `middleware/rbac.js` (`authorizeRole`)
3. **Verifikasi Kepemilikan Objek:** `routes/krs.js`, `routes/nilai.js`
4. **Audit Trail:** `middleware/auditLog.js` & `models/AuditLog.js`
