const session = require('./session')

function ensureSession() {
  if (session.hasToken()) return true
  wx.reLaunch({ url: '/pages/login/login' })
  return false
}

function showError(error) {
  wx.showToast({ title: error.message || '操作失败', icon: 'none', duration: 2500 })
}

function formatNumber(value) {
  const number = Number(value) || 0
  if (number >= 100000000) return `${(number / 100000000).toFixed(2)}亿`
  if (number >= 10000) return `${(number / 10000).toFixed(1)}万`
  return String(Math.floor(number))
}

module.exports = { ensureSession, showError, formatNumber }

