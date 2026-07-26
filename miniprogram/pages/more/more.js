const api = require('../../utils/api')
const { ensureSession, showError, formatNumber } = require('../../utils/page')

Page({
  data: {
    loading: true,
    character: null,
    resources: [],
    announcements: [],
    features: [
      { id: 'craft', glyph: '丹', title: '丹谱', copy: '查看丹方、材料与炼制队列' },
      { id: 'techniques', glyph: '诀', title: '功法', copy: '查阅功法并选择当前主修' },
      { id: 'equipment', glyph: '器', title: '装备', copy: '装备、保护与分解随身器物' },
      { id: 'social', glyph: '友', title: '道友', copy: '天下传音、私聊与好友申请' },
      { id: 'market', glyph: '市', title: '坊市', copy: '山门商店与玩家寄售' },
      { id: 'mail', glyph: '信', title: '信箱', copy: '领取交易货物与灵石附件' }
    ]
  },

  onShow() {
    if (ensureSession()) this.load()
  },

  async load() {
    this.setData({ loading: true })
    try {
      const [state, notices] = await Promise.all([api.game.state(), api.game.announcements({ page: 1 })])
      const character = state.character
      this.setData({
        character,
        resources: [
          { label: '境界', value: character.realm },
          { label: '灵石', value: formatNumber(character.spirit_stones) },
          { label: '精力', value: `${character.stamina.current}/${character.stamina.max}` },
          { label: '奇缘', value: character.fate_points || 0 }
        ],
        announcements: notices.items || []
      })
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ loading: false })
    }
  },

  openFeature(event) {
    const id = event.currentTarget.dataset.id
    if (['craft', 'techniques', 'equipment'].includes(id)) {
      getApp().globalData.inventoryMode = id
      wx.switchTab({ url: '/pages/inventory/inventory' })
      return
    }
    if (id === 'social') {
      getApp().globalData.profileMode = 'social'
      wx.switchTab({ url: '/pages/profile/profile' })
      return
    }
    wx.navigateTo({ url: `/pages/market/market?mode=${id === 'mail' ? 'mail' : 'shop'}` })
  }
})
