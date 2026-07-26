const TOKEN_KEY = 'songjian_token'
const USER_KEY = 'songjian_user'

function hasToken() { return Boolean(wx.getStorageSync(TOKEN_KEY)) }
function getToken() { return wx.getStorageSync(TOKEN_KEY) || '' }
function getUser() { return wx.getStorageSync(USER_KEY) || null }
function setSession(token, user) {
  wx.setStorageSync(TOKEN_KEY, token)
  wx.setStorageSync(USER_KEY, user)
}
function clearSession() {
  wx.removeStorageSync(TOKEN_KEY)
  wx.removeStorageSync(USER_KEY)
}

module.exports = { hasToken, getToken, getUser, setSession, clearSession }

