const api = require('../../utils/api')
const { ensureSession, showError, formatNumber } = require('../../utils/page')
const { assetUrl } = require('../../utils/assets')

const rankNames = { normal: '寻常', elite: '精英', boss: '首领' }
const forecastNames = { overwhelming: '碾压', easy: '轻松', favorable: '占优', even: '势均力敌', risky: '凶险', deadly: '九死一生', unknown: '难以判断' }

Page({
  data: {
    mode: 'map', loading: true, busy: false, state: null, areas: [], selectedArea: '',
    selected: null, event: null, encounter: null, result: null, history: [], battleHistory: [], historyMode: 'explore'
  },

  onShow() {
    if (ensureSession()) this.load()
  },

  async load() {
    this.setData({ loading: true })
    try {
      const state = await api.game.state()
      const areas = (state.areas || []).filter((area) => area.unlocked).map((area) => ({
        ...area,
        art: `/assets/areas/${area.code}.webp`,
        staminaText: `${area.stamina_cost || area.explore_stamina_cost || 6} 精力`
      }))
      const selectedArea = areas.some((area) => area.code === this.data.selectedArea)
        ? this.data.selectedArea : (areas.length ? areas[areas.length - 1].code : '')
      this.setData({
        state,
        areas,
        selectedArea,
        selected: areas.find((area) => area.code === selectedArea) || null,
        event: state.pending_event,
        encounter: state.pending_encounter ? this.mapEncounter(state.pending_encounter) : null
      })
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ loading: false })
    }
  },

  mapEncounter(encounter) {
    return {
      ...encounter,
      rankName: rankNames[encounter.rank] || encounter.rank,
      forecastName: forecastNames[encounter.forecast] || encounter.forecast || '难以判断',
      art: assetUrl(encounter.image_url),
      rewardText: `灵气 ${formatNumber(encounter.qi_reward)} · 灵石 ${formatNumber(encounter.stone_reward)}`,
      requirementText: (encounter.missing_requirements || []).join('、')
    }
  },

  selectArea(event) {
    const selectedArea = event.currentTarget.dataset.code
    this.setData({ selectedArea, selected: this.data.areas.find((area) => area.code === selectedArea) || null })
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode
    this.setData({ mode }, () => {
      if (mode === 'history') this.loadHistory()
    })
  },

  switchHistory(event) {
    this.setData({ historyMode: event.currentTarget.dataset.mode }, () => this.loadHistory())
  },

  async loadHistory() {
    this.setData({ loading: true })
    try {
      if (this.data.historyMode === 'explore') {
        const result = await api.game.explorations({ page: 1 })
        this.setData({ history: result.items || [] })
      } else {
        const result = await api.game.battles({ page: 1 })
        this.setData({ battleHistory: result.items || [] })
      }
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ loading: false })
    }
  },

  async explore() {
    if (!this.data.selectedArea) return
    await this.run(async () => {
      const result = await api.game.explore(this.data.selectedArea)
      this.setData({ event: result.event, encounter: result.encounter ? this.mapEncounter(result.encounter) : null, result: null })
      if (!result.event && !result.encounter) await this.load()
      return result.resumed ? '继续处理上次机缘' : `消耗 ${result.stamina_cost} 精力`
    })
  },

  async choose(event) {
    await this.run(async () => {
      const response = await api.game.chooseEvent(Number(event.currentTarget.dataset.index))
      const drops = (response.area_drops || []).map((item) => `${item.name} ×${item.quantity || 1}`)
      this.setData({
        result: { title: response.title || '机缘已结', message: response.result || response.message || '有所收获', rewards: drops.join('、') },
        event: null
      })
      await this.load()
      return '机缘已结算'
    })
  },

  async fight() {
    await this.run(async () => {
      const response = await api.game.fight(this.data.encounter.code)
      const loot = Array.isArray(response.loot) ? response.loot : response.loot?.items || []
      const rewards = [`灵气 ${formatNumber(response.qi_reward)}`, `灵石 ${formatNumber(response.stone_reward)}`, ...loot.map((item) => `${item.name} ×${item.quantity || 1}`)]
      this.setData({
        result: { title: response.result === 'win' ? '此战告捷' : '败退', message: response.message, rewards: rewards.join(' · ') },
        encounter: null
      })
      await this.load()
      return response.message
    })
  },

  async challengeBoss() {
    if (!this.data.selectedArea) return
    await this.run(async () => {
      const response = await api.game.challengeBoss(this.data.selectedArea)
      this.setData({ encounter: this.mapEncounter(response.pending_encounter), result: null })
    })
  },

  async avoid() {
    await this.run(async () => {
      const result = await api.game.avoid()
      this.setData({ encounter: null })
      await this.load()
      return result.message
    })
  },

  async rest() {
    await this.run(async () => {
      const result = await api.game.rest()
      await this.load()
      return result.message
    })
  },

  clearResult() {
    this.setData({ result: null })
  },

  async run(action) {
    if (this.data.busy) return
    this.setData({ busy: true })
    try {
      const message = await action()
      if (message) wx.showToast({ title: message, icon: 'none', duration: 2200 })
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ busy: false })
    }
  }
})
