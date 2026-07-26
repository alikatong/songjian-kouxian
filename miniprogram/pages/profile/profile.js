const api = require('../../utils/api')
const session = require('../../utils/session')
const { ensureSession, showError, formatNumber } = require('../../utils/page')
const { assetUrl } = require('../../utils/assets')

const statNames = { hp: '气血', atk: '攻击', def: '防御', spd: '身法', fate_points: '奇缘' }
const relationNames = { friend: '已是道友', sent: '等待回应', received: '待你回应', none: '添加道友' }

Page({
  data: {
    mode: 'profile', socialMode: 'chat', loading: true, busy: '', character: null, user: null,
    resources: [], originBonuses: [], equipment: [], friends: [], incoming: [], outgoing: [], messages: [],
    searchResults: [], search: '', message: '', chatChannel: 'global', chatFriend: '', chatTitle: '天下传音'
  },

  onShow() {
    if (!ensureSession()) return
    const requested = getApp().globalData.profileMode
    if (requested === 'social') {
      getApp().globalData.profileMode = ''
      this.setData({ mode: 'social' }, () => this.load())
      return
    }
    this.load()
  },

  switchMode(event) {
    this.setData({ mode: event.currentTarget.dataset.mode }, () => this.load())
  },

  switchSocialMode(event) {
    this.setData({ socialMode: event.currentTarget.dataset.mode }, () => this.loadSocial())
  },

  onInput(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value })
  },

  async load() {
    this.setData({ loading: true, user: session.getUser() })
    try {
      if (this.data.mode === 'profile') await this.loadProfile()
      else await this.loadSocial()
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadProfile() {
    const state = await api.game.state()
    const source = state.character || {}
    const character = {
      ...source,
      origin: source.origin || { name: '身世未载', description: '命数尚未录入。', bonuses: {} },
      stats: source.stats || { hp: 0, hp_max: 0, atk: 0, def: 0, spd: 0 },
      stamina: source.stamina || { current: 0, max: 0 },
      active_technique: source.active_technique || { name: '未修功法', description: '前往功法谱选择主修功法。' },
      equipped_weapons: source.equipped_weapons || {},
      portrait: assetUrl(source.portrait_url),
      portraitFallback: assetUrl(source.portrait_fallback_url)
    }
    const equipment = [
      { slot: '武器位', item: character.equipped_weapons?.attack },
      { slot: '护器位', item: character.equipped_weapons?.defense }
    ].map((entry) => ({
      ...entry,
      image: entry.item ? assetUrl(entry.item.image_url) : ''
    }))
    this.setData({
      character,
      resources: [
        { label: '灵石', value: formatNumber(character.spirit_stones) },
        { label: '精力', value: `${character.stamina.current}/${character.stamina.max}` },
        { label: '奇缘', value: character.fate_points || 0 },
        { label: '战力', value: state.combat_power || 0 }
      ],
      originBonuses: Object.entries(character.origin?.bonuses || {}).map(([key, value]) => ({ label: statNames[key] || key, value })),
      equipment
    })
  },

  async loadSocial() {
    this.setData({ loading: true })
    try {
      const [friends, incoming, outgoing, messages] = await Promise.all([
        api.social.friends(),
        api.social.requests('incoming'),
        api.social.requests('outgoing'),
        api.social.messages(this.data.chatChannel, this.data.chatFriend)
      ])
      this.setData({
        friends: (friends.items || []).map((item) => ({ ...item, portrait: assetUrl(item.portrait_url) })),
        incoming: incoming.items || [],
        outgoing: outgoing.items || [],
        messages: messages.items || []
      })
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ loading: false })
    }
  },

  chooseChannel(event) {
    const username = event.currentTarget.dataset.username || ''
    const label = event.currentTarget.dataset.label || '天下传音'
    this.setData({ mode: 'social', socialMode: 'chat', chatChannel: username ? 'direct' : 'global', chatFriend: username, chatTitle: label }, () => this.loadSocial())
  },

  async searchPlayers() {
    if (!this.data.search.trim()) return
    this.setData({ busy: 'search' })
    try {
      const result = await api.social.search(this.data.search.trim())
      this.setData({ searchResults: (result.items || []).map((item) => ({ ...item, relationName: relationNames[item.relation] || '添加道友' })) })
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ busy: '' })
    }
  },

  async requestFriend(event) {
    const username = event.currentTarget.dataset.username
    this.setData({ busy: `friend-${username}` })
    try {
      const result = await api.social.requestFriend(username)
      wx.showToast({ title: result.message, icon: 'none' })
      this.setData({ searchResults: [] })
      await this.loadSocial()
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ busy: '' })
    }
  },

  async respond(event) {
    const id = Number(event.currentTarget.dataset.id)
    this.setData({ busy: `request-${id}` })
    try {
      const result = await api.social.respond(id, event.currentTarget.dataset.action)
      wx.showToast({ title: result.message, icon: 'none' })
      await this.loadSocial()
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ busy: '' })
    }
  },

  async sendMessage() {
    const body = this.data.message.trim()
    if (!body) return
    this.setData({ busy: 'send' })
    try {
      await api.social.send(body, this.data.chatChannel, this.data.chatFriend)
      this.setData({ message: '' })
      await this.loadSocial()
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ busy: '' })
    }
  },

  onPortraitError() {
    const character = this.data.character
    if (!character) return
    const fallback = character.portraitFallback
    if (fallback && fallback !== character.portrait) {
      this.setData({ 'character.portrait': fallback, 'character.portraitFallback': '' })
      return
    }
    this.setData({ 'character.portrait': '', 'character.portraitFallback': '' })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确认清除当前登录状态？',
      success(result) {
        if (result.confirm) {
          session.clearSession()
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})
