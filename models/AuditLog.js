/**
 * Model AuditLog (A-05: Log audit sistem)
 * R-03: Keterlacakan & Non-repudiation
 * SR-05: Peristiwa sensitif dicatat dalam log terlindungi
 */
const db = require('../config/database');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Winston logger untuk file terpisah (R-03: centralized file-based logging)
const fileLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'audit.log') }),
    new winston.transports.File({ filename: path.join(logDir, 'security-alerts.log'), level: 'warn' })
  ]
});

class AuditLog {
  static async log({ userId, username, role, action, resource, resourceId, details, ipAddress, userAgent, status = 'success' }) {
    try {
      // 1. Simpan ke database
      await db.execute(
        `INSERT INTO audit_log (user_id, username, role, action, resource, resource_id, details, ip_address, user_agent, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId || null,
          username || 'ANONYMOUS',
          role || 'GUEST',
          action,
          resource || null,
          resourceId ? String(resourceId) : null,
          details || null,
          ipAddress || '127.0.0.1',
          userAgent || '',
          status
        ]
      );

      // 2. Simpan ke immutable file log (Winston)
      const payload = {
        timestamp: new Date().toISOString(),
        userId,
        username,
        role,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        status
      };

      if (status === 'blocked' || status === 'failed') {
        fileLogger.warn(payload);
      } else {
        fileLogger.info(payload);
      }
    } catch (err) {
      console.error('❌ [AuditLog] Gagal mencatat log:', err.message);
    }
  }

  static async getRecent(limit = 10) {
    const [rows] = await db.execute(
      `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?`,
      [Number(limit)]
    );
    return rows;
  }

  static async countByStatus() {
    const [rows] = await db.execute(
      `SELECT status, COUNT(*) AS count FROM audit_log GROUP BY status`
    );
    return rows;
  }

  static async findAll({ page = 1, limit = 20, username, action, status, dateFrom, dateTo }) {
    let whereClauses = ['1=1'];
    let params = [];

    if (username) {
      whereClauses.push('username LIKE ?');
      params.push(`%${username}%`);
    }
    if (action) {
      whereClauses.push('action LIKE ?');
      params.push(`%${action}%`);
    }
    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }
    if (dateFrom) {
      whereClauses.push('DATE(created_at) >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      whereClauses.push('DATE(created_at) <= ?');
      params.push(dateTo);
    }

    const whereSql = whereClauses.join(' AND ');

    // Hitung total
    const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM audit_log WHERE ${whereSql}`, params);
    const total = countRows[0].total;

    // Ambil data dengan paging
    const offset = (Number(page) - 1) * Number(limit);
    const [logs] = await db.execute(
      `SELECT * FROM audit_log WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return {
      logs,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    };
  }
}

module.exports = AuditLog;

