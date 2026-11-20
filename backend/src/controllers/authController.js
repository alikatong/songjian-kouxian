const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { setSessionCookie, clearSessionCookie } = require('../security/sessionCookie');

/** 生成 JWT */
function signToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, sessionVersion: Number(user.session_version || 0) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function respondWithSession(res, status, user) {
  setSessionCookie(res, signToken(user));
  return res.status(status).json({ user: { id: user.id, username: user.username } });
}

/** POST /api/auth/register */
const registerValidation = [
  body('username').trim().isLength({ min: 2, max: 20 }).withMessage('用户名 2-20 个字符'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('密码需要 8-128 个字符'),
];

async function register(req, res, next) {
  try {
    // 校验输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    // 检查用户名是否已存在
    const exists = await query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: '用户名已被使用' });
    }

    // 加密密码并写入数据库
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, created_at, session_version`,
      [username, passwordHash]
    );

    const user = result.rows[0];
    return respondWithSession(res, 201, user);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: '用户名已被使用' });
    }
    next(err);
  }
}

/** POST /api/auth/login */
const loginValidation = [
  body('username').trim().notEmpty().withMessage('请输入用户名'),
  body('password').notEmpty().withMessage('请输入密码'),
];

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    // 查询用户
    const result = await query(
      `SELECT id, username, password_hash, status, ban_reason, banned_until, session_version
       FROM users WHERE username = $1`,
      [username]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const stillBanned = user.status === 'banned'
      && (!user.banned_until || new Date(user.banned_until) > new Date());
    if (stillBanned) {
      return res.status(403).json({
        error: '账号已被封禁',
        reason: user.ban_reason,
        bannedUntil: user.banned_until,
      });
    }
    if (user.status === 'banned' && user.banned_until) {
      await query(
        `UPDATE users SET status = 'active', ban_reason = NULL, banned_until = NULL
         WHERE id = $1`,
        [user.id]
      );
      user.status = 'active';
    }

    // 验证密码
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    return respondWithSession(res, 200, user);
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/session */
function getSession(req, res) {
  return res.json({ user: req.user });
}

/** POST /api/auth/logout */
async function logout(req, res, next) {
  try {
    await query(
      'UPDATE users SET session_version = session_version + 1 WHERE id = $1',
      [req.user.userId],
    );
    clearSessionCookie(res);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register, login, logout, getSession,
  registerValidation, loginValidation,
};
