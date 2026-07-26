const { query } = require('../config/db');
const {
  httpError,
  requireReason,
  requireInteger,
  runAdminMutation,
} = require('../services/adminService');

const rarityOrder = `CASE t.rarity WHEN 'legendary' THEN 5 WHEN 'rare' THEN 4 WHEN 'uncommon' THEN 2 ELSE 1 END`;

function paging(req, max = 100) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(max, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 30));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

async function dashboard(req, res) {
  const [summary, realms, audits] = await Promise.all([
    query(`SELECT
      (SELECT COUNT(*)::int FROM users) players,
      (SELECT COUNT(*)::int FROM users WHERE created_at >= CURRENT_DATE) new_today,
      (SELECT COUNT(*)::int FROM users u JOIN characters c ON c.user_id=u.id WHERE c.last_online_at >= CURRENT_DATE) active_today,
      (SELECT COUNT(*)::int FROM users u JOIN characters c ON c.user_id=u.id WHERE c.last_online_at >= NOW()-INTERVAL '7 days') active_seven_days,
      (SELECT COUNT(*)::int FROM users WHERE status='banned' AND (banned_until IS NULL OR banned_until>NOW())) banned,
      (SELECT COALESCE(SUM(spirit_stones),0)::text FROM characters) spirit_stones,
      (SELECT COUNT(*)::int FROM auction_listings WHERE status='active') active_auctions,
      (SELECT COUNT(*)::int FROM mail_messages WHERE claimed=FALSE AND expires_at>NOW()) unclaimed_mail,
      (SELECT COUNT(*)::int FROM battle_logs WHERE fought_at>=NOW()-INTERVAL '24 hours') battles_24h`),
    query(`SELECT r.major_realm name, COUNT(*)::int count
           FROM characters c JOIN realms r ON r.id=c.realm_id
           GROUP BY r.major_realm, r.order_index ORDER BY MIN(r.order_index)`),
    query(`SELECT id, admin_username, action, target_type, target_id, success, created_at
           FROM admin_audit_logs ORDER BY created_at DESC LIMIT 10`),
  ]);
  res.json({ summary: summary.rows[0], realmDistribution: realms.rows, recentAudits: audits.rows, requestId: req.requestId });
}

async function players(req, res) {
  const { page, pageSize, offset } = paging(req);
  const search = String(req.query.search || '').trim();
  const status = ['active', 'banned'].includes(req.query.status) ? req.query.status : null;
  const realmId = Number.isInteger(Number(req.query.realmId)) ? Number(req.query.realmId) : null;
  const result = await query(
    `SELECT COUNT(*) OVER()::int total,
            u.id user_id, u.username, u.status, u.ban_reason, u.banned_until, u.created_at, u.last_login_at,
            c.id character_id, c.name character_name, c.current_qi::text, c.spirit_stones::text,
            c.stamina, c.last_online_at, c.admin_version::text,
            r.id realm_id, r.major_realm, r.sub_stage, r.order_index
     FROM users u LEFT JOIN characters c ON c.user_id=u.id LEFT JOIN realms r ON r.id=c.realm_id
     WHERE ($1='' OR u.username ILIKE '%'||$1||'%' OR c.name ILIKE '%'||$1||'%' OR u.id::text=$1 OR c.id::text=$1)
       AND ($2::text IS NULL OR u.status=$2)
       AND ($3::int IS NULL OR c.realm_id=$3)
     ORDER BY COALESCE(c.last_online_at,u.created_at) DESC
     LIMIT $4 OFFSET $5`,
    [search, status, realmId, pageSize, offset]
  );
  res.json({ items: result.rows, total: result.rows[0]?.total || 0, page, pageSize, requestId: req.requestId });
}

