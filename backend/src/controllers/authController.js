const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/db');
const wechatService = require('../services/wechatService');

/** 生成 JWT */
function signToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, sessionVersion: Number(user.session_version || 0) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
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

    const user  = result.rows[0];
    const token = signToken(user);

    res.status(201).json({ token, user: { id: user.id, username: user.username } });
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

    const token = signToken(user);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    next(err);
  }
}

const wechatPhoneValidation = [
  body('phone_code').isString().isLength({ min: 1, max: 128 }).withMessage('微信手机号凭证无效'),
];

async function wechatPhoneLogin(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  try {
    const { phone } = await wechatService.exchangePhoneCode(req.body.phone_code);
    const result = await withTransaction(async (client) => {
      const identities = await client.query(
        `SELECT id, username, phone, status, ban_reason, banned_until, session_version
         FROM users WHERE phone = $1 FOR UPDATE`,
        [phone],
      );

      let user = identities.rows[0];
      let created = false;
      if (!user) {
        const username = `wx_${crypto.createHash('sha256').update(phone).digest('hex').slice(0, 12)}`;
        const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
        user = (await client.query(
          `INSERT INTO users (username, password_hash, phone, last_login_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id, username, phone, status, ban_reason, banned_until, session_version`,
          [username, passwordHash, phone],
        )).rows[0];
        created = true;
      } else {
        const stillBanned = user.status === 'banned'
          && (!user.banned_until || new Date(user.banned_until) > new Date());
        if (stillBanned) {
          const error = new Error('账号已被封禁');
          error.status = 403;
          error.reason = user.ban_reason;
          error.bannedUntil = user.banned_until;
          throw error;
        }
        user = (await client.query(
          `UPDATE users SET last_login_at = NOW(),
             status = CASE WHEN status = 'banned' THEN 'active' ELSE status END,
             ban_reason = CASE WHEN status = 'banned' THEN NULL ELSE ban_reason END,
             banned_until = CASE WHEN status = 'banned' THEN NULL ELSE banned_until END
           WHERE id = $1
           RETURNING id, username, phone, status, session_version`,
          [user.id],
        )).rows[0];
      }

      return { user, created };
    });
    const token = signToken(result.user);
    return res.status(result.created ? 201 : 200).json({
      token,
      created: result.created,
      user: { id: result.user.id, username: result.user.username, phone: result.user.phone },
    });
  } catch (error) {
    if (error.code === '23505') {
      error.status = 409;
      error.message = '微信账号绑定发生冲突，请重试';
    }
    return next(error);
  }
}

module.exports = {
  register, login, wechatPhoneLogin,
  registerValidation, loginValidation, wechatPhoneValidation,
};
