const env = require('../config/env')
const session = require('./session')

function request(path, options) {
  const settings = options || {}
  const token = session.getToken()
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${env.API_BASE_URL}${path}`,
      method: settings.method || 'GET',
      data: settings.data,
      timeout: env.REQUEST_TIMEOUT,
      header: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data)
          return
        }
        const error = new Error((response.data && response.data.error) || `请求失败（${response.statusCode}）`)
        error.statusCode = response.statusCode
        error.data = response.data
        if (response.statusCode === 401 && !path.startsWith('/auth/')) {
          session.clearSession()
          wx.reLaunch({ url: '/pages/login/login' })
        }
        reject(error)
      },
      fail(error) {
        reject(new Error(error.errMsg || '无法连接服务器'))
      }
    })
  })
}

module.exports = request

