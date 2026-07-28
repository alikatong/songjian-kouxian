const express = require('express');
const path    = require('path');
const helmet  = require('helmet');
const cors    = require('cors');
const { rateLimit } = require('express-rate-limit');

const authRouter      = require('./routes/auth');
const characterRouter = require('./routes/character');
const gameRouter      = require('./routes/game');
const socialRouter    = require('./routes/social');
const marketRouter    = require('./routes/market');
const adminRouter     = require('./routes/admin');
const crypto          = require('crypto');
const { isAllowedBrowserOrigin } = require('./security/sessionCookie');

const app = express();

// ── 安全中间件 ─────────────────────────────────────────────
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || isAllowedBrowserOrigin(origin)) return callback(null, true);
    const error = new Error('不允许的跨域来源');
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
}));
app.use(express.json({ limit: '32kb' }));
app.use((req, _res, next) => {
  // Controllers treat a missing or malformed JSON object as invalid input.
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) req.body = {};
  next();
});
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// ── 健康检查（Docker healthcheck 使用）──────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/assets', express.static(path.join(__dirname, '../public/assets'), {
  maxAge: process.env.NODE_ENV === 'production' ? '30d' : 0,
  immutable: process.env.NODE_ENV === 'production',
  setHeaders(res) {
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  },
}));

// ── 业务路由 ──────────────────────────────────────────────
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
}), authRouter);
app.use('/api/character', characterRouter);
app.use('/api/game',      gameRouter);
app.use('/api/social',    socialRouter);
app.use('/api/market',    marketRouter);
app.use('/api/admin',     adminRouter);

// ── 全局错误处理 ──────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599
    ? err.status
    : 500;
  if (status >= 500) console.error(err);
  const payload = {
    error: isProd && status >= 500 ? '服务器内部错误' : err.message,
  };
  if (err.code === 'NO_CHARACTER') payload.code = err.code;
  res.status(status).json(payload);
});

module.exports = app;