async function playerDetail(req, res) {
  const userId = requireInteger(req.params.id, '玩家 ID', 1, 2147483647);
  const base = await query(
    `SELECT u.id user_id, u.username, u.email, u.status, u.ban_reason, u.banned_until, u.session_version,
            u.created_at user_created_at, u.last_login_at,
            c.*, r.code realm_code, r.major_realm, r.sub_stage, r.order_index, r.qi_required,
            o.name origin_name, t.name active_technique_name, t.rarity active_technique_rarity
     FROM users u LEFT JOIN characters c ON c.user_id=u.id
     LEFT JOIN realms r ON r.id=c.realm_id LEFT JOIN origins o ON o.id=c.origin_id
     LEFT JOIN techniques t ON t.id=c.active_technique WHERE u.id=$1`,
    [userId]
  );
  if (!base.rows[0]) throw httpError(404, '玩家不存在', 'PLAYER_NOT_FOUND');
  const characterId = base.rows[0].id;
  if (!characterId) return res.json({ player: base.rows[0], requestId: req.requestId });

  const [inventory, equipment, techniques, recipes, equipmentRecipes, mail, auctions, battles, explorations, ascensions, audits, ledger] = await Promise.all([
    query(`SELECT i.item_id, i.quantity, i.locked, t.code, t.name, t.type, t.rarity FROM inventories i JOIN items t ON t.id=i.item_id WHERE i.character_id=$1 ORDER BY i.quantity DESC,t.name LIMIT 200`, [characterId]),
    query(`SELECT ce.equipment_id, ce.quantity, ce.equipped, ce.equipped_slot, ce.locked, e.code,e.name,e.rarity,e.combat_role,e.required_order FROM character_equipment ce JOIN equipment e ON e.id=ce.equipment_id WHERE ce.character_id=$1 ORDER BY ce.equipped DESC,e.required_order DESC,e.name LIMIT 200`, [characterId]),
    query(`SELECT t.id,t.code,t.name,t.rarity,t.major_realm,
                  (ct.technique_id=(SELECT active_technique FROM characters WHERE id=$1)) is_active,
                  ct.acquired_at unlocked_at
           FROM character_techniques ct JOIN techniques t ON t.id=ct.technique_id
           WHERE ct.character_id=$1
           ORDER BY is_active DESC,${rarityOrder} DESC,t.required_order DESC LIMIT 200`, [characterId]),
    query(`SELECT i.id,i.code,i.name,i.rarity,cr.acquired_at unlocked_at FROM character_recipes cr JOIN items i ON i.id=cr.item_id WHERE cr.character_id=$1 ORDER BY i.required_order DESC,i.name LIMIT 200`, [characterId]),
    query(`SELECT e.id,e.code,e.name,e.rarity,cr.obtained_at unlocked_at FROM character_equipment_recipes cr JOIN equipment e ON e.id=cr.equipment_id WHERE cr.character_id=$1 ORDER BY e.required_order DESC,e.name LIMIT 200`, [characterId]),
    query(`SELECT m.id,m.title,m.body,m.quantity,m.spirit_stones::text,m.claimed,m.created_at,m.expires_at,i.name item_name,e.name equipment_name FROM mail_messages m LEFT JOIN items i ON i.id=m.item_id LEFT JOIN equipment e ON e.id=m.equipment_id WHERE m.character_id=$1 ORDER BY m.created_at DESC LIMIT 100`, [characterId]),
    query(`SELECT a.*,i.name item_name,e.name equipment_name FROM auction_listings a LEFT JOIN items i ON i.id=a.item_id LEFT JOIN equipment e ON e.id=a.equipment_id WHERE a.seller_character_id=$1 OR a.buyer_character_id=$1 ORDER BY a.created_at DESC LIMIT 100`, [characterId]),
    query(`SELECT id,enemy_code,result,rounds,loot,fought_at FROM battle_logs WHERE character_id=$1 ORDER BY fought_at DESC LIMIT 100`, [characterId]),
    query(`SELECT id,area_name,event_title,choice_text,rewards,explored_at FROM exploration_logs WHERE character_id=$1 ORDER BY explored_at DESC LIMIT 100`, [characterId]),
    query(`SELECT ca.*,r.major_realm,r.sub_stage FROM character_ascensions ca JOIN realms r ON r.id=ca.to_realm_id WHERE ca.character_id=$1 ORDER BY ca.ascended_at DESC LIMIT 100`, [characterId]),
    query(`SELECT id,admin_username,action,reason,before_data,after_data,success,created_at,request_id FROM admin_audit_logs WHERE target_type='player' AND target_id=$1::text ORDER BY created_at DESC LIMIT 100`, [userId]),
    query(`SELECT id,resource_type,resource_id,delta::text,balance_after::text,source_type,description,created_at FROM resource_ledger WHERE character_id=$1 ORDER BY created_at DESC LIMIT 100`, [characterId]),
  ]);
  res.json({
    player: base.rows[0], inventory: inventory.rows, equipment: equipment.rows,
    techniques: techniques.rows, recipes: recipes.rows, equipmentRecipes: equipmentRecipes.rows,
    mail: mail.rows, auctions: auctions.rows, battles: battles.rows, explorations: explorations.rows,
    ascensions: ascensions.rows, audits: audits.rows, ledger: ledger.rows,
    health: buildHealth(base.rows[0], equipment.rows, inventory.rows), requestId: req.requestId,
  });
}

function buildHealth(player, equipment, inventory) {
  const issues = [];
  if (Number(player.hp) < 0 || Number(player.hp) > Number(player.hp_max)) issues.push({ code: 'HP_OUT_OF_RANGE', severity: 'high', message: '当前气血超出 0 到最大气血范围', repairable: true });
  if (Number(player.stamina) < 0 || Number(player.stamina) > 999) issues.push({ code: 'STAMINA_OUT_OF_RANGE', severity: 'high', message: '精力超出合法范围', repairable: true });
  const invalidEquipment = equipment.filter((item) => item.equipped && Number(item.required_order) > Number(player.order_index));
  if (invalidEquipment.length) issues.push({ code: 'INVALID_EQUIPMENT_REQUIREMENT', severity: 'high', message: `${invalidEquipment.length} 件已装备器物不满足境界要求`, repairable: true });
  if (inventory.some((item) => Number(item.quantity) <= 0)) issues.push({ code: 'NEGATIVE_OR_ZERO_ASSET', severity: 'medium', message: '行囊存在零或负数量记录', repairable: true });
  if (player.qi_buff_expires_at && new Date(player.qi_buff_expires_at) < new Date() && Number(player.qi_buff_multiplier) !== 1) issues.push({ code: 'STALE_BUFF', severity: 'medium', message: '存在已过期但未清理的修炼增益', repairable: true });
  if (player.pending_event_id && player.pending_enemy_code) issues.push({ code: 'PENDING_EVENT_AND_ENEMY_CONFLICT', severity: 'medium', message: '随机事件和妖兽遭遇同时处于待处理状态', repairable: true });
  return issues;
}

