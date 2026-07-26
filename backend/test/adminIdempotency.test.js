const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');

function loadService(client) {
  const servicePath = require.resolve('../src/services/adminService');
  const originalPool = db.pool;
  db.pool = { connect: async () => client };
  delete require.cache[servicePath];
  const service = require(servicePath);
  return {
    service,
    restore() {
      db.pool = originalPool;
      delete require.cache[servicePath];
    },
  };
}

function request() {
  return {
    admin: { id: 1, username: 'owner', role: 'owner' },
    headers: { 'idempotency-key': 'd9428888-122b-4f35-9c3a-5ec6d7f20291' },
    method: 'POST',
    originalUrl: '/api/admin/test',
    body: { value: 1 },
    requestId: '11111111-1111-4111-8111-111111111111',
    ip: '127.0.0.1',
  };
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('admin mutation claims the idempotency key atomically before doing work', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql.includes('INSERT INTO admin_idempotency_keys')) return { rowCount: 1, rows: [{ id: 9 }] };
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  const loaded = loadService(client);
  let workCalls = 0;
  try {
    await loaded.service.runAdminMutation(request(), responseRecorder(), {
      action: 'test', targetType: 'test', reason: 'test reason',
    }, async () => {
      workCalls += 1;
      return { body: { ok: true } };
    });
  } finally {
    loaded.restore();
  }
  assert.equal(workCalls, 1);
  assert.ok(calls.findIndex((sql) => sql.includes('INSERT INTO admin_idempotency_keys'))
    < calls.findIndex((sql) => sql.includes('UPDATE admin_idempotency_keys')));
  assert.equal(calls.some((sql) => sql.includes('SELECT request_hash')), false);
});

test('admin mutation replays a completed concurrent request after a conflicting claim', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql.includes('INSERT INTO admin_idempotency_keys')) return { rowCount: 0, rows: [] };
      if (sql.includes('SELECT request_hash')) {
        const crypto = require('crypto');
        const req = request();
        const hash = crypto.createHash('sha256')
          .update(JSON.stringify({ method: req.method, path: req.originalUrl, body: req.body }))
          .digest('hex');
        return { rowCount: 1, rows: [{ request_hash: hash, status: 'completed', response_status: 201, response_body: { ok: true } }] };
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  const loaded = loadService(client);
  const res = responseRecorder();
  let workCalls = 0;
  try {
    await loaded.service.runAdminMutation(request(), res, {
      action: 'test', targetType: 'test', reason: 'test reason',
    }, async () => { workCalls += 1; return { body: { ok: false } }; });
  } finally {
    loaded.restore();
  }
  assert.equal(workCalls, 0);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { ok: true, replayed: true });
  assert.ok(calls.some((sql) => sql.includes('SELECT request_hash') && sql.includes('FOR UPDATE')));
});
