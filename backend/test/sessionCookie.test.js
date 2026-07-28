const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SESSION_COOKIE,
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} = require('../src/security/sessionCookie');

test('web session cookie is HttpOnly, SameSite and secure in production', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousMaxAge = process.env.AUTH_COOKIE_MAX_AGE_MS;
  process.env.NODE_ENV = 'production';
  process.env.AUTH_COOKIE_MAX_AGE_MS = '3600000';
  let written;
  let cleared;
  const res = {
    cookie(...args) { written = args; },
    clearCookie(...args) { cleared = args; },
  };
  try {
    setSessionCookie(res, 'test-token');
    clearSessionCookie(res);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousMaxAge === undefined) delete process.env.AUTH_COOKIE_MAX_AGE_MS;
    else process.env.AUTH_COOKIE_MAX_AGE_MS = previousMaxAge;
  }
  assert.equal(written[0], SESSION_COOKIE);
  assert.equal(written[1], 'test-token');
  assert.deepEqual(written[2], {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 3600000,
  });
  assert.deepEqual(cleared, [SESSION_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  }]);
});

test('session cookie parser only returns a valid named cookie', () => {
  assert.equal(readSessionCookie({ headers: { cookie: 'other=value; xxgame_session=valid%2Dtoken' } }), 'valid-token');
  assert.equal(readSessionCookie({ headers: { cookie: 'xxgame_session=%E0%A4%A' } }), null);
  assert.equal(readSessionCookie({ headers: { cookie: 'not_xxgame_session=token' } }), null);
});
