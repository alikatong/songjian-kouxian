// Axios HTTP 客户端封装
import axios from 'axios'

// 从环境变量读取 API 基础地址，默认 '/api'
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// 创建 axios 实例
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 请求拦截器
 * 自动从 localStorage 读取 token 并添加到请求头
 */
client.interceptors.request.use(
  (config) => {
    // 从 zustand persist 存储中读取 token
    try {
      const stored = localStorage.getItem('xxgame-storage')
      if (stored) {
        const { state } = JSON.parse(stored)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      }
    } catch (e) {
      // 解析失败则不添加 token
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * 响应拦截器
 * 401 时清除 token 并跳转到登录页
 */
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = String(error.config?.url || '').startsWith('/auth/')
    if (error.response?.status === 401 && !isAuthRequest) {
      // 清除本地存储的认证信息
      localStorage.removeItem('xxgame-storage')
      // 跳转到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ========================
// 认证相关 API
// ========================
export const authAPI = {
  /**
   * 用户注册
   * @param {{ username: string, password: string }} data
   */
  register: (data) => client.post('/auth/register', data),

  /**
   * 用户登录
   * @param {{ username: string, password: string }} data
   */
  login: (data) => client.post('/auth/login', data),
}

// ========================
// 角色相关 API
// ========================
export const characterAPI = {
  /**
   * 获取当前用户角色信息
   */
  get: () => client.get('/character'),

  /**
   * 创建角色
   * @param {{ name: string, gender: 'male'|'female' }} data
   */
  create: (data) => client.post('/character', data),

  /**
   * 突破境界
   */
  breakthrough: (boostItemCode, protectionItemCode, majorPillCode) => client.post('/character/breakthrough', {
    ...(boostItemCode ? { boost_item_code: boostItemCode } : {}),
    ...(protectionItemCode ? { protection_item_code: protectionItemCode } : {}),
    ...(majorPillCode ? { major_pill_code: majorPillCode } : {}),
  }),
}

export const marketAPI = {
  getState: () => client.get('/market'),
  getShop: (page = 1) => client.get('/market/shop', { params: { page } }),
  getListings: (page = 1) => client.get('/market/listings', { params: { page } }),
  getSellable: (page = 1) => client.get('/market/sellable', { params: { page } }),
  buyShop: (itemCode, quantity = 1) => client.post('/market/shop/buy', { item_code: itemCode, quantity }),
  listAuction: (assetType, code, quantity, unitPrice) => client.post('/market/auction/list', {
    asset_type: assetType, code, quantity, unit_price: unitPrice,
  }),
  buyAuction: (listingId) => client.post('/market/auction/buy', { listing_id: listingId }),
  cancelAuction: (listingId) => client.post('/market/auction/cancel', { listing_id: listingId }),
  getMail: (page = 1) => client.get('/market/mail', { params: { page } }),
  claimMail: (mailId) => client.post('/market/mail/claim', { mail_id: mailId }),
}

export const gameAPI = {
  getState: () => client.get('/game'),
  getAnnouncements: (page = 1) => client.get('/game/announcements', { params: { page } }),
  getInventory: (params = {}) => client.get('/game/inventory', { params }),
  getRecipes: (params = {}) => client.get('/game/recipes', { params }),
  getTechniques: (params = {}) => client.get('/game/techniques', { params }),
  getEquipment: (params = {}) => client.get('/game/equipment', { params }),
  getBattles: (params = {}) => client.get('/game/battles', { params }),
  getExplorationHistory: (params = {}) => client.get('/game/explorations', { params }),
  startRetreat: () => client.post('/game/retreat/start', {}),
  endRetreat: () => client.post('/game/retreat/end', {}),
  explore: (area = 'luoxia') => client.post('/game/explore', { area }),
  fight: (enemyCode) => client.post('/game/pve/fight', { enemy_code: enemyCode }),
  avoidEncounter: () => client.post('/game/pve/avoid', {}),
  rest: () => client.post('/game/pve/rest', {}),
  chooseEvent: (choiceIndex) => client.post('/game/events/choose', { choice_index: choiceIndex }),
  craft: (itemCode, quantity = 1) => client.post('/game/craft', { item_code: itemCode, quantity }),
  collectCraft: (queueId) => client.post('/game/craft/collect', { queue_id: queueId }),
  forge: (equipmentCode, quantity = 1) => client.post('/game/forge', { equipment_code: equipmentCode, quantity }),
  collectForging: (queueId) => client.post('/game/forge/collect', { queue_id: queueId }),
  useItem: (itemCode) => client.post('/game/items/use', { item_code: itemCode }),
  protectItem: (itemCode, locked) => client.post('/game/items/protect', { item_code: itemCode, locked }),
  recycleItem: (itemCode, quantity = 1) => client.post('/game/items/recycle', { item_code: itemCode, quantity }),
  equipTechnique: (techniqueCode) => client.post('/game/techniques/equip', { technique_code: techniqueCode }),
  equipWeapon: (equipmentCode) => client.post('/game/equipment/equip', { equipment_code: equipmentCode }),
  unequipWeapon: (slot) => client.post('/game/equipment/unequip', { slot }),
  protectEquipment: (equipmentCode, locked) => client.post('/game/equipment/protect', { equipment_code: equipmentCode, locked }),
  recycleEquipment: (equipmentCode, quantity = 1) => client.post('/game/equipment/recycle', { equipment_code: equipmentCode, quantity }),
}

export const socialAPI = {
  getFriends: (page = 1) => client.get('/social/friends', { params: { page } }),
  getRequests: (direction, page = 1) => client.get('/social/requests', { params: { direction, page } }),
  search: (query, page = 1) => client.get('/social/search', { params: { q: query, page } }),
  requestFriend: (username) => client.post('/social/friends/request', { username }),
  respondFriend: (friendshipId, action) => client.post('/social/friends/respond', { friendship_id: friendshipId, action }),
  getMessages: (channel = 'global', friend = '', page = 1) => client.get('/social/messages', { params: { channel, friend, page } }),
  sendMessage: (body, channel = 'global', friend = '') => client.post('/social/messages', { body, channel, friend }),
}

export default client
