#!/bin/bash
# ============================================================
# SIAKAD UMRAH - Baseline Kebijakan Firewall / NGFW
# Implementasi Aturan Default-Deny Sesuai Laporan PKSJ
#
# Referensi Laporan PKSJ:
# - Bab IV Subbab 4.1 Tabel 4.1: Baseline Kebijakan Firewall/NGFW
# - Pendekatan: "Default-deny: koneksi ditolak kecuali ada kebutuhan bisnis yang terdokumentasi"
#
# Tim PKSJ UMRAH:
# 1. M. Khairul Fikri (2201020073)
# 2. Imelda Cristina Sinaga (2301020031)
# 3. Laila Amelia Ulva (2301020099)
# 4. Alfin Rifaldy Siregar (2301020125)
# Dosen Pengampu: Hendra Kurniawan, S.Kom., M.Sc.Eng., Ph.D
# ============================================================

set -euo pipefail

echo "============================================================"
echo " Menerapkan Baseline Firewall SIAKAD UMRAH (Tabel 4.1)"
echo "============================================================"

# Definisi Interface & Subnet Jaringan
DMZ_IF="eth0"                 # Interface Publik / DMZ (Reverse Proxy Nginx)
APP_IF="eth1"                 # Interface Jaringan Aplikasi
DB_IF="eth2"                  # Interface Jaringan Basis Data
MGMT_NET="10.10.100.0/24"     # Subnet Jaringan Administrator yang disetujui (FW-07)
APP_IP="10.10.20.10"          # IP Host Server Aplikasi
DB_IP="10.10.30.10"           # IP Host Basis Data
LOG_SERVER_IP="10.10.40.10"   # IP Host Centralized Log Server (FW-06)

# ------------------------------------------------------------
# 1. FLUSH ATURAN LAMA
# ------------------------------------------------------------
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# ------------------------------------------------------------
# 2. PENDEKATAN DEFAULT-DENY (Tabel 4.1 & FW-08)
# "Koneksi ditolak kecuali ada kebutuhan bisnis yang terdokumentasi"
# ------------------------------------------------------------
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# Izinkan Loopback interface
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Izinkan paket yang sudah terjalin (ESTABLISHED, RELATED)
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# ------------------------------------------------------------
# 3. IMPLEMENTASI ATURAN TABEL 4.1 LAPORAN PKSJ
# ------------------------------------------------------------

# FW-01: Internet/pengguna -> WAF/Reverse Proxy (TCP 443 HTTPS) -> ALLOW
# "Hanya endpoint publik yang disetujui; log koneksi"
echo "[+] Menerapkan FW-01: Allow HTTPS dari pengguna ke Reverse Proxy..."
iptables -A INPUT -i $DMZ_IF -p tcp --dport 443 -m conntrack --ctstate NEW -j ACCEPT
# HTTP port 80 hanya untuk redirect ke HTTPS
iptables -A INPUT -i $DMZ_IF -p tcp --dport 80 -m conntrack --ctstate NEW -j ACCEPT

# FW-02: Internet/pengguna -> Server aplikasi langsung -> DENY
# "Mencegah bypass terhadap lapisan depan; koneksi langsung ditolak"
echo "[+] Menerapkan FW-02: Deny koneksi langsung dari publik ke port aplikasi..."
iptables -A INPUT -i $DMZ_IF -p tcp --dport 3000 -j LOG --log-prefix "[FW-02-BLOCKED-APP]: " --log-level 4
iptables -A INPUT -i $DMZ_IF -p tcp --dport 3000 -j DROP

# FW-03: WAF/Reverse Proxy -> Server Aplikasi (Port 3000) -> ALLOW
# "Sumber dibatasi ke alamat/identitas komponen DMZ"
echo "[+] Menerapkan FW-03: Allow Reverse Proxy ke Server Aplikasi..."
iptables -A FORWARD -i $DMZ_IF -o $APP_IF -p tcp -d $APP_IP --dport 3000 -m conntrack --ctstate NEW -j ACCEPT

# FW-04: Server Aplikasi -> Server Basis Data (TCP 3306) -> ALLOW
# "Port DB aktual TCP 3306; jangan membuka DB ke internet atau zona pengguna"
echo "[+] Menerapkan FW-04: Allow Server Aplikasi ke Basis Data (Port 3306)..."
iptables -A FORWARD -s $APP_IP -d $DB_IP -p tcp --dport 3306 -m conntrack --ctstate NEW -j ACCEPT

# FW-05: Zona Pengguna / DMZ -> Server Basis Data -> DENY
# "Tidak ada koneksi langsung ke basis data dari internet atau DMZ"
echo "[+] Menerapkan FW-05: Deny koneksi langsung ke Basis Data dari DMZ/Pengguna..."
iptables -A FORWARD -i $DMZ_IF -d $DB_IP -p tcp --dport 3306 -j LOG --log-prefix "[FW-05-BLOCKED-DB]: " --log-level 4
iptables -A FORWARD -i $DMZ_IF -d $DB_IP -j DROP

# FW-06: Server Aplikasi -> Server Log (Port Syslog/TCP 514 atau TLS 6514) -> ALLOW
# "Batasi tujuan dan protokol; amankan transport log bila didukung"
echo "[+] Menerapkan FW-06: Allow pengiriman log ke Server Logging..."
iptables -A OUTPUT -s $APP_IP -d $LOG_SERVER_IP -p tcp --dport 6514 -m conntrack --ctstate NEW -j ACCEPT
iptables -A OUTPUT -s $APP_IP -d $LOG_SERVER_IP -p udp --dport 514 -m conntrack --ctstate NEW -j ACCEPT

# FW-07: Jaringan Admin yang Disetujui -> Host Administrasi (SSH/Port Manajemen) -> ALLOW TERBATAS
# "MFA / jalur aman; hindari paparan SSH ke internet"
echo "[+] Menerapkan FW-07: Allow akses administratif hanya dari jaringan admin..."
iptables -A INPUT -s $MGMT_NET -p tcp --dport 22 -m conntrack --ctstate NEW -j ACCEPT
# Blokir SSH dari internet publik
iptables -A INPUT -i $DMZ_IF -p tcp --dport 22 -j LOG --log-prefix "[FW-07-BLOCKED-SSH]: " --log-level 4
iptables -A INPUT -i $DMZ_IF -p tcp --dport 22 -j DROP

# FW-08: Sumber Lain -> Semua Zona Internal -> DENY + LOG
# "Tinjau false positive dan log secara terjadwal"
echo "[+] Menerapkan FW-08: Default Deny + Logging untuk semua lalu lintas tak sah..."
iptables -A INPUT -m limit --limit 5/min -j LOG --log-prefix "[FW-08-DEFAULT-DENY]: " --log-level 4
iptables -A INPUT -j DROP
iptables -A FORWARD -m limit --limit 5/min -j LOG --log-prefix "[FW-08-FORWARD-DENY]: " --log-level 4
iptables -A FORWARD -j DROP

echo "============================================================"
echo " [OK] Baseline Firewall SIAKAD PKSJ Berhasil Diterapkan!"
echo "============================================================"
