const api = require('../../utils/api')
const { ensureSession, showError } = require('../../utils/page')
const { assetUrl } = require('../../utils/assets')

const statNames = { hp: '气血', atk: '攻击', def: '防御', spd: '身法', fate_points: '奇缘' }

Page({
  data: { name: '', gender: 'male', busy: false, created: null, bonuses: [] },
  onLoad() { ensureSession() },
  onInput(event) { this.setData({ name: event.detail.value }) },
  chooseGender(event) { this.setData({ gender: event.currentTarget.dataset.gender }) },
  async create() {
    const name = this.data.name.trim()
    if (name.length < 2) return showError(new Error('道号需要 2-12 个字符'))
    this.setData({ busy: true })
    try {
      const response = await api.character.create({ name, gender: this.data.gender })
      const created = { ...response, portrait: assetUrl(response.portrait_url) }
      this.setData({ created, bonuses: Object.entries(response.origin?.bonuses || {}).map(([key, value]) => ({ label: statNames[key] || key, value })) })
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ busy: false })
    }
  },
  enter() { wx.switchTab({ url: '/pages/cultivate/cultivate' }) }
})
