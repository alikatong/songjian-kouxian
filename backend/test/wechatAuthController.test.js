const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const wechatService = require('../src/services/wechatService');

function loadController(client) {
  const controllerPath = require.resolve('../src/controllers/authController');
  const originalTransaction = db.withTransaction;
  const originalPhoneExchange = wechatService.exchangePhoneCode;
  db.withTransaction = async (work) => work(client);
  wechatService.exchangePhoneCode = async () => ({ phone: '13800138000' });
  delete require.cache[controllerPath];
  const controller = require(controllerPath);
  return {
    controller,
    restore() {
      db.withTransaction = originalTransaction;
      wechatService.exchangePhoneCode = originalPhoneExchange;
      delete require.cache[controllerPath];
    },
  };
}

async function invoke(controller) {
  let status = 200;
  let body;
  let forwarded;
  const req = { body: { phone_code: 'phone-code' } };
  const res = {
    status(code) { status = code; return this; },
    json(payload) { body = payload; return this; },
  };
  await controller.wechatPhoneLogin(req, res, (error) => { forwarded = error; });
  return { status, body, forwarded };
}

test('wechat phone login creates an account on first authorization', async () => {
  const calls = [];
  const loaded = loadController({
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('FROM users WHERE phone')) return { rows: [] };
      if (sql.includes('INSERT INTO users')) {
        return { rows: [{ id: 9, username: params[0], phone: params[2], status: 'active', session_version: 0 }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  });
  process.env.JWT_SECRET ||= 'test-secret';
  let result;
  try { result = await invoke(loaded.controller); } finally { loaded.restore(); }
  assert.equal(result.forwarded, undefined);
  assert.equal(result.status, 201);
  assert.equal(result.body.created, true);
  assert.equal(result.body.user.phone, '13800138000');
  assert.match(result.body.user.username, /^wx_[0-9a-f]{12}$/);
  assert.ok(result.body.token);
  assert.ok(calls.some(({ sql }) => sql.includes('INSERT INTO users')));
});

test('wechat phone login reuses an existing phone account', async () => {
  const loaded = loadController({
    async query(sql) {
      if (sql.includes('FROM users WHERE phone')) {
        return { rows: [{ id: 5, username: 'existing', phone: '13800138000', status: 'active', session_version: 2 }] };
      }
      if (sql.includes('UPDATE users SET last_login_at')) {
        return { rows: [{ id: 5, username: 'existing', phone: '13800138000', status: 'active', session_version: 2 }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  });
  process.env.JWT_SECRET ||= 'test-secret';
  let result;
  try { result = await invoke(loaded.controller); } finally { loaded.restore(); }
  assert.equal(result.status, 200);
  assert.equal(result.body.created, false);
  assert.equal(result.body.user.id, 5);
});

test('wechat phone login only requires the phone dynamic token', async () => {
  const loaded = loadController({
    async query(sql) {
      if (sql.includes('FROM users WHERE phone')) {
        return { rows: [{ id: 6, username: 'phone-user', phone: '13800138000', status: 'active', session_version: 0 }] };
      }
      if (sql.includes('UPDATE users SET last_login_at')) {
        return { rows: [{ id: 6, username: 'phone-user', phone: '13800138000', status: 'active', session_version: 0 }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  });
  let result;
  try { result = await invoke(loaded.controller); } finally { loaded.restore(); }
  assert.equal(result.forwarded, undefined);
  assert.equal(result.status, 200);
  assert.equal(result.body.user.phone, '13800138000');
});