async function sanction(req, res) {
  const userId = requireInteger(req.params.id, '玩家 ID', 1, 2147483647);
  const reason = requireReason(req.body.reason);
  const action = String(req.body.action || '');
  if (!['ban', 'unban', 'kick'].includes(action)) throw httpError(422, '无效处置动作', 'INVALID_ACTION');
  return runAdminMutation(req, res, { action: `player.${action}`, targetType: 'player', targetId: userId, reason }, async (client) => {
    const found = await client.query('SELECT id,username,status,ban_reason,banned_until,session_version FROM users WHERE id=$1 FOR UPDATE', [userId]);
    if (!found.rows[0]) throw httpError(404, '玩家不存在', 'PLAYER_NOT_FOUND');
    const before = found.rows[0];
    let until = null;
    if (action === 'ban' && req.body.durationHours != null) {
      const hours = requireInteger(req.body.durationHours, '封禁小时', 1, 87600);
      until = new Date(Date.now() + hours * 3600000);
    }
    if (action === 'ban') {
      await client.query(`UPDATE users SET status='banned',ban_reason=$2,banned_until=$3,session_version=session_version+1 WHERE id=$1`, [userId, reason, until]);
    } else if (action === 'unban') {
      await client.query(`UPDATE users SET status='active',ban_reason=NULL,banned_until=NULL,session_version=session_version+1 WHERE id=$1`, [userId]);
    } else {
      await client.query(`UPDATE users SET session_version=session_version+1 WHERE id=$1`, [userId]);
    }
    const after = (await client.query('SELECT id,username,status,ban_reason,banned_until,session_version FROM users WHERE id=$1', [userId])).rows[0];
    return { body: { message: action === 'ban' ? '玩家已封禁' : action === 'unban' ? '玩家已解封' : '玩家会话已失效' }, targetId: userId, reason, before, after };
  });
}

async function adjustResource(req, res) {
  const userId = requireInteger(req.params.id, '玩家 ID', 1, 2147483647);
  const reason = requireReason(req.body.reason);
  const resource = String(req.body.resource || '');
  const columns = { spiritStones: 'spirit_stones', fatePoints: 'fate_points', stamina: 'stamina' };
  const column = columns[resource];
  if (!column) throw httpError(422, '资源类型无效', 'INVALID_RESOURCE');
  const mode = req.body.mode === 'set' ? 'set' : 'adjust';
  const value = requireInteger(req.body.value, '资源数值', -9007199254740991, 9007199254740991);
  return runAdminMutation(req, res, { action: 'player.resource.adjust', targetType: 'player', targetId: userId, reason }, async (client) => {
    const found = await client.query(`SELECT c.id,c.admin_version,c.${column} value,u.username FROM characters c JOIN users u ON u.id=c.user_id WHERE u.id=$1 FOR UPDATE`, [userId]);
    const row = found.rows[0];
    if (!row) throw httpError(404, '玩家角色不存在', 'CHARACTER_NOT_FOUND');
    if (req.body.expectedVersion != null && Number(row.admin_version) !== Number(req.body.expectedVersion)) throw httpError(409, '玩家数据已变化，请刷新', 'VERSION_CONFLICT');
    const current = Number(row.value);
    const next = mode === 'set' ? value : current + value;
    const max = resource === 'stamina' ? 999 : 9007199254740991;
    if (!Number.isSafeInteger(next) || next < 0 || next > max) throw httpError(422, '调整后资源超出合法范围', 'RESOURCE_OUT_OF_RANGE');
    await client.query(`UPDATE characters SET ${column}=$2,admin_version=admin_version+1${resource === 'stamina' ? ',stamina_updated_at=NOW()' : ''} WHERE id=$1`, [row.id, next]);
    await client.query(`INSERT INTO resource_ledger(character_id,resource_type,delta,balance_after,source_type,description,operator_type,operator_id,request_id) VALUES($1,$2,$3,$4,'admin_adjustment',$5,'admin',$6,$7)`, [row.id, resource, next-current, next, reason, req.admin.id, req.requestId]);
    return { body: { message: '资源调整完成', value: String(next) }, targetId: userId, reason, before: { resource, value: String(current), adminVersion: String(row.admin_version) }, after: { resource, value: String(next), adminVersion: String(Number(row.admin_version)+1) } };
  });
}

