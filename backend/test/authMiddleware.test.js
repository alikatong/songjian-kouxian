const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const db = require('../src/config/db');

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function loadMiddleware(moduleName, query, verify) {
  const modulePath = require.resolve(`../src/middleware/${moduleName}`);
  const originalQuery = db.query;
  const originalVerify = jwt.verify;
  db.query = query;
  jwt.verify = verify;
  delete require.cache[modulePath];
  const middleware = require(modulePath);
  return {
    middleware,
    restore() {
      db.query = originalQuery;
      jwt.verify = originalVerify;
      delete require.cache[modulePath];
    },
  };
}

test('player auth forwards database failures instead of reporting an invalid token', async () => {
  const databaseError = new Error('database unavailable');
  const loaded = loadMiddleware('auth', async () => { throw databaseError; }, () => ({ userId: 7 }));
  const res = responseRecorder();
  let forwarded;
  try {
    await loaded.middleware({ headers: { authorization: 'Bearer valid' } }, res, (error) => { forwarded = error; });
  } finally {
    loaded.restore();
  }
  assert.equal(forwarded, databaseError);
  assert.equal(res.statusCode, 200);
});

test('admin auth forwards database failures instead of reporting an invalid token', async () => {
  const databaseError = new Error('database unavailable');
  const loaded = loadMiddleware('adminAuth', async () => { throw databaseError; }, () => ({ adminId: 3 }));
  const res = responseRecorder();
  let forwarded;
  try {
    await loaded.middleware({ headers: { authorization: 'Bearer valid' }, requestId: 'request-1' }, res, (error) => { forwarded = error; });
  } finally {
    loaded.restore();
  }
  assert.equal(forwarded, databaseError);
  assert.equal(res.statusCode, 200);
});
