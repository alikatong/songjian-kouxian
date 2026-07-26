import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Backpack, Bell, BookOpen, ChevronLeft, ChevronRight, Compass, Flame, FlaskConical, Gem, Gavel,
  Check, Hammer, LogOut, Map, Menu, MessageCircle, Mountain, PackageCheck, Search,
  Lock, Mail, Recycle, ScrollText, Shield, Sparkles, Store, Swords, Timer, Unlock, UserRound, Users, X,
  Zap,
} from 'lucide-react'
import { characterAPI, gameAPI, marketAPI, socialAPI } from '../api/client'
import useGameStore from '../stores/gameStore'
import Loading from '../components/Loading'
import './GamePage.css'

const tabs = [
  { id: 'cultivate', label: '修炼', icon: Flame },
  { id: 'explore', label: '游历', icon: Compass },
  { id: 'craft', label: '丹谱', icon: FlaskConical },
  { id: 'techniques', label: '功法', icon: ScrollText },
  { id: 'equipment', label: '装备', icon: Shield },
  { id: 'inventory', label: '行囊', icon: Backpack },
  { id: 'profile', label: '人物', icon: UserRound },
  { id: 'social', label: '道友', icon: Users },
  { id: 'market', label: '坊市', icon: Store },
  { id: 'mail', label: '信箱', icon: Mail },
]
const mobilePrimaryTabs = new Set(['cultivate', 'explore', 'inventory', 'profile'])

const rarityLabels = {
  common: '凡品', uncommon: '良品', rare: '上品', epic: '珍品', legendary: '绝品',
}
const ascensionMultipliers = {
  common: 3, uncommon: 3.05, rare: 3.1, epic: 3.15, legendary: 3.2,
}
const breakthroughChanceCap = 0.95
const typeLabels = {
  material: '炼材', pill: '丹药', breakthrough: '破境丹食', buff: '修炼辅物',
  breakthrough_protection: '护脉丹',
  major_breakthrough: '大境破境丹', boss_material: '首领核心', legacy_breakthrough: '旧制丹食',
  explore: '游历用物', collectible: '收藏',
}
const weaponTypeLabels = { sword: '剑', saber: '刀', spear: '枪', fan: '扇', staff: '杖', armor: '甲', robe: '袍', crown: '冠', boots: '履', shield: '盾' }
const dropCategoryLabels = { material: '材料', technique: '功法谱', recipe: '丹谱', equipment_recipe: '器谱', equipment: '成品器物', item: '物品' }
const combatRankLabels = { normal: '寻常', elite: '精英', boss: '首领' }
const statLabels = { hp: '气血', atk: '攻击', def: '防御', spd: '身法' }
const rewardIconByCategory = { material: PackageCheck, technique: ScrollText, recipe: FlaskConical, equipment_recipe: Hammer, equipment: Shield, item: Backpack }
const qualityFilters = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary']
const PAGE_SIZE = 10
const createPageState = () => ({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 })
const qiMotes = [
  [8, 10, 0.2, 4.8, 4], [88, 12, 1.1, 5.4, 3], [18, 27, 2.4, 4.2, 5],
  [82, 31, 0.7, 4.7, 4], [4, 49, 1.8, 5.7, 3], [94, 53, 3.1, 4.4, 5],
  [12, 72, 0.4, 5.1, 4], [87, 75, 2.1, 4.9, 3], [27, 91, 1.4, 5.6, 4],
  [72, 92, 2.8, 4.5, 5], [48, 5, 3.5, 5.3, 3], [55, 96, 0.9, 4.6, 4],
]

const formatNumber = (value = 0) => {
  const number = Number(value)
  if (number >= 100000000) return `${(number / 100000000).toFixed(2)}亿`
  if (number >= 10000) return `${(number / 10000).toFixed(1)}万`
  if (number > 0 && number < 100) return number.toFixed(1).replace(/\.0$/, '')
  return Math.floor(number).toLocaleString('zh-CN')
}

const remaining = (date) => Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 1000))
const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total % 3600 / 60)
  const secs = total % 60
  return hours > 0 ? `${hours}时 ${minutes}分` : `${minutes}分 ${secs}秒`
}

function QualityFilter({ value, onChange }) {
  return (
    <div className="quality-filter" aria-label="品质筛选">
      {qualityFilters.map((quality) => (
        <button key={quality} className={value === quality ? 'active' : ''} onClick={() => onChange(quality)}>
          {quality === 'all' ? '全部' : rarityLabels[quality]}
        </button>
      ))}
    </div>
  )
}

function CollectionToolbar({ query, category, categories, onQuery, onCategory }) {
  return (
    <div className="collection-toolbar">
      <label><Search size={16} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="搜索名称、说明或来源" /></label>
      <select value={category} onChange={(event) => onCategory(event.target.value)} aria-label="分类筛选">
        {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
  )
}

function Pagination({ page, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), pages)
  if (total <= PAGE_SIZE) return total > 0 ? <div className="pagination compact"><span>共 {total} 项</span></div> : null
  return (
    <div className="pagination">
      <button className="icon-button" title="上一页" onClick={() => onChange(safePage - 1)} disabled={safePage <= 1}><ChevronLeft size={17} /></button>
      <span>第 {safePage} / {pages} 页 · 共 {total} 项</span>
      <button className="icon-button" title="下一页" onClick={() => onChange(safePage + 1)} disabled={safePage >= pages}><ChevronRight size={17} /></button>
    </div>
  )
}

const containsQuery = (item, query) => !query || [item.name, item.description, item.source_description, item.category, item.major_realm]
  .filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())

const paginate = (items) => items

function Portrait({ character, className = 'character-portrait', alt = '' }) {
  return <img className={className} src={character.portrait_url} data-fallback={character.portrait_fallback_url} onError={(event) => { const fallback = event.currentTarget.dataset.fallback; if (fallback) { event.currentTarget.onerror = null; event.currentTarget.src = fallback } }} alt={alt} />
}

function RewardArt({ reward, className = 'reward-art' }) {
  const [failed, setFailed] = useState(false)
  const Icon = rewardIconByCategory[reward.category] || PackageCheck
  if (reward.image_url && !failed) return <img className={className} src={reward.image_url} alt="" loading="lazy" onError={() => setFailed(true)} />
  return <span className={`${className} reward-art-fallback`}><Icon size={18} /></span>
}

function CreateCharacter({ onCreated }) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('male')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    if (name.trim().length < 2) return setError('道号需要 2-12 个字符')
    setBusy(true)
    setError('')
    try {
      const response = await characterAPI.create({ name: name.trim(), gender })
      setCreated(response.data)
    } catch (requestError) {
      setError(requestError.response?.data?.error || '暂时无法创建角色')
    } finally {
      setBusy(false)
    }
  }

  if (created) return (
    <div className="dialog-backdrop">
      <div className="dialog origin-reveal">
        <span className="event-kicker">命数已定</span>
        <h2>{created.origin?.name || '凡人之家'}</h2>
        <Portrait character={created} className="origin-portrait" alt={`${created.gender === 'female' ? '女' : '男'}性角色立绘`} />
        <p>{created.origin?.description}</p>
        <div className="origin-bonuses">
          {Object.entries(created.origin?.bonuses || {}).map(([key, value]) => (
            <span key={key}>{({ hp: '气血', atk: '攻击', def: '防御', spd: '身法', fate_points: '奇缘' })[key] || key} +{value}</span>
          ))}
        </div>
        <button className="primary-command" onClick={onCreated}>接受命数</button>
      </div>
    </div>
  )

  return (
    <div className="dialog-backdrop">
      <form className="dialog" onSubmit={submit}>
        <Mountain size={34} aria-hidden="true" />
        <h2>立下道号</h2>
        <p>你必定出生在凡人家庭，家境与天性由命数随机决定，差异只在毫厘之间。</p>
        <label>
          <span>道号</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={12} autoFocus />
        </label>
        <div className="gender-picker" role="group" aria-label="选择角色性别">
          <button type="button" className={gender === 'male' ? 'active' : ''} onClick={() => setGender('male')}>男</button>
          <button type="button" className={gender === 'female' ? 'active' : ''} onClick={() => setGender('female')}>女</button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-command" disabled={busy}>{busy ? '推演命数中...' : '落子人间'}</button>
      </form>
    </div>
  )
}

