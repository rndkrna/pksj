/**
 * Security Headers Middleware (Helmet)
 * R-04: Kerahasiaan data akun & komunikasi aman
 * Fase 2: Hardening Host Server Aplikasi (Tabel 4.2)
 */
const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      frameAncestors: ["'none'"], // Mencegah clickjacking (CT-06)
      formAction: ["'self'"],
      upgradeInsecureRequests: null // Mencegah browser memaksa https:// di localhost
    }
  },
  hsts: false, // HSTS ditangani oleh Nginx Reverse Proxy (Port 443), dinonaktifkan di port lokal 3000
  crossOriginEmbedderPolicy: false,
  xContentTypeOptions: true, // nosniff
  xFrameOptions: { action: 'deny' }, // Anti-clickjacking
  xXssProtection: true
});

module.exports = securityHeaders;