async function restorePlayer(req, res) {
  const userId = requireInteger(req.params.id, '玩家 ID', 1, 2147483647);
  const reason = requireReason(req.body.reason);
  const options = req.body.options || {};
  if (!Object.values(options).some(Boolean)) throw httpError(422, '至少选择一个修复项', 'NO_REPAIR_SELECTED');
  return runAdminMutation(req, res, { action: 'player.restore', targetType: 'player', targetId: userId, reason }, async (client) => {
    const found = await client.query(`SELECT c.* FROM characters c JOIN users u ON u.id=c.user_id WHERE u.id=$1 FOR UPDATE`, [userId]);
    const row = found.rows[0];
    if (!row) throw httpError(404, '玩家角色不存在', 'CHARACTER_NOT_FOUND');
    const sets = ['admin_version=admin_version+1'];
    if (options.fullHeal) sets.push('hp=hp_max');
    if (options.clearBuff) sets.push('qi_buff_multiplier=1', 'qi_buff_expires_at=NULL');
    if (options.endRetreat) sets.push('retreat_started_at=NULL');
    if (options.clearPending) sets.push('pending_event_id=NULL', 'pending_enemy_code=NULL');
    if (options.clampStamina) sets.push('stamina=LEAST(999,GREATEST(0,stamina))', 'stamina_updated_at=NOW()');
    await client.query(`UPDATE characters SET ${sets.join(',')} WHERE id=$1`, [row.id]);
    if (options.unequipInvalid) {
      await client.query(`UPDATE character_equipment ce SET equipped=FALSE,equipped_slot=NULL FROM equipment e,realms r WHERE ce.character_id=$1 AND ce.equipment_id=e.id AND r.id=$2 AND ce.equipped=TRUE AND e.required_order>r.order_index`, [row.id, row.realm_id]);
    }
    const after = (await client.query('SELECT hp,hp_max,stamina,qi_buff_multiplier,qi_buff_expires_at,retreat_started_at,pending_event_id,pending_enemy_code,admin_version FROM characters WHERE id=$1', [row.id])).rows[0];
    return { body: { message: '角色状态修复完成' }, targetId: userId, reason, before: row, after, metadata: { options } };
  });
}

async function sendMail(req, res) {
  const userId = requireInteger(req.params.id, '玩家 ID', 1, 2147483647);
  const reason = requireReason(req.body.reason);
  const title = String(req.body.title || '').trim();
  const body = String(req.body.body || '').trim();
  if (!title || title.length > 100 || !body || body.length > 5000) throw httpError(422, '邮件标题或正文不合法', 'INVALID_MAIL');
  const itemId = req.body.itemId == null ? null : requireInteger(req.body.itemId, '物品 ID', 1, 2147483647);
  const equipmentId = req.body.equipmentId == null ? null : requireInteger(req.body.equipmentId, '装备 ID', 1, 2147483647);
  if (itemId && equipmentId) throw httpError(422, '一封邮件不能同时附带物品和装备', 'INVALID_ATTACHMENT');
  const quantity = itemId || equipmentId ? requireInteger(req.body.quantity || 1, '附件数量', 1, 999999) : 0;
  const spiritStones = requireInteger(req.body.spiritStones || 0, '灵石数量', 0, 9007199254740991);
  const expiresDays = requireInteger(req.body.expiresDays || 30, '有效天数', 1, 365);
  return runAdminMutation(req, res, { action: 'player.mail.send', targetType: 'player', targetId: userId, reason }, async (client) => {
    const player = await client.query('SELECT c.id character_id,u.username FROM users u JOIN characters c ON c.user_id=u.id WHERE u.id=$1 FOR UPDATE', [userId]);
    if (!player.rows[0]) throw httpError(404, '玩家角色不存在', 'CHARACTER_NOT_FOUND');
    if (itemId && !(await client.query('SELECT id FROM items WHERE id=$1', [itemId])).rows[0]) throw httpError(422, '附件物品不存在', 'ITEM_NOT_FOUND');
    if (equipmentId && !(await client.query('SELECT id FROM equipment WHERE id=$1', [equipmentId])).rows[0]) throw httpError(422, '附件装备不存在', 'EQUIPMENT_NOT_FOUND');
    const inserted = await client.query(`INSERT INTO mail_messages(character_id,title,body,item_id,equipment_id,quantity,spirit_stones,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,NOW()+($8||' days')::interval) RETURNING id,title,quantity,spirit_stones,expires_at`, [player.rows[0].character_id,title,body,itemId,equipmentId,quantity,spiritStones,expiresDays]);
    return { status: 201, body: { message: '邮件已发送', mail: inserted.rows[0] }, targetId: userId, reason, after: inserted.rows[0] };
  });
}

