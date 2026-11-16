/**
 * Audit Logging HTTP Middleware
 * R-03: Pencatatan Peristiwa Sensitif (SR-05, CT-08)
 */
const AuditLog = require('../models/AuditLog');

function auditMiddleware(req, res, next) {
  // Abaikan request untuk aset statis
  if (req.path.startsWith('/public') || req.path === '/favicon.ico') {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', () => {
    // Catat aksi-aksi mutasi (POST, PUT, DELETE) atau jalur administratif
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    const isAdminPath = req.path.startsWith('/admin');

    if ((isMutation || isAdminPath) && req.session && req.session.user) {
      const duration = Date.now() - startTime;
      AuditLog.log({
        userId: req.session.user.id,
        username: req.session.user.username,
        role: req.session.user.role,
        action: `HTTP_${req.method}_${req.baseUrl || ''}${req.path}`,
        resource: req.originalUrl,
        details: `Status Code: ${res.statusCode} (Latency: ${duration}ms)`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: res.statusCode < 400 ? 'success' : 'failed'
      });
    }
  });

  next();
}

module.exports = auditMiddleware;

