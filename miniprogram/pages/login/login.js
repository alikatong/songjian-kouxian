const api = require('../../utils/api')
const session = require('../../utils/session')
const { showError } = require('../../utils/page')

Page({
  data: {
    mode: 'login',
    username: '',
    password: '',
    confirmPassword: '',
    busy: false,
    statusText: '账号登录',
    errorMessage: ''
  },

  onShow() {
    if (session.hasToken()) {
      wx.switchTab({ url: '/pages/cultivate/cultivate' })
    }
  },

  switchMode(event) {
    if (this.data.busy) return
    const mode = event.currentTarget.dataset.mode
    if (mode !== 'login' && mode !== 'register') return
    this.setData({
      mode,
      password: '',
      confirmPassword: '',
      errorMessage: '',
      statusText: mode === 'login' ? '账号登录' : '创建账号'
    })
  },

  handleUsernameInput(event) {
    this.setData({ username: event.detail.value, errorMessage: '' })
  },

  handlePasswordInput(event) {
    this.setData({ password: event.detail.value, errorMessage: '' })
  },

  handleConfirmInput(event) {
    this.setData({ confirmPassword: event.detail.value, errorMessage: '' })
  },

  validate(username, password, confirmPassword) {
    if (!username || !password) return '请输入道号和口令'
    if (this.data.mode === 'login') return ''
    if (username.length < 2) return '道号需要 2-20 个字符'
    if (password.length < 8) return '口令至少需要 8 位'
    if (password !== confirmPassword) return '两次输入的口令不一致'
    return ''
  },

  async handleSubmit(event) {
    if (this.data.busy) return
    const values = event.detail.value || {}
    const username = String(values.username || this.data.username).trim()
    const password = String(values.password || this.data.password)
    const confirmPassword = String(values.confirmPassword || this.data.confirmPassword)
    const validationError = this.validate(username, password, confirmPassword)
    if (validationError) {
      this.setData({ errorMessage: validationError })
      return
    }

    const registering = this.data.mode === 'register'
    this.setData({
      busy: true,
      errorMessage: '',
      statusText: registering ? '正在创建账号' : '正在验证身份'
    })

    try {
      const result = registering
        ? await api.auth.register({ username, password })
        : await api.auth.login({ username, password })
      session.setSession(result.token, result.user)
      this.setData({ statusText: registering ? '账号创建成功' : '登录成功' })
      wx.switchTab({ url: '/pages/cultivate/cultivate' })
    } catch (error) {
      const message = error.message || (registering ? '注册失败' : '登录失败')
      this.setData({ statusText: registering ? '注册未完成' : '登录未完成', errorMessage: message })
      showError(error)
    } finally {
      this.setData({ busy: false })
    }
  }
})