async function adjustInventory(req, res) {
  const userId = requireInteger(req.params.id, '玩家 ID', 1, 2147483647);
  const reason = requireReason(req.body.reason);
  const kind = req.body.kind === 'equipment' ? 'equipment' : 'item';
  const assetId = requireInteger(req.body.assetId, '资产 ID', 1, 2147483647);
  const delta = requireInteger(req.body.delta, '调整数量', -999999, 999999);
  if (delta === 0) throw httpError(422, '调整数量不能为 0', 'ZERO_DELTA');
  return runAdminMutation(req, res, { action: `player.inventory.${kind}.adjust`, targetType: 'player', targetId: userId, reason }, async (client) => {
    const player = await client.query('SELECT c.id,c.admin_version FROM users u JOIN characters c ON c.user_id=u.id WHERE u.id=$1 FOR UPDATE', [userId]);
    if (!player.rows[0]) throw httpError(404, '玩家角色不存在', 'CHARACTER_NOT_FOUND');
    const characterId = player.rows[0].id;
    const table = kind === 'item' ? 'inventories' : 'character_equipment';
    const idColumn = kind === 'item' ? 'item_id' : 'equipment_id';
    const definitionTable = kind === 'item' ? 'items' : 'equipment';
    if (!(await client.query(`SELECT id FROM ${definitionTable} WHERE id=$1`, [assetId])).rows[0]) throw httpError(422, '资产定义不存在', 'ASSET_NOT_FOUND');
    const currentRow = await client.query(`SELECT id,quantity${kind === 'equipment' ? ',equipped,locked' : ',locked'} FROM ${table} WHERE character_id=$1 AND ${idColumn}=$2 FOR UPDATE`, [characterId,assetId]);
    const current = Number(currentRow.rows[0]?.quantity || 0);
    const next = current + delta;
    if (next < 0) throw httpError(422, '库存不足，不能扣为负数', 'INSUFFICIENT_ASSET');
    if (delta < 0 && currentRow.rows[0]?.locked) throw httpError(422, '锁定资产不能扣除', 'ASSET_LOCKED');
    if (delta < 0 && currentRow.rows[0]?.equipped) throw httpError(422, '已装备器物不能扣除', 'ASSET_EQUIPPED');
    if (next === 0 && currentRow.rows[0]) await client.query(`DELETE FROM ${table} WHERE id=$1`, [currentRow.rows[0].id]);
    else if (currentRow.rows[0]) await client.query(`UPDATE ${table} SET quantity=$2 WHERE id=$1`, [currentRow.rows[0].id,next]);
    else await client.query(`INSERT INTO ${table}(character_id,${idColumn},quantity) VALUES($1,$2,$3)`, [characterId,assetId,next]);
    await client.query('UPDATE characters SET admin_version=admin_version+1 WHERE id=$1', [characterId]);
    await client.query(`INSERT INTO resource_ledger(character_id,resource_type,resource_id,delta,balance_after,source_type,description,operator_type,operator_id,request_id) VALUES($1,$2,$3,$4,$5,'admin_adjustment',$6,'admin',$7,$8)`, [characterId,kind,assetId,delta,next,reason,req.admin.id,req.requestId]);
    return { body: { message: '库存调整完成', quantity: next }, targetId: userId, reason, before: { kind, assetId, quantity: current }, after: { kind, assetId, quantity: next } };
  });
}

async function unlock(req, res) {
  const userId = requireInteger(req.params.id, '玩家 ID', 1, 2147483647);
  const reason = requireReason(req.body.reason);
  const kind = String(req.body.kind || '');
  const definition = {
    technique: ['character_techniques', 'technique_id', 'techniques'],
    recipe: ['character_recipes', 'item_id', 'items'],
    equipmentRecipe: ['character_equipment_recipes', 'equipment_id', 'equipment'],
  }[kind];
  if (!definition) throw httpError(422, '解锁类型无效', 'INVALID_UNLOCK_TYPE');
  const assetId = requireInteger(req.body.assetId, '内容 ID', 1, 2147483647);
  const operation = req.body.operation === 'remove' ? 'remove' : 'grant';
  return runAdminMutation(req, res, { action: `player.unlock.${kind}.${operation}`, targetType: 'player', targetId: userId, reason }, async (client) => {
    const player = await client.query('SELECT c.id,c.active_technique FROM users u JOIN characters c ON c.user_id=u.id WHERE u.id=$1 FOR UPDATE', [userId]);
    if (!player.rows[0]) throw httpError(404, '玩家角色不存在', 'CHARACTER_NOT_FOUND');
    const [table,idColumn,sourceTable] = definition;
    if (!(await client.query(`SELECT id FROM ${sourceTable} WHERE id=$1`,[assetId])).rows[0]) throw httpError(422,'内容不存在','CONTENT_NOT_FOUND');
    if (operation === 'remove' && kind === 'technique' && Number(player.rows[0].active_technique) === assetId) throw httpError(422,'主修功法不能移除','ACTIVE_TECHNIQUE');
    if (operation === 'grant') await client.query(`INSERT INTO ${table}(character_id,${idColumn}) VALUES($1,$2) ON CONFLICT DO NOTHING`,[player.rows[0].id,assetId]);
    else await client.query(`DELETE FROM ${table} WHERE character_id=$1 AND ${idColumn}=$2`,[player.rows[0].id,assetId]);
    await client.query('UPDATE characters SET admin_version=admin_version+1 WHERE id=$1',[player.rows[0].id]);
    return { body:{message:operation==='grant'?'解锁完成':'已移除解锁'},targetId:userId,reason,before:{kind,assetId},after:{kind,assetId,operation} };
  });
}

async function chats(req, res) {
  const { page,pageSize,offset } = paging(req);
  const search=String(req.query.search||'').trim();
  const status=['visible','hidden'].includes(req.query.status)?req.query.status:null;
  const result=await query(`SELECT COUNT(*) OVER()::int total,m.id,m.channel,m.body,m.moderation_status,m.moderation_reason,m.moderated_at,m.created_at,s.username sender,r.username recipient,a.username moderated_by_name FROM chat_messages m JOIN users s ON s.id=m.sender_user_id LEFT JOIN users r ON r.id=m.recipient_user_id LEFT JOIN admin_users a ON a.id=m.moderated_by WHERE ($1='' OR m.body ILIKE '%'||$1||'%' OR s.username ILIKE '%'||$1||'%') AND ($2::text IS NULL OR m.moderation_status=$2) ORDER BY m.created_at DESC LIMIT $3 OFFSET $4`,[search,status,pageSize,offset]);
  res.json({items:result.rows,total:result.rows[0]?.total||0,page,pageSize,requestId:req.requestId});
}

