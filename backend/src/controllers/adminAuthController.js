const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

async function handshake(_req, res) {
  const migration = await query('SELECT version, run_at FROM schema_migrations ORDER BY version DESC LIMIT 1');
  res.json({
    product: '松间叩仙管理台',
    environment: process.env.ADMIN_ENVIRONMENT_NAME || process.env.NODE_ENV || 'development',
    instanceId: process.env.ADMIN_INSTANCE_ID || 'local-default',
    apiVersion: '1.0',
    migration: migration.rows[0] || null,
    serverTime: new Date().toISOString(),
  });
}

async function login(req, res) {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!username || !password) return res.status(422).json({ error: '请输入管理员账号和密码', requestId: req.requestId });

  const result = await query(
    `SELECT id, username, password_hash, display_name, role, active, token_version,
            failed_login_count, locked_until
     FROM admin_users WHERE username = $1`,
    [username]
  );
  const admin = result.rows[0];
  const now = new Date();
  if (!admin || !admin.active || (admin.locked_until && new Date(admin.locked_until) > now)) {
    return res.status(401).json({ error: '管理员账号或密码错误', requestId: req.requestId });
  }

  const matches = await bcrypt.compare(password, admin.password_hash);
  if (!matches) {
    await query(
      `UPDATE admin_users
       SET failed_login_count = failed_login_count + 1,
           locked_until = CASE WHEN failed_login_count + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END,
           updated_at = NOW()
       WHERE id = $1`,
      [admin.id]
    );
    return res.status(401).json({ error: '管理员账号或密码错误', requestId: req.requestId });
  }

  await query(
    `UPDATE admin_users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [admin.id]
  );
  const token = jwt.sign(
    { adminId: admin.id, role: admin.role, tokenVersion: admin.token_version },
    process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
    { audience: 'songjian-admin', expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '4h' }
  );
  res.json({
    token,
    admin: { id: admin.id, username: admin.username, displayName: admin.display_name, role: admin.role },
    requestId: req.requestId,
  });
}

async function me(req, res) {
  res.json({
    admin: {
      id: req.admin.id,
      username: req.admin.username,
      displayName: req.admin.display_name,
      role: req.admin.role,
    },
    requestId: req.requestId,
  });
}

module.exports = { handshake, login, me };

