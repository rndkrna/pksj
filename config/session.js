/**
 * Session Configuration
 * R-07: Sesi/token pengguna
 * SR-09: Cookie Secure, HttpOnly, SameSite, session expiry
 * Hardening: Custom cookie name (mencegah fingerprinting framework)
 */
require('dotenv').config();

const sessionConfig = {
  name: 'siakad_sess', // Menyamarkan cookie name default 'connect.sid'
  secret: process.env.SESSION_SECRET || 'siakad-pksj-umrah-2026-very-secure-secret-key-salt',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // Mencegah akses cookie via JavaScript (XSS Protection)
    secure: 'auto', // 'auto': menyesuaikan otomatis dengan koneksi HTTPS / reverse proxy
    sameSite: 'lax', // Proteksi serangan CSRF lintas domain
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 1800000 // Sesi kedaluwarsa 30 menit (SR-09)
  }
};

module.exports = sessionConfig;

