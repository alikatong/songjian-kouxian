const api = require('../../utils/api')
const { ensureSession, showError, formatNumber } = require('../../utils/page')
const { assetUrl } = require('../../utils/assets')

const rarityNames = { common: '凡品', uncommon: '良品', rare: '上品', epic: '珍品', legendary: '绝品' }

Page({
  data: {
    loading: true,
    busy: false,
    state: null,
    character: null,
    qiPercent: 0,
    qiText: '0',
    requiredText: '0',
    chanceText: '0%',
    meditationArt: '',
    resources: [],
    breakthroughSummary: '', activeTechniqueRarity: '',
    equipment: [], legendaryAttack: null, legendaryDefense: null
  },

  onShow() {
    if (ensureSession()) this.load()
  },

  async load() {
    this.setData({ loading: true })
    try {
      const state = await api.game.state()
      const character = state.character
      const qiPercent = character.qi_required > 0
        ? Math.min(100, Number((character.current_qi / character.qi_required * 100).toFixed(1))) : 100
      const boost = (state.breakthrough_items || []).find((item) => item.type === 'breakthrough')
      const protection = (state.breakthrough_items || []).find((item) => item.type === 'breakthrough_protection')
      const major = (state.breakthrough_items || []).find((item) => item.type === 'major_breakthrough')
      const bonus = Number(boost?.effect?.breakthrough_rate || 0) + Number(major?.effect?.breakthrough_rate || 0)
      const chance = Math.min(.95, Number(character.breakthrough?.current_chance || 0) + bonus)
      const equipment = [
        { slot: '武器位', empty: '尚未装备武器', item: character.equipped_weapons?.attack },
        { slot: '护器位', empty: '尚未装备护器', item: character.equipped_weapons?.defense }
      ].map((entry) => ({
        ...entry,
        image: entry.item ? assetUrl(entry.item.image_url) : ''
      }))
      const attack = equipment[0]
      const defense = equipment[1]
      this.setData({
        state,
        character,
        qiPercent,
        qiText: formatNumber(character.current_qi),
        requiredText: formatNumber(character.qi_required),
        chanceText: `${Math.round(chance * 100)}%`,
        activeTechniqueRarity: character.active_technique ? rarityNames[character.active_technique.rarity] || '未知品级' : '',
        meditationArt: `/assets/cultivation/meditation_${character.gender === 'female' ? 'female' : 'male'}.webp`,
        resources: [
          { label: '灵气', value: formatNumber(character.current_qi) },
          { label: '修炼', value: character.retreat?.active ? '已暂停' : `+${formatNumber(character.qi_per_second)}/秒` },
          { label: '灵石', value: formatNumber(character.spirit_stones) },
          { label: '精力', value: `${character.stamina.current}/${character.stamina.max}` },
          { label: '奇缘', value: character.fate_points || 0 }
        ],
        breakthroughSummary: `${boost ? `${boost.name} ×${boost.quantity}` : '无增幅丹'} · ${protection ? `${protection.name} ×${protection.quantity}` : '无护脉丹'}${character.breakthrough?.is_major ? ` · ${major ? `${major.name} ×${major.quantity}` : '缺少大境破境丹'}` : ''}`,
        equipment: equipment.map((entry) => ({
          ...entry,
          rarityName: entry.item ? rarityNames[entry.item.rarity] || '未知' : '',
          bonusText: entry.item ? `攻击 +${entry.item.bonuses.atk} · 防御 +${entry.item.bonuses.def} · 气血 +${entry.item.bonuses.hp} · 身法 +${entry.item.bonuses.spd}` : ''
        })),
        legendaryAttack: attack.item && attack.item.rarity === 'legendary' && attack.image ? attack : null,
        legendaryDefense: defense.item && defense.item.rarity === 'legendary' && defense.image ? defense : null
      })
      getApp().globalData.gameState = state
    } catch (error) {
      if (error.statusCode === 404 && error.data && error.data.code === 'NO_CHARACTER') {
        wx.navigateTo({ url: '/pages/character/character' })
      } else showError(error)
    } finally {
      this.setData({ loading: false })
    }
  },

  async toggleRetreat() {
    this.setData({ busy: true })
    try {
      const result = this.data.character.retreat.active ? await api.game.retreatEnd() : await api.game.retreatStart()
      wx.showToast({ title: result.message, icon: 'none' })
      await this.load()
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ busy: false })
    }
  },

  async breakthrough() {
    const character = this.data.character
    const items = this.data.state.breakthrough_items || []
    const payload = {}
    const boost = items.find((item) => item.type === 'breakthrough')
    const protection = items.find((item) => item.type === 'breakthrough_protection')
    const major = items.find((item) => item.type === 'major_breakthrough')
    if (boost) payload.boost_item_code = boost.code
    if (protection) payload.protection_item_code = protection.code
    if (major) payload.major_pill_code = major.code
    if (character.breakthrough.is_major && !major) return showError(new Error('缺少当前境界专属破境丹'))
    const confirmed = await new Promise((resolve) => wx.showModal({
      title: '尝试突破',
      content: `当前成功率 ${this.data.chanceText}。${this.data.breakthroughSummary}`,
      success: (result) => resolve(result.confirm)
    }))
    if (!confirmed) return
    this.setData({ busy: true })
    try {
      const result = await api.character.breakthrough(payload)
      wx.showModal({ title: result.success ? '突破成功' : '突破失败', content: result.message || '境界有所变化', showCancel: false })
      await this.load()
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ busy: false })
    }
  }
})