function GamePage() {
  const { user, logout, setCharacter } = useGameStore()
  const [state, setState] = useState(null)
  const [localQi, setLocalQi] = useState(0)
  const [activeTab, setActiveTab] = useState('cultivate')
  const [cultivationView, setCultivationView] = useState('technique')
  const [activeArea, setActiveArea] = useState('luoxia')
  const [quality, setQuality] = useState('all')
  const [loading, setLoading] = useState(true)
  const [needsCharacter, setNeedsCharacter] = useState(false)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [announcements, setAnnouncements] = useState(createPageState())
  const [announcementsOpen, setAnnouncementsOpen] = useState(false)
  const [social, setSocial] = useState({ friends: [], incoming: [], outgoing: [] })
  const [socialPages, setSocialPages] = useState({ friends: createPageState(), incoming: createPageState(), outgoing: createPageState(), messages: createPageState(), search: createPageState() })
  const [socialViews, setSocialViews] = useState({ friends: 1, incoming: 1, outgoing: 1, messages: 1, search: 1 })
  const [socialMode, setSocialMode] = useState('chat')
  const [chatChannel, setChatChannel] = useState('global')
  const [chatFriend, setChatFriend] = useState('')
  const [messages, setMessages] = useState([])
  const [messageBody, setMessageBody] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [collectionViews, setCollectionViews] = useState({
    craft: { query: '', category: 'all', page: 1 },
    techniques: { query: '', category: 'all', page: 1 },
    equipment: { query: '', category: 'all', page: 1 },
    inventory: { query: '', category: 'all', page: 1 },
  })
  const [gamePages, setGamePages] = useState({ inventory: createPageState(), recipes: createPageState(), techniques: createPageState(), equipment: createPageState(), carriedEquipment: createPageState(), battles: createPageState() })
  const [inventoryEquipmentPage, setInventoryEquipmentPage] = useState(1)
  const [listRevision, setListRevision] = useState(0)
  const [recycleTarget, setRecycleTarget] = useState(null)
  const [recycleAmount, setRecycleAmount] = useState(1)
  const [lastBattle, setLastBattle] = useState(null)
  const [battlePage, setBattlePage] = useState('summary')
  const [battleHistoryOpen, setBattleHistoryOpen] = useState(false)
  const [battleDetailSource, setBattleDetailSource] = useState(null)
  const [explorationResult, setExplorationResult] = useState(null)
  const [explorationHistoryOpen, setExplorationHistoryOpen] = useState(false)
  const [explorationHistory, setExplorationHistory] = useState(createPageState())
  const [explorationHistoryLoading, setExplorationHistoryLoading] = useState(false)
  const [market, setMarket] = useState({ spirit_stones: 0, system_auction_open: false })
  const [marketPages, setMarketPages] = useState({ shop: createPageState(), listings: createPageState(), sellable: createPageState() })
  const [marketViews, setMarketViews] = useState({ shop: 1, listings: 1, sellable: 1 })
  const [marketMode, setMarketMode] = useState('shop')
  const [auctionAsset, setAuctionAsset] = useState('')
  const [auctionQuantity, setAuctionQuantity] = useState(1)
  const [auctionPrice, setAuctionPrice] = useState(10)
  const [mailbox, setMailbox] = useState({ ...createPageState(), unclaimed: 0 })
  const [mailPage, setMailPage] = useState(1)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const contentStageRef = useRef(null)
  const stateRequestId = useRef(0)
  const socialRequestId = useRef(0)
  const explorationHistoryRequestId = useRef(0)
  const gameListRequestIds = useRef({})
  const battleHistoryRequestId = useRef(0)
  const marketRequestId = useRef(0)
  const mailboxRequestId = useRef(0)
  const [, tick] = useState(0)

  const loadState = useCallback(async (quiet = false) => {
    const requestId = ++stateRequestId.current
    if (!quiet) setLoading(true)
    try {
      const response = await gameAPI.getState()
      if (requestId !== stateRequestId.current) return
      setState(response.data)
      setCharacter(response.data.character)
      setLocalQi(response.data.character.current_qi)
      setNeedsCharacter(false)
      const unlocked = response.data.areas?.filter((area) => area.unlocked)
      if (unlocked?.length) setActiveArea((currentArea) => (
        unlocked.some((area) => area.code === currentArea) ? currentArea : unlocked[unlocked.length - 1].code
      ))
      if (response.data.character.offline_gain > 0) {
        setNotice(`自然修炼所得灵气 ${formatNumber(response.data.character.offline_gain)}`)
      }
    } catch (error) {
      if (requestId !== stateRequestId.current) return
      if (error.response?.status === 404 && error.response?.data?.code === 'NO_CHARACTER') setNeedsCharacter(true)
      else setNotice(error.response?.data?.error || '无法读取洞府状态')
    } finally {
      if (requestId === stateRequestId.current) setLoading(false)
    }
  }, [setCharacter])

  const loadAnnouncements = useCallback(async (page = 1) => {
    try {
      const response = await gameAPI.getAnnouncements(page)
      setAnnouncements(response.data)
    } catch {
      // Announcements are supplemental and should not block entering the game.
    }
  }, [])

  useEffect(() => {
    loadState()
    return () => { stateRequestId.current += 1 }
  }, [loadState])
  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])
  useEffect(() => {
    if (!state?.character) return undefined
    const timer = setInterval(() => {
      setLocalQi((value) => Math.min(value + state.character.qi_per_second, state.character.qi_required))
      tick((value) => value + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [state?.character])
  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    if (contentStageRef.current) contentStageRef.current.scrollTop = 0
  }, [activeTab])

  const loadSocial = useCallback(async () => {
    const requestId = ++socialRequestId.current
    try {
      const [friendsResponse, incomingResponse, outgoingResponse, messageResponse] = await Promise.all([
        socialAPI.getFriends(socialViews.friends),
        socialAPI.getRequests('incoming', socialViews.incoming),
        socialAPI.getRequests('outgoing', socialViews.outgoing),
        socialAPI.getMessages(chatChannel, chatFriend, socialViews.messages),
      ])
      if (requestId !== socialRequestId.current) return
      setSocial({
        friends: friendsResponse.data.items || [],
        incoming: incomingResponse.data.items || [],
        outgoing: outgoingResponse.data.items || [],
      })
      setSocialPages((current) => ({
        ...current,
        friends: friendsResponse.data,
        incoming: incomingResponse.data,
        outgoing: outgoingResponse.data,
        messages: messageResponse.data,
      }))
      setMessages(messageResponse.data.items || [])
    } catch (error) {
      if (requestId !== socialRequestId.current) return
      if (activeTab === 'social') setNotice(error.response?.data?.error || '暂时无法读取道友消息')
    }
  }, [activeTab, chatChannel, chatFriend, socialViews])

  useEffect(() => {
    if (activeTab !== 'social' || chatChannel === 'direct' && !chatFriend) {
      socialRequestId.current += 1
      return undefined
    }
    loadSocial()
    const timer = setInterval(loadSocial, 10000)
    return () => {
      clearInterval(timer)
      socialRequestId.current += 1
    }
  }, [activeTab, chatChannel, chatFriend, loadSocial])
  useEffect(() => {
    setSocialViews((current) => current.messages === 1 ? current : { ...current, messages: 1 })
  }, [chatChannel, chatFriend])

  const loadMarket = useCallback(async () => {
    const requestId = ++marketRequestId.current
    try {
      const [stateResponse, shopResponse, listingsResponse, sellableResponse] = await Promise.all([
        marketAPI.getState(),
        marketAPI.getShop(marketViews.shop),
        marketAPI.getListings(marketViews.listings),
        marketAPI.getSellable(marketViews.sellable),
      ])
      if (requestId !== marketRequestId.current) return
      setMarket({
        ...stateResponse.data,
        shop: shopResponse.data.items,
        listings: listingsResponse.data.items,
        sellable: sellableResponse.data.items,
      })
      setMarketPages({ shop: shopResponse.data, listings: listingsResponse.data, sellable: sellableResponse.data })
    } catch (error) {
      if (requestId === marketRequestId.current) setNotice(error.response?.data?.error || '坊市暂时未开')
    }
  }, [marketViews])

  const loadMailbox = useCallback(async () => {
    const requestId = ++mailboxRequestId.current
    try {
      const response = await marketAPI.getMail(mailPage)
      if (requestId !== mailboxRequestId.current) return
      setMailbox(response.data)
    } catch (error) {
      if (requestId === mailboxRequestId.current) setNotice(error.response?.data?.error || '无法读取信箱')
    }
  }, [mailPage])

  useEffect(() => {
    if (activeTab === 'market') loadMarket()
    if (activeTab === 'mail') loadMailbox()
  }, [activeTab, loadMarket, loadMailbox])

  const character = state?.character
  const currentArea = state?.areas?.find((area) => area.code === activeArea)
  const recentBattles = gamePages.battles.items || []
  const selectedAuctionAsset = useMemo(() => marketPages.sellable.items?.find(
    (item) => `${item.asset_type}:${item.code}` === auctionAsset,
  ), [marketPages.sellable.items, auctionAsset])
  const encounter = state?.pending_encounter
  const encounterStaminaCost = encounter ? ({ normal: 8, elite: 16, boss: 28 }[encounter.rank] || 8) : 0
  const breakthroughItem = useMemo(() => state?.breakthrough_items?.find(
    (item) => item.type === 'breakthrough' && item.effect?.realm_code === character?.realm_code,
  ), [state?.breakthrough_items, character?.realm_code])
  const protectionItem = useMemo(() => state?.breakthrough_items?.find(
    (item) => item.type === 'breakthrough_protection' && item.effect?.realm_code === character?.realm_code,
  ), [state?.breakthrough_items, character?.realm_code])
  const majorPillItem = useMemo(() => state?.breakthrough_items?.find(
    (item) => item.type === 'major_breakthrough' && item.effect?.realm_code === character?.realm_code,
  ), [state?.breakthrough_items, character?.realm_code])
  const qiPercent = character?.qi_required > 0 ? Math.min(100, localQi / character.qi_required * 100) : 100
  const retreatElapsed = character?.retreat?.active
    ? Math.max(0, Math.floor((Date.now() - new Date(character.retreat.started_at).getTime()) / 1000))
    : 0
  const cappedRetreatElapsed = Math.min(retreatElapsed, (character?.offline_qi_cap_hrs || 0) * 3600)
  const retreatProjected = character?.retreat?.active
    ? Math.min(character.qi_required - localQi, Math.floor(cappedRetreatElapsed * character.retreat.rate_per_second))
    : 0
  const loadGamePage = useCallback(async (key, request) => {
    const requestId = (gameListRequestIds.current[key] || 0) + 1
    gameListRequestIds.current[key] = requestId
    try {
      const response = await request()
      if (gameListRequestIds.current[key] !== requestId) return
      setGamePages((current) => ({ ...current, [key]: response.data }))
    } catch (error) {
      if (gameListRequestIds.current[key] === requestId) setNotice(error.response?.data?.error || '无法读取列表')
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'craft' || !character) return
    const view = collectionViews.craft
    loadGamePage('recipes', () => gameAPI.getRecipes({ page: view.page, q: view.query || undefined, category: view.category === 'all' ? undefined : view.category, rarity: quality === 'all' ? undefined : quality }))
  }, [activeTab, character?.id, collectionViews.craft, quality, listRevision, loadGamePage])

  useEffect(() => {
    if (activeTab !== 'techniques' || !character) return
    const view = collectionViews.techniques
    loadGamePage('techniques', () => gameAPI.getTechniques({ page: view.page, q: view.query || undefined, category: view.category === 'all' ? undefined : view.category, rarity: quality === 'all' ? undefined : quality }))
  }, [activeTab, character?.id, collectionViews.techniques, quality, listRevision, loadGamePage])

  useEffect(() => {
    if (activeTab !== 'equipment' || !character) return
    const view = collectionViews.equipment
    loadGamePage('equipment', () => gameAPI.getEquipment({ page: view.page, q: view.query || undefined, category: view.category === 'all' ? undefined : view.category, rarity: quality === 'all' ? undefined : quality }))
  }, [activeTab, character?.id, collectionViews.equipment, quality, listRevision, loadGamePage])

  useEffect(() => {
    if (activeTab !== 'inventory' || !character) return
    const view = collectionViews.inventory
    if (view.category !== 'equipment') {
      loadGamePage('inventory', () => gameAPI.getInventory({ page: view.page, q: view.query || undefined, category: view.category === 'all' ? undefined : view.category }))
    }
    if (['all', 'equipment'].includes(view.category)) {
      loadGamePage('carriedEquipment', () => gameAPI.getEquipment({ page: inventoryEquipmentPage, q: view.query || undefined, category: 'owned' }))
    }
  }, [activeTab, character?.id, collectionViews.inventory, inventoryEquipmentPage, listRevision, loadGamePage])
  const updateCollection = (tab, patch) => {
    if (tab === 'inventory' && ('query' in patch || 'category' in patch)) setInventoryEquipmentPage(1)
    setCollectionViews((current) => ({
      ...current, [tab]: { ...current[tab], ...patch, page: patch.page || 1 },
    }))
  }
  const recipes = gamePages.recipes.items || []
  const techniques = gamePages.techniques.items || []
  const equipment = gamePages.equipment.items || []
  const inventory = collectionViews.inventory.category === 'equipment' ? [] : gamePages.inventory.items || []
  const carriedEquipment = gamePages.carriedEquipment.items || []
  const showsCarriedEquipment = ['all', 'equipment'].includes(collectionViews.inventory.category)

  useEffect(() => {
    const first = marketPages.sellable.items?.[0]
    if (!selectedAuctionAsset) {
      setAuctionAsset(first ? `${first.asset_type}:${first.code}` : '')
      setAuctionQuantity(1)
      return
    }
    const maxQuantity = Math.max(1, Number(selectedAuctionAsset.quantity) || 1)
    if (auctionQuantity > maxQuantity) setAuctionQuantity(maxQuantity)
  }, [marketPages.sellable.items, selectedAuctionAsset, auctionQuantity])

  const run = async (key, action, after = true) => {
    setBusy(key)
    try {
      const response = await action()
      setNotice(response.data.message || response.data.result || '已完成')
      if (after) {
        await loadState(true)
        setListRevision((value) => value + 1)
      }
      return response.data
    } catch (error) {
      setNotice(error.response?.data?.error || '操作未完成')
      return null
    } finally {
      setBusy('')
    }
  }

  const doBreakthrough = async () => {
    const data = await run('breakthrough', () => characterAPI.breakthrough(breakthroughItem?.code, protectionItem?.code, majorPillItem?.code), false)
    if (data?.character) {
      await loadState(true)
      setListRevision((value) => value + 1)
      setNotice(data.message)
    }
  }
  const toggleRetreat = async () => {
    const data = await run(
      'retreat',
      () => character.retreat?.active ? gameAPI.endRetreat() : gameAPI.startRetreat(),
      false,
    )
    if (data?.character) {
      setState((current) => ({ ...current, character: data.character }))
      setCharacter(data.character)
      setLocalQi(data.character.current_qi)
      setNotice(data.message)
    }
  }
  const doExplore = async () => {
    const data = await run('explore', () => gameAPI.explore(activeArea), false)
    if (data?.event) setState((current) => ({
      ...current,
      pending_event: data.event,
      character: data.stamina_remaining == null ? current.character : {
        ...current.character,
        stamina: { ...current.character.stamina, current: data.stamina_remaining },
      },
    }))
  }
  const fight = async (enemyCode) => {
    const data = await run(`fight-${enemyCode}`, () => gameAPI.fight(enemyCode))
    if (data) { setBattleDetailSource(null); setBattlePage('summary'); setLastBattle(data) }
  }
  const inspectBattle = (battle) => {
    const loot = battle.loot || {}
    setBattleHistoryOpen(false)
    setBattleDetailSource('history')
    setLastBattle({
      result: battle.result,
      rounds: battle.rounds,
      enemy_name: battle.name || battle.enemy_code,
      message: battle.result === 'win' ? `战胜${battle.name || battle.enemy_code}` : `败于${battle.name || battle.enemy_code}`,
      log: loot.log || [],
      loot: loot.items || [],
      qi_reward: Number(loot.qi || 0),
      stone_reward: Number(loot.spirit_stones || 0),
    })
    setBattlePage('details')
  }
  const closeBattle = () => {
    setLastBattle(null)
    setBattlePage('summary')
    setBattleDetailSource(null)
  }
  const returnFromBattleDetails = () => {
    if (battleDetailSource === 'history') {
      closeBattle()
      setBattleHistoryOpen(true)
      return
    }
    setBattlePage('summary')
  }
  const loadBattleHistory = async (page = 1) => {
    const requestId = ++battleHistoryRequestId.current
    try {
      const response = await gameAPI.getBattles({ page })
      if (requestId !== battleHistoryRequestId.current) return
      setGamePages((current) => ({ ...current, battles: response.data }))
    } catch (error) {
      if (requestId === battleHistoryRequestId.current) setNotice(error.response?.data?.error || '无法读取战绩')
    }
  }
  const openBattleHistory = () => {
    setBattleHistoryOpen(true)
    loadBattleHistory(1)
  }
  const loadExplorationHistory = async (page = 1) => {
    const requestId = ++explorationHistoryRequestId.current
    setExplorationHistoryLoading(true)
    try {
      const response = await gameAPI.getExplorationHistory({ page })
      if (requestId !== explorationHistoryRequestId.current) return
      setExplorationHistory(response.data)
    } catch (error) {
      if (requestId === explorationHistoryRequestId.current) setNotice(error.response?.data?.error || '无法读取游历记录')
    } finally {
      if (requestId === explorationHistoryRequestId.current) setExplorationHistoryLoading(false)
    }
  }
  const openExplorationHistory = () => {
    setExplorationHistoryOpen(true)
    loadExplorationHistory(1)
  }
  const avoidEncounter = async () => {
    const data = await run('avoid-encounter', () => gameAPI.avoidEncounter(), false)
    if (data) {
      setState((current) => ({ ...current, pending_encounter: null }))
      return
    }
    await loadState(true)
  }
  const selectTab = (id) => {
    setActiveTab(id)
    setQuality('all')
    setMobileMenuOpen(false)
  }
  const choose = async (index) => {
    const data = await run(`choice-${index}`, () => gameAPI.chooseEvent(index))
    if (data) {
      setExplorationResult(data)
      setNotice(data.result)
    }
  }
  const signOut = () => { logout(); window.location.replace('/login') }
  const socialRun = async (key, action) => {
    setBusy(key)
    try {
      const response = await action()
      setNotice(response.data.message || '已完成')
      await loadSocial()
      return response.data
    } catch (error) {
      setNotice(error.response?.data?.error || '操作未完成')
      return null
    } finally { setBusy('') }
  }
  const loadPlayerSearch = async (page = 1) => {
    if (searchTerm.trim().length < 2) return setNotice('至少输入两个字进行搜索')
    setBusy('player-search')
    try {
      const response = await socialAPI.search(searchTerm.trim(), page)
      setSearchResults(response.data.items || [])
      setSocialPages((current) => ({ ...current, search: response.data }))
      setSocialViews((current) => ({ ...current, search: page }))
    } catch (error) { setNotice(error.response?.data?.error || '搜索未完成') }
    finally { setBusy('') }
  }
  const searchPlayers = async (event) => {
    event.preventDefault()
    loadPlayerSearch(1)
  }
  const sendChat = async (event) => {
    event.preventDefault()
    if (!messageBody.trim()) return
    const sent = await socialRun('send-chat', () => socialAPI.sendMessage(messageBody.trim(), chatChannel, chatFriend))
    if (sent) {
      setMessageBody('')
      setSocialViews((current) => ({ ...current, messages: 1 }))
    }
  }
  const confirmRecycle = async () => {
    if (!recycleTarget) return
    const action = recycleTarget.kind === 'equipment'
      ? () => gameAPI.recycleEquipment(recycleTarget.code, recycleAmount)
      : () => gameAPI.recycleItem(recycleTarget.code, recycleAmount)
    const result = await run(`recycle-${recycleTarget.code}`, action)
    if (result) setRecycleTarget(null)
  }
  const marketRun = async (key, action, reloadMail = false) => {
    setBusy(key)
    try {
      const response = await action()
      setNotice(response.data.message || '已完成')
      await Promise.all([loadMarket(), loadState(true), ...(reloadMail ? [loadMailbox()] : [])])
      setListRevision((value) => value + 1)
      return response.data
    } catch (error) {
      setNotice(error.response?.data?.error || '交易未完成')
      return null
    } finally { setBusy('') }
  }
  const submitAuction = async (event) => {
    event.preventDefault()
    if (!selectedAuctionAsset) return setNotice('请选择上架物品')
    const quantity = Math.min(auctionQuantity, Number(selectedAuctionAsset.quantity) || 1)
    await marketRun('auction-list', () => marketAPI.listAuction(
      selectedAuctionAsset.asset_type,
      selectedAuctionAsset.code,
      quantity,
      auctionPrice,
    ))
  }

  if (loading) return <Loading />
  if (!character) return (
    <div className="game-shell">
      <div className="mountain-backdrop" aria-hidden="true" />
      {needsCharacter
        ? <CreateCharacter onCreated={() => loadState()} />
        : <div className="fatal-state"><Mountain size={38} /><h1>洞府暂不可达</h1><button className="primary-command" onClick={() => loadState()}>重新连接</button></div>}
      {notice && <div className="toast">{notice}</div>}
    </div>
  )

  return (
    <div className="game-shell">
      <div className="mountain-backdrop" aria-hidden="true" />
      <header className="topbar">
        <div className="brand"><img src="/songjian-mark.png" alt="" aria-hidden="true" /><div><strong>松间叩仙</strong><small>{character.origin?.name} · {character.realm}</small></div></div>
        <div className="top-actions">
          <button className="icon-button announcement-button" onClick={() => { setAnnouncementsOpen(true); loadAnnouncements(1) }} title="查看公告" aria-label="查看公告"><Bell size={18} />{announcements.total > 0 && <b>{announcements.total}</b>}</button>
          <span className="account"><UserRound size={15} />{character.name || user?.username}</span>
          <button className="icon-button" onClick={signOut} title="退出登录" aria-label="退出登录"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="resource-strip">
        <span><Flame size={15} />灵气 <b>{formatNumber(localQi)}</b></span>
        <span><Sparkles size={15} />修炼 <b>{character.retreat?.active ? '已暂停' : `+${formatNumber(character.qi_per_second)}/秒`}</b></span>
        <span><Gem size={15} />灵石 <b>{formatNumber(character.spirit_stones)}</b></span>
        <span><Zap size={15} />精力 <b>{character.stamina?.current}/{character.stamina?.max}</b></span>
        <span><Sparkles size={15} />奇缘 <b>{character.fate_points || 0}</b></span>
      </div>

      <main className="game-workspace">
        <aside className="realm-rail">
          <div className="realm-mark"><small>当前境界</small><strong>{character.realm}</strong><span>{character.title}</span></div>
          <nav>{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={`${activeTab === id ? 'active' : ''} ${mobilePrimaryTabs.has(id) ? 'mobile-primary-tab' : 'mobile-more-tab'}`} onClick={() => selectTab(id)}><Icon size={18} /><span>{label}</span></button>)}<button className={`more-menu-toggle ${!mobilePrimaryTabs.has(activeTab) ? 'active' : ''}`} onClick={() => setMobileMenuOpen(true)}><Menu size={18} /><span>更多</span></button></nav>
          <div className="rail-stats"><span>气血 <b>{character.stats.hp}/{character.stats.hp_max}</b></span><span>攻击 / 防御 <b>{character.stats.atk} / {character.stats.def}</b></span><span>当前功法 <b>{character.technique || '未习得'}</b></span></div>
        </aside>

        <section className="content-stage" ref={contentStageRef}>
          {activeTab === 'cultivate' && <div className="cultivate-view">
            <div className="section-heading"><div><small>洞府修行</small><h1>{character.realm}</h1></div><BookOpen size={24} /></div>
            <div className="cultivation-layout">
              <div className={`cultivation-visual ${character.retreat?.active ? 'is-retreat' : ''}`}>
                <img className="cultivation-art" src={`/assets/cultivation/meditation_${character.gender === 'female' ? 'female' : 'male'}.webp`} alt={`${character.gender === 'female' ? '女' : '男'}修盘坐吸收灵力`} />
                {['attack', 'defense'].map((slot) => {
                  const equipment = character.equipped_weapons?.[slot]
                  return equipment?.rarity === 'legendary' && equipment.image_url
                    ? <img key={slot} className={`legendary-orbit legendary-orbit-${slot}`} src={equipment.image_url} alt={equipment.name} title={equipment.name} />
                    : null
                })}
                <div className="qi-aura" aria-hidden="true">
                  <span className="qi-orbit qi-orbit-outer" />
                  <span className="qi-orbit qi-orbit-inner" />
                  <span className="qi-core" />
                  {qiMotes.map(([x, y, delay, duration, size], index) => (
                    <span key={index} className="qi-mote" style={{ '--mote-x': `${x}%`, '--mote-y': `${y}%`, '--mote-delay': `${delay}s`, '--mote-duration': `${duration}s`, '--mote-size': `${size}px` }} />
                  ))}
                </div>
              </div>
              <div className="cultivation-console">
                <p className="realm-copy">{character.realm_desc}</p>
                <div className={`cultivation-rate ${character.retreat?.active ? 'paused' : ''}`}><div><Sparkles size={20} /><span>当前灵气速度</span></div><strong>{character.retreat?.active ? '自然修炼已暂停' : `+${formatNumber(character.qi_per_second)} 灵气 / 秒`}</strong><small>{character.retreat?.active ? `闭关速度 +${formatNumber(character.retreat.rate_per_second)} / 秒，出关结算` : `${character.technique || '无功法'} · 已计入功法与丹药增益`}</small></div>
                <div className="qi-meter"><div className="meter-label"><span>灵气周天</span><b>{formatNumber(localQi)} / {formatNumber(character.qi_required)}</b></div><div className="meter-track"><span style={{ width: `${qiPercent}%` }} /></div><div className="meter-foot"><span>{character.retreat?.active ? '闭关中 · 自然增长已暂停' : `每息 +${formatNumber(character.qi_per_second)} · ${character.technique || '无功法加持'}`}</span><span>{qiPercent.toFixed(1)}%</span></div></div>
                {character.active_qi_buff && <div className="active-buff"><Sparkles size={16} /><span>修炼增益 ×{character.active_qi_buff.multiplier}</span><small>持续至 {new Date(character.active_qi_buff.expires_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</small></div>}
                <div className={`retreat-panel ${character.retreat?.active ? 'active' : ''}`}><div><small>{character.retreat?.active ? '闭关进行中' : '闭关修炼'}</small><strong>{character.retreat?.active ? `已闭关 ${formatDuration(retreatElapsed)}` : `总效率 ×${character.retreat?.total_multiplier || 1.75}`}</strong><span>{character.retreat?.active ? `预计出关获得 ${formatNumber(retreatProjected)} 灵气` : `基础 ×${character.retreat?.multiplier || 1.75} · 功法 ×${character.retreat?.technique_multiplier || 1} · 最多结算 ${character.offline_qi_cap_hrs} 小时`}</span></div><button className="secondary-command" onClick={toggleRetreat} disabled={busy === 'retreat' || !character.retreat?.active && localQi >= character.qi_required}><Timer size={17} />{busy === 'retreat' ? '调息中' : character.retreat?.active ? '出关结算' : '开始闭关'}</button></div>
                <div className="breakthrough-panel"><div><small>{character.breakthrough?.is_major ? '大境界冲关' : '小境界突破'}</small><strong>当前成功率 {Math.round(Math.min(breakthroughChanceCap, character.breakthrough.current_chance + (breakthroughItem ? Number(breakthroughItem.effect?.breakthrough_rate || 0) : 0) + (majorPillItem ? Number(majorPillItem.effect?.breakthrough_rate || 0) : 0)) * 100)}%</strong>{character.breakthrough?.is_major && <span>主修{rarityLabels[character.active_technique?.rarity] || '凡品'}功法 · 成功后基础属性永久 ×{(ascensionMultipliers[character.active_technique?.rarity] || 3).toFixed(2)}</span>}<span>失败损失 {Math.round(character.breakthrough.loss_min * 100)}%-{Math.round(character.breakthrough.loss_max * 100)}% 灵气{character.breakthrough?.is_major ? ' · 无保护将跌一小境界' : ''}</span><span>{breakthroughItem ? `${breakthroughItem.name} × ${breakthroughItem.quantity}` : '无增幅丹'} · {character.breakthrough?.is_major ? majorPillItem ? `${majorPillItem.name} × ${majorPillItem.quantity}` : '缺少本境界专属破境丹' : '无需大境破境丹'} · {protectionItem ? `${protectionItem.name} × ${protectionItem.quantity}（免罚）` : '无护脉丹'} · 失败经验 {Math.min(character.breakthrough_failures, 4)}/4（每次 +3%，最多 +12%）</span></div><button className="primary-command" onClick={doBreakthrough} disabled={localQi < character.qi_required || busy === 'breakthrough' || character.retreat?.active || character.breakthrough?.is_major && !majorPillItem}><Swords size={18} />{busy === 'breakthrough' ? '行功中' : character.breakthrough?.is_major && !majorPillItem ? '缺少破境丹' : localQi >= character.qi_required ? '尝试破境' : '灵气未满'}</button></div>
              </div>
            </div>
            <section className="cultivation-details" aria-label="修炼信息">
              <div className="cultivation-tabs" role="tablist" aria-label="修炼信息视图">
                <button type="button" role="tab" aria-selected={cultivationView === 'technique'} aria-controls="cultivation-technique-panel" className={cultivationView === 'technique' ? 'active' : ''} onClick={() => setCultivationView('technique')}><ScrollText size={16} />主修功法</button>
                <button type="button" role="tab" aria-selected={cultivationView === 'equipment'} aria-controls="cultivation-equipment-panel" className={cultivationView === 'equipment' ? 'active' : ''} onClick={() => setCultivationView('equipment')}><Shield size={16} />当前装备</button>
              </div>
              {cultivationView === 'technique' ? <div id="cultivation-technique-panel" role="tabpanel" className="cultivation-detail-panel technique-detail-panel">
                <div className="cultivation-detail-heading"><div><small>当前主修</small><div className="cultivation-detail-title"><h2>{character.active_technique?.name || '尚未主修功法'}</h2>{character.active_technique && <span className={`rarity ${character.active_technique.rarity || 'common'}`}>{rarityLabels[character.active_technique.rarity] || '未知品级'}</span>}</div></div><ScrollText size={26} aria-hidden="true" /></div>
                <p>{character.active_technique?.description || '前往功法谱查看已收录功法，并设为主修。'}</p>
                <div className="cultivation-origin"><div><small>出身</small><strong>{character.origin?.name || '凡人出身'}</strong></div><p>{character.origin?.description || '命数未定。'}</p></div>
              </div> : <div id="cultivation-equipment-panel" role="tabpanel" className="cultivation-detail-panel cultivation-equipment-panel">
                {[['attack', '武器位', Swords, '尚未装备武器'], ['defense', '护器位', Shield, '尚未装备护器']].map(([slot, label, SlotIcon, emptyName]) => {
                  const equipped = character.equipped_weapons?.[slot]
                  return <article className={`cultivation-equipment-item cultivation-equipment-${slot}`} key={slot}>{equipped ? <><img src={equipped.image_url} alt="" /><div><small>{label}</small><div className="cultivation-detail-title"><h3>{equipped.name}</h3><span className={`rarity ${equipped.rarity || 'common'}`}>{rarityLabels[equipped.rarity] || '未知品级'}</span></div><p>{weaponTypeLabels[equipped.weapon_type] || '器物'} · {equipped.major_realm || '当前境界'}</p><div className="cultivation-equipment-bonuses"><span>攻击 +{equipped.bonuses.atk}</span><span>防御 +{equipped.bonuses.def}</span><span>气血 +{equipped.bonuses.hp}</span><span>身法 +{equipped.bonuses.spd}</span></div></div></> : <><SlotIcon size={28} /><div><small>{label}</small><h3>{emptyName}</h3><p>前往炼器与装备或乾坤行囊进行装备。</p></div></>}</article>
                })}
              </div>}
            </section>
          </div>}

          {activeTab === 'explore' && <div className="explore-view">
            <div className="section-heading"><div><small>山河有迹</small><h1>游历区域</h1></div><div className="section-actions"><button className="secondary-command exploration-history-command" title="查看游历记录" aria-label="查看游历记录" onClick={openExplorationHistory}><BookOpen size={16} /><span className="section-action-label">游历记录</span></button><button className="secondary-command battle-history-command" title="查看战绩" aria-label="查看战绩" onClick={openBattleHistory}><ScrollText size={16} /><span className="section-action-label">战绩</span></button><Map size={24} /></div></div>
            <label className="area-picker"><span>选择区域</span><select value={activeArea} onChange={(event) => setActiveArea(event.target.value)}>{state.areas?.map((area) => <option key={area.code} value={area.code} disabled={!area.unlocked}>{area.unlocked ? area.name : `未解锁 · ${area.name}`}</option>)}</select></label>
            {currentArea && <div className="location-scene"><img className="location-art" src={currentArea.image_url} alt={`${currentArea.name}场景`} /><div className="location-shade" /><div className="location-copy"><span>{currentArea.major_realm}区域 · {currentArea.event_count}类奇遇</span><h2>{currentArea.name}</h2><p>{currentArea.description}</p></div><button className="primary-command" onClick={doExplore} disabled={Boolean(state.pending_event) || busy === 'explore' || character.retreat?.active || character.stamina.current < currentArea.explore_stamina_cost}><Compass size={18} />{character.retreat?.active ? '闭关中不可游历' : state.pending_event ? '先处理眼前奇遇' : character.stamina.current < currentArea.explore_stamina_cost ? '精力不足' : `游历 · ${currentArea.explore_stamina_cost} 精力`}</button></div>}
            {currentArea && <div className="field-notes"><span><PackageCheck size={17} />主要材料：{currentArea.material_summary}</span><span><Zap size={17} />精力 {character.stamina?.current}/{character.stamina?.max} · 游历消耗 {currentArea.explore_stamina_cost} · 低于上限时每5分钟恢复1点</span><span><Swords size={17} />深入区域可能遭遇妖兽；迎战另行消耗精力，也可收敛气息避开</span></div>}
            <div className="combat-summary explore-combat-summary"><div><small>综合战力</small><strong>{state.combat_power}</strong></div><div><small>当前气血</small><strong>{character.stats.hp}/{character.stats.hp_max}</strong></div><div><small>战斗属性</small><span>攻击造成伤害，防御削减伤害，身法影响先手、闪避与暴击。</span></div><button className="secondary-command" onClick={() => run('rest', () => gameAPI.rest())} disabled={character.stats.hp >= character.stats.hp_max || Boolean(busy)}>调息疗伤</button></div>
          </div>}

          {activeTab === 'craft' && <div className="craft-view">
            <div className="section-heading"><div><small>丹方有序</small><h1>丹谱</h1></div><FlaskConical size={24} /></div>
            <div className="codex-summary"><span>符合筛选 <b>{gamePages.recipes.total}</b></span><span>当前页 <b>{recipes.length}/10</b></span><span>炉位 <b>{state.queue?.length || 0}/3</b></span></div>
            <div className="queue-bar">{[0, 1, 2].map((slot) => { const task = state.queue?.[slot]; return <div className="queue-slot" key={slot}>{task ? <><span>{task.name} × {task.quantity}</span><small>{task.ready ? '炼制完成' : `还需 ${remaining(task.finish_at)} 秒`}</small>{task.ready && <button onClick={() => run(`collect-${task.id}`, () => gameAPI.collectCraft(task.id))} disabled={busy === `collect-${task.id}`}>领取</button>}</> : <><span>空闲炉位</span><small>等待安排丹方</small></>}</div> })}</div>
            <CollectionToolbar query={collectionViews.craft.query} category={collectionViews.craft.category} categories={[["all", "全部丹谱"], ["unlocked", "已收录"], ["locked", "未收录"]]} onQuery={(query) => updateCollection('craft', { query })} onCategory={(category) => updateCollection('craft', { category })} />
            <QualityFilter value={quality} onChange={(value) => { setQuality(value); updateCollection('craft', { page: 1 }) }} />
            <div className="recipe-list codex-grid">{paginate(recipes, collectionViews.craft.page).map((recipe) => <article key={recipe.code} className={!recipe.unlocked ? 'locked-entry' : ''}>{recipe.image_url && <img className="item-art" src={recipe.image_url} alt="" loading="lazy" />}<div className="entry-main"><div><span className={`rarity ${recipe.rarity}`}>{rarityLabels[recipe.rarity]}</span><h3>{recipe.name}</h3></div><p>{recipe.description}</p><p className="effect-line">{recipe.effect_summary}</p><div className="ingredients">{recipe.ingredients.map((item) => <span key={item.code} className={item.owned < item.quantity ? 'missing' : ''}>{item.name} {item.owned}/{item.quantity}{item.source_area ? ` · ${item.source_area}` : ''}</span>)}</div><small className="source-line">{recipe.source_description}</small></div><div className="recipe-action"><small>{recipe.unlocked ? `${recipe.craft_time_s} 秒` : '丹谱未收录'}</small><button className="icon-button" title={recipe.unlocked ? `炼制${recipe.name}` : '尚未收录丹谱'} onClick={() => run(`craft-${recipe.code}`, () => gameAPI.craft(recipe.code))} disabled={Boolean(busy) || !recipe.unlocked}><ChevronRight size={18} /></button></div></article>)}</div>
            <Pagination page={gamePages.recipes.page} total={gamePages.recipes.total} onChange={(page) => updateCollection('craft', { page })} />
          </div>}

          {activeTab === 'techniques' && <div className="technique-view">
            <div className="section-heading"><div><small>万法归藏</small><h1>功法谱</h1></div><ScrollText size={24} /></div>
            <div className="codex-summary"><span>符合筛选 <b>{gamePages.techniques.total}</b></span><span>当前页 <b>{techniques.length}/10</b></span><span>当前修习 <b>{character.technique}</b></span></div>
            <CollectionToolbar query={collectionViews.techniques.query} category={collectionViews.techniques.category} categories={[["all", "全部功法"], ["owned", "已收录"], ["unowned", "未收录"]]} onQuery={(query) => updateCollection('techniques', { query })} onCategory={(category) => updateCollection('techniques', { category })} />
            <QualityFilter value={quality} onChange={(value) => { setQuality(value); updateCollection('techniques', { page: 1 }) }} />
            <div className="technique-grid codex-grid">{paginate(techniques, collectionViews.techniques.page).map((technique) => <article key={technique.code} className={!technique.owned ? 'locked-entry' : ''}><div className="entry-head"><span className={`rarity ${technique.rarity}`}>{rarityLabels[technique.rarity]}</span><span>{technique.category}</span></div><h3>{technique.name}</h3><p>{technique.description}</p><div className="effect-stats"><span>修炼 ×{technique.qi_multiplier}</span><span>闭关 ×{technique.retreat_multiplier}</span>{Object.entries(technique.stat_bonuses || {}).map(([key, value]) => <span key={key}>{statLabels[key]} +{value}</span>)}{technique.breakthrough_bonus > 0 && <span>破境 +{Math.round(technique.breakthrough_bonus * 100)}%</span>}{technique.event_bonus > 0 && <span>奇缘 +{Math.round(technique.event_bonus * 100)}%</span>}</div><small className="source-line">{technique.source_description}</small><button className={technique.active ? 'active-technique' : 'secondary-command'} onClick={() => run(`equip-${technique.code}`, () => gameAPI.equipTechnique(technique.code))} disabled={!technique.owned || technique.active || Boolean(busy)}>{technique.active ? '当前修习' : technique.owned ? '设为主修' : '功法谱未收录'}</button></article>)}</div>
            <Pagination page={gamePages.techniques.page} total={gamePages.techniques.total} onChange={(page) => updateCollection('techniques', { page })} />
          </div>}

          {activeTab === 'equipment' && <div className="equipment-view">
            <div className="section-heading"><div><small>百炼成器</small><h1>炼器与装备</h1></div><Hammer size={24} /></div>
            <div className="loadout-grid">
              {[
                ['attack', '武器位', Swords, '刀、剑、枪、扇、杖等武器，以攻击与先手为主。'],
                ['defense', '护器位', Shield, '甲、袍、冠、履、盾等护器，以防御与气血为主。'],
              ].map(([slot, label, SlotIcon, emptyText]) => {
                const equipped = character.equipped_weapons?.[slot]
                return <div className={`equipped-strip equipped-${slot}`} key={slot}>{equipped ? <><img src={equipped.image_url} alt="" /><div><small>{label}</small><strong>{equipped.name}</strong><span>攻击 +{equipped.bonuses.atk} · 防御 +{equipped.bonuses.def} · 气血 +{equipped.bonuses.hp} · 身法 +{equipped.bonuses.spd}</span></div><button className="secondary-command" onClick={() => run(`unequip-${slot}`, () => gameAPI.unequipWeapon(slot))}>卸下</button></> : <><SlotIcon size={30} /><div><small>{label}</small><strong>尚未装备</strong><span>{emptyText}</span></div></>}</div>
              })}
            </div>
            <div className="queue-bar forging-queue">{[0, 1, 2].map((slot) => { const task = state.equipment_queue?.[slot]; return <div className="queue-slot" key={slot}>{task ? <><span>{task.name} × {task.quantity}</span><small>{task.ready ? '器物已成' : `还需 ${remaining(task.finish_at)} 秒`}</small>{task.ready && <button onClick={() => run(`collect-forge-${task.id}`, () => gameAPI.collectForging(task.id))} disabled={busy === `collect-forge-${task.id}`}>领取</button>}</> : <><span>空闲炉位</span><small>等待器谱入炉</small></>}</div> })}</div>
            <div className="codex-summary"><span>符合筛选 <b>{gamePages.equipment.total}</b></span><span>当前页 <b>{equipment.length}/10</b></span><span>炼器炉位 <b>{state.equipment_queue?.length || 0}/3</b></span></div>
            <CollectionToolbar query={collectionViews.equipment.query} category={collectionViews.equipment.category} categories={[["all", "全部器物"], ["attack", "武器"], ["defense", "护器"], ["recipe_unlocked", "已收录器谱"], ["owned", "已持有"], ["equipped", "装备中"], ["unowned", "未持有"]]} onQuery={(query) => updateCollection('equipment', { query })} onCategory={(category) => updateCollection('equipment', { category })} />
            <QualityFilter value={quality} onChange={(value) => { setQuality(value); updateCollection('equipment', { page: 1 }) }} />
            <div className="equipment-grid codex-grid">{paginate(equipment, collectionViews.equipment.page).map((item) => {
              const canForge = item.recipe_unlocked && item.ingredients?.every((material) => material.owned >= material.quantity)
              return <article key={item.code} className={item.quantity < 1 && !item.recipe_unlocked ? 'locked-entry' : ''}>
                <img className="equipment-art" src={item.image_url} alt="" loading="lazy" />
                <div className="entry-main">
                  <div className="entry-head"><span className={`rarity ${item.rarity}`}>{rarityLabels[item.rarity]}</span><span>{item.combat_role === 'attack' ? '武器' : '护器'} · {weaponTypeLabels[item.weapon_type]} · {item.major_realm}</span></div>
                  <h3>{item.name}</h3><p>{item.description}</p>
                  <div className="effect-stats"><span>攻击 +{item.attack_bonus}</span>{item.defense_bonus > 0 && <span>防御 +{item.defense_bonus}</span>}{item.hp_bonus > 0 && <span>气血 +{item.hp_bonus}</span>}{item.speed_bonus > 0 && <span>身法 +{item.speed_bonus}</span>}</div>
                  <div className="ingredients forging-ingredients">{item.ingredients?.map((material) => <span key={material.code} className={material.owned < material.quantity ? 'missing' : ''}>{material.name} {material.owned}/{material.quantity}{material.source_area ? ` · ${material.source_area}` : ''}</span>)}</div>
                  <small className="source-line">{item.recipe_unlocked ? item.source_description : item.recipe_source_description || item.source_description}</small>
                </div>
                <div className="equipment-action"><small>{item.quantity > 0 ? `持有 ${item.quantity}${item.locked ? ' · 已锁定' : ''}` : item.recipe_unlocked ? `器谱已收录 · ${item.craft_time_s} 秒` : '器谱未收录'}</small><div className="entry-actions">
                  <button className="secondary-command forge-command" title={item.recipe_unlocked ? '炼制器物' : '尚未收录器谱'} onClick={() => run(`forge-${item.code}`, () => gameAPI.forge(item.code))} disabled={!canForge || Boolean(busy) || (state.equipment_queue?.length || 0) >= 3}><Hammer size={16} />炼制</button>
                  {item.quantity > 0 && <button className="icon-button" title={item.locked ? '解除锁定' : '锁定保护'} onClick={() => run(`protect-equipment-${item.code}`, () => gameAPI.protectEquipment(item.code, !item.locked))}>{item.locked ? <Lock size={16} /> : <Unlock size={16} />}</button>}
                  {item.quantity > 0 && <button className="icon-button danger-command" title="分解器物" onClick={() => { setRecycleTarget({ kind: 'equipment', code: item.code, name: item.name, max: item.quantity }); setRecycleAmount(1) }} disabled={item.equipped || item.locked}><Recycle size={16} /></button>}
                  <button className={item.equipped ? 'active-technique' : 'secondary-command'} onClick={() => run(`equip-weapon-${item.code}`, () => gameAPI.equipWeapon(item.code))} disabled={!item.quantity || !item.can_equip || item.equipped || Boolean(busy)}>{item.equipped ? `${item.equipped_slot === 'attack' ? '武器位' : '护器位'}装备中` : !item.can_equip ? `需${item.major_realm}` : `装备${item.combat_role === 'attack' ? '武器位' : '护器位'}`}</button>
                </div></div>
              </article>
            })}</div>
            <Pagination page={gamePages.equipment.page} total={gamePages.equipment.total} onChange={(page) => updateCollection('equipment', { page })} />
          </div>}

          {activeTab === 'inventory' && <div className="inventory-view">
            <div className="section-heading"><div><small>随身之物</small><h1>乾坤行囊</h1></div><Backpack size={24} /></div>
            <CollectionToolbar query={collectionViews.inventory.query} category={collectionViews.inventory.category} categories={[["all", "全部物品"], ["equipment", "武器 / 护器"], ["material", "炼丹材料"], ["pill", "丹药"], ["breakthrough", "破境丹食"], ["breakthrough_protection", "护脉丹"], ["buff", "修炼辅物"], ["collectible", "收藏品"]]} onQuery={(query) => updateCollection('inventory', { query })} onCategory={(category) => updateCollection('inventory', { category })} />
            {showsCarriedEquipment && <section className="backpack-equipment">
              <div className="backpack-equipment-heading"><div><small>随身器物</small><h2>装备行囊</h2></div><span>{gamePages.carriedEquipment.total} 件</span></div>
              {carriedEquipment.length > 0 ? <div className="backpack-equipment-list">{carriedEquipment.map((item) => <article key={item.code}>{item.image_url ? <img src={item.image_url} alt={item.name} loading="lazy" /> : <span className="backpack-equipment-art">{item.combat_role === 'attack' ? <Swords size={20} /> : <Shield size={20} />}</span>}<div><div className="entry-head"><h3>{item.name}</h3><span className={`rarity ${item.rarity}`}>{rarityLabels[item.rarity]}</span></div><small>{item.combat_role === 'attack' ? '武器' : '护器'} · {weaponTypeLabels[item.weapon_type]} · 持有 {item.quantity}{item.locked ? ' · 已锁定' : ''}</small><p>攻击 +{item.attack_bonus} · 防御 +{item.defense_bonus} · 气血 +{item.hp_bonus} · 身法 +{item.speed_bonus}</p></div><div className="inventory-actions equipment-inventory-actions">{item.equipped ? <span className="equipment-status">{item.equipped_slot === 'attack' ? '武器位已装备' : '护器位已装备'}</span> : <button className="secondary-command" onClick={() => run(`equip-weapon-${item.code}`, () => gameAPI.equipWeapon(item.code))} disabled={!item.can_equip || Boolean(busy)}>{item.can_equip ? `装备${item.combat_role === 'attack' ? '武器位' : '护器位'}` : `需${item.major_realm}`}</button>}<button className="icon-button" title={item.locked ? '解除锁定' : '锁定保护'} onClick={() => run(`protect-equipment-${item.code}`, () => gameAPI.protectEquipment(item.code, !item.locked))}><span className="sr-only">{item.locked ? '解除锁定' : '锁定保护'}</span>{item.locked ? <Lock size={16} /> : <Unlock size={16} />}</button><button className="icon-button danger-command" title={item.equipped ? '已装备器物不可分解' : item.locked ? '已锁定器物不可分解' : '分解器物'} onClick={() => { setRecycleTarget({ kind: 'equipment', code: item.code, name: item.name, max: item.quantity }); setRecycleAmount(1) }} disabled={item.equipped || item.locked || Boolean(busy)}><span className="sr-only">分解器物</span><Recycle size={16} /></button></div></article>)}</div> : <p className="empty-state backpack-equipment-empty">行囊中暂无器物。</p>}
              <Pagination page={gamePages.carriedEquipment.page} total={gamePages.carriedEquipment.total} onChange={setInventoryEquipmentPage} />
            </section>}
            <div className="inventory-grid">{paginate(inventory, collectionViews.inventory.page).map((item) => <article key={item.code}>{item.image_url ? <img className="item-art" src={item.image_url} alt="" loading="lazy" /> : <span className={`item-glyph type-${item.type}`}>{item.type === 'material' ? <PackageCheck /> : <Sparkles />}</span>}<div><div className="entry-head"><h3>{item.name}</h3><span className={`rarity ${item.rarity}`}>{rarityLabels[item.rarity]}</span></div><small>{typeLabels[item.type] || '其他物品'} · 持有 {item.quantity}{item.locked ? ' · 已锁定' : ''}</small><p>{item.description}</p>{item.type !== 'material' && <p className="effect-line">{item.effect_summary}</p>}<small className="source-line">{item.source_description || '可通过游历、炼制或事件获得。'}</small></div><div className="inventory-actions">{['pill', 'buff'].includes(item.type) && <button className="secondary-command" onClick={() => run(`use-${item.code}`, () => gameAPI.useItem(item.code))} disabled={Boolean(busy) || item.used_once && (item.effect?.atk || item.effect?.def || item.effect?.spd)}>{item.used_once ? '已经生效' : '使用'}</button>}<button className="icon-button" title={item.locked ? '解除锁定' : '锁定保护'} onClick={() => run(`protect-item-${item.code}`, () => gameAPI.protectItem(item.code, !item.locked))}>{item.locked ? <Lock size={16} /> : <Unlock size={16} />}</button><button className="icon-button danger-command" title="销毁物品" onClick={() => { setRecycleTarget({ kind: 'item', code: item.code, name: item.name, max: item.quantity }); setRecycleAmount(1) }} disabled={item.locked}><Recycle size={16} /></button></div></article>)}</div>
            {collectionViews.inventory.category !== 'equipment' && <Pagination page={gamePages.inventory.page} total={gamePages.inventory.total} onChange={(page) => updateCollection('inventory', { page })} />}
            {!inventory.length && collectionViews.inventory.category !== 'equipment' && <p className="empty-state">没有符合条件的物品，换个分类或搜索词试试。</p>}
          </div>}

          {activeTab === 'profile' && <div className="profile-view">
            <div className="section-heading"><div><small>命数与根骨</small><h1>{character.name}</h1></div><UserRound size={24} /></div>
            <div className="profile-layout"><Portrait character={character} alt={`${character.origin?.name}角色画像`} /><div className="profile-hero"><div><span>{character.gender === 'female' ? '女修' : '男修'} · {character.title}</span><h2>{character.realm}</h2><p>{character.realm_desc}</p></div><div><small>出身</small><strong>{character.origin?.name}</strong><p>{character.origin?.description}</p></div></div></div>
            <div className="stat-grid"><div><span>气血</span><b>{character.stats.hp}/{character.stats.hp_max}</b></div><div><span>攻击</span><b>{character.stats.atk}</b></div><div><span>防御</span><b>{character.stats.def}</b></div><div><span>身法</span><b>{character.stats.spd}</b></div><div><span>每息灵气</span><b>{formatNumber(character.qi_per_second)}</b></div><div><span>闭关上限</span><b>{character.offline_qi_cap_hrs} 时辰</b></div></div>
            <div className="profile-section"><small>当前功法</small><h3>{character.active_technique?.name || '未修功法'}</h3><p>{character.active_technique?.description || '尚未选择主修功法。'}</p></div>
            <div className="profile-section"><small>当前器装</small><h3>{[character.equipped_weapons?.attack?.name, character.equipped_weapons?.defense?.name].filter(Boolean).join(' · ') || '赤手空拳'}</h3><p>武器与护器各可装备一件：武器主攻击，护器主防御与气血，两件属性共同计入战斗。</p></div>
            <div className="profile-section"><small>出身带来的细微差异</small><div className="origin-bonuses">{Object.entries(character.origin?.bonuses || {}).map(([key, value]) => <span key={key}>{({ hp: '气血', atk: '攻击', def: '防御', spd: '身法', fate_points: '奇缘' })[key] || key} +{value}</span>)}</div></div>
          </div>}

          {activeTab === 'market' && <div className="market-view">
            <div className="section-heading"><div><small>灵石流转</small><h1>山海坊市</h1></div><Store size={24} /></div>
            <div className="market-balance"><Gem size={18} /><span>可用灵石</span><strong>{formatNumber(market.spirit_stones ?? character.spirit_stones)}</strong></div>
            <div className="market-modes"><button className={marketMode === 'shop' ? 'active' : ''} onClick={() => setMarketMode('shop')}><Store size={16} />系统商店</button><button className={marketMode === 'auction' ? 'active' : ''} onClick={() => setMarketMode('auction')}><Gavel size={16} />玩家拍卖</button><button className={marketMode === 'system' ? 'active' : ''} onClick={() => setMarketMode('system')}><Sparkles size={16} />系统拍卖</button></div>
            {marketMode === 'shop' && <Pagination page={marketPages.shop.page} total={marketPages.shop.total} onChange={(page) => setMarketViews((current) => ({ ...current, shop: page }))} />}
            {marketMode === 'auction' && <div className="market-page-controls"><div><small>可寄售物</small><Pagination page={marketPages.sellable.page} total={marketPages.sellable.total} onChange={(page) => setMarketViews((current) => ({ ...current, sellable: page }))} /></div><div><small>玩家拍卖</small><Pagination page={marketPages.listings.page} total={marketPages.listings.total} onChange={(page) => setMarketViews((current) => ({ ...current, listings: page }))} /></div></div>}
            {marketMode === 'shop' && <div className="market-grid">{market.shop?.map((item) => <article key={item.code}>{item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : <PackageCheck />}<div><div className="entry-head"><h3>{item.name}</h3><span className={`rarity ${item.rarity}`}>{rarityLabels[item.rarity]}</span></div><p>{item.description}</p><small>{item.major_realm} · {item.source_description}</small></div><button className="secondary-command" onClick={() => marketRun(`shop-${item.code}`, () => marketAPI.buyShop(item.code))} disabled={Boolean(busy) || market.spirit_stones < item.price}><Gem size={15} />{formatNumber(item.price)}</button></article>)}{!market.shop?.length && <p className="empty-state">当前境界暂无可购货物。</p>}</div>}
            {marketMode === 'auction' && <div className="auction-layout"><form className="auction-form" onSubmit={submitAuction}><h3>寄售上架</h3><label><span>物品或器物</span><select value={auctionAsset} onChange={(event) => { const nextAsset = event.target.value; const nextItem = market.sellable?.find((item) => `${item.asset_type}:${item.code}` === nextAsset); setAuctionAsset(nextAsset); setAuctionQuantity((current) => Math.max(1, Math.min(Number(nextItem?.quantity) || 1, current))) }}>{market.sellable?.map((item) => <option key={`${item.asset_type}:${item.code}`} value={`${item.asset_type}:${item.code}`}>{item.name} · {rarityLabels[item.rarity]} · 持有 {item.quantity}</option>)}</select></label><div><label><span>数量</span><input type="number" min="1" max={selectedAuctionAsset?.quantity || 1} value={auctionQuantity} onChange={(event) => setAuctionQuantity(Math.max(1, Math.min(Number(selectedAuctionAsset?.quantity) || 1, Number(event.target.value) || 1)))} /></label><label><span>单价</span><input type="number" min="1" max="1000000000000" value={auctionPrice} onChange={(event) => setAuctionPrice(Math.max(1, Number(event.target.value) || 1))} /></label></div><small>上架收取总价 2% 手续费；成交后扣除 5% 交易税，货物与灵石均通过信箱领取。</small><button className="primary-command" disabled={!selectedAuctionAsset || Boolean(busy)}><Gavel size={17} />确认上架</button></form><div className="auction-list">{market.listings?.map((listing) => { const name = listing.item_name || listing.equipment_name; const rarity = listing.item_rarity || listing.equipment_rarity; const imageUrl = listing.item_image_url || listing.equipment_image_url; const total = Number(listing.unit_price) * Number(listing.quantity); return <article key={listing.id}>{imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <PackageCheck />}<div><div className="entry-head"><h3>{name}</h3><span className={`rarity ${rarity}`}>{rarityLabels[rarity]}</span></div><p>{listing.quantity} 件 · 单价 {formatNumber(listing.unit_price)} 灵石</p><small>卖家 {listing.seller_name}</small></div><button className="secondary-command" onClick={() => marketRun(`${listing.is_own ? 'cancel' : 'buy'}-${listing.id}`, () => listing.is_own ? marketAPI.cancelAuction(listing.id) : marketAPI.buyAuction(listing.id), true)} disabled={Boolean(busy) || !listing.is_own && market.spirit_stones < total}>{listing.is_own ? '撤拍' : <><Gem size={15} />{formatNumber(total)}</>}</button></article> })}{!market.listings?.length && <p className="empty-state">暂无玩家寄售。</p>}</div></div>}
            {marketMode === 'system' && <div className="system-auction-closed"><Gavel size={38} /><h2>系统拍卖筹备中</h2><p>稀世器物尚未入场，功能开放后将在此进行限时竞价。</p></div>}
          </div>}

          {activeTab === 'mail' && <div className="mail-view">
            <div className="section-heading"><div><small>附件领取</small><h1>传书信箱</h1></div><Mail size={24} /></div>
            <div className="mail-summary"><span>未领取附件</span><strong>{mailbox.unclaimed || 0}</strong></div>
            <div className="mail-list">{mailbox.items?.map((mail) => { const assetName = mail.item_name || mail.equipment_name; const imageUrl = mail.item_image_url || mail.equipment_image_url; return <article key={mail.id} className={mail.claimed ? 'claimed' : ''}>{imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <Mail size={24} />}<div><div className="entry-head"><h3>{mail.title}</h3><span>{mail.claimed ? '已领取' : '待领取'}</span></div><p>{mail.body}</p><small>{assetName ? `${assetName} × ${mail.quantity}` : ''}{assetName && mail.spirit_stones > 0 ? ' · ' : ''}{mail.spirit_stones > 0 ? `${formatNumber(mail.spirit_stones)} 灵石` : ''}</small><time>{new Date(mail.created_at).toLocaleString('zh-CN')}</time></div><button className="secondary-command" onClick={() => marketRun(`mail-${mail.id}`, () => marketAPI.claimMail(mail.id), true)} disabled={mail.claimed || Boolean(busy)}><PackageCheck size={16} />{mail.claimed ? '已收取' : '领取附件'}</button></article> })}{!mailbox.items?.length && <p className="empty-state">暂时没有传书。</p>}</div>
            <Pagination page={mailbox.page} total={mailbox.total} onChange={setMailPage} />
          </div>}

          {activeTab === 'social' && <div className="social-view">
            <div className="section-heading"><div><small>山海有同道</small><h1>道友与传音</h1></div><Users size={24} /></div>
            <div className="social-modes"><button className={socialMode === 'chat' ? 'active' : ''} onClick={() => setSocialMode('chat')}><MessageCircle size={16} />传音</button><button className={socialMode === 'friends' ? 'active' : ''} onClick={() => setSocialMode('friends')}><Users size={16} />道友录{socialPages.incoming.total > 0 && <b>{socialPages.incoming.total}</b>}</button></div>
            {socialMode === 'chat' && <div className="social-page-controls"><div><small>道友</small><Pagination page={socialPages.friends.page} total={socialPages.friends.total} onChange={(page) => setSocialViews((current) => ({ ...current, friends: page }))} /></div><div><small>传音记录</small><Pagination page={socialPages.messages.page} total={socialPages.messages.total} onChange={(page) => setSocialViews((current) => ({ ...current, messages: page }))} /></div></div>}
            {socialMode === 'friends' && <div className="social-page-controls"><div><small>待回应申请</small><Pagination page={socialPages.incoming.page} total={socialPages.incoming.total} onChange={(page) => setSocialViews((current) => ({ ...current, incoming: page }))} /></div><div><small>我的道友</small><Pagination page={socialPages.friends.page} total={socialPages.friends.total} onChange={(page) => setSocialViews((current) => ({ ...current, friends: page }))} /></div>{searchTerm.trim().length >= 2 && <div><small>搜索结果</small><Pagination page={socialPages.search.page} total={socialPages.search.total} onChange={loadPlayerSearch} /></div>}</div>}
            {socialMode === 'chat' && <div className="chat-layout"><aside className="chat-channels"><button className={chatChannel === 'global' ? 'active' : ''} onClick={() => { setChatChannel('global'); setChatFriend('') }}>天下传音</button>{social.friends.map((friend) => <button key={friend.username} className={chatChannel === 'direct' && chatFriend === friend.username ? 'active' : ''} onClick={() => { setChatChannel('direct'); setChatFriend(friend.username) }}><span>{friend.character_name || friend.username}</span><small>{friend.realm}</small></button>)}</aside><div className="chat-panel"><div className="message-list">{messages.map((message) => <div key={message.id} className={message.username === user?.username ? 'own-message' : ''}><span>{message.character_name || message.username}</span><p>{message.body}</p><small>{new Date(message.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</small></div>)}{!messages.length && <p className="empty-state">此处尚无传音。</p>}</div><form className="message-form" onSubmit={sendChat}><input value={messageBody} onChange={(event) => setMessageBody(event.target.value)} maxLength={200} placeholder={chatChannel === 'global' ? '向天下道友传音' : `传音给 ${chatFriend}`} disabled={chatChannel === 'direct' && !chatFriend} /><button className="primary-command" disabled={!messageBody.trim() || Boolean(busy)}>发送</button></form></div></div>}
            {socialMode === 'friends' && <div className="friends-layout"><form className="player-search" onSubmit={searchPlayers}><Search size={17} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="搜索账号或角色名" maxLength={20} /><button className="secondary-command" disabled={busy === 'player-search'}>搜索</button></form>{social.incoming.length > 0 && <section><h3>待回应申请</h3><div className="request-list">{social.incoming.map((request) => <div key={request.id}><span>{request.character_name || request.username}</span><button title="接受" onClick={() => socialRun(`accept-${request.id}`, () => socialAPI.respondFriend(request.id, 'accept'))}><Check size={17} /></button><button title="拒绝" onClick={() => socialRun(`reject-${request.id}`, () => socialAPI.respondFriend(request.id, 'reject'))}><X size={17} /></button></div>)}</div></section>}{searchResults.length > 0 && <section><h3>搜索结果</h3><div className="player-list">{searchResults.map((player) => <div key={player.username}><div><strong>{player.character_name || player.username}</strong><small>{player.username} · {player.realm}</small></div><button className="secondary-command" disabled={player.relation !== 'none' || Boolean(busy)} onClick={() => socialRun(`add-${player.username}`, () => socialAPI.requestFriend(player.username))}>{({ friend: '已是道友', sent: '等待回应', received: '待你回应', none: '添加道友' })[player.relation]}</button></div>)}</div></section>}<section><h3>我的道友</h3><div className="friend-grid">{social.friends.map((friend) => <article key={friend.username}>{friend.portrait_url ? <img src={friend.portrait_url} data-fallback={friend.portrait_fallback_url} onError={(event) => { const fallback = event.currentTarget.dataset.fallback; if (fallback) { event.currentTarget.onerror = null; event.currentTarget.src = fallback } }} alt="" /> : <UserRound />}<div><strong>{friend.character_name || friend.username}</strong><small>{friend.realm} · {friend.username}</small></div><button className="secondary-command" onClick={() => { setSocialMode('chat'); setChatChannel('direct'); setChatFriend(friend.username) }}>传音</button></article>)}</div>{!social.friends.length && <p className="empty-state">道友录尚空，可搜索玩家发送申请。</p>}</section></div>}
          </div>}
        </section>
      </main>

      {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)}><div className="mobile-menu-sheet" onClick={(event) => event.stopPropagation()}><div><span>更多功能</span><button className="icon-button" title="关闭" onClick={() => setMobileMenuOpen(false)}><X size={18} /></button></div><nav>{tabs.filter((tab) => !mobilePrimaryTabs.has(tab.id)).map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => selectTab(id)}><Icon size={20} /><span>{label}</span><ChevronRight size={16} /></button>)}</nav></div></div>}
      {announcementsOpen && <div className="dialog-backdrop"><div className="event-dialog announcement-dialog" role="dialog" aria-modal="true" aria-labelledby="announcement-title"><div className="dialog-title-row"><div><span className="event-kicker">宗门传讯</span><h2 id="announcement-title">游戏公告</h2></div><button className="icon-button" title="关闭公告" onClick={() => setAnnouncementsOpen(false)}><X size={18} /></button></div><div className="announcement-list">{announcements.items.map((announcement) => <article key={announcement.id}><div><strong>{announcement.pinned ? '置顶 · ' : ''}{announcement.title}</strong><time>{new Date(announcement.updated_at).toLocaleString('zh-CN')}</time></div><p>{announcement.body}</p></article>)}{!announcements.items.length && <p className="empty-state">当前没有公告。</p>}</div><Pagination page={announcements.page} total={announcements.total} onChange={loadAnnouncements} /></div></div>}
      {encounter && !explorationResult && <div className="dialog-backdrop"><div className="event-dialog encounter-dialog">{encounter.image_url && <img className="boss-art" src={encounter.image_url} alt={encounter.name} />}<span className="event-kicker">突发遭遇 · {combatRankLabels[encounter.rank]}</span><h2>{encounter.name}</h2><p>{encounter.description}</p><div className="encounter-forecast"><div><small>胜负预估</small><strong className={`forecast-${encounter.forecast}`}>{encounter.forecast}</strong></div><div><small>我方 / 敌方战力</small><strong>{formatNumber(encounter.player_power)} / {formatNumber(encounter.enemy_power)}</strong></div><div><small>挑战消耗</small><strong>{encounterStaminaCost} 精力</strong></div></div><div className="enemy-stats"><span>气血 <b>{formatNumber(encounter.hp)}</b></span><span>攻击 <b>{formatNumber(encounter.atk)}</b></span><span>防御 <b>{formatNumber(encounter.def)}</b></span><span>身法 <b>{formatNumber(encounter.spd)}</b></span></div>{encounter.missing_requirements?.length > 0 && <div className="boss-requirements"><strong>尚未具备挑战资格</strong>{encounter.missing_requirements.map((requirement) => <span key={requirement}>{requirement}</span>)}</div>}<div className="dialog-actions"><button className="secondary-command" onClick={avoidEncounter} disabled={Boolean(busy)}>避开</button><button className="primary-command" onClick={() => fight(encounter.code)} disabled={Boolean(busy) || encounter.can_challenge === false || character.stats.hp <= 1 || character.stamina.current < encounterStaminaCost}><Swords size={17} />迎战 · {encounterStaminaCost}</button></div>{character.stamina.current < encounterStaminaCost && <p className="form-error">精力不足，可等待恢复或在行囊服用养神丸。</p>}</div></div>}
      {recycleTarget && <div className="dialog-backdrop"><div className="dialog recycle-dialog"><Recycle size={30} /><h2>{recycleTarget.kind === 'equipment' ? '分解器物' : '销毁物品'}</h2><p>将消耗 <strong>{recycleTarget.name}</strong>，按真实炼器配方返还 30% 材料，每种材料不足 1 份时不返还。此操作不可撤销。</p><label><span>处理数量（最多 {recycleTarget.max}）</span><input type="number" min="1" max={recycleTarget.max} value={recycleAmount} onChange={(event) => setRecycleAmount(Math.max(1, Math.min(recycleTarget.max, Number(event.target.value) || 1)))} /></label><div className="dialog-actions"><button className="secondary-command" onClick={() => setRecycleTarget(null)}>取消</button><button className="primary-command danger-primary" onClick={confirmRecycle} disabled={busy === `recycle-${recycleTarget.code}`}><Recycle size={17} />确认处理</button></div></div></div>}
      {battleHistoryOpen && <div className="dialog-backdrop"><div className="event-dialog battle-history-dialog" role="dialog" aria-modal="true" aria-labelledby="battle-history-title"><div className="dialog-title-row"><div><span className="event-kicker">战斗记录</span><h2 id="battle-history-title">战绩查询</h2></div><button className="icon-button" title="关闭战绩" onClick={() => setBattleHistoryOpen(false)}><X size={18} /></button></div><div className="battle-history">{recentBattles.map((battle, index) => <div key={`${battle.fought_at}-${index}`}><span className={battle.result === 'win' ? 'battle-win' : 'battle-lose'}>{battle.result === 'win' ? '胜' : '败'}</span><strong>{battle.name || battle.enemy_code}</strong><small>{battle.rounds} 回合 · {new Date(battle.fought_at).toLocaleString('zh-CN')}</small><button className="icon-button" title="查看战报与掉落" onClick={() => inspectBattle(battle)}><ChevronRight size={16} /></button></div>)}{!recentBattles.length && <p className="empty-state">尚无战绩，游历时可能遭遇敌人。</p>}</div><Pagination page={gamePages.battles.page} total={gamePages.battles.total} onChange={loadBattleHistory} /></div></div>}
      {state?.pending_event && <div className="dialog-backdrop"><div className="event-dialog"><span className="event-kicker">奇遇</span><h2>{state.pending_event.title}</h2><p>{state.pending_event.body}</p><div className="event-choices">{state.pending_event.choices.map((choice, index) => <button key={choice.text} onClick={() => choose(index)} disabled={Boolean(busy)}><span>{choice.text}</span><ChevronRight size={18} /></button>)}</div></div></div>}
      {lastBattle && <div className="dialog-backdrop"><div className="event-dialog battle-result">{battlePage === 'summary' ? <><span className="event-kicker">{lastBattle.result === 'win' ? '战胜' : '败退'}</span><h2>{lastBattle.result === 'win' ? '此战告捷' : '气血将尽'}</h2><p>{lastBattle.message}</p><div className="battle-overview"><span>交锋回合 <b>{lastBattle.rounds}</b></span><span>剩余气血 <b>{formatNumber(lastBattle.player_hp || 0)}</b></span><span>获得灵气 <b>{formatNumber(lastBattle.qi_reward || 0)}</b></span><span>获得灵石 <b>{formatNumber(lastBattle.stone_reward || 0)}</b></span></div><div className="dialog-actions"><button className="secondary-command" onClick={closeBattle}>关闭</button><button className="primary-command" onClick={() => setBattlePage('details')}><ScrollText size={17} />查看战报与掉落</button></div></> : <><span className="event-kicker">战斗详情</span><h2>{lastBattle.enemy_name || (lastBattle.result === 'win' ? '此战告捷' : '败退')}</h2><div className="battle-loot"><div><Flame size={16} /><span>灵气</span><b>{formatNumber(lastBattle.qi_reward || 0)}</b></div><div><Gem size={16} /><span>灵石</span><b>{formatNumber(lastBattle.stone_reward || 0)}</b></div>{lastBattle.loot?.map((item, index) => <div key={`${item.code}-${index}`} className={`battle-loot-item rarity-${item.rarity || 'common'}`}><RewardArt reward={item} /><span><i className={`rarity ${item.rarity || 'common'}`}>{rarityLabels[item.rarity] || '未记载品级'}</i>{item.name}</span><b>× {item.quantity || 1}</b></div>)}{!lastBattle.loot?.length && <p>此次没有物品掉落。</p>}</div><div className="battle-rounds">{lastBattle.log?.map((line, index) => <span key={index}>{line}</span>)}</div><div className="dialog-actions"><button className="secondary-command" onClick={returnFromBattleDetails}><ChevronLeft size={17} />{battleDetailSource === 'history' ? '返回战绩' : '返回概览'}</button><button className="primary-command" onClick={closeBattle}>关闭</button></div></>}</div></div>}
      {explorationResult && <div className="dialog-backdrop"><div className="event-dialog exploration-result" role="dialog" aria-modal="true" aria-labelledby="exploration-result-title"><div className="dialog-title-row"><div><span className="event-kicker">游历结算</span><h2 id="exploration-result-title">{explorationResult.title}</h2></div><button className="icon-button" title="关闭结算" onClick={() => setExplorationResult(null)}><X size={18} /></button></div><p>{explorationResult.narrative || explorationResult.result}</p>{explorationResult.rewards?.length > 0 ? <div className="reward-list">{explorationResult.rewards.map((reward, index) => <article key={`${reward.category}-${reward.code}-${index}`} className={`reward-card rarity-${reward.rarity || 'common'}`}><RewardArt reward={reward} /><div><small>{reward.category === 'item' ? typeLabels[reward.item_type] || dropCategoryLabels.item : dropCategoryLabels[reward.category] || '游历收获'}</small><strong>{reward.name}</strong></div><div className="reward-meta"><span className={`rarity ${reward.rarity || 'common'}`}>{rarityLabels[reward.rarity] || '无品级'}</span><b>× {reward.quantity}</b></div></article>)}</div> : <p className="empty-state reward-empty">本次未获得可收录掉落。</p>}<button className="primary-command" onClick={() => setExplorationResult(null)}>收下</button></div></div>}
      {explorationHistoryOpen && <div className="dialog-backdrop"><div className="event-dialog exploration-history-dialog" role="dialog" aria-modal="true" aria-labelledby="exploration-history-title"><div className="dialog-title-row"><div><span className="event-kicker">行迹留痕</span><h2 id="exploration-history-title">游历记录</h2></div><button className="icon-button" title="关闭游历记录" onClick={() => setExplorationHistoryOpen(false)}><X size={18} /></button></div><div className="exploration-history-list">{explorationHistoryLoading && !explorationHistory.items.length && <p className="empty-state history-empty">读取记录中...</p>}{!explorationHistoryLoading && !explorationHistory.items.length && <p className="empty-state history-empty">尚无游历记录。</p>}{explorationHistory.items.map((record) => <article key={record.id}><div className="exploration-history-head"><div><span>{record.area_name}</span><strong>{record.event_title}</strong></div><time>{new Date(record.explored_at).toLocaleString('zh-CN')}</time></div><p>{record.narrative}</p>{record.choice_text && <small className="history-choice">{record.choice_text}</small>}{Array.isArray(record.rewards) && record.rewards.length > 0 ? <div className="exploration-history-rewards">{record.rewards.map((reward, index) => <span key={`${reward.category}-${reward.code}-${index}`} className={`history-reward rarity-${reward.rarity || 'common'}`}><RewardArt reward={reward} className="history-reward-art" /><b>{reward.name}</b><em>× {reward.quantity}</em></span>)}</div> : <small className="history-no-reward">无额外掉落</small>}</article>)}</div><Pagination page={explorationHistory.page} total={explorationHistory.total} onChange={loadExplorationHistory} /></div></div>}
      {notice && <div className="toast">{notice}</div>}
    </div>
  )
}

export default GamePage
