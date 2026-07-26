const api = require('../../utils/api')
const { ensureSession, showError } = require('../../utils/page')
const { assetUrl } = require('../../utils/assets')

const rarityNames = { common: '凡品', uncommon: '良品', rare: '上品', epic: '珍品', legendary: '绝品' }
const typeNames = { material: '炼材', pill: '丹药', breakthrough: '破境丹食', buff: '修炼辅物', breakthrough_protection: '护脉丹', major_breakthrough: '大境破境丹', explore: '游历用物', collectible: '收藏' }
const weaponTypeNames = { sword: '剑', saber: '刀', spear: '枪', staff: '杖', bow: '弓', fan: '扇', armor: '甲', robe: '法袍', crown: '灵冠', boots: '云履', shield: '法盾', weapon: '武器' }
const categoryNames = { item: '物品', equipment: '器物', technique: '功法', recipe: '丹方', material: '炼材' }
const modeTitles = {
  items: ['随身之物', '乾坤行囊'], equipment: ['百炼成器', '器物装备'], techniques: ['术法真传', '功法谱'],
  craft: ['炉火丹心', '丹方炼制'], forge: ['锻金淬火', '炼器炉']
}

Page({
  data: {
    mode: 'items', loading: true, busy: '', items: [], queue: [], equipmentQueue: [],
    page: 1, totalPages: 1, total: 0, query: '', title: modeTitles.items[1], kicker: modeTitles.items[0]
  },

  onShow() {
    if (!ensureSession()) return
    const requested = getApp().globalData.inventoryMode
    if (requested && modeTitles[requested]) {
      getApp().globalData.inventoryMode = ''
      this.setData({ mode: requested, page: 1, query: '', title: modeTitles[requested][1], kicker: modeTitles[requested][0] }, () => this.load())
      return
    }
    this.load()
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode
    this.setData({ mode, page: 1, query: '', title: modeTitles[mode][1], kicker: modeTitles[mode][0] }, () => this.load())
  },

  onQuery(event) {
    this.setData({ query: event.detail.value })
  },

  search() {
    this.setData({ page: 1 }, () => this.load())
  },

  async load() {
    this.setData({ loading: true })
    try {
      const params = { page: this.data.page, ...(this.data.query.trim() ? { q: this.data.query.trim() } : {}) }
      let result
      if (this.data.mode === 'items') result = await api.game.inventory(params)
      if (this.data.mode === 'equipment') result = await api.game.equipment({ ...params, category: 'owned' })
      if (this.data.mode === 'techniques') result = await api.game.techniques(params)
      if (this.data.mode === 'craft') result = await api.game.recipes(params)
      if (this.data.mode === 'forge') result = await api.game.equipment(params)
      const needsState = ['craft', 'forge'].includes(this.data.mode)
      const state = needsState ? await api.game.state() : null
      const items = (result.items || []).map((item) => this.mapItem(item, state))
      this.setData({
        items,
        total: result.total || 0,
        totalPages: result.totalPages || 1,
        queue: state ? (state.queue || []).map((item) => ({ ...item, readyText: item.ready ? '丹成可取' : '炼制中' })) : [],
        equipmentQueue: state ? (state.equipment_queue || []).map((item) => ({ ...item, readyText: item.ready ? '器成可取' : '锻造中' })) : []
      })
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ loading: false })
    }
  },

  mapItem(item, state) {
    const ingredients = (item.ingredients || []).map((material) => `${material.name} ${material.owned}/${material.quantity}`)
    const hasMaterials = (item.ingredients || []).every((material) => Number(material.owned) >= Number(material.quantity))
    let canAct = true
    let actionLabel = ''
    if (this.data.mode === 'items') actionLabel = ['pill', 'buff', 'explore'].includes(item.type) ? (item.used_once ? '已经生效' : '使用') : ''
    if (this.data.mode === 'equipment') {
      actionLabel = item.equipped ? '卸下' : item.can_equip ? '装备' : `需${item.major_realm}`
      canAct = item.quantity > 0 && (item.equipped || item.can_equip)
    }
    if (this.data.mode === 'techniques') {
      actionLabel = item.active ? '当前主修' : item.owned ? '设为主修' : '功法谱未收录'
      canAct = item.owned && !item.active
    }
    if (this.data.mode === 'craft') {
      actionLabel = item.unlocked ? '炼制' : '丹方未收录'
      canAct = item.unlocked && hasMaterials && (state?.queue?.length || 0) < 3
    }
    if (this.data.mode === 'forge') {
      actionLabel = item.recipe_unlocked ? '炼器' : '器谱未收录'
      canAct = item.recipe_unlocked && hasMaterials && (state?.equipment_queue?.length || 0) < 3
    }
    return {
      ...item,
      image: assetUrl(item.image_url),
      rarityName: rarityNames[item.rarity] || '未知品级',
      typeName: typeNames[item.type] || weaponTypeNames[item.weapon_type] || categoryNames[item.category] || '其他',
      ingredientsText: ingredients.join(' · '),
      statsText: item.attack_bonus != null ? `攻击 +${item.attack_bonus} · 防御 +${item.defense_bonus} · 气血 +${item.hp_bonus} · 身法 +${item.speed_bonus}` : '',
      actionLabel,
      canAct,
      canRecycle: Number(item.quantity) > 0 && !item.locked && !item.equipped
    }
  },

  async act(event) {
    const item = this.data.items[event.currentTarget.dataset.index]
    const action = event.currentTarget.dataset.action || 'primary'
    const key = `${action}-${item.code}`
    this.setData({ busy: key })
    try {
      let result
      if (action === 'protect') {
        result = this.data.mode === 'equipment'
          ? await api.game.protectEquipment(item.code, !item.locked)
          : await api.game.protectItem(item.code, !item.locked)
      } else if (action === 'recycle') {
        const confirmed = await new Promise((resolve) => wx.showModal({ title: `分解 ${item.name}`, content: '分解后不可恢复，确定继续？', success: (modal) => resolve(modal.confirm) }))
        if (!confirmed) return
        result = this.data.mode === 'equipment'
          ? await api.game.recycleEquipment(item.code, 1)
          : await api.game.recycleItem(item.code, 1)
      } else if (this.data.mode === 'items') {
        result = await api.game.useItem(item.code)
      } else if (this.data.mode === 'equipment') {
        result = item.equipped ? await api.game.unequip(item.equipped_slot || item.combat_role) : await api.game.equip(item.code)
      } else if (this.data.mode === 'techniques') {
        result = await api.game.equipTechnique(item.code)
      } else if (this.data.mode === 'forge') {
        result = await api.game.forge(item.code)
      } else {
        result = await api.game.craft(item.code)
      }
      wx.showToast({ title: result.message || '操作完成', icon: 'none' })
      await this.load()
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ busy: '' })
    }
  },

  async collect(event) {
    const kind = event.currentTarget.dataset.kind
    const id = Number(event.currentTarget.dataset.id)
    this.setData({ busy: `${kind}-${id}` })
    try {
      const result = kind === 'craft' ? await api.game.collectCraft(id) : await api.game.collectForge(id)
      wx.showToast({ title: result.message, icon: 'none' })
      await this.load()
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ busy: '' })
    }
  },

  previous() {
    if (this.data.page > 1) this.setData({ page: this.data.page - 1 }, () => this.load())
  },

  next() {
    if (this.data.page < this.data.totalPages) this.setData({ page: this.data.page + 1 }, () => this.load())
  }
})
