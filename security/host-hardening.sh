#!/bin/bash
# ============================================================
# SIAKAD UMRAH - Host Hardening Server Aplikasi
# Implementasi Penguatan Host Sesuai Laporan PKSJ
#
# Referensi Laporan PKSJ:
# - Bab IV Subbab 4.2 Tabel 4.2: Baseline Hardening Host Server Aplikasi
#
# Kontrol yang diterapkan:
# 1. Patch dan Layanan: Update keamanan, nonaktifkan port/layanan tidak perlu
# 2. Akun dan Hak Istimewa: Akun personal, batasi admin, akun layanan terpisah
# 3. Rahasia Konfigurasi: Hak akses ketat file .env (chmod 600)
# 4. Proteksi Endpoint: Sysctl kernel hardening, batasi eksekusi file
# 5. Logging: Sinkronisasi waktu (Chrony/NTP) & proteksi file log
#
# Tim PKSJ UMRAH
# ============================================================

set -euo pipefail

echo "============================================================"
echo " Menerapkan Host Hardening Server Aplikasi (Tabel 4.2)"
echo "============================================================"

# Verifikasi akses root untuk menjalankan hardening
if [ "$(id -u)" -ne 0 ]; then
  echo "[-] Script ini harus dijalankan sebagai root / sudo." >&2
  exit 1
fi

# ------------------------------------------------------------
# 1. PATCH DAN LAYANAN (Tabel 4.2 Baris 1)
# "Pasang pembaruan keamanan yang disetujui; nonaktifkan layanan/port tidak perlu"
# ------------------------------------------------------------
echo "[1/6] Memperbarui paket keamanan sistem..."
apt-get update -y
apt-get --only-upgrade install -y unattended-upgrades libssl-dev

echo "[1/6] Menonaktifkan layanan dan daemon yang tidak diperlukan..."
UNWANTED_SERVICES=(
    "cups"
    "avahi-daemon"
    "bluetooth"
    "rpcbind"
    "nfs-common"
    "vsftpd"
    "telnet"
    "rsh-server"
)

for srv in "${UNWANTED_SERVICES[@]}"; do
    if systemctl is-active --quiet "$srv"; then
        systemctl stop "$srv" || true
        systemctl disable "$srv" || true
        echo "    - Layanan $srv dinonaktifkan."
    fi
done

# ------------------------------------------------------------
# 2. AKUN DAN HAK ISTIMEWA (Tabel 4.2 Baris 2)
# "Akun personal; hak administrator terbatas; larang akun bersama; akun layanan terpisah"
# ------------------------------------------------------------
echo "[2/6] Memeriksa akun layanan terpisah untuk SIAKAD..."
if ! id "siakad" &>/dev/null; then
    echo "    - Membuat user layanan 'siakad' (non-login shell)..."
    useradd -r -u 1001 -g nogroup -s /bin/false -d /opt/siakad siakad
else
    echo "    - User 'siakad' sudah terdaftar."
fi

echo "[2/6] Memperkuat konfigurasi SSH (sshd_config)..."
SSHD_CONFIG="/etc/ssh/sshd_config"
if [ -f "$SSHD_CONFIG" ]; then
    # Larang login root langsung
    sed -i -E 's/^#?PermitRootLogin.*/PermitRootLogin no/' "$SSHD_CONFIG"
    # Batasi max auth tries (mencegah brute force SSH)
    sed -i -E 's/^#?MaxAuthTries.*/MaxAuthTries 3/' "$SSHD_CONFIG"
    # Timeout sesi tidak aktif (10 menit)
    sed -i -E 's/^#?ClientAliveInterval.*/ClientAliveInterval 300/' "$SSHD_CONFIG"
    sed -i -E 's/^#?ClientAliveCountMax.*/ClientAliveCountMax 2/' "$SSHD_CONFIG"
    echo "    - Konfigurasi SSH diperketat (PermitRootLogin no, MaxAuthTries 3)."
fi

# ------------------------------------------------------------
# 3. RAHASIA KONFIGURASI (Tabel 4.2 Baris 4)
# "Simpan kredensial di konfigurasi terlindungi/secret store; jangan commit ke repositori"
# ------------------------------------------------------------
echo "[3/6] Memperketat izin file konfigurasi dan rahasia..."
APP_DIR="/opt/siakad"
if [ -d "$APP_DIR" ]; then
    chown -R siakad:siakad "$APP_DIR"
    find "$APP_DIR" -type f -name ".env*" -exec chmod 600 {} \;
    find "$APP_DIR" -type f -name ".env*" -exec chown siakad:siakad {} \;
    echo "    - Izin file .env dibatasi menjadi 600 (Hanya pemilik yang dapat membaca)."
fi

# ------------------------------------------------------------
# 4. PROTEKSI ENDPOINT & KERNEL HARDENING (Tabel 4.2 Baris 7)
# "Gunakan proteksi host yang tersedia; batasi eksekusi dan akses file konfigurasi"
# ------------------------------------------------------------
echo "[4/6] Menerapkan parameter kernel hardening (sysctl)..."
SYSCTL_FILE="/etc/sysctl.d/99-siakad-security.conf"
cat <<EOF > "$SYSCTL_FILE"
# Perlindungan terhadap Serangan SYN Flood (R-05 Ketersediaan)
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2

# Cegah IP Spoofing dan IP Forwarding tidak disengaja
net.ipv4.ip_forward = 0
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Nonaktifkan ICMP Redirect (Mencegah manipulasi rute routing)
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Proteksi Link (Mencegah Time-of-Check Time-of-Use exploit)
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
fs.protected_fifos = 2
fs.protected_regular = 2

# Batasi dmesg hanya untuk root
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
EOF

sysctl -p "$SYSCTL_FILE" || true
echo "    - Kernel hardening sysctl berhasil diterapkan."

# ------------------------------------------------------------
# 5. SINKRONISASI WAKTU DAN LOGGING (Tabel 4.2 Baris 6, R-03)
# "Log terpusat/terlindungi, sinkronisasi waktu, retensi"
# ------------------------------------------------------------
echo "[5/6] Memeriksa sinkronisasi waktu sistem (NTP/Chrony)..."
if ! command -v chrony &>/dev/null && ! command -v systemd-timesyncd &>/dev/null; then
    apt-get install -y chrony
    systemctl enable chrony
    systemctl start chrony
    echo "    - Layanan chrony diaktifkan untuk sinkronisasi waktu akurat log audit."
else
    echo "    - Sinkronisasi waktu aktif."
fi

# ------------------------------------------------------------
# 6. INTEGRITAS FILE DAN AUDIT LOG PERMISSION (Tabel 4.2 Baris 6 & 8)
# ------------------------------------------------------------
echo "[6/6] Menyetel izin direktori logs & backups..."
if [ -d "$APP_DIR/logs" ]; then
    chmod 750 "$APP_DIR/logs"
    chmod 640 "$APP_DIR/logs/"*.log 2>/dev/null || true
fi
if [ -d "$APP_DIR/backups" ]; then
    chmod 700 "$APP_DIR/backups"
fi

echo "============================================================"
echo " [OK] Baseline Host Hardening Berhasil Diterapkan!"
echo "============================================================"
