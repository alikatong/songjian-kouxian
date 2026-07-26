const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * JWT 验证中间件
 * 验证成功后将 { userId, username } 挂载到 req.user
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录或 Token 缺失' });
  }

  const token = authHeader.slice(7); // 去掉 "Bearer "
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_error) {
    return res.status(401).json({ error: 'Token 无效或已过期，请重新登录' });
  }

  try {
    const result = await query(
      `SELECT id, username, status, banned_until, session_version
       FROM users WHERE id = $1`,
      [payload.userId]
    );
    const user = result.rows[0];
    if (!user || Number(user.session_version) !== Number(payload.sessionVersion || 0)) {
      return res.status(401).json({ error: '会话已失效，请重新登录' });
    }
    const stillBanned = user.status === 'banned'
      && (!user.banned_until || new Date(user.banned_until) > new Date());
    if (stillBanned) {
      return res.status(403).json({
        error: '账号已被封禁',
        bannedUntil: user.banned_until,
      });
    }
    if (user.status === 'banned' && user.banned_until) {
      await query(
        `UPDATE users SET status = 'active', ban_reason = NULL, banned_until = NULL
         WHERE id = $1`,
        [user.id]
      );
    }
    req.user = { userId: user.id, username: user.username };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = authMiddleware;
