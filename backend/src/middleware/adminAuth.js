const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

async function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '管理员未登录', requestId: req.requestId });
  }

  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET, {
      audience: 'songjian-admin',
    });
    if (!payload.adminId) throw new Error('invalid admin token');
  } catch (_error) {
    return res.status(401).json({ error: '管理员令牌无效或已过期', requestId: req.requestId });
  }

  try {
    const result = await query(
      `SELECT id, username, display_name, role, active, token_version
       FROM admin_users WHERE id = $1`,
      [payload.adminId]
    );
    const admin = result.rows[0];
    if (!admin || !admin.active || Number(admin.token_version) !== Number(payload.tokenVersion)) {
      return res.status(401).json({ error: '管理员会话已失效', requestId: req.requestId });
    }
    req.admin = admin;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = adminAuth;
