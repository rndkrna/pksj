# ============================================================
# SIAKAD UMRAH - Dockerfile (Multi-Stage Build)
# Implementasi Keamanan Container sesuai Laporan PKSJ
#
# Referensi Laporan PKSJ:
# - Tabel 4.2 (Hardening Host Server Aplikasi):
#   * Akun & hak istimewa: "akun layanan terpisah; hak administrator terbatas"
#   * Patch & layanan: "nonaktifkan layanan/port yang tidak diperlukan"
#   * Rahasia konfigurasi: "simpan di konfigurasi terlindungi/secret store"
#   * Proteksi endpoint: "batasi eksekusi dan akses file konfigurasi"
# - Tabel 3.1 (Zona Jaringan): Isolasi komponen per zona
# - R-05: Ketersediaan (health check & resource monitoring)
#
# Tim PKSJ UMRAH:
# 1. M. Khairul Fikri (2201020073)
# 2. Imelda Cristina Sinaga (2301020031)
# 3. Laila Amelia Ulva (2301020099)
# 4. Alfin Rifaldy Siregar (2301020125)
# Dosen: Hendra Kurniawan, S.Kom., M.Sc.Eng., Ph.D
# ============================================================

# ==================== STAGE 1: Builder ====================
# Tabel 4.2 (Patch & layanan): Gunakan image minimal (Alpine)
# untuk mengurangi attack surface
FROM node:22-alpine AS builder

LABEL maintainer="Tim PKSJ UMRAH"
LABEL description="SIAKAD UMRAH - Sistem Informasi Akademik dengan Arsitektur Keamanan"
LABEL version="1.0.0"

WORKDIR /app

# Copy hanya package files (layer caching optimization)
COPY package.json package-lock.json* ./

# Install dependensi production only (tanpa devDependencies)
# Tabel 4.2 (Patch & layanan): "nonaktifkan layanan yang tidak diperlukan"
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ==================== STAGE 2: Production ====================
FROM node:22-alpine AS production

# Tabel 4.2 (Patch & layanan): Install utilitas minimal yang diperlukan
# dumb-init = proper PID 1 signal handling (graceful shutdown)
RUN apk add --no-cache dumb-init

# Tabel 4.2 (Akun & hak istimewa):
# "Akun layanan terpisah; hak administrator terbatas; larang akun bersama"
# Buat user non-root khusus untuk menjalankan aplikasi SIAKAD
RUN addgroup -g 1001 -S siakad && \
    adduser -u 1001 -S siakad -G siakad -h /app -s /bin/false

WORKDIR /app

# Copy dependensi dari stage builder
COPY --from=builder --chown=siakad:siakad /app/node_modules ./node_modules

# Copy source code aplikasi
COPY --chown=siakad:siakad . .

# Buat direktori untuk logs dan backups
# Tabel 4.2 (Logging): "Catat login, kegagalan akses, perubahan nilai/akun"
RUN mkdir -p /app/logs /app/backups && \
    chown -R siakad:siakad /app/logs /app/backups

# Tabel 4.2 (Akun & hak istimewa): Switch ke user non-root
USER siakad

# R-05 (Ketersediaan): Expose port aplikasi
EXPOSE 3000

# R-05 (Ketersediaan): Health check untuk monitoring container
# Docker akan memonitor kesehatan container setiap 30 detik
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/auth/login || exit 1

# Environment variables default
ENV NODE_ENV=production
ENV PORT=3000

# Tabel 4.2 (Proteksi endpoint): dumb-init sebagai PID 1
# Mencegah zombie process dan memastikan graceful shutdown
ENTRYPOINT ["dumb-init", "--"]

# Jalankan aplikasi SIAKAD
CMD ["node", "server.js"]
