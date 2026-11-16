/**
 * Routes Administrator
 * R-06: Hak akses minimum (Least Privilege)
 * R-03: Log audit terpusat & immutable audit viewer
 * R-01: Manajemen akun & reset status lockout
 */
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const User = require('../models/User');
const Mahasiswa = require('../models/Mahasiswa');
const AuditLog = require('../models/AuditLog');
const { validatePassword, isValidEmail, sanitizeText } = require('../utils/validator');

// Hanya peran 'admin' yang dapat mengakses seluruh rute ini (R-06 RBAC)
router.use(isAuthenticated, requireRole('admin'));

// GET /admin/users (Daftar Pengguna)
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll();
    res.render('admin/users', {
      title: 'Manajemen Pengguna - SIAKAD',
      user: req.session.user,
      users,
      error: res.locals.error,
      success: res.locals.success,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('Admin Users GET Error:', err);
    res.status(500).render('errors/500', { title: '500 - Server Error', user: req.session.user });
  }
});

// POST /admin/users/create (Buat Akun Baru)
router.post('/users/create', async (req, res) => {
  const { username, password, nama_lengkap, email, role, nim, angkatan, program_studi } = req.body;
  const adminUser = req.session.user;

  try {
    const cleanUsername = sanitizeText(username);
    const cleanNama = sanitizeText(nama_lengkap);

    if (!cleanUsername || !password || !cleanNama || !role) {
      req.flash('error', 'Semua kolom bertanda bintang (*) wajib diisi.');
      return res.redirect('/admin/users');
    }

    // 1. Kebijakan Kata Sandi Kuat (R-01)
    const passCheck = validatePassword(password);
    if (!passCheck.isValid) {
      req.flash('error', `Password tidak memenuhi syarat keamanan: ${passCheck.errors.join(', ')}.`);
      return res.redirect('/admin/users');
    }

    if (email && !isValidEmail(email)) {
      req.flash('error', 'Format alamat email tidak valid.');
      return res.redirect('/admin/users');
    }

    // 2. Buat user dengan hash bcrypt
    const result = await User.create({
      username: cleanUsername,
      password,
      nama_lengkap: cleanNama,
      email: email || null,
      role
    });

    const newUserId = result.insertId;

    // Jika role mahasiswa, tambahkan ke tabel mahasiswa
    if (role === 'mahasiswa' && nim) {
      await Mahasiswa.create({
        user_id: newUserId,
        nim: sanitizeText(nim),
        program_studi: program_studi || 'Teknik Informatika',
        angkatan: angkatan || new Date().getFullYear(),
        semester_aktif: 1
      });
    }

    AuditLog.log({
      userId: adminUser.id,
      username: adminUser.username,
      role: 'admin',
      action: 'ADMIN_CREATE_USER',
      resource: 'users',
      resourceId: newUserId,
      details: `Administrator membuat akun baru: ${cleanUsername} [${role}]`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    req.flash('success', `Akun baru ${cleanNama} (${cleanUsername}) berhasil dibuat.`);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Admin Create User Error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'Username, NIM, atau Email sudah terdaftar.');
    } else {
      req.flash('error', 'Terjadi kesalahan saat membuat akun.');
    }
    res.redirect('/admin/users');
  }
});

// POST /admin/users/toggle/:id (Aktifkan / Nonaktifkan Akun)
router.post('/users/toggle/:id', async (req, res) => {
  const targetId = Number(req.params.id);
  const adminUser = req.session.user;

  // Larang admin menonaktifkan akunnya sendiri
  if (targetId === adminUser.id) {
    req.flash('error', 'Tindakan ditolak: Anda tidak dapat menonaktifkan akun sendiri.');
    return res.redirect('/admin/users');
  }

  try {
    const target = await User.findById(targetId);
    if (!target) {
      req.flash('error', 'Pengguna tidak ditemukan.');
      return res.redirect('/admin/users');
    }

    await User.toggleActive(targetId);

    AuditLog.log({
      userId: adminUser.id,
      username: adminUser.username,
      role: 'admin',
      action: 'ADMIN_TOGGLE_USER_STATUS',
      resource: 'users',
      resourceId: targetId,
      details: `Status akun ${target.username} diubah menjadi: ${target.is_active ? 'Nonaktif' : 'Aktif'}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    req.flash('success', `Status akun ${target.nama_lengkap} berhasil diubah.`);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Admin Toggle User Error:', err);
    req.flash('error', 'Gagal memperbarui status akun.');
    res.redirect('/admin/users');
  }
});

// POST /admin/users/unlock/:id (Buka Kunci Akun yang Terkunci Akibat Salah Password)
router.post('/users/unlock/:id', async (req, res) => {
  const targetId = Number(req.params.id);
  const adminUser = req.session.user;

  try {
    const target = await User.findById(targetId);
    if (!target) {
      req.flash('error', 'Pengguna tidak ditemukan.');
      return res.redirect('/admin/users');
    }

    await User.unlockAccount(targetId);

    AuditLog.log({
      userId: adminUser.id,
      username: adminUser.username,
      role: 'admin',
      action: 'ADMIN_UNLOCK_USER_ACCOUNT',
      resource: 'users',
      resourceId: targetId,
      details: `Administrator membuka kunci akun ${target.username} (Reset login attempts)`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    req.flash('success', `Kunci akun ${target.nama_lengkap} berhasil dibuka.`);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Admin Unlock User Error:', err);
    req.flash('error', 'Gagal membuka kunci akun.');
    res.redirect('/admin/users');
  }
});

// GET /admin/audit-log (Audit Log Viewer Terpusat - R-03)
router.get('/audit-log', async (req, res) => {
  const { page = 1, username, action, status, dateFrom, dateTo } = req.query;

  try {
    const result = await AuditLog.findAll({
      page: Number(page) || 1,
      limit: 25,
      username: sanitizeText(username),
      action: sanitizeText(action),
      status: sanitizeText(status),
      dateFrom: sanitizeText(dateFrom),
      dateTo: sanitizeText(dateTo)
    });

    res.render('admin/audit-log', {
      title: 'Log Audit Sistem - SIAKAD UMRAH',
      user: req.session.user,
      ...result,
      filters: { username, action, status, dateFrom, dateTo },
      error: res.locals.error,
      success: res.locals.success,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('Admin Audit Log Error:', err);
    res.status(500).render('errors/500', { title: '500 - Server Error', user: req.session.user });
  }
});

module.exports = router;

