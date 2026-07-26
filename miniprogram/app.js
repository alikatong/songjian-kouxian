const { hasToken } = require('./utils/session')

App({
  onLaunch() {
    if (!hasToken()) {
      wx.reLaunch({ url: '/pages/login/login' })
    }
  },
  globalData: {
    gameState: null,
    inventoryMode: '',
    profileMode: ''
  }
})
