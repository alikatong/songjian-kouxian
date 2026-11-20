const request = require('./request')
const get = (path, data) => request(path, { data })
const post = (path, data) => request(path, { method: 'POST', data: data || {} })

module.exports = {
  auth: {
    wechatPhone: (phoneCode) => post('/auth/wechat/phone', { phone_code: phoneCode }),
    login: (data) => post('/auth/login', data),
    register: (data) => post('/auth/register', data)
  },
  character: {
    create: (data) => post('/character', data),
    breakthrough: (data) => post('/character/breakthrough', data)
  },
  game: {
    state: () => get('/game'),
    announcements: (data) => get('/game/announcements', data),
    inventory: (data) => get('/game/inventory', data),
    equipment: (data) => get('/game/equipment', data),
    techniques: (data) => get('/game/techniques', data),
    recipes: (data) => get('/game/recipes', data),
    battles: (data) => get('/game/battles', data),
    explorations: (data) => get('/game/explorations', data),
    retreatStart: () => post('/game/retreat/start'),
    retreatEnd: () => post('/game/retreat/end'),
    explore: (area) => post('/game/explore', { area }),
    challengeBoss: (area) => post('/game/pve/challenge', { area }),
    chooseEvent: (choiceIndex) => post('/game/events/choose', { choice_index: choiceIndex }),
    fight: (enemyCode) => post('/game/pve/fight', { enemy_code: enemyCode }),
    avoid: () => post('/game/pve/avoid'),
    rest: () => post('/game/pve/rest'),
    useItem: (code) => post('/game/items/use', { item_code: code }),
    protectItem: (code, locked) => post('/game/items/protect', { item_code: code, locked }),
    recycleItem: (code, quantity) => post('/game/items/recycle', { item_code: code, quantity: quantity || 1 }),
    equip: (code) => post('/game/equipment/equip', { equipment_code: code }),
    unequip: (slot) => post('/game/equipment/unequip', { slot }),
    protectEquipment: (code, locked) => post('/game/equipment/protect', { equipment_code: code, locked }),
    recycleEquipment: (code, quantity) => post('/game/equipment/recycle', { equipment_code: code, quantity: quantity || 1 }),
    equipTechnique: (code) => post('/game/techniques/equip', { technique_code: code }),
    craft: (code) => post('/game/craft', { item_code: code, quantity: 1 }),
    collectCraft: (id) => post('/game/craft/collect', { queue_id: id }),
    forge: (code) => post('/game/forge', { equipment_code: code, quantity: 1 }),
    collectForge: (id) => post('/game/forge/collect', { queue_id: id })
  },
  market: {
    state: () => get('/market'),
    shop: (page) => get('/market/shop', { page: page || 1 }),
    listings: (page) => get('/market/listings', { page: page || 1 }),
    sellable: (page) => get('/market/sellable', { page: page || 1 }),
    buyShop: (code) => post('/market/shop/buy', { item_code: code, quantity: 1 }),
    buyListing: (id) => post('/market/auction/buy', { listing_id: id }),
    cancelListing: (id) => post('/market/auction/cancel', { listing_id: id }),
    list: (assetType, code, quantity, unitPrice) => post('/market/auction/list', {
      asset_type: assetType, code, quantity, unit_price: unitPrice
    }),
    mail: (page) => get('/market/mail', { page: page || 1 }),
    claimMail: (id) => post('/market/mail/claim', { mail_id: id })
  },
  social: {
    friends: () => get('/social/friends', { page: 1 }),
    requests: (direction) => get('/social/requests', { direction, page: 1 }),
    messages: (channel, friend) => get('/social/messages', { channel, friend, page: 1 }),
    send: (body, channel, friend) => post('/social/messages', { body, channel, friend }),
    search: (q) => get('/social/search', { q, page: 1 }),
    requestFriend: (username) => post('/social/friends/request', { username }),
    respond: (id, action) => post('/social/friends/respond', { friendship_id: id, action })
  }
}
