/**
 * SIAKAD - Sistem Informasi Akademik
 * Universitas Maritim Raja Ali Haji (UMRAH)
 * 
 * Implementasi Arsitektur Keamanan Laporan PKSJ:
 * - Fase 1: Discovery & Security Requirements (Asset Inventory, STRIDE, Risk Register)
 * - Fase 2: Security Architecture & Hardening (Zero Trust, Host Hardening, NGFW Baseline)
 * 
 * Tim Pengembang (Mahasiswa PKSJ):
 * 1. M. Khairul Fikri (2201020073)
 * 2. Imelda Cristina Sinaga (2301020031)
 * 3. Laila Amelia Ulva (2301020099)
 * 4. Alfin Rifaldy Siregar (2301020125)
 * Dosen Pengampu: Hendra Kurniawan, S.Kom., M.Sc.Eng., Ph.D
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const path = require('path');

// 1. Middleware Keamanan (Fase 2 Bab IV - Host Hardening)
const securityHeaders = require('./middleware/security');
const { globalLimiter } = require('./middleware/rateLimiter');
const { csrfProtection, csrfErrorHandler } = require('./middleware/csrf');
const auditMiddleware = require('./middleware/auditLog');
const sessionConfig = require('./config/session');

// 2. Modul Rute
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const krsRoutes = require('./routes/krs');
const nilaiRoutes = require('./routes/nilai');
const jadwalRoutes = require('./routes/jadwal');
const adminRoutes = require('./routes/admin');

// 3. Helper Utilitas
const { formatDate, formatDateShort, gradeColor } = require('./utils/helpers');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// HARDENING LAYER 0: Reverse Proxy Trust (TB-1 & TB-2)
// Diperlukan agar cookie secure dan client IP valid di balik Nginx
// ============================================================
app.set('trust proxy', 1);

// ============================================================
// HARDENING LAYER 1: Perimeter & Security Headers (R-04)
// ============================================================
app.use(securityHeaders);
app.disable('x-powered-by'); // Sembunyikan identitas Express (Tabel 4.2)

// ============================================================
// HARDENING LAYER 2: DoS & Request Flooding Protection (R-05)
// ============================================================
app.use(globalLimiter);

// ============================================================
// APPLICATION CORE MIDDLEWARES
// ============================================================
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Static Files (CSS, JS, Assets)
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

// Session Management (R-07 & SR-09)
app.use(session(sessionConfig));

// Flash Messages
app.use(flash());

// CSRF Protection (R-01)
app.use(csrfProtection);

// Audit Logging Middleware (R-03)
app.use(auditMiddleware);

// ============================================================
// VIEW ENGINE CONFIGURATION (EJS)
// ============================================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global View Context
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  res.locals.currentPath = req.path;
  res.locals.formatDate = formatDate;
  res.locals.formatDateShort = formatDateShort;
  res.locals.gradeColor = gradeColor;

  // Flash messages: simpan ke res.locals
  const flashSucc = req.flash('success');
  const flashErr = req.flash('error');
  res.locals.success = flashSucc.length > 0 ? flashSucc : null;
  res.locals.error = flashErr.length > 0 ? flashErr : null;
  res.locals.flashSuccess = res.locals.success;
  res.locals.flashError = res.locals.error;
  next();
});

// ============================================================
// MOUNT ROUTES
// ============================================================
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/auth/login');
});

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/krs', krsRoutes);
app.use('/nilai', nilaiRoutes);
app.use('/jadwal', jadwalRoutes);
app.use('/admin', adminRoutes);

// ============================================================
// ERROR HANDLING (R-04: Non-Disclosure of Internal Details)
// ============================================================
app.use(csrfErrorHandler);

// 404 Not Found
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: '404 - Halaman Tidak Ditemukan',
    user: req.session?.user || null
  });
});

// 500 Internal Server Error
app.use((err, req, res, next) => {
  console.error('❌ [Unhandled Server Error]:', err);
  res.status(500).render('errors/500', {
    title: '500 - Server Error',
    user: req.session?.user || null
  });
});

// ============================================================
// START APPLICATION SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`
==============================================================
   SIAKAD UNIVERSITAS MARITIM RAJA ALI HAJI (UMRAH)
   Fakultas Teknik dan Teknologi Kemaritiman - Teknik Informatika
==============================================================
   Status Server : Berjalan pada http://localhost:${PORT}
   Arsitektur    : Zero Trust, Parameterized Query, RBAC
   Database      : MySQL 127.0.0.1:3306 (siakad_db)
   Keamanan Aktif:
   - R-01 : Autentikasi (bcrypt salt 12, Rate Limit 5x, Lockout 15m)
   - R-02 : Integritas Nilai (Server-side validation & queries)
   - R-03 : Log Audit (Immutable Append-only & Winston json log)
   - R-04 : Kerahasiaan (Helmet CSP, HttpOnly, SameSite, no-sniff)
   - R-05 : Ketersediaan (Global rate limiter anti-DoS)
   - R-06 : Eskalasi Hak Akses (RBAC per route & Isolasi data CT-03)
   - R-07 : Sesi (Regenerasi session ID & Timeout 30 menit)
   - R-08 : Backup & Restore (scripts/backup.js)
==============================================================
  `);
});

module.exports = app;

