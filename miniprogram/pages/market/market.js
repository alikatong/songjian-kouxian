const api = require('../../utils/api')
const { ensureSession, showError, formatNumber } = require('../../utils/page')
const { assetUrl } = require('../../utils/assets')

const rarityNames = { common: '凡品', uncommon: '良品', rare: '上品', epic: '珍品', legendary: '绝品' }
const modeTitles = { shop: '山门商店', auction: '玩家寄售', sell: '寄售上架', mail: '传书信箱' }

Page({
  data: {
    mode: 'shop', loading: true, busy: '', balance: '0', balanceRaw: 0, items: [], sellable: [],
    assetIndex: 0, quantity: 1, unitPrice: 10, page: 1, totalPages: 1, total: 0, title: modeTitles.shop
  },

  onLoad(options) {
    const mode = options && ['shop', 'auction', 'sell', 'mail'].includes(options.mode) ? options.mode : 'shop'
    this.setData({ mode, title: modeTitles[mode] })
  },

  onShow() {
    if (ensureSession()) this.load()
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode
    this.setData({ mode, title: modeTitles[mode], page: 1, items: [] }, () => this.load())
  },

  async load() {
    this.setData({ loading: true })
    try {
      const [state, result] = await Promise.all([
        api.market.state(),
        this.loadMode()
      ])
      const balanceRaw = Number(state.spirit_stones || 0)
      const items = (result.items || []).map((item) => this.mapItem(item, balanceRaw))
      this.setData({
        balance: formatNumber(balanceRaw),
        balanceRaw,
        items,
        sellable: this.data.mode === 'sell' ? items : this.data.sellable,
        total: result.total || 0,
        totalPages: result.totalPages || 1
      })
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ loading: false })
    }
  },

  loadMode() {
    if (this.data.mode === 'shop') return api.market.shop(this.data.page)
    if (this.data.mode === 'auction') return api.market.listings(this.data.page)
    if (this.data.mode === 'sell') return api.market.sellable(this.data.page)
    return api.market.mail(this.data.page)
  },

  mapItem(item, balance) {
    const name = item.name || item.item_name || item.equipment_name || item.title
    const rarity = item.rarity || item.item_rarity || item.equipment_rarity || 'common'
    const totalPrice = item.price != null ? Number(item.price) : Number(item.unit_price || 0) * Number(item.quantity || 1)
    const assetName = item.item_name || item.equipment_name || ''
    return {
      ...item,
      displayName: name,
      image: assetUrl(item.image_url || item.item_image_url || item.equipment_image_url),
      rarity,
      rarityName: rarityNames[rarity] || '未知品级',
      displayPrice: formatNumber(totalPrice),
      canBuy: balance >= totalPrice,
      attachment: [assetName ? `${assetName} ×${item.quantity || 1}` : '', Number(item.spirit_stones || 0) > 0 ? `${formatNumber(item.spirit_stones)} 灵石` : ''].filter(Boolean).join(' · ')
    }
  },

  onAsset(event) {
    this.setData({ assetIndex: Number(event.detail.value), quantity: 1 })
  },

  onNumber(event) {
    this.setData({ [event.currentTarget.dataset.field]: Math.max(1, Number(event.detail.value) || 1) })
  },

  async action(event) {
    const item = this.data.items[event.currentTarget.dataset.index]
    const action = event.currentTarget.dataset.action
    this.setData({ busy: `${action}-${item.id || item.code}` })
    try {
      let result
      if (action === 'buy-shop') result = await api.market.buyShop(item.code)
      if (action === 'buy-auction') result = item.is_own ? await api.market.cancelListing(item.id) : await api.market.buyListing(item.id)
      if (action === 'claim') result = await api.market.claimMail(item.id)
      wx.showToast({ title: result.message || '操作完成', icon: 'none' })
      await this.load()
    } catch (error) {
      showError(error)
    } finally {
      this.setData({ busy: '' })
    }
  },

  async listAsset() {
    const asset = this.data.sellable[this.data.assetIndex]
    if (!asset) return showError(new Error('没有可上架的物品'))
    if (this.data.quantity > Number(asset.quantity)) return showError(new Error('上架数量超过持有数量'))
    this.setData({ busy: 'list' })
    try {
      const result = await api.market.list(asset.asset_type, asset.code, this.data.quantity, this.data.unitPrice)
      wx.showToast({ title: result.message, icon: 'none' })
      this.setData({ mode: 'auction', title: modeTitles.auction, page: 1 })
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
