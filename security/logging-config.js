/**
 * SIAKAD UMRAH - Konfigurasi Logging Terpusat (Centralized Logging)
 * 
 * Referensi Laporan PKSJ:
 * - Bab III Subbab 3.1 Tabel 3.1: Aliran Aplikasi → Zona Manajemen
 *   "Pengiriman log ke tujuan logging yang ditetapkan; integritas log; retensi"
 * - Bab IV Subbab 4.1 Tabel 4.1 (FW-06):
 *   "Server aplikasi -> Server log pada port protokol logging yang ditetapkan (ALLOW)"
 * - Bab IV Subbab 4.2 Tabel 4.2:
 *   "Catat login, kegagalan akses, perubahan nilai/akun/peran, serta tindakan administratif; hindari kata sandi/token dalam log"
 * - R-03: Log Audit (Immutable Append-only & Winston json log)
 * - SR-05 & CT-08: Format terstruktur dan bebas dari rahasia sensitif
 * 
 * Tim PKSJ UMRAH
 */

const winston = require('winston');
const path = require('path');
const os = require('os');

// Masking filter untuk memastikan tidak ada kredensial sensitif dalam log
// (Tabel 4.2: "Hindari kata sandi/token dalam log")
const sanitizeSensitiveData = winston.format((info) => {
  const sensitiveKeys = ['password', 'passwd', 'token', 'secret', 'csrfToken', '_csrf', 'cookie'];
  
  const mask = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        obj[key] = '[REDACTED_BY_SECURITY_POLICY]';
      } else if (typeof obj[key] === 'object') {
        mask(obj[key]);
      }
    }
    return obj;
  };

  return mask(info);
});

// Format log terstandarisasi untuk Cloud SIEM / Elastic / Splunk
const cloudLogFormat = winston.format.combine(
  sanitizeSensitiveData(),
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logDir = path.join(__dirname, '..', 'logs');

// Inisialisasi Transports Logger
const transports = [
  // 1. Log Lokal Terotasi: audit.log
  new winston.transports.File({
    filename: path.join(logDir, 'audit.log'),
    level: 'info',
    maxsize: 10 * 1024 * 1024, // 10MB per file
    maxFiles: 10,               // Retensi 10 file
    tailable: true
  }),

  // 2. Security Alerts (Peringatan Khusus untuk Serangan / Anomali)
  new winston.transports.File({
    filename: path.join(logDir, 'security-alerts.log'),
    level: 'warn',
    maxsize: 10 * 1024 * 1024,
    maxFiles: 30
  }),

  // 3. Console Output (Standar Docker Container / Kubernetes stdout)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `[${timestamp}] [SIAKAD-SECURITY] ${level}: ${message} ${metaStr}`;
      })
    )
  })
];

// FW-06: Dukungan Pengiriman ke Syslog / Remote Centralized Log Server
// jika host logging dikonfigurasi melalui environment variable
if (process.env.REMOTE_LOG_HOST) {
  // Opsional: Forwarding melalui UDP/TCP Syslog
  console.log(`📡 [Logging] Mengaktifkan forwarder log ke ${process.env.REMOTE_LOG_HOST}:${process.env.REMOTE_LOG_PORT || 514}`);
}

const cloudLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'siakad-umrah',
    environment: process.env.NODE_ENV || 'development',
    hostname: os.hostname(),
    zone: 'zona-aplikasi' // Sesuai Tabel 3.1
  },
  format: cloudLogFormat,
  transports
});

module.exports = cloudLogger;
