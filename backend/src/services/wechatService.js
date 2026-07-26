let accessTokenCache = null;

function credentials() {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  if (!appId || !appSecret) {
    const error = new Error('微信登录尚未配置');
    error.status = 503;
    error.code = 'WECHAT_NOT_CONFIGURED';
    throw error;
  }
  return { appId, appSecret };
}

async function readWechatResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errcode) {
    const error = new Error(payload.errmsg || fallbackMessage);
    error.status = 502;
    error.code = 'WECHAT_API_ERROR';
    error.wechatCode = payload.errcode;
    throw error;
  }
  return payload;
}

async function exchangeLoginCode(loginCode) {
  const { appId, appSecret } = credentials();
  const query = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    js_code: loginCode,
    grant_type: 'authorization_code',
  });
  const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${query}`);
  const payload = await readWechatResponse(response, '微信登录凭证校验失败');
  if (!payload.openid) {
    const error = new Error('微信登录未返回用户标识');
    error.status = 502;
    error.code = 'WECHAT_OPENID_MISSING';
    throw error;
  }
  return { openid: payload.openid, unionid: payload.unionid || null };
}

async function getAccessToken() {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) return accessTokenCache.value;
  const { appId, appSecret } = credentials();
  const query = new URLSearchParams({
    grant_type: 'client_credential', appid: appId, secret: appSecret,
  });
  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/token?${query}`);
  const payload = await readWechatResponse(response, '微信接口令牌获取失败');
  if (!payload.access_token) {
    const error = new Error('微信接口未返回访问令牌');
    error.status = 502;
    error.code = 'WECHAT_ACCESS_TOKEN_MISSING';
    throw error;
  }
  accessTokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(60, Number(payload.expires_in || 7200) - 300) * 1000,
  };
  return accessTokenCache.value;
}

async function exchangePhoneCode(phoneCode) {
  const accessToken = await getAccessToken();
  const response = await fetch(
    `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: phoneCode }),
    },
  );
  const payload = await readWechatResponse(response, '微信手机号授权校验失败');
  const phone = payload.phone_info?.purePhoneNumber || payload.phone_info?.phoneNumber;
  if (!phone || !/^\d{6,20}$/.test(phone)) {
    const error = new Error('微信未返回有效手机号');
    error.status = 502;
    error.code = 'WECHAT_PHONE_MISSING';
    throw error;
  }
  return { phone, countryCode: payload.phone_info.countryCode || null };
}

function clearAccessTokenCache() {
  accessTokenCache = null;
}

module.exports = { exchangeLoginCode, exchangePhoneCode, clearAccessTokenCache };

