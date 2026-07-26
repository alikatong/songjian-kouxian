const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../src/services/wechatService');

function response(payload, ok = true) {
  return { ok, json: async () => payload };
}

test('wechat service exchanges login and phone codes without exposing credentials', async () => {
  const originalFetch = global.fetch;
  const originalAppId = process.env.WECHAT_APP_ID;
  const originalSecret = process.env.WECHAT_APP_SECRET;
  const calls = [];
  process.env.WECHAT_APP_ID = 'wx-test-app';
  process.env.WECHAT_APP_SECRET = 'server-only-secret';
  service.clearAccessTokenCache();
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/sns/jscode2session')) return response({ openid: 'openid-1' });
    if (String(url).includes('/cgi-bin/token')) return response({ access_token: 'access-1', expires_in: 7200 });
    return response({ phone_info: { purePhoneNumber: '13800138000', countryCode: '86' } });
  };
  try {
    assert.deepEqual(await service.exchangeLoginCode('login-code'), { openid: 'openid-1', unionid: null });
    assert.deepEqual(await service.exchangePhoneCode('phone-code'), { phone: '13800138000', countryCode: '86' });
  } finally {
    global.fetch = originalFetch;
    process.env.WECHAT_APP_ID = originalAppId;
    process.env.WECHAT_APP_SECRET = originalSecret;
    service.clearAccessTokenCache();
  }
  assert.equal(calls.length, 3);
  assert.match(calls[0].url, /appid=wx-test-app/);
  assert.match(calls[0].url, /js_code=login-code/);
  assert.deepEqual(JSON.parse(calls[2].options.body), { code: 'phone-code' });
});

test('wechat service reports missing server credentials as a service error', async () => {
  const originalAppId = process.env.WECHAT_APP_ID;
  const originalSecret = process.env.WECHAT_APP_SECRET;
  delete process.env.WECHAT_APP_ID;
  delete process.env.WECHAT_APP_SECRET;
  try {
    await assert.rejects(service.exchangeLoginCode('code'), (error) => {
      assert.equal(error.status, 503);
      assert.equal(error.code, 'WECHAT_NOT_CONFIGURED');
      return true;
    });
  } finally {
    process.env.WECHAT_APP_ID = originalAppId;
    process.env.WECHAT_APP_SECRET = originalSecret;
  }
});

