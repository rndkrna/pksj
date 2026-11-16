# Panduan Pengelolaan Rahasia (Secret Management)
## Sistem Informasi Akademik (SIAKAD) - Universitas Maritim Raja Ali Haji (UMRAH)

**Referensi Laporan PKSJ:**
- **Fase 2 Bab IV Tabel 4.2 Baris 4:** *Rahasia konfigurasi — Simpan kredensial di konfigurasi terlindungi / secret store; jangan commit ke repositori; rotasi bila terpapar.*
- **Fase 1 Bab VII (SR-10):** *Hak akses akun layanan dan administrator mengikuti prinsip hak minimum.*
- **Fase 2 Bab III Tabel 3.1 (TB-3):** *Rahasia tidak ditanam di kode.*

---

## 1. Klasifikasi Informasi Rahasia (Secrets)

SIAKAD UMRAH mengelola beberapa data sensitif yang tidak boleh diekspos ke publik atau disimpan langsung di repositori kode sumber (hardcoded):

| Kategori Rahasia | Variabel | Deskripsi | Risiko Paparan |
|---|---|---|---|
| **Database Credentials** | `DB_PASSWORD`, `DB_ROOT_PASSWORD` | Kata sandi koneksi basis data MySQL | Pengambilalihan data nilai dan KRS (R-02) |
| **Session Secret** | `SESSION_SECRET` | Kunci enkripsi tanda tangan cookie session | Pemalsuan sesi pengguna / Session hijacking (R-07) |
| **Database User** | `DB_USER` | Identitas pengguna aplikasi ke database | Eskalasi hak akses database (R-06) |
| **Kunci Privat TLS** | `server.key` | Kunci privat enkripsi HTTPS | Intersepsi data dalam transmisi / MITM (R-04) |

---

## 2. Strategi Penyimpanan Berdasarkan Lingkungan

### A. Lingkungan Staging / Pengujian Lokal
1. Seluruh kredensial disimpan di file `.env`.
2. File `.env` wajib dimasukkan ke `.gitignore` dan `.dockerignore`.
3. Template tanpa rahasia disediakan pada `.env.example` untuk acuan pengembang:
   ```env
   PORT=3000
   NODE_ENV=development
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=siakad_user
   DB_PASSWORD=
   DB_NAME=siakad_dbs
   SESSION_SECRET=ganti-dengan-kunci-acak-panjang
   ```
4. Izin file pada sistem operasi Linux diatur secara ketat:
   ```bash
   chmod 600 .env
   chown siakad:siakad .env
   ```

### B. Lingkungan Container Docker
1. Kredensial tidak disalin ke dalam image Docker (`COPY` tidak menyertakan `.env`).
2. Kredensial diinjeksikan saat container dijalankan via environment variable atau Docker Compose file:
   ```yaml
   environment:
     DB_PASSWORD: ${DB_PASSWORD}
     SESSION_SECRET: ${SESSION_SECRET}
   ```
3. Docker Secret digunakan untuk lingkungan Swarm/Production skala besar.

### C. Lingkungan Kubernetes
1. Kredensial dikelola melalui resource **Kubernetes Secret** (`k8s/secret.yaml`):
   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: siakad-secret
     namespace: siakad
   type: Opaque
   stringData:
     DB_PASSWORD: "..."
     SESSION_SECRET: "..."
   ```
2. Secret diinjeksikan ke dalam Pod melalui `env.valueFrom.secretKeyRef` sehingga tidak tersimpan di disk container.
3. Rekomendasi produksi: Integrasi dengan Cloud Secret Manager (Google Secret Manager / HashiCorp Vault) dan enkripsi etcd at-rest.

### D. Pipeline DevSecOps (CI/CD)
1. Kredensial disimpan pada **GitHub Actions Secrets** (misal: `PRODUCTION_DB_PASSWORD`, `DOCKERHUB_TOKEN`).
2. Runner secara otomatis menyamarkan (*masking*) nilai rahasia pada log eksekusi.
3. Scanner otomatis (`scripts/secret-scan.js`) memblokir push commit yang memuat password ter-hardcode.

---

## 3. Prosedur Rotasi Rahasia (Secret Rotation)

Jika terdeteksi insiden kebocoran kredensial atau pergantian berkala (tiap 90 hari):

1. **Rotasi Kredensial Basis Data:**
   ```sql
   -- 1. Buat kata sandi baru untuk user aplikasi
   ALTER USER 'siakad_app'@'%' IDENTIFIED BY 'PasswordBaru@2026!Kuat';
   FLUSH PRIVILEGES;
   ```
2. **Perbarui Konfigurasi Aplikasi:**
   - Perbarui file `.env` atau Kubernetes Secret.
   - Lakukan rolling restart pada Pod aplikasi (`kubectl rollout restart deployment siakad-app -n siakad`).
3. **Rotasi Session Secret:**
   - Ubah nilai `SESSION_SECRET` di konfigurasi.
   - Sesi lama akan otomatis tidak valid, memaksa seluruh pengguna untuk login ulang secara bersih.
4. **Audit Log:**
   - Catat peristiwa rotasi pada log audit keamanan dengan waktu dan penanggung jawab.

---

## 4. Checklist Pencegahan Kebocoran (Tabel 7.1 Deliverables)

- [x] `.env` masuk ke `.gitignore`
- [x] `.env` masuk ke `.dockerignore`
- [x] Tidak ada kredensial hardcoded pada file JavaScript (`server.js`, `routes/`, `models/`)
- [x] Dockerfile menggunakan user non-root dan tidak menyalin file `.env`
- [x] Script `scripts/secret-scan.js` aktif pada pipeline DevSecOps