async function moderateChat(req,res){
  const id=requireInteger(req.params.id,'消息 ID',1,9007199254740991); const reason=requireReason(req.body.reason); const status=req.body.status;
  if(!['visible','hidden'].includes(status)) throw httpError(422,'治理状态无效','INVALID_STATUS');
  return runAdminMutation(req,res,{action:`chat.${status}`,targetType:'chat',targetId:id,reason},async client=>{
    const found=await client.query('SELECT * FROM chat_messages WHERE id=$1 FOR UPDATE',[id]); if(!found.rows[0]) throw httpError(404,'消息不存在','CHAT_NOT_FOUND');
    await client.query(`UPDATE chat_messages SET moderation_status=$2,moderated_by=$3,moderated_at=NOW(),moderation_reason=$4 WHERE id=$1`,[id,status,req.admin.id,reason]);
    const after=(await client.query('SELECT id,moderation_status,moderation_reason,moderated_at FROM chat_messages WHERE id=$1',[id])).rows[0];
    return {body:{message:status==='hidden'?'消息已隐藏':'消息已恢复'},targetId:id,reason,before:found.rows[0],after};
  });
}

async function auctions(req,res){
  const {page,pageSize,offset}=paging(req); const status=String(req.query.status||''); const search=String(req.query.search||'').trim();
  const result=await query(`SELECT COUNT(*) OVER()::int total,a.*,s.name seller_name,u.username seller_username,b.name buyer_name,i.name item_name,e.name equipment_name FROM auction_listings a JOIN characters s ON s.id=a.seller_character_id JOIN users u ON u.id=s.user_id LEFT JOIN characters b ON b.id=a.buyer_character_id LEFT JOIN items i ON i.id=a.item_id LEFT JOIN equipment e ON e.id=a.equipment_id WHERE ($1='' OR a.status=$1) AND ($2='' OR u.username ILIKE '%'||$2||'%' OR s.name ILIKE '%'||$2||'%' OR i.name ILIKE '%'||$2||'%' OR e.name ILIKE '%'||$2||'%') ORDER BY a.created_at DESC LIMIT $3 OFFSET $4`,[status,search,pageSize,offset]);
  res.json({items:result.rows,total:result.rows[0]?.total||0,page,pageSize,requestId:req.requestId});
}

async function cancelAuction(req,res){
  const id=requireInteger(req.params.id,'拍品 ID',1,9007199254740991); const reason=requireReason(req.body.reason);
  return runAdminMutation(req,res,{action:'auction.admin_cancel',targetType:'auction',targetId:id,reason},async client=>{
    const found=await client.query(`SELECT a.*,COALESCE(i.name,e.name) asset_name FROM auction_listings a LEFT JOIN items i ON i.id=a.item_id LEFT JOIN equipment e ON e.id=a.equipment_id WHERE a.id=$1 FOR UPDATE OF a`,[id]); const row=found.rows[0];
    if(!row) throw httpError(404,'拍品不存在','AUCTION_NOT_FOUND'); if(row.status!=='active') throw httpError(409,'只有活动拍品可以撤销','AUCTION_NOT_ACTIVE');
    await client.query(`UPDATE auction_listings SET status='admin_cancelled' WHERE id=$1`,[id]);
    await client.query(`INSERT INTO mail_messages(character_id,title,body,item_id,equipment_id,quantity) VALUES($1,'拍品由管理员撤回',$2,$3,$4,$5)`,[row.seller_character_id,`拍品“${row.asset_name}”已由管理员撤回。原因：${reason}`,row.item_id,row.equipment_id,row.quantity]);
    return {body:{message:'拍品已撤销，资产已发送至卖家信箱'},targetId:id,reason,before:row,after:{status:'admin_cancelled',returnedByMail:true}};
  });
}

async function announcements(req,res){
  const {page,pageSize,offset}=paging(req); const result=await query(`SELECT COUNT(*) OVER()::int total,n.*,c.username created_by_name,u.username updated_by_name FROM announcements n LEFT JOIN admin_users c ON c.id=n.created_by LEFT JOIN admin_users u ON u.id=n.updated_by ORDER BY n.pinned DESC,n.priority DESC,n.updated_at DESC LIMIT $1 OFFSET $2`,[pageSize,offset]);
  res.json({items:result.rows,total:result.rows[0]?.total||0,page,pageSize,requestId:req.requestId});
}

function validateAnnouncement(body){
  const title=String(body.title||'').trim(),text=String(body.body||'').trim(); if(!title||title.length>100||!text||text.length>10000) throw httpError(422,'公告标题或正文不合法','INVALID_ANNOUNCEMENT');
  const priority=requireInteger(body.priority||0,'优先级',0,100); const status=['draft','published','withdrawn'].includes(body.status)?body.status:'draft';
  const startsAt=body.startsAt?new Date(body.startsAt):null,endsAt=body.endsAt?new Date(body.endsAt):null; if((startsAt&&Number.isNaN(startsAt.valueOf()))||(endsAt&&Number.isNaN(endsAt.valueOf()))||(startsAt&&endsAt&&endsAt<=startsAt)) throw httpError(422,'公告时间范围无效','INVALID_TIME_RANGE');
  return {title,body:text,priority,status,pinned:Boolean(body.pinned),startsAt,endsAt};
}

async function createAnnouncement(req,res){
  const reason=requireReason(req.body.reason); const v=validateAnnouncement(req.body);
  return runAdminMutation(req,res,{action:'announcement.create',targetType:'announcement',reason},async client=>{const inserted=await client.query(`INSERT INTO announcements(title,body,priority,pinned,status,starts_at,ends_at,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,[v.title,v.body,v.priority,v.pinned,v.status,v.startsAt,v.endsAt,req.admin.id]); return {status:201,body:{message:'公告已创建',announcement:inserted.rows[0]},targetId:inserted.rows[0].id,reason,after:inserted.rows[0]};});
}

async function updateAnnouncement(req,res){
  const id=requireInteger(req.params.id,'公告 ID',1,9007199254740991),reason=requireReason(req.body.reason),v=validateAnnouncement(req.body);
  return runAdminMutation(req,res,{action:'announcement.update',targetType:'announcement',targetId:id,reason},async client=>{const found=await client.query('SELECT * FROM announcements WHERE id=$1 FOR UPDATE',[id]);if(!found.rows[0])throw httpError(404,'公告不存在','ANNOUNCEMENT_NOT_FOUND');const updated=await client.query(`UPDATE announcements SET title=$2,body=$3,priority=$4,pinned=$5,status=$6,starts_at=$7,ends_at=$8,updated_by=$9,updated_at=NOW() WHERE id=$1 RETURNING *`,[id,v.title,v.body,v.priority,v.pinned,v.status,v.startsAt,v.endsAt,req.admin.id]);return {body:{message:'公告已更新',announcement:updated.rows[0]},targetId:id,reason,before:found.rows[0],after:updated.rows[0]};});
}

const contentResources={
  realms:{table:'realms',search:['code','major_realm','description'],fields:['qi_required','qi_base_per_sec','boss_required','title_unlock','description','image_url'],order:'order_index'},
  techniques:{table:'techniques',search:['code','name','description'],fields:['name','rarity','description','qi_multiplier','retreat_multiplier','breakthrough_bonus','event_bonus','stat_bonuses','source_description','image_url'],order:'required_order DESC,id'},
  items:{table:'items',search:['code','name','description'],fields:['name','type','rarity','description','effect','recipe','craft_time_s','source_description','image_url'],order:'required_order DESC,id'},
  equipment:{table:'equipment',search:['code','name','description'],fields:['name','rarity','attack_bonus','defense_bonus','hp_bonus','speed_bonus','required_order','description','source_description','recipe','craft_time_s','recipe_source_description','image_url'],order:'required_order DESC,id'},
  areas:{table:'areas',search:['code','name','description'],fields:['name','description','min_realm_order','stamina_cost','battle_stamina_cost','encounter_base_rate','encounter_pity_after','image_url'],order:'min_realm_order,id'},
  enemies:{table:'enemies',search:['code','name','description'],fields:['name','rank','hp','atk','def','spd','qi_reward','stone_reward','material_rate','description','image_url'],order:'id'},
  events:{table:'events',search:['code','title','body'],fields:['title','body','image_url','min_realm_order','max_realm_order','weight','choices','is_story'],order:'id'},
  shop:{table:'shop_goods',search:[],fields:['price','required_order','active'],order:'required_order,id'},
};

async function contentList(req,res){
  const resource=contentResources[req.params.resource]; if(!resource)throw httpError(404,'内容类型不存在','RESOURCE_NOT_FOUND'); const {page,pageSize,offset}=paging(req);const search=String(req.query.search||'').trim();
  const where=resource.search.length?`WHERE ($1='' OR ${resource.search.map(c=>`${c} ILIKE '%'||$1||'%'`).join(' OR ')})`:''; const params=resource.search.length?[search,pageSize,offset]:[pageSize,offset]; const li=resource.search.length?2:1;
  const result=await query(`SELECT COUNT(*) OVER()::int total,* FROM ${resource.table} ${where} ORDER BY ${resource.order} LIMIT $${li} OFFSET $${li+1}`,params);
  res.json({resource:req.params.resource,items:result.rows,total:result.rows[0]?.total||0,page,pageSize,editableFields:resource.fields,requestId:req.requestId});
}

async function contentImpact(req,res){
  const resource=req.params.resource,id=requireInteger(req.params.id,'内容 ID',1,2147483647);if(!contentResources[resource])throw httpError(404,'内容类型不存在','RESOURCE_NOT_FOUND');let impact={};
  if(resource==='items'){const r=await query(`SELECT (SELECT COUNT(*) FROM inventories WHERE item_id=$1)::int holders,(SELECT COALESCE(SUM(quantity),0) FROM inventories WHERE item_id=$1)::text quantity,(SELECT COUNT(*) FROM shop_goods WHERE item_id=$1)::int shop_refs,(SELECT COUNT(*) FROM mail_messages WHERE item_id=$1)::int mail_refs`,[id]);impact=r.rows[0];}
  else if(resource==='equipment'){const r=await query(`SELECT (SELECT COUNT(*) FROM character_equipment WHERE equipment_id=$1)::int holders,(SELECT COUNT(*) FROM character_equipment WHERE equipment_id=$1 AND equipped)::int equipped,(SELECT COUNT(*) FROM auction_listings WHERE equipment_id=$1)::int auction_refs,(SELECT COUNT(*) FROM mail_messages WHERE equipment_id=$1)::int mail_refs`,[id]);impact=r.rows[0];}
  else if(resource==='techniques'){const r=await query(`SELECT (SELECT COUNT(*) FROM character_techniques WHERE technique_id=$1)::int holders,(SELECT COUNT(*) FROM characters WHERE active_technique=$1)::int active_users`,[id]);impact=r.rows[0];}
  else impact={note:'此内容类型暂提供字段校验和审计回滚，未建立额外引用统计'};
  res.json({resource,id,impact,requestId:req.requestId});
}

async function updateContent(req,res){
  const resourceName=req.params.resource,resource=contentResources[resourceName];if(!resource)throw httpError(404,'内容类型不存在','RESOURCE_NOT_FOUND');const id=requireInteger(req.params.id,'内容 ID',1,2147483647),reason=requireReason(req.body.reason),changes=req.body.changes;
  if(!changes||typeof changes!=='object'||Array.isArray(changes))throw httpError(422,'changes 必须是对象','INVALID_CHANGES'); const keys=Object.keys(changes);if(!keys.length||keys.some(k=>!resource.fields.includes(k)))throw httpError(422,'包含不可编辑字段或没有变更','INVALID_FIELD');
  return runAdminMutation(req,res,{action:`content.${resourceName}.update`,targetType:`content:${resourceName}`,targetId:id,reason},async client=>{const found=await client.query(`SELECT * FROM ${resource.table} WHERE id=$1 FOR UPDATE`,[id]);if(!found.rows[0])throw httpError(404,'内容不存在','CONTENT_NOT_FOUND');const values=[id,...keys.map(k=>typeof changes[k]==='object'&&changes[k]!==null?JSON.stringify(changes[k]):changes[k])];const set=keys.map((k,i)=>`${k}=$${i+2}`).join(',');let updated;try{updated=await client.query(`UPDATE ${resource.table} SET ${set} WHERE id=$1 RETURNING *`,values);}catch(error){if(error.code?.startsWith('22')||error.code?.startsWith('23'))throw httpError(422,`内容校验失败：${error.message}`,'CONTENT_VALIDATION_FAILED');throw error;}return {body:{message:'内容已更新',item:updated.rows[0]},targetId:id,reason,before:found.rows[0],after:updated.rows[0]};});
}

async function auditLogs(req,res){
  const {page,pageSize,offset}=paging(req);const search=String(req.query.search||'').trim();const result=await query(`SELECT COUNT(*) OVER()::int total,* FROM admin_audit_logs WHERE ($1='' OR admin_username ILIKE '%'||$1||'%' OR action ILIKE '%'||$1||'%' OR target_id ILIKE '%'||$1||'%' OR reason ILIKE '%'||$1||'%') ORDER BY created_at DESC LIMIT $2 OFFSET $3`,[search,pageSize,offset]);res.json({items:result.rows,total:result.rows[0]?.total||0,page,pageSize,requestId:req.requestId});
}

async function requestStatus(req,res){const key=String(req.params.key||'');const found=await query(`SELECT status,response_status,response_body,created_at,completed_at FROM admin_idempotency_keys WHERE admin_id=$1 AND idempotency_key=$2`,[req.admin.id,key]);if(!found.rows[0])throw httpError(404,'请求记录不存在','REQUEST_NOT_FOUND');res.json({...found.rows[0],requestId:req.requestId});}

async function catalogs(req,res){
  const [realms,items,equipment,techniques]=await Promise.all([
    query('SELECT id,major_realm,sub_stage,order_index FROM realms ORDER BY order_index'),
    query('SELECT id,code,name,type,rarity FROM items ORDER BY required_order DESC,name LIMIT 3000'),
    query('SELECT id,code,name,rarity,combat_role,required_order FROM equipment ORDER BY required_order DESC,name LIMIT 2000'),
    query('SELECT id,code,name,rarity,major_realm,required_order FROM techniques ORDER BY required_order DESC,name LIMIT 3000'),
  ]);
  res.json({realms:realms.rows,items:items.rows,equipment:equipment.rows,techniques:techniques.rows,requestId:req.requestId});
}

module.exports={dashboard,players,playerDetail,sanction,adjustResource,restorePlayer,sendMail,adjustInventory,unlock,chats,moderateChat,auctions,cancelAuction,announcements,createAnnouncement,updateAnnouncement,contentList,contentImpact,updateContent,auditLogs,requestStatus,catalogs};
