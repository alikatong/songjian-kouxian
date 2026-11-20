const { withTransaction, query } = require('../config/db');
const { playerPaging, pagedResult } = require('../utils/playerPagination');
const {
  baseHpAfterBattle, combatPower, resolveBattle, scaleTechniqueStats, encounterChance,
} = require('../utils/gameMath');
const {
  getCharacterRow,
  serializeCharacter,
  settleOffline,
  settleRetreat,
  settleStamina,
  addInventory,
  applyEffects,
  rollAreaDrops,
} = require('../services/gameService');

function eventView(event) {
  return event ? {
    code: event.code,
    area_code: event.area_code,
    title: event.title,
    body: event.body,
    image_url: event.image_url,
    choices: event.choices.map(({ text }) => ({ text })),
  } : null;
}

function exploreCooldownRemaining(lastExploredAt) {
  if (!lastExploredAt) return 0;
  const cooldown = Number(process.env.EXPLORE_COOLDOWN_SECONDS || 15);
  const elapsed = (Date.now() - new Date(lastExploredAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(cooldown - elapsed));
}

const rarityOrder = "CASE i.rarity WHEN 'legendary' THEN 0 WHEN 'epic' THEN 1 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 3 ELSE 4 END";
const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
const bossPillByArea = {
  luoxia: 'major_pill_mortal', qingyun_foothill: 'major_pill_lianpi', blackstone_forest: 'major_pill_lianggu',
  mist_forest: 'major_pill_yijin', clear_spring_cliff: 'major_pill_xisui', red_maple_valley: 'major_pill_huanxue',
  mirror_lake: 'major_pill_tianren', spirit_vein_valley: 'major_pill_lianqi', sect_outer_court: 'major_pill_zhujia',
  alchemy_peak: 'major_pill_jindan', ancient_soul_ruins: 'major_pill_yuanying', law_abyss: 'major_pill_huashen',
  heaven_gate: 'major_pill_dacheng',
};

function effectSummary(effect = {}) {
  effect = effect || {};
  if (effect.qi_percent) return `立即获得破境所需灵气的 ${Math.round(Number(effect.qi_percent) * 100)}%`;
  if (effect.heal_percent) return `恢复 ${Math.round(Number(effect.heal_percent) * 100)}% 气血`;
  if (effect.atk) return `永久增加 ${effect.atk} 点攻击，每种仅首次生效`;
  if (effect.def) return `永久增加 ${effect.def} 点防御，每种仅首次生效`;
  if (effect.spd) return `永久增加 ${effect.spd} 点身法，每种仅首次生效`;
  if (effect.fate_points) return `获得 ${effect.fate_points} 点奇缘`;
  if (effect.stamina_restore) return `恢复 ${effect.stamina_restore} 点精力${effect.stamina_major_realm ? `，仅限${effect.stamina_major_realm}` : ''}`;
  if (effect.breakthrough_rate) return `当前指定境界破境成功率提高 ${Math.round(Number(effect.breakthrough_rate) * 100)}%`;
  if (effect.protection) return '破境失败时免除灵气损失与大境界跌境';
  if (effect.qi_multiplier) return `修炼速度临时提高至 ${effect.qi_multiplier} 倍`;
  return '暂无可主动使用的效果';
}

const rarities = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);

function optionalQueryValue(value, maxLength = 100) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().slice(0, maxLength);
  return normalized || null;
}

function optionalRarity(value) {
  const rarity = optionalQueryValue(value, 20);
  return rarity && rarities.has(rarity) ? rarity : null;
}

function optionalCategory(value) {
  const category = optionalQueryValue(value, 50);
  return category && category !== 'all' ? category : null;
}

function knownCategory(value, values) {
  const category = optionalCategory(value);
  return category && values.has(category) ? category : null;
}

async function ingredientDetails(client, characterId, recipes) {
  const codes = [...new Set(recipes.flatMap((item) => Object.keys(item.recipe || {})))];
  if (!codes.length) return {};
  const rows = (await client.query(
    `SELECT i.code, i.name, i.source_description, COALESCE(inv.quantity, 0)::int AS quantity,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT a.name ORDER BY a.name), NULL) AS source_areas
     FROM items i
     LEFT JOIN inventories inv ON inv.item_id = i.id AND inv.character_id = $1
     LEFT JOIN area_material_drops amd ON amd.item_id = i.id
     LEFT JOIN areas a ON a.code = amd.area_code
     WHERE i.code = ANY($2::text[])
     GROUP BY i.id, inv.quantity
     ORDER BY i.code`,
    [characterId, codes],
  )).rows;
  return Object.fromEntries(rows.map((item) => [item.code, item]));
}

function withIngredients(item, materials, unknownName) {
  return {
    ...item,
    craft_time_s: Number(item.craft_time_s),
    ingredients: Object.entries(item.recipe || {}).map(([code, quantity]) => ({
      code,
      name: materials[code]?.name || unknownName,
      quantity: Number(quantity),
      owned: Number(materials[code]?.quantity || 0),
      source_area: materials[code]?.source_areas?.join('、') || null,
      source_description: materials[code]?.source_description || null,
    })),
  };
}

async function currentBreakthroughItems(client, character) {
  const rows = (await client.query(
    `SELECT i.code, i.name, i.type, i.rarity, i.description, i.effect, i.image_url,
            i.source_description, i.major_realm, inv.quantity, inv.locked
     FROM inventories inv
     JOIN items i ON i.id = inv.item_id
     WHERE inv.character_id = $1
       AND inv.quantity > 0
       AND i.type = ANY(ARRAY['breakthrough', 'breakthrough_protection', 'major_breakthrough'])
       AND i.effect ->> 'realm_code' = $2
     ORDER BY CASE i.type
       WHEN 'breakthrough' THEN 0
       WHEN 'major_breakthrough' THEN 1
       ELSE 2
     END, ${rarityOrder}, i.name, i.id`,
    [character.id, character.realm_code],
  )).rows;
  return rows.map((item) => ({ ...item, effect_summary: effectSummary(item.effect) }));
}

async function inventoryState(client, character, includeCollections = true) {
  const inventory = includeCollections ? (await client.query(
    `SELECT i.id, i.code, i.name, i.type, i.rarity, i.description, i.effect, i.image_url,
            i.source_description, i.major_realm, inv.quantity, inv.locked,
            EXISTS (SELECT 1 FROM character_item_uses ciu
                    WHERE ciu.character_id = inv.character_id AND ciu.item_id = i.id) AS used_once
     FROM inventories inv JOIN items i ON i.id = inv.item_id
     WHERE inv.character_id = $1 AND inv.quantity > 0
     ORDER BY (i.major_realm = $2) DESC,
              CASE i.type WHEN 'pill' THEN 0 WHEN 'breakthrough' THEN 1 WHEN 'material' THEN 2 ELSE 3 END,
              ${rarityOrder}, i.name`,
    [character.id, character.major_realm],
  )).rows.map((item) => ({ ...item, effect_summary: effectSummary(item.effect) })) : [];
  const itemDefinitions = includeCollections ? Object.fromEntries((await client.query(
    'SELECT code, name, source_description FROM items',
  )).rows.map((item) => [item.code, item])) : {};
  const materialAreaRows = includeCollections ? (await client.query(
    `SELECT i.code, a.name AS area_name
     FROM area_material_drops amd
     JOIN items i ON i.id = amd.item_id
     JOIN areas a ON a.code = amd.area_code
     ORDER BY i.code, a.min_realm_order`,
  )).rows : [];
  const materialAreas = materialAreaRows.reduce((result, row) => {
    (result[row.code] ||= []).push(row.area_name);
    return result;
  }, {});
  const owned = Object.fromEntries(inventory.map((item) => [item.code, Number(item.quantity)]));
  const recipes = includeCollections ? (await client.query(
    `SELECT i.code, i.name, i.type, i.rarity, i.description, i.effect, i.recipe, i.image_url,
            i.craft_time_s, i.source_description, i.major_realm,
            (cr.id IS NOT NULL) AS unlocked
     FROM items i
     LEFT JOIN character_recipes cr ON cr.item_id = i.id AND cr.character_id = $1
     WHERE i.recipe IS NOT NULL AND (i.major_realm = $2 OR cr.id IS NOT NULL)
     ORDER BY (i.major_realm = $2) DESC, ${rarityOrder}, (cr.id IS NOT NULL) DESC, i.name`,
    [character.id, character.major_realm],
  )).rows.map((item) => ({
    ...item,
    craft_time_s: Number(item.craft_time_s),
    effect_summary: effectSummary(item.effect),
    ingredients: Object.entries(item.recipe).map(([code, quantity]) => ({
      code,
      name: itemDefinitions[code]?.name || '未知材料',
      quantity: Number(quantity),
      owned: owned[code] || 0,
      source_area: materialAreas[code]?.join('、') || null,
      source_description: itemDefinitions[code]?.source_description || null,
    })),
  })) : [];
  const queue = (await client.query(
    `SELECT q.id, q.quantity, q.finish_at, q.is_collected,
            i.code, i.name, q.finish_at <= NOW() AS ready
     FROM craft_queue q JOIN items i ON i.id = q.item_id
     WHERE q.character_id = $1 AND q.is_collected = FALSE
     ORDER BY q.finish_at`,
    [character.id],
  )).rows;
  const inventoryWithSources = inventory.map((item) => ({
    ...item,
    source_areas: materialAreas[item.code] || [],
    source_description: materialAreas[item.code]?.length
      ? `前往${materialAreas[item.code].join('、')}游历；事件明确奖励为必得，区域额外材料按公开掉落表结算。`
      : item.source_description,
  }));
  return { inventory: inventoryWithSources, recipes, queue };
}

async function equipmentQueueState(client, character) {
  return (await client.query(
    `SELECT q.id, q.quantity, q.finish_at, q.is_collected, e.code, e.name,
            q.finish_at <= NOW() AS ready
     FROM equipment_craft_queue q JOIN equipment e ON e.id = q.equipment_id
     WHERE q.character_id = $1 AND q.is_collected = FALSE
     ORDER BY q.finish_at, q.id`,
    [character.id],
  )).rows;
}

async function codexState(client, character, includeCollections = true) {
  const techniques = includeCollections ? (await client.query(
    `SELECT t.code, t.name, t.rarity, t.category, t.description, t.qi_multiplier,
            t.retreat_multiplier, t.breakthrough_bonus, t.event_bonus,
            t.stat_bonuses, t.source_description, t.major_realm,
            (ct.id IS NOT NULL) AS owned,
            (c.active_technique = t.id) AS active
     FROM techniques t
     LEFT JOIN character_techniques ct ON ct.technique_id = t.id AND ct.character_id = $1
     JOIN characters c ON c.id = $1
     WHERE t.major_realm = $2 OR ct.id IS NOT NULL
     ORDER BY (t.major_realm = $2) DESC,
              CASE t.rarity WHEN 'legendary' THEN 0 WHEN 'epic' THEN 1 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 3 ELSE 4 END,
              (ct.id IS NOT NULL) DESC, t.name`,
    [character.id, character.major_realm],
  )).rows.map((technique) => ({
    ...technique,
    qi_multiplier: Number(technique.qi_multiplier),
    retreat_multiplier: Number(technique.retreat_multiplier),
    breakthrough_bonus: Number(technique.breakthrough_bonus),
    event_bonus: Number(technique.event_bonus),
    stat_bonuses: scaleTechniqueStats(technique.stat_bonuses, technique.rarity),
  })) : [];
  const areas = (await client.query(
    `SELECT a.*, COALESCE(cep.misses, 0)::int AS encounter_misses,
            (a.min_realm_order <= $1) AS unlocked,
            COALESCE(atlas.event_count, 0) AS event_count,
            COALESCE(atlas.available_event_count, 0) AS available_event_count,
            COALESCE(atlas.discoverable_count, 0) AS discoverable_count,
            COALESCE(atlas.discovered_events, '[]'::json) AS discovered_events
     FROM areas a
     LEFT JOIN character_encounter_pity cep ON cep.area_code = a.code AND cep.character_id = $2
     LEFT JOIN (
       SELECT e.area_code, count(*)::int AS event_count,
              (count(*) FILTER (WHERE $1 BETWEEN e.min_realm_order AND e.max_realm_order))::int AS available_event_count,
              (count(*) FILTER (WHERE ce.event_id IS NULL AND $1 BETWEEN e.min_realm_order AND e.max_realm_order))::int AS discoverable_count,
              json_agg(json_build_object('code', e.code, 'title', e.title) ORDER BY e.id)
                FILTER (WHERE ce.event_id IS NOT NULL) AS discovered_events
       FROM events e
       LEFT JOIN (SELECT DISTINCT event_id FROM character_events WHERE character_id = $2) ce ON ce.event_id = e.id
       GROUP BY e.area_code
     ) atlas ON atlas.area_code = a.code
     ORDER BY a.min_realm_order`,
    [character.order_index, character.id],
  )).rows;
  if (!includeCollections) {
    const equipmentQueue = await equipmentQueueState(client, character);
    const publicAreas = areas.map(({
      encounter_base_rate, encounter_pity_after, encounter_misses, ...area
    }) => area);
    return { techniques: [], areas: publicAreas, equipment: [], equipment_queue: equipmentQueue };
  }
  const rarityRates = (await client.query(
    'SELECT rarity, weight, sort_order FROM rarity_drop_rates ORDER BY sort_order',
  )).rows;
  const rarityTotal = rarityRates.reduce((sum, row) => sum + Number(row.weight), 0);
  const rarityProbabilities = Object.fromEntries(rarityRates.map((row) => [
    row.rarity, Number(row.weight) / rarityTotal,
  ]));
  const dropRules = (await client.query(
    `SELECT adr.area_code, adr.category, adr.base_rate, adr.pity_after, adr.description,
            COALESCE(cdp.misses, 0)::int AS misses
     FROM area_drop_rules adr
     LEFT JOIN character_drop_pity cdp ON cdp.area_code = adr.area_code
       AND cdp.category = adr.category AND cdp.character_id = $1
     ORDER BY adr.area_code, adr.category`,
    [character.id],
  )).rows;
  const materialDrops = (await client.query(
    `SELECT amd.area_code, i.code, i.name, i.rarity, amd.weight,
            amd.min_quantity, amd.max_quantity
     FROM area_material_drops amd JOIN items i ON i.id = amd.item_id
     ORDER BY amd.area_code, amd.weight DESC, i.name`,
  )).rows;
  const dropsByArea = materialDrops.reduce((groups, item) => {
    (groups[item.area_code] ||= []).push(item);
    return groups;
  }, {});
  const rulesByArea = dropRules.reduce((groups, rule) => {
    (groups[rule.area_code] ||= []).push(rule);
    return groups;
  }, {});
  const eventBonus = Math.max(0, Number(character.technique_event_bonus || 0));
  const areasWithDrops = areas.map((area) => {
    const materials = dropsByArea[area.code] || [];
    const totalMaterialWeight = materials.reduce((sum, item) => sum + Number(item.weight), 0);
    const rules = (rulesByArea[area.code] || []).map((rule) => {
      const bonus = rule.category === 'material' ? 0 : eventBonus * 0.15;
      const effectiveRate = Math.min(0.95, Number(rule.base_rate) + bonus);
      return {
        ...rule,
        base_rate: Number(rule.base_rate),
        effective_rate: effectiveRate,
        pity_remaining: Math.max(1, Number(rule.pity_after) - Number(rule.misses)),
        rarity_rates: rule.category === 'material' ? null : Object.fromEntries(
          Object.entries(rarityProbabilities).map(([rarity, chance]) => [rarity, {
            conditional_rate: chance,
            per_exploration_rate: chance * effectiveRate,
          }]),
        ),
      };
    });
    const materialRule = rules.find((rule) => rule.category === 'material');
    const encounterBaseRate = Number(area.encounter_base_rate || 0.2);
    const encounterPityAfter = Number(area.encounter_pity_after || 5);
    const encounterMisses = Number(area.encounter_misses || 0);
    const encounterRate = encounterChance({ baseRate: encounterBaseRate, misses: encounterMisses, pityAfter: encounterPityAfter });
    return {
      ...area,
      encounter: {
        base_rate: encounterBaseRate,
        current_rate: Math.min(1, encounterRate),
        misses: encounterMisses,
        pity_after: encounterPityAfter,
        pity_remaining: Math.max(1, encounterPityAfter - encounterMisses),
      },
      drop_rules: rules,
      material_drops: materials.map((item) => ({
        ...item,
        min_quantity: Number(item.min_quantity),
        max_quantity: Number(item.max_quantity),
        drop_rate: materialRule && totalMaterialWeight > 0
          ? materialRule.effective_rate * Number(item.weight) / totalMaterialWeight
          : 0,
      })),
    };
  });
  const equipmentRows = includeCollections ? (await client.query(
    `SELECT e.code, e.name, e.weapon_type, e.combat_role, e.rarity, e.major_realm, e.required_order,
            e.attack_bonus, e.defense_bonus, e.hp_bonus, e.speed_bonus,
            e.description, e.source_description, e.image_url, e.recipe, e.craft_time_s,
            e.recipe_source_description, (cer.id IS NOT NULL) AS recipe_unlocked,
            COALESCE(ce.quantity, 0)::int AS quantity,
            (ce.equipped_slot IS NOT NULL) AS equipped,
            ce.equipped_slot,
            COALESCE(ce.locked, FALSE) AS locked,
            (e.required_order <= $2) AS can_equip
     FROM equipment e
     LEFT JOIN character_equipment ce ON ce.equipment_id = e.id AND ce.character_id = $1
     LEFT JOIN character_equipment_recipes cer ON cer.equipment_id = e.id AND cer.character_id = $1
     WHERE e.major_realm = $3 OR ce.id IS NOT NULL OR cer.id IS NOT NULL
     ORDER BY (e.major_realm = $3) DESC,
              CASE e.rarity WHEN 'legendary' THEN 0 WHEN 'epic' THEN 1 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 3 ELSE 4 END,
              (ce.id IS NOT NULL) DESC, e.combat_role, e.weapon_type, e.name`,
    [character.id, character.order_index, character.major_realm],
  )).rows : [];
  const forgingMaterials = includeCollections ? (await client.query(
    `SELECT i.code, i.name, i.source_description, COALESCE(inv.quantity, 0)::int AS quantity,
            STRING_AGG(DISTINCT a.name, '、') AS source_area
     FROM items i
     LEFT JOIN inventories inv ON inv.item_id = i.id AND inv.character_id = $1
     LEFT JOIN area_material_drops amd ON amd.item_id = i.id
     LEFT JOIN areas a ON a.code = amd.area_code
     WHERE i.code LIKE 'forge_%'
     GROUP BY i.id, inv.quantity`,
    [character.id],
  )).rows : [];
  const materialMap = Object.fromEntries(forgingMaterials.map((item) => [item.code, item]));
  const equipment = equipmentRows.map((item) => ({
    ...item,
    craft_time_s: Number(item.craft_time_s),
    ingredients: Object.entries(item.recipe || {}).map(([code, quantity]) => ({
      code,
      name: materialMap[code]?.name || '未知炼材',
      quantity: Number(quantity),
      owned: Number(materialMap[code]?.quantity || 0),
      source_area: materialMap[code]?.source_area || null,
      source_description: materialMap[code]?.source_description || null,
    })),
  }));
  const equipmentQueue = await equipmentQueueState(client, character);
  const publicAreas = areasWithDrops.map(({
    encounter, drop_rules, material_drops, encounter_base_rate,
    encounter_pity_after, encounter_misses, ...area
  }) => area);
  return { techniques, areas: publicAreas, equipment, equipment_queue: equipmentQueue };
}

async function hydrateBattleLoot(client, battles) {
  const lootCodes = [...new Set(battles.flatMap((battle) => (
    Array.isArray(battle.loot?.items) ? battle.loot.items.map((item) => item.code).filter(Boolean) : []
  )))];
  const lootMetadata = lootCodes.length ? (await client.query(
    `SELECT code, rarity, image_url, type AS item_type,
            CASE WHEN type = 'material' THEN 'material' ELSE 'item' END AS category
     FROM items WHERE code = ANY($1::text[])
     UNION ALL
     SELECT code, rarity, image_url, NULL::text AS item_type, 'equipment' AS category
     FROM equipment WHERE code = ANY($1::text[])`,
    [lootCodes],
  )).rows : [];
  const lootMetadataByCode = Object.fromEntries(lootMetadata.map((item) => [item.code, item]));
  return battles.map((battle) => {
    const loot = battle.loot && typeof battle.loot === 'object' ? battle.loot : {};
    return {
      ...battle,
      loot: {
        ...loot,
        items: (Array.isArray(loot.items) ? loot.items : []).map((item) => {
          const metadata = lootMetadataByCode[item.code] || {};
          return {
            ...item,
            rarity: item.rarity || metadata.rarity || null,
            image_url: item.image_url || metadata.image_url || null,
            category: item.category || metadata.category || 'item',
            item_type: item.item_type || metadata.item_type || null,
          };
        }),
      },
    };
  });
}

async function pveState(client, character) {
  const stats = serializeCharacter(character).stats;
  const playerPower = combatPower(stats);
  const pendingEncounter = character.pending_enemy_code ? (await client.query(
    `SELECT e.*, a.name AS area_name, a.min_realm_order,
            EXISTS (SELECT 1 FROM battle_logs bl WHERE bl.character_id = $1
                    AND bl.enemy_code = e.code AND bl.result = 'win') AS defeated
     FROM enemies e JOIN areas a ON a.code = e.area_code
     WHERE e.code = $2`,
    [character.id, character.pending_enemy_code],
  )).rows[0] : null;
  const encounter = pendingEncounter ? (() => {
    const enemy = pendingEncounter;
    const enemyPower = combatPower(enemy);
    const bossRequirements = enemy.rank === 'boss' ? {
      technique: rarityRank[character.technique_rarity] >= rarityRank.epic,
      weapon: rarityRank[character.attack_weapon_rarity] >= rarityRank.epic
        && character.attack_weapon_major_realm === character.major_realm,
      armor: rarityRank[character.defense_weapon_rarity] >= rarityRank.epic
        && character.defense_weapon_major_realm === character.major_realm,
    } : null;
    const missingRequirements = bossRequirements ? Object.entries(bossRequirements)
      .filter(([, ready]) => !ready)
      .map(([key]) => ({ technique: '本境界珍品以上功法', weapon: '本境界珍品以上武器', armor: '本境界珍品以上护器' })[key]) : [];
    return {
      code: enemy.code,
      name: enemy.name,
      rank: enemy.rank,
      area_code: enemy.area_code,
      area_name: enemy.area_name,
      description: enemy.description,
      image_url: enemy.image_url,
      defeated: enemy.defeated,
      hp: Number(enemy.hp), atk: Number(enemy.atk), def: Number(enemy.def), spd: Number(enemy.spd),
      qi_reward: Number(enemy.qi_reward), stone_reward: Number(enemy.stone_reward),
      enemy_power: enemyPower, player_power: playerPower,
      power_ratio: Number((playerPower / enemyPower).toFixed(2)),
      forecast: missingRequirements.length ? '尚未具备资格' : playerPower >= enemyPower * 1.25 ? '优势' : playerPower >= enemyPower * 0.9 ? '势均力敌' : '凶险',
      boss_requirements: bossRequirements,
      missing_requirements: missingRequirements,
      can_challenge: missingRequirements.length === 0,
    };
  })() : null;
  return { pending_encounter: encounter, combat_power: playerPower };
}

async function getGameState(req, res, next) {
  try {
    const state = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) {
        const error = new Error('角色不存在'); error.status = 404; error.code = 'NO_CHARACTER'; throw error;
      }
      const gain = await settleOffline(client, character);
      await settleStamina(client, character);
      const inventory = await inventoryState(client, character, false);
      const codex = await codexState(client, character, false);
      const pve = await pveState(client, character);
      const breakthroughItems = await currentBreakthroughItems(client, character);
      let pendingEvent = null;
      if (character.pending_event_id) {
        pendingEvent = (await client.query('SELECT * FROM events WHERE id = $1', [character.pending_event_id])).rows[0];
      }
      return {
        character: serializeCharacter(character, gain),
        queue: inventory.queue,
        areas: codex.areas,
        equipment_queue: codex.equipment_queue,
        ...pve,
        breakthrough_items: breakthroughItems,
        pending_event: eventView(pendingEvent),
        explore_cooldown_seconds: exploreCooldownRemaining(character.last_explore_at),
      };
    });
    return res.json(state);
  } catch (error) {
    return next(error);
  }
}

async function playerCharacter(client, req) {
  const character = await getCharacterRow(client, req.user.userId);
  if (!character) {
    const error = new Error('角色不存在');
    error.status = 404;
    error.code = 'NO_CHARACTER';
    throw error;
  }
  return character;
}

async function getInventory(req, res, next) {
  const paging = playerPaging(req);
  const rarity = optionalRarity(req.query.rarity);
  const category = optionalCategory(req.query.category);
  const q = optionalQueryValue(req.query.q);
  try {
    const result = await withTransaction(async (client) => {
      const character = await playerCharacter(client, req);
      const params = [character.id, rarity, category, q];
      const [countResult, rowsResult] = await Promise.all([
        client.query(
          `SELECT COUNT(*)::int AS total
           FROM inventories inv
           JOIN items i ON i.id = inv.item_id
           WHERE inv.character_id = $1
             AND inv.quantity > 0
             AND ($2::text IS NULL OR i.rarity = $2)
             AND ($3::text IS NULL OR i.type = $3)
             AND ($4::text IS NULL OR CONCAT_WS(' ', i.code, i.name, i.description, i.source_description, i.major_realm)
                  ILIKE '%' || $4 || '%')`,
          params,
        ),
        client.query(
          `SELECT i.id, i.code, i.name, i.type, i.rarity, i.description, i.effect, i.image_url,
                  i.source_description, i.major_realm, inv.quantity, inv.locked,
                  EXISTS (SELECT 1 FROM character_item_uses ciu
                          WHERE ciu.character_id = inv.character_id AND ciu.item_id = i.id) AS used_once
           FROM inventories inv
           JOIN items i ON i.id = inv.item_id
           WHERE inv.character_id = $1
             AND inv.quantity > 0
             AND ($2::text IS NULL OR i.rarity = $2)
             AND ($3::text IS NULL OR i.type = $3)
             AND ($4::text IS NULL OR CONCAT_WS(' ', i.code, i.name, i.description, i.source_description, i.major_realm)
                  ILIKE '%' || $4 || '%')
           ORDER BY (i.major_realm = $5) DESC,
                    CASE i.type WHEN 'pill' THEN 0 WHEN 'breakthrough' THEN 1 WHEN 'material' THEN 2 ELSE 3 END,
                    ${rarityOrder}, i.name, i.id
           LIMIT $6 OFFSET $7`,
          [...params, character.major_realm, paging.limit, paging.offset],
        ),
      ]);
      const rows = rowsResult.rows;
      const codes = rows.map((item) => item.code);
      const sourceRows = codes.length ? (await client.query(
        `SELECT i.code, a.name AS area_name
         FROM area_material_drops amd
         JOIN items i ON i.id = amd.item_id
         JOIN areas a ON a.code = amd.area_code
         WHERE i.code = ANY($1::text[])
         ORDER BY i.code, a.min_realm_order, a.name`,
        [codes],
      )).rows : [];
      const sourceAreas = sourceRows.reduce((all, row) => {
        (all[row.code] ||= []).push(row.area_name);
        return all;
      }, {});
      const items = rows.map((item) => {
        const areas = sourceAreas[item.code] || [];
        return {
          ...item,
          effect_summary: effectSummary(item.effect),
          source_areas: areas,
          source_description: areas.length
            ? `前往${areas.join('、')}游历；事件明确奖励为必得，区域额外材料按公开掉落表结算。`
            : item.source_description,
        };
      });
      return pagedResult(items, countResult.rows[0]?.total, paging.page);
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function getRecipes(req, res, next) {
  const paging = playerPaging(req);
  const rarity = optionalRarity(req.query.rarity);
  const category = knownCategory(req.query.category, new Set(['unlocked', 'locked']));
  const q = optionalQueryValue(req.query.q);
  try {
    const result = await withTransaction(async (client) => {
      const character = await playerCharacter(client, req);
      const params = [character.id, character.major_realm, rarity, q, category];
      const [countResult, rowsResult] = await Promise.all([
        client.query(
          `SELECT COUNT(*)::int AS total
           FROM items i
           LEFT JOIN character_recipes cr ON cr.item_id = i.id AND cr.character_id = $1
           WHERE i.recipe IS NOT NULL
             AND (i.major_realm = $2 OR cr.id IS NOT NULL)
             AND ($3::text IS NULL OR i.rarity = $3)
             AND ($4::text IS NULL OR CONCAT_WS(' ', i.code, i.name, i.description, i.source_description, i.major_realm)
                  ILIKE '%' || $4 || '%')
             AND ($5::text IS NULL
                  OR ($5 = 'unlocked' AND cr.id IS NOT NULL)
                  OR ($5 = 'locked' AND cr.id IS NULL))`,
          params,
        ),
        client.query(
          `SELECT i.code, i.name, i.type, i.rarity, i.description, i.effect, i.recipe, i.image_url,
                  i.craft_time_s, i.source_description, i.major_realm,
                  (cr.id IS NOT NULL) AS unlocked
           FROM items i
           LEFT JOIN character_recipes cr ON cr.item_id = i.id AND cr.character_id = $1
           WHERE i.recipe IS NOT NULL
             AND (i.major_realm = $2 OR cr.id IS NOT NULL)
             AND ($3::text IS NULL OR i.rarity = $3)
             AND ($4::text IS NULL OR CONCAT_WS(' ', i.code, i.name, i.description, i.source_description, i.major_realm)
                  ILIKE '%' || $4 || '%')
             AND ($5::text IS NULL
                  OR ($5 = 'unlocked' AND cr.id IS NOT NULL)
                  OR ($5 = 'locked' AND cr.id IS NULL))
           ORDER BY (i.major_realm = $2) DESC, ${rarityOrder}, (cr.id IS NOT NULL) DESC, i.name, i.id
           LIMIT $6 OFFSET $7`,
          [...params, paging.limit, paging.offset],
        ),
      ]);
      const materials = await ingredientDetails(client, character.id, rowsResult.rows);
      const items = rowsResult.rows.map((item) => ({
        ...withIngredients(item, materials, '未知材料'),
        effect_summary: effectSummary(item.effect),
      }));
      return pagedResult(items, countResult.rows[0]?.total, paging.page);
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function getTechniques(req, res, next) {
  const paging = playerPaging(req);
  const rarity = optionalRarity(req.query.rarity);
  const category = knownCategory(req.query.category, new Set(['owned', 'unowned']));
  const q = optionalQueryValue(req.query.q);
  try {
    const result = await withTransaction(async (client) => {
      const character = await playerCharacter(client, req);
      const params = [character.id, character.major_realm, rarity, q, category];
      const [countResult, rowsResult] = await Promise.all([
        client.query(
          `SELECT COUNT(*)::int AS total
           FROM techniques t
           LEFT JOIN character_techniques ct ON ct.technique_id = t.id AND ct.character_id = $1
           WHERE (t.major_realm = $2 OR ct.id IS NOT NULL)
             AND ($3::text IS NULL OR t.rarity = $3)
             AND ($4::text IS NULL OR CONCAT_WS(' ', t.code, t.name, t.category, t.description, t.source_description, t.major_realm)
                  ILIKE '%' || $4 || '%')
             AND ($5::text IS NULL
                  OR ($5 = 'owned' AND ct.id IS NOT NULL)
                  OR ($5 = 'unowned' AND ct.id IS NULL))`,
          params,
        ),
        client.query(
          `SELECT t.code, t.name, t.rarity, t.category, t.description, t.qi_multiplier,
                  t.retreat_multiplier, t.breakthrough_bonus, t.event_bonus,
                  t.stat_bonuses, t.source_description, t.major_realm,
                  (ct.id IS NOT NULL) AS owned,
                  (c.active_technique = t.id) AS active
           FROM techniques t
           LEFT JOIN character_techniques ct ON ct.technique_id = t.id AND ct.character_id = $1
           JOIN characters c ON c.id = $1
           WHERE (t.major_realm = $2 OR ct.id IS NOT NULL)
             AND ($3::text IS NULL OR t.rarity = $3)
             AND ($4::text IS NULL OR CONCAT_WS(' ', t.code, t.name, t.category, t.description, t.source_description, t.major_realm)
                  ILIKE '%' || $4 || '%')
             AND ($5::text IS NULL
                  OR ($5 = 'owned' AND ct.id IS NOT NULL)
                  OR ($5 = 'unowned' AND ct.id IS NULL))
           ORDER BY (t.major_realm = $2) DESC,
                    CASE t.rarity WHEN 'legendary' THEN 0 WHEN 'epic' THEN 1 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 3 ELSE 4 END,
                    (ct.id IS NOT NULL) DESC, t.name, t.id
           LIMIT $6 OFFSET $7`,
          [...params, paging.limit, paging.offset],
        ),
      ]);
      const items = rowsResult.rows.map((technique) => ({
        ...technique,
        qi_multiplier: Number(technique.qi_multiplier),
        retreat_multiplier: Number(technique.retreat_multiplier),
        breakthrough_bonus: Number(technique.breakthrough_bonus),
        event_bonus: Number(technique.event_bonus),
        stat_bonuses: scaleTechniqueStats(technique.stat_bonuses, technique.rarity),
      }));
      return pagedResult(items, countResult.rows[0]?.total, paging.page);
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function getEquipment(req, res, next) {
  const paging = playerPaging(req);
  const rarity = optionalRarity(req.query.rarity);
  const category = knownCategory(req.query.category, new Set([
    'attack', 'defense', 'owned', 'unowned', 'recipe_unlocked', 'equipped',
  ]));
  const q = optionalQueryValue(req.query.q);
  try {
    const result = await withTransaction(async (client) => {
      const character = await playerCharacter(client, req);
      const params = [character.id, character.order_index, character.major_realm, rarity, q, category];
      const countParams = [character.id, character.major_realm, rarity, q, category];
      const [countResult, rowsResult] = await Promise.all([
        client.query(
          `SELECT COUNT(*)::int AS total
           FROM equipment e
           LEFT JOIN character_equipment ce ON ce.equipment_id = e.id AND ce.character_id = $1
           LEFT JOIN character_equipment_recipes cer ON cer.equipment_id = e.id AND cer.character_id = $1
           WHERE (e.major_realm = $2 OR ce.id IS NOT NULL OR cer.id IS NOT NULL)
             AND ($3::text IS NULL OR e.rarity = $3)
             AND ($4::text IS NULL OR CONCAT_WS(' ', e.code, e.name, e.weapon_type, e.combat_role, e.description, e.source_description, e.major_realm)
                  ILIKE '%' || $4 || '%')
             AND ($5::text IS NULL
                  OR ($5 IN ('attack', 'defense') AND e.combat_role = $5)
                  OR ($5 = 'owned' AND COALESCE(ce.quantity, 0) > 0)
                  OR ($5 = 'unowned' AND COALESCE(ce.quantity, 0) < 1)
                  OR ($5 = 'recipe_unlocked' AND cer.id IS NOT NULL)
                  OR ($5 = 'equipped' AND ce.equipped_slot IS NOT NULL))`,
          countParams,
        ),
        client.query(
          `SELECT e.code, e.name, e.weapon_type, e.combat_role, e.rarity, e.major_realm, e.required_order,
                  e.attack_bonus, e.defense_bonus, e.hp_bonus, e.speed_bonus,
                  e.description, e.source_description, e.image_url, e.recipe, e.craft_time_s,
                  e.recipe_source_description, (cer.id IS NOT NULL) AS recipe_unlocked,
                  COALESCE(ce.quantity, 0)::int AS quantity,
                  (ce.equipped_slot IS NOT NULL) AS equipped,
                  ce.equipped_slot,
                  COALESCE(ce.locked, FALSE) AS locked,
                  (e.required_order <= $2) AS can_equip
           FROM equipment e
           LEFT JOIN character_equipment ce ON ce.equipment_id = e.id AND ce.character_id = $1
           LEFT JOIN character_equipment_recipes cer ON cer.equipment_id = e.id AND cer.character_id = $1
           WHERE (e.major_realm = $3 OR ce.id IS NOT NULL OR cer.id IS NOT NULL)
             AND ($4::text IS NULL OR e.rarity = $4)
             AND ($5::text IS NULL OR CONCAT_WS(' ', e.code, e.name, e.weapon_type, e.combat_role, e.description, e.source_description, e.major_realm)
                  ILIKE '%' || $5 || '%')
             AND ($6::text IS NULL
                  OR ($6 IN ('attack', 'defense') AND e.combat_role = $6)
                  OR ($6 = 'owned' AND COALESCE(ce.quantity, 0) > 0)
                  OR ($6 = 'unowned' AND COALESCE(ce.quantity, 0) < 1)
                  OR ($6 = 'recipe_unlocked' AND cer.id IS NOT NULL)
                  OR ($6 = 'equipped' AND ce.equipped_slot IS NOT NULL))
           ORDER BY (e.major_realm = $3) DESC,
                    CASE e.rarity WHEN 'legendary' THEN 0 WHEN 'epic' THEN 1 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 3 ELSE 4 END,
                    (ce.id IS NOT NULL) DESC, e.combat_role, e.weapon_type, e.name, e.id
           LIMIT $7 OFFSET $8`,
          [...params, paging.limit, paging.offset],
        ),
      ]);
      const materials = await ingredientDetails(client, character.id, rowsResult.rows);
      const items = rowsResult.rows.map((item) => withIngredients(item, materials, '未知炼材'));
      return pagedResult(items, countResult.rows[0]?.total, paging.page);
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function getBattleHistory(req, res, next) {
  const paging = playerPaging(req);
  const category = knownCategory(req.query.category, new Set(['win', 'lose']));
  const q = optionalQueryValue(req.query.q);
  try {
    const result = await withTransaction(async (client) => {
      const character = await playerCharacter(client, req);
      const params = [character.id, category, q];
      const [countResult, rowsResult] = await Promise.all([
        client.query(
          `SELECT COUNT(*)::int AS total
           FROM battle_logs bl
           LEFT JOIN enemies e ON e.code = bl.enemy_code
           WHERE bl.character_id = $1
             AND ($2::text IS NULL OR bl.result = $2)
             AND ($3::text IS NULL OR CONCAT_WS(' ', bl.enemy_code, e.name) ILIKE '%' || $3 || '%')`,
          params,
        ),
        client.query(
          `SELECT bl.id, bl.enemy_code, bl.result, bl.rounds, bl.loot, bl.fought_at, e.name
           FROM battle_logs bl
           LEFT JOIN enemies e ON e.code = bl.enemy_code
           WHERE bl.character_id = $1
             AND ($2::text IS NULL OR bl.result = $2)
             AND ($3::text IS NULL OR CONCAT_WS(' ', bl.enemy_code, e.name) ILIKE '%' || $3 || '%')
           ORDER BY bl.fought_at DESC, bl.id DESC
           LIMIT $4 OFFSET $5`,
          [...params, paging.limit, paging.offset],
        ),
      ]);
      const items = await hydrateBattleLoot(client, rowsResult.rows);
      return pagedResult(items, countResult.rows[0]?.total, paging.page);
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function getExplorationHistory(req, res, next) {
  const paging = playerPaging(req);
  const category = optionalCategory(req.query.category);
  const q = optionalQueryValue(req.query.q);
  try {
    const result = await withTransaction(async (client) => {
      const character = await playerCharacter(client, req);
      const params = [character.id, category, q];
      const [countResult, rowsResult] = await Promise.all([
        client.query(
          `SELECT COUNT(*)::int AS total
           FROM exploration_logs
           WHERE character_id = $1
             AND ($2::text IS NULL OR area_code = $2)
             AND ($3::text IS NULL OR CONCAT_WS(' ', area_code, area_name, event_code, event_title, narrative)
                  ILIKE '%' || $3 || '%')`,
          params,
        ),
        client.query(
          `SELECT id, area_code, area_name, event_code, event_title, choice_text, narrative, rewards, explored_at
           FROM exploration_logs
           WHERE character_id = $1
             AND ($2::text IS NULL OR area_code = $2)
             AND ($3::text IS NULL OR CONCAT_WS(' ', area_code, area_name, event_code, event_title, narrative)
                  ILIKE '%' || $3 || '%')
           ORDER BY explored_at DESC, id DESC
           LIMIT $4 OFFSET $5`,
          [...params, paging.limit, paging.offset],
        ),
      ]);
      return pagedResult(rowsResult.rows, countResult.rows[0]?.total, paging.page);
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function fightEnemy(req, res, next) {
  if (typeof req.body.enemy_code !== 'string') return res.status(400).json({ error: '请选择对手' });
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      if (character.retreat_started_at) { const error = new Error('闭关期间不能出战'); error.status = 409; throw error; }
      await settleStamina(client, character);
      if (!character.pending_enemy_code || character.pending_enemy_code !== req.body.enemy_code) {
        const error = new Error('当前没有遭遇这个敌人'); error.status = 409; throw error;
      }
      const enemy = (await client.query(
        `SELECT e.*, a.min_realm_order FROM enemies e JOIN areas a ON a.code = e.area_code
         WHERE e.code = $1 AND a.min_realm_order <= $2`,
        [req.body.enemy_code, character.order_index],
      )).rows[0];
      if (!enemy) { const error = new Error('当前境界无法挑战该敌人'); error.status = 403; throw error; }
      if (enemy.rank === 'boss') {
        const missing = [];
        if (rarityRank[character.technique_rarity] < rarityRank.epic) missing.push('本境界珍品以上功法');
        if (rarityRank[character.attack_weapon_rarity] < rarityRank.epic
          || character.attack_weapon_major_realm !== character.major_realm) missing.push('本境界珍品以上武器');
        if (rarityRank[character.defense_weapon_rarity] < rarityRank.epic
          || character.defense_weapon_major_realm !== character.major_realm) missing.push('本境界珍品以上护器');
        if (missing.length) {
          const error = new Error(`首领威压难以承受，还需：${missing.join('、')}`); error.status = 403; throw error;
        }
      }
      const staminaCost = { normal: 8, elite: 16, boss: 28 }[enemy.rank] || 8;
      if (Number(character.stamina) < staminaCost) {
        const error = new Error(`精力不足，挑战${enemy.name}需要${staminaCost}点精力`); error.status = 409; throw error;
      }
      const player = serializeCharacter(character).stats;
      if (Number(player.hp) <= 0) { const error = new Error('气血枯竭，请先服丹或调息'); error.status = 409; throw error; }
      const battle = resolveBattle(player, enemy);
      const remainingHp = battle.result === 'win' ? Math.max(1, battle.player_hp) : 1;
      const techniqueHp = Number(scaleTechniqueStats(
        character.technique_stat_bonuses,
        character.technique_rarity,
      ).hp || 0);
      const bonusHp = techniqueHp + Number(character.attack_weapon_hp || 0) + Number(character.defense_weapon_hp || 0);
      const storedHp = baseHpAfterBattle(remainingHp, character.hp_max, bonusHp);
      await client.query(
        'UPDATE characters SET hp = $1, stamina = stamina - $2, stamina_updated_at = NOW(), pending_enemy_code = NULL WHERE id = $3',
        [storedHp, staminaCost, character.id],
      );
      const loot = [];
      let qiReward = 0;
      let stoneReward = 0;
      if (battle.result === 'win') {
        qiReward = Number(enemy.qi_reward);
        stoneReward = Number(enemy.stone_reward);
        await client.query(
          `UPDATE characters SET current_qi = LEAST(current_qi + $1, $2),
             spirit_stones = spirit_stones + $3 WHERE id = $4`,
          [qiReward, character.qi_required, stoneReward, character.id],
        );
        if (enemy.rank === 'boss') {
          const bossMaterialCode = `boss_core_${enemy.area_code}`;
          const bossMaterial = (await client.query(
            'SELECT code, name, type, rarity, image_url FROM items WHERE code = $1',
            [bossMaterialCode],
          )).rows[0];
          if (bossMaterial) {
            await addInventory(client, character.id, bossMaterial.code, 1);
            loot.push({ ...bossMaterial, category: 'item', item_type: bossMaterial.type, quantity: 1, guaranteed: true });
          }
          const pillCode = bossPillByArea[enemy.area_code];
          if (pillCode) {
            await client.query(
              `INSERT INTO character_recipes(character_id,item_id)
               SELECT $1,id FROM items WHERE code=$2 ON CONFLICT DO NOTHING`,
              [character.id, pillCode],
            );
          }
        }
        if (Math.random() < Number(enemy.material_rate)) {
          const material = (await client.query(
            `SELECT i.code, i.name, i.type, i.rarity, i.image_url
             FROM area_material_drops amd JOIN items i ON i.id = amd.item_id
             WHERE amd.area_code = $1 ORDER BY -LN(GREATEST(RANDOM(), 0.000001)) / amd.weight LIMIT 1`,
            [enemy.area_code],
          )).rows[0];
          if (material) {
            await addInventory(client, character.id, material.code, 1);
            loot.push({ ...material, category: 'material', item_type: material.type, quantity: 1 });
          }
        }
      }
      await client.query(
        `INSERT INTO battle_logs (character_id, enemy_code, result, rounds, loot) VALUES ($1,$2,$3,$4,$5)`,
        [character.id, enemy.code, battle.result, battle.rounds, JSON.stringify({ items: loot, qi: qiReward, spirit_stones: stoneReward, log: battle.log })],
      );
      return {
        ...battle, loot, qi_reward: qiReward, stone_reward: stoneReward, stamina_cost: staminaCost,
        message: battle.result === 'win'
          ? `战胜${enemy.name}，获得${qiReward}灵气、${stoneReward}灵石${loot.length ? `及${loot[0].name}` : ''}`
          : `败于${enemy.name}，气血降至1点，请疗伤后再战`,
      };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function avoidEncounter(req, res, next) {
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character?.pending_enemy_code) { const error = new Error('当前没有需要避开的敌人'); error.status = 409; throw error; }
      const enemy = (await client.query('SELECT name FROM enemies WHERE code = $1', [character.pending_enemy_code])).rows[0];
      await client.query('UPDATE characters SET pending_enemy_code = NULL WHERE id = $1', [character.id]);
      return { message: `你收敛气息，避开了${enemy?.name || '敌人'}，未消耗精力。` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function rest(req, res, next) {
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      const stats = serializeCharacter(character).stats;
      if (Number(stats.hp) >= Number(stats.hp_max)) return { message: '气血已满，无需调息' };
      const cost = Math.max(1, Math.ceil((Number(stats.hp_max) - Number(stats.hp)) / 100));
      if (Number(character.spirit_stones) < cost) { const error = new Error(`调息需要${cost}枚灵石`); error.status = 400; throw error; }
      await client.query('UPDATE characters SET hp = $1, spirit_stones = spirit_stones - $2 WHERE id = $3',
        [character.hp_max, cost, character.id]);
      return { message: `调息完成，气血恢复至${stats.hp_max}，消耗${cost}枚灵石` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function startRetreat(req, res, next) {
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      if (character.retreat_started_at) {
        const error = new Error('已经在闭关中'); error.status = 409; throw error;
      }
      if (character.pending_enemy_code) {
        const error = new Error('附近有敌人逼近，无法安心闭关'); error.status = 409; throw error;
      }
      await settleOffline(client, character);
      if (BigInt(character.current_qi) >= BigInt(character.qi_required)) {
        const error = new Error('灵气已经圆满，请先尝试破境'); error.status = 409; throw error;
      }
      await client.query(
        'UPDATE characters SET retreat_started_at = NOW(), last_online_at = NOW() WHERE id = $1',
        [character.id],
      );
      const updated = await getCharacterRow(client, req.user.userId);
      return {
        message: `开始闭关，自然修炼与游历已经暂停；最多结算 ${updated.offline_qi_cap_hrs} 小时`,
        character: serializeCharacter(updated),
      };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function endRetreat(req, res, next) {
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      if (!character.retreat_started_at) {
        const error = new Error('当前没有进行闭关'); error.status = 409; throw error;
      }
      const gained = await settleRetreat(client, character);
      const updated = await getCharacterRow(client, req.user.userId);
      return {
        gained,
        message: gained > 0 ? `出关完成，获得 ${gained.toLocaleString('zh-CN')} 灵气` : '已经出关，灵气已达本境界上限',
        character: serializeCharacter(updated),
      };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function explore(req, res, next) {
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) {
        const error = new Error('角色不存在'); error.status = 404; throw error;
      }
      if (character.retreat_started_at) {
        const error = new Error('闭关期间无法游历，请先出关'); error.status = 409; throw error;
      }
      if (character.pending_event_id) {
        const pending = (await client.query('SELECT * FROM events WHERE id = $1', [character.pending_event_id])).rows[0];
        return { event: eventView(pending), resumed: true, explore_cooldown_seconds: exploreCooldownRemaining(character.last_explore_at) };
      }
      if (character.pending_enemy_code) {
        const error = new Error('附近仍有敌人逼近，请先迎战或避开'); error.status = 409; throw error;
      }
      const retryAfter = exploreCooldownRemaining(character.last_explore_at);
      if (retryAfter > 0) {
        const error = new Error(`游历太频繁，还需 ${retryAfter} 秒`);
        error.retryAfter = retryAfter;
        throw error;
      }
      const area = typeof req.body.area === 'string' ? req.body.area : 'luoxia';
      const areaState = (await client.query(
        'SELECT * FROM areas WHERE code = $1 AND min_realm_order <= $2',
        [area, character.order_index],
      )).rows[0];
      if (!areaState) {
        const error = new Error('该区域尚未解锁，先提升境界再来'); error.status = 403; throw error;
      }
      await settleStamina(client, character);
      const staminaCost = Number(areaState.explore_stamina_cost || 6);
      if (Number(character.stamina) < staminaCost) {
        const error = new Error(`精力不足，游历${areaState.name}需要${staminaCost}点精力`);
        error.status = 409; throw error;
      }
      const event = (await client.query(
        `SELECT * FROM events
         WHERE area_code = $1 AND min_realm_order <= $2 AND max_realm_order >= $2
         ORDER BY -LN(GREATEST(RANDOM(), 0.000001)) / weight LIMIT 1`,
        [area, character.order_index],
      )).rows[0];
      if (!event) {
        const error = new Error('当前区域还没有可触发事件'); error.status = 404; throw error;
      }
      const { rows: [updated] } = await client.query(
        `UPDATE characters SET pending_event_id = $1, last_explore_at = NOW(),
           stamina = stamina - $2, stamina_updated_at = NOW() WHERE id = $3
         RETURNING last_explore_at`,
        [event.id, staminaCost, character.id],
      );
      return {
        event: eventView(event), resumed: false, stamina_cost: staminaCost,
        stamina_remaining: Number(character.stamina) - staminaCost,
        explore_cooldown_seconds: exploreCooldownRemaining(updated.last_explore_at),
      };
    });
    return res.json(result);
  } catch (error) {
    if (error.retryAfter) {
      res.set('Retry-After', String(error.retryAfter));
      return res.status(429).json({ error: error.message, retry_after: error.retryAfter });
    }
    return next(error);
  }
}

async function chooseEvent(req, res, next) {
  const choiceIndex = Number(req.body.choice_index);
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0) {
    return res.status(400).json({ error: '无效的事件选项' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character?.pending_event_id) {
        const error = new Error('当前没有待处理事件'); error.status = 409; throw error;
      }
      const event = (await client.query(
        `SELECT e.*, a.name AS area_name,
                NOT EXISTS (SELECT 1 FROM character_events ce WHERE ce.character_id = $2 AND ce.event_id = e.id) AS first_discovery
         FROM events e LEFT JOIN areas a ON a.code = e.area_code
         WHERE e.id = $1`,
        [character.pending_event_id, character.id],
      )).rows[0];
      const choice = event?.choices?.[choiceIndex];
      if (!choice) {
        const error = new Error('事件选项不存在'); error.status = 400; throw error;
      }
      const eventRewards = await applyEffects(client, character, choice.effects);
      const areaDrops = await rollAreaDrops(client, character, event.area_code);
      const visibleAreaDrops = areaDrops.map(({ pity_triggered, rate, ...drop }) => drop);
      const mergedRewards = new Map();
      for (const reward of [...eventRewards, ...visibleAreaDrops]) {
        const key = `${reward.category}:${reward.code}`;
        const existing = mergedRewards.get(key);
        if (existing) existing.quantity += Number(reward.quantity || 1);
        else mergedRewards.set(key, { ...reward, quantity: Number(reward.quantity || 1) });
      }
      const rewards = [...mergedRewards.values()];
      const dropLabels = { material: '材料', technique: '功法谱', recipe: '丹谱', equipment_recipe: '器谱', equipment: '成品器物', item: '物品' };
      const discoveries = rewards.map((reward) => `${dropLabels[reward.category] || '收获'}《${reward.name}》${reward.quantity > 1 ? ` × ${reward.quantity}` : ''}`);
      await client.query(
        `INSERT INTO exploration_logs(
           character_id, area_code, area_name, event_code, event_title, choice_text, narrative, rewards
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          character.id,
          event.area_code,
          event.area_name || event.area_code,
          event.code,
          event.title,
          String(choice.text || ''),
          choice.result,
          JSON.stringify(rewards),
        ],
      );
      await client.query(
        'INSERT INTO character_events (character_id, event_id, choice_index) VALUES ($1, $2, $3)',
        [character.id, event.id, choiceIndex],
      );
      let encounter = null;
      const encounterRule = (await client.query(
        `SELECT a.encounter_base_rate, a.encounter_pity_after, COALESCE(cep.misses, 0)::int AS misses
         FROM areas a
         LEFT JOIN character_encounter_pity cep ON cep.area_code = a.code AND cep.character_id = $1
         WHERE a.code = $2`,
        [character.id, event.area_code],
      )).rows[0];
      const encounterBaseRate = Number(encounterRule?.encounter_base_rate || 0.2);
      const encounterPityAfter = Number(encounterRule?.encounter_pity_after || 5);
      const encounterMisses = Number(encounterRule?.misses || 0);
      const encounterRate = encounterChance({ baseRate: encounterBaseRate, misses: encounterMisses, pityAfter: encounterPityAfter });
      if (Math.random() < encounterRate) {
        const rankRoll = Math.random();
        const fullStage = character.sub_stage === '圆满';
        const rank = fullStage
          ? rankRoll < 0.5 ? 'normal' : rankRoll < 0.8 ? 'elite' : 'boss'
          : rankRoll < 0.72 ? 'normal' : rankRoll < 0.96 ? 'elite' : 'boss';
        encounter = (await client.query(
          'SELECT code, name, rank FROM enemies WHERE area_code = $1 AND rank = $2 LIMIT 1',
          [event.area_code, rank],
        )).rows[0] || null;
      }
      const nextEncounterMisses = encounter ? 0 : Math.min(encounterPityAfter - 1, encounterMisses + 1);
      await client.query(
        `INSERT INTO character_encounter_pity(character_id, area_code, misses)
         VALUES ($1, $2, $3)
         ON CONFLICT(character_id, area_code) DO UPDATE SET misses = EXCLUDED.misses`,
        [character.id, event.area_code, nextEncounterMisses],
      );
      await client.query(
        'UPDATE characters SET pending_event_id = NULL, pending_enemy_code = $1 WHERE id = $2',
        [encounter?.code || null, character.id],
      );
      return {
        title: event.title,
        first_discovery: event.first_discovery,
        result: discoveries.length ? `${choice.result} 另有收获：${discoveries.join('、')}。` : choice.result,
        narrative: choice.result,
        effects: choice.effects,
        discoveries,
        rewards,
        area_drops: visibleAreaDrops,
        encounter_triggered: Boolean(encounter),
      };
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function startCraft(req, res, next) {
  const quantity = Number(req.body.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10 || typeof req.body.item_code !== 'string') {
    return res.status(400).json({ error: '炼制参数无效' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) {
        const error = new Error('角色不存在'); error.status = 404; throw error;
      }
      const activeCount = Number((await client.query(
        'SELECT count(*) FROM craft_queue WHERE character_id = $1 AND is_collected = FALSE',
        [character.id],
      )).rows[0].count);
      if (activeCount >= 3) {
        const error = new Error('炼制队列已满，请先领取成品'); error.status = 409; throw error;
      }
      const item = (await client.query(
        `SELECT i.* FROM items i
         JOIN character_recipes cr ON cr.item_id = i.id
         WHERE i.code = $1 AND i.recipe IS NOT NULL AND cr.character_id = $2`,
        [req.body.item_code, character.id],
      )).rows[0];
      if (!item) {
        const error = new Error('尚未收录这张丹谱，无法炼制'); error.status = 403; throw error;
      }
      for (const [code, amount] of Object.entries(item.recipe)) {
        const required = Number(amount) * quantity;
        const deducted = await client.query(
          `UPDATE inventories inv SET quantity = quantity - $1
           FROM items i WHERE inv.item_id = i.id AND inv.character_id = $2
             AND i.code = $3 AND inv.quantity >= $1`,
          [required, character.id, code],
        );
        if (!deducted.rowCount) {
          const material = (await client.query('SELECT name FROM items WHERE code = $1', [code])).rows[0];
          const error = new Error(`材料不足：${material?.name || '未知材料'}`); error.status = 400; throw error;
        }
      }
      const queue = (await client.query(
        `INSERT INTO craft_queue (character_id, item_id, quantity, finish_at)
         VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL '1 second')) RETURNING *`,
        [character.id, item.id, quantity, item.craft_time_s * quantity],
      )).rows[0];
      return { queue, message: `${item.name}已开始炼制` };
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function collectCraft(req, res, next) {
  const queueId = Number(req.body.queue_id);
  if (!Number.isInteger(queueId)) return res.status(400).json({ error: '无效的炼制队列' });
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      const queue = (await client.query(
        `SELECT q.*, i.code, i.name FROM craft_queue q JOIN items i ON i.id = q.item_id
         WHERE q.id = $1 AND q.character_id = $2 FOR UPDATE OF q`,
        [queueId, character?.id || 0],
      )).rows[0];
      if (!queue || queue.is_collected) {
        const error = new Error('炼制任务不存在或已领取'); error.status = 404; throw error;
      }
      if (new Date(queue.finish_at).getTime() > Date.now()) {
        const error = new Error('炼制尚未完成'); error.status = 409; throw error;
      }
      await addInventory(client, character.id, queue.code, queue.quantity);
      await client.query('UPDATE craft_queue SET is_collected = TRUE WHERE id = $1', [queue.id]);
      return { item_code: queue.code, quantity: queue.quantity, message: `已领取${queue.name}` };
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function startForging(req, res, next) {
  const quantity = Number(req.body.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5 || typeof req.body.equipment_code !== 'string') {
    return res.status(400).json({ error: '炼器参数无效' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      const activeCount = Number((await client.query(
        'SELECT count(*) FROM equipment_craft_queue WHERE character_id = $1 AND is_collected = FALSE',
        [character.id],
      )).rows[0].count);
      if (activeCount >= 3) { const error = new Error('炼器炉位已满，请先领取成品'); error.status = 409; throw error; }
      const equipment = (await client.query(
        `SELECT e.* FROM equipment e
         JOIN character_equipment_recipes cer ON cer.equipment_id = e.id
         WHERE e.code = $1 AND e.recipe IS NOT NULL AND cer.character_id = $2`,
        [req.body.equipment_code, character.id],
      )).rows[0];
      if (!equipment) { const error = new Error('尚未收录这张器谱，无法炼制'); error.status = 403; throw error; }
      if (character.order_index < equipment.required_order) {
        const error = new Error(`境界不足，需要达到${equipment.major_realm}才能炼制`); error.status = 403; throw error;
      }
      for (const [code, amount] of Object.entries(equipment.recipe || {})) {
        const required = Number(amount) * quantity;
        const deducted = await client.query(
          `UPDATE inventories inv SET quantity = quantity - $1
           FROM items i WHERE inv.item_id = i.id AND inv.character_id = $2
             AND i.code = $3 AND inv.quantity >= $1`,
          [required, character.id, code],
        );
        if (!deducted.rowCount) {
          const material = (await client.query('SELECT name FROM items WHERE code = $1', [code])).rows[0];
          const error = new Error(`炼材不足：${material?.name || '未知炼材'}`); error.status = 400; throw error;
        }
      }
      const queue = (await client.query(
        `INSERT INTO equipment_craft_queue(character_id,equipment_id,quantity,finish_at)
         VALUES ($1,$2,$3,NOW()+($4*INTERVAL '1 second')) RETURNING *`,
        [character.id, equipment.id, quantity, equipment.craft_time_s * quantity],
      )).rows[0];
      return { queue, message: `${equipment.name}已入炉锻造` };
    });
    return res.status(201).json(result);
  } catch (error) { return next(error); }
}

async function collectForging(req, res, next) {
  const queueId = Number(req.body.queue_id);
  if (!Number.isInteger(queueId)) return res.status(400).json({ error: '无效的炼器队列' });
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      const queue = (await client.query(
        `SELECT q.*, e.code, e.name FROM equipment_craft_queue q JOIN equipment e ON e.id=q.equipment_id
         WHERE q.id=$1 AND q.character_id=$2 FOR UPDATE OF q`,
        [queueId, character?.id || 0],
      )).rows[0];
      if (!queue || queue.is_collected) { const error = new Error('炼器任务不存在或已领取'); error.status = 404; throw error; }
      if (new Date(queue.finish_at).getTime() > Date.now()) { const error = new Error('器物尚未铸成'); error.status = 409; throw error; }
      await client.query(
        `INSERT INTO character_equipment(character_id,equipment_id,quantity)
         VALUES ($1,$2,$3)
         ON CONFLICT(character_id,equipment_id) DO UPDATE SET quantity=character_equipment.quantity+EXCLUDED.quantity`,
        [character.id, queue.equipment_id, queue.quantity],
      );
      await client.query('UPDATE equipment_craft_queue SET is_collected=TRUE WHERE id=$1', [queue.id]);
      return { equipment_code: queue.code, quantity: queue.quantity, message: `已领取${queue.name}` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function useItem(req, res, next) {
  if (typeof req.body.item_code !== 'string') return res.status(400).json({ error: '请选择要使用的物品' });
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      await settleStamina(client, character);
      const item = (await client.query(
        `SELECT i.*, inv.quantity FROM inventories inv JOIN items i ON i.id = inv.item_id
         WHERE inv.character_id = $1 AND i.code = $2 AND inv.quantity > 0 FOR UPDATE OF inv`,
        [character.id, req.body.item_code],
      )).rows[0];
      if (!item) { const error = new Error('行囊中没有这件物品'); error.status = 404; throw error; }
      if (!['pill', 'buff'].includes(item.type)) {
        const error = new Error(item.type === 'material' ? '材料不能直接使用' : '这件物品需要在对应玩法中使用');
        error.status = 400; throw error;
      }
      const effect = item.effect || {};
      if (effect.stamina_major_realm && effect.stamina_major_realm !== character.major_realm) {
        const error = new Error(`${item.name}只适用于${effect.stamina_major_realm}，当前境界无法吸收药力`);
        error.status = 409; throw error;
      }
      const permanent = Number(effect.atk || 0) || Number(effect.def || 0) || Number(effect.spd || 0);
      if (permanent) {
        const use = await client.query(
          `INSERT INTO character_item_uses (character_id, item_id) VALUES ($1, $2)
           ON CONFLICT (character_id, item_id) DO NOTHING RETURNING id`,
          [character.id, item.id],
        );
        if (!use.rowCount) { const error = new Error('这种属性丹已经生效过，不能重复服用'); error.status = 409; throw error; }
      }
      const currentStats = serializeCharacter(character).stats;
      const hpBonus = Number(currentStats.hp_max) - Number(character.hp_max);
      const qiGain = Math.floor(Number(character.qi_required) * Number(effect.qi_percent || 0));
      const heal = Math.floor(Number(currentStats.hp_max) * Number(effect.heal_percent || 0));
      const healedBaseHp = baseHpAfterBattle(
        Math.min(Number(currentStats.hp_max), Number(currentStats.hp) + heal),
        character.hp_max,
        hpBonus,
      );
      const buffMultiplier = Number(effect.qi_multiplier || (effect.random_buff ? 1.5 : 1));
      const buffMinutes = Number(effect.duration_min || (effect.random_buff ? 20 : 0));
      await client.query(
        `UPDATE characters SET
           current_qi = LEAST(current_qi + $1, $2),
           hp = $3,
           atk = atk + $4, def = def + $5, spd = spd + $6,
           bonus_atk = bonus_atk + $4, bonus_def = bonus_def + $5, bonus_spd = bonus_spd + $6,
           fate_points = fate_points + $7,
           qi_buff_multiplier = CASE WHEN $8 > 1 THEN GREATEST(qi_buff_multiplier, $8) ELSE qi_buff_multiplier END,
           qi_buff_expires_at = CASE WHEN $9 > 0 THEN GREATEST(COALESCE(qi_buff_expires_at, NOW()), NOW()) + ($9 * INTERVAL '1 minute') ELSE qi_buff_expires_at END
         WHERE id = $10`,
        [qiGain, character.qi_required.toString(), healedBaseHp,
          Number(effect.atk || 0), Number(effect.def || 0), Number(effect.spd || 0),
          Number(effect.fate_points || 0), buffMultiplier, buffMinutes, character.id],
      );
      await client.query(
        'UPDATE inventories SET quantity = quantity - 1 WHERE character_id = $1 AND item_id = $2',
        [character.id, item.id],
      );
      if (Number(effect.stamina_restore || 0) > 0) {
        await client.query(
          `UPDATE characters SET stamina = LEAST(stamina + $1, 999),
             stamina_updated_at = CASE WHEN stamina + $1 >= 100 THEN NOW() ELSE stamina_updated_at END
           WHERE id = $2`,
          [Number(effect.stamina_restore), character.id],
        );
      }
      return { message: `已服用${item.name}：${effectSummary(effect)}` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

function recycleQuantity(value) {
  const quantity = Number(value || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) return null;
  return quantity;
}

async function protectItem(req, res, next) {
  if (typeof req.body.item_code !== 'string' || typeof req.body.locked !== 'boolean') {
    return res.status(400).json({ error: '物品保护参数无效' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      const updated = await client.query(
        `UPDATE inventories inv SET locked = $1 FROM items i
         WHERE inv.item_id = i.id AND inv.character_id = $2 AND i.code = $3 AND inv.quantity > 0
         RETURNING i.name`,
        [req.body.locked, character.id, req.body.item_code],
      );
      if (!updated.rowCount) { const error = new Error('行囊中没有这件物品'); error.status = 404; throw error; }
      return { message: `${updated.rows[0].name}已${req.body.locked ? '锁定' : '解除锁定'}` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function recycleItem(req, res, next) {
  const quantity = recycleQuantity(req.body.quantity);
  if (!quantity || typeof req.body.item_code !== 'string') {
    return res.status(400).json({ error: '回收参数无效' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      const item = (await client.query(
        `SELECT i.*, inv.quantity AS owned_quantity, inv.locked
         FROM inventories inv JOIN items i ON i.id = inv.item_id
         WHERE inv.character_id = $1 AND i.code = $2 FOR UPDATE OF inv`,
        [character.id, req.body.item_code],
      )).rows[0];
      if (!item || Number(item.owned_quantity) < quantity) {
        const error = new Error('持有数量不足'); error.status = 400; throw error;
      }
      if (item.locked) { const error = new Error('物品已锁定，请先解除保护'); error.status = 409; throw error; }

      await client.query(
        'UPDATE inventories SET quantity = quantity - $1 WHERE character_id = $2 AND item_id = $3',
        [quantity, character.id, item.id],
      );
      const recipe = item.recipe && Object.keys(item.recipe).length ? item.recipe : { [item.code]: 1 };
      const returned = [];
      for (const [code, amount] of Object.entries(recipe)) {
        const returnedQuantity = Math.floor(Number(amount) * quantity * 0.3);
        if (returnedQuantity < 1) continue;
        await addInventory(client, character.id, code, returnedQuantity);
        const material = (await client.query('SELECT name FROM items WHERE code = $1', [code])).rows[0];
        if (material) returned.push({ code, name: material.name, quantity: returnedQuantity });
      }
      return {
        returned,
        message: returned.length
          ? `已销毁${item.name} × ${quantity}，返还${returned.map((x) => `${x.name} × ${x.quantity}`).join('、')}`
          : `已销毁${item.name} × ${quantity}，折算后不足 1 份材料，不予返还`,
      };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function equipTechnique(req, res, next) {
  if (typeof req.body.technique_code !== 'string') return res.status(400).json({ error: '请选择功法' });
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      const technique = (await client.query(
        `SELECT t.* FROM character_techniques ct JOIN techniques t ON t.id = ct.technique_id
         WHERE ct.character_id = $1 AND t.code = $2 AND t.required_order <= $3`,
        [character.id, req.body.technique_code, character.order_index],
      )).rows[0];
      if (!technique) { const error = new Error('尚未收录这本功法谱'); error.status = 403; throw error; }
      await client.query('UPDATE characters SET active_technique = $1 WHERE id = $2', [technique.id, character.id]);
      return { message: `已将《${technique.name}》设为当前功法` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function equipWeapon(req, res, next) {
  if (typeof req.body.equipment_code !== 'string') return res.status(400).json({ error: '请选择器物' });
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      const equipment = (await client.query(
        `SELECT e.*, ce.id AS owned_id FROM character_equipment ce
         JOIN equipment e ON e.id = ce.equipment_id
         WHERE ce.character_id = $1 AND e.code = $2 AND ce.quantity > 0
         FOR UPDATE OF ce`,
        [character.id, req.body.equipment_code],
      )).rows[0];
      if (!equipment) { const error = new Error('尚未获得这件器物'); error.status = 404; throw error; }
      if (character.order_index < equipment.required_order) {
        const error = new Error(`境界不足，需要达到${equipment.major_realm}才能装备`);
        error.status = 403; throw error;
      }
      await client.query(
        `UPDATE character_equipment SET equipped = FALSE, equipped_slot = NULL
         WHERE character_id = $1 AND equipped_slot = $2`,
        [character.id, equipment.combat_role],
      );
      await client.query(
        'UPDATE character_equipment SET equipped = TRUE, equipped_slot = $1 WHERE id = $2',
        [equipment.combat_role, equipment.owned_id],
      );
      return { message: `已将${equipment.name}装备到${equipment.combat_role === 'attack' ? '攻器位' : '护器位'}` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function unequipWeapon(req, res, next) {
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      const slot = req.body.slot;
      if (!['attack', 'defense'].includes(slot)) {
        const error = new Error('请选择要卸下的装备位'); error.status = 400; throw error;
      }
      await client.query(
        `UPDATE character_equipment SET equipped = FALSE, equipped_slot = NULL
         WHERE character_id = $1 AND equipped_slot = $2`,
        [character.id, slot],
      );
      return { message: `已卸下${slot === 'attack' ? '攻器位' : '护器位'}装备` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function protectEquipment(req, res, next) {
  if (typeof req.body.equipment_code !== 'string' || typeof req.body.locked !== 'boolean') {
    return res.status(400).json({ error: '装备保护参数无效' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      const updated = await client.query(
        `UPDATE character_equipment ce SET locked = $1 FROM equipment e
         WHERE ce.equipment_id = e.id AND ce.character_id = $2 AND e.code = $3 AND ce.quantity > 0
         RETURNING e.name`,
        [req.body.locked, character.id, req.body.equipment_code],
      );
      if (!updated.rowCount) { const error = new Error('尚未获得这件器物'); error.status = 404; throw error; }
      return { message: `${updated.rows[0].name}已${req.body.locked ? '锁定' : '解除锁定'}` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function recycleEquipment(req, res, next) {
  const quantity = recycleQuantity(req.body.quantity);
  if (!quantity || typeof req.body.equipment_code !== 'string') {
    return res.status(400).json({ error: '分解参数无效' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      const equipment = (await client.query(
        `SELECT e.*, ce.id AS owned_id, ce.quantity AS owned_quantity, ce.locked, ce.equipped
         FROM character_equipment ce JOIN equipment e ON e.id = ce.equipment_id
         WHERE ce.character_id = $1 AND e.code = $2 FOR UPDATE OF ce`,
        [character.id, req.body.equipment_code],
      )).rows[0];
      if (!equipment || Number(equipment.owned_quantity) < quantity) {
        const error = new Error('持有数量不足'); error.status = 400; throw error;
      }
      if (equipment.equipped) { const error = new Error('当前装备不可分解，请先卸下'); error.status = 409; throw error; }
      if (equipment.locked) { const error = new Error('器物已锁定，请先解除保护'); error.status = 409; throw error; }

      if (Number(equipment.owned_quantity) === quantity) {
        await client.query('DELETE FROM character_equipment WHERE id = $1', [equipment.owned_id]);
      } else {
        await client.query('UPDATE character_equipment SET quantity = quantity - $1 WHERE id = $2', [quantity, equipment.owned_id]);
      }

      const returned = [];
      for (const [code, cost] of Object.entries(equipment.recipe || {})) {
        const returnedQuantity = Math.floor(Number(cost) * quantity * 0.3);
        if (returnedQuantity < 1) continue;
        const material = (await client.query('SELECT code, name FROM items WHERE code = $1', [code])).rows[0];
        if (!material) continue;
        await addInventory(client, character.id, material.code, returnedQuantity);
        returned.push({ ...material, quantity: returnedQuantity });
      }
      return {
        returned,
        message: returned.length
          ? `已分解${equipment.name} × ${quantity}，返还${returned.map((x) => `${x.name} × ${x.quantity}`).join('、')}`
          : `已分解${equipment.name} × ${quantity}，折算后不足 1 份材料，不予返还`,
      };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function getAnnouncements(req, res, next) {
  const { page, limit, offset } = playerPaging(req);
  try {
    const [countResult, rowsResult] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total
         FROM announcements
         WHERE status='published'
           AND (starts_at IS NULL OR starts_at<=NOW())
           AND (ends_at IS NULL OR ends_at>NOW())`,
      ),
      query(
        `SELECT id,title,body,priority,pinned,starts_at,ends_at,updated_at
         FROM announcements
         WHERE status='published'
           AND (starts_at IS NULL OR starts_at<=NOW())
           AND (ends_at IS NULL OR ends_at>NOW())
         ORDER BY pinned DESC,priority DESC,updated_at DESC,id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
    ]);
    return res.json(pagedResult(rowsResult.rows, countResult.rows[0]?.total, page));
  } catch (error) { return next(error); }
}

async function getTitles(req, res, next) {
  try {
    const result = await withTransaction(async (client) => {
      const character = await playerCharacter(client, req);
      const titles = (await client.query(
        `SELECT title, unlocked_at FROM character_titles
         WHERE character_id = $1
         ORDER BY unlocked_at DESC`,
        [character.id],
      )).rows;
      return { titles, active_title: character.active_title };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function setTitle(req, res, next) {
  if (typeof req.body.title !== 'string') return res.status(400).json({ error: '请选择称号' });
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }
      const owned = (await client.query(
        'SELECT 1 FROM character_titles WHERE character_id = $1 AND title = $2',
        [character.id, req.body.title],
      )).rows[0];
      if (!owned) { const error = new Error('尚未解锁该称号'); error.status = 403; throw error; }
      await client.query('UPDATE characters SET active_title = $1 WHERE id = $2', [req.body.title, character.id]);
      return { message: `已将称号设为「${req.body.title}」` };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function dailyCheckin(req, res, next) {
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) { const error = new Error('角色不存在'); error.status = 404; throw error; }

      const today = new Date().toISOString().split('T')[0];
      const lastCheckin = character.last_checkin_date ? new Date(character.last_checkin_date).toISOString().split('T')[0] : null;

      if (lastCheckin === today) {
        const error = new Error('今日已签到，明日再来'); error.status = 409; throw error;
      }

      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const isConsecutive = lastCheckin === yesterday;
      const newStreak = isConsecutive ? (character.checkin_streak || 0) + 1 : 1;

      await client.query(
        'INSERT INTO character_checkins (character_id, checkin_date, streak_days) VALUES ($1, $2, $3)',
        [character.id, today, newStreak],
      );

      let spiritStones = 50;
      let fatePoints = 0;
      let items = [];

      if (newStreak === 7) {
        spiritStones = 500;
        fatePoints = 3;
        items.push({ code: 'herb_rare_random', quantity: 5 });
        await client.query(
          'INSERT INTO character_titles (character_id, title) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [character.id, '勤修不辍'],
        );
      } else if (newStreak % 7 === 0) {
        spiritStones = 300;
        fatePoints = 2;
      } else if (newStreak >= 3) {
        spiritStones = 100;
        fatePoints = 1;
      }

      await client.query(
        `UPDATE characters SET
          checkin_streak = $1,
          last_checkin_date = $2,
          spirit_stones = spirit_stones + $3,
          fate_points = fate_points + $4
         WHERE id = $5`,
        [newStreak, today, spiritStones, fatePoints, character.id],
      );

      for (const item of items) {
        await addInventory(client, character.id, item.code, item.quantity);
      }

      return {
        message: `签到成功！连续${newStreak}天`,
        streak: newStreak,
        rewards: { spirit_stones: spiritStones, fate_points: fatePoints, items },
        unlocked_title: newStreak === 7 ? '勤修不辍' : null,
      };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function getAchievements(req, res, next) {
  try {
    const result = await withTransaction(async (client) => {
      const character = await playerCharacter(client, req);
      const achievements = (await client.query(
        `SELECT a.code, a.name, a.description, a.category, a.icon, a.requirement, a.reward,
                COALESCE(ca.progress, 0) AS progress, COALESCE(ca.completed, FALSE) AS completed,
                ca.completed_at
         FROM achievements a
         LEFT JOIN character_achievements ca ON ca.achievement_id = a.id AND ca.character_id = $1
         ORDER BY a.sort_order, a.id`,
        [character.id],
      )).rows;
      return { achievements };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

async function getLeaderboard(req, res, next) {
  const requestedType = typeof req.query.type === 'string' ? req.query.type : 'all_time_realm';
  const type = ['all_time_realm', 'spirit_stones', 'combat_power'].includes(requestedType)
    ? requestedType
    : 'all_time_realm';
  const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 10));
  try {
    const result = await withTransaction(async (client) => {
      const character = await playerCharacter(client, req);
      const rankedSql = type === 'all_time_realm'
        ? `
          WITH ranked AS (
            SELECT c.id, c.name AS character_name,
                   COALESCE(r.major_realm, '') || COALESCE(r.sub_stage, '') AS realm,
                   r.order_index AS score,
                   ROW_NUMBER() OVER (
                     ORDER BY r.order_index DESC, c.current_qi DESC, c.id ASC
                   ) AS rank
            FROM characters c
            JOIN realms r ON r.id = c.realm_id
          )
          SELECT id, character_name, realm, score, rank
          FROM ranked
          WHERE rank <= $1 OR id = $2
          ORDER BY rank`
        : type === 'spirit_stones'
          ? `
            WITH ranked AS (
              SELECT c.id, c.name AS character_name,
                     COALESCE(r.major_realm, '') || COALESCE(r.sub_stage, '') AS realm,
                     COALESCE(c.spirit_stones, 0) AS score,
                     ROW_NUMBER() OVER (
                       ORDER BY c.spirit_stones DESC NULLS LAST,
                                r.order_index DESC, c.current_qi DESC, c.id ASC
                     ) AS rank
              FROM characters c
              JOIN realms r ON r.id = c.realm_id
            )
            SELECT id, character_name, realm, score, rank
            FROM ranked
            WHERE rank <= $1 OR id = $2
            ORDER BY rank`
          : `
            WITH equipment_stats AS (
              SELECT ce.character_id,
                     SUM(e.attack_bonus) AS equipment_atk,
                     SUM(e.defense_bonus) AS equipment_def,
                     SUM(e.hp_bonus) AS equipment_hp,
                     SUM(e.speed_bonus) AS equipment_spd
              FROM character_equipment ce
              JOIN equipment e ON e.id = ce.equipment_id
              WHERE ce.equipped_slot IS NOT NULL
              GROUP BY ce.character_id
            ), base_stats AS (
              SELECT c.id, c.name AS character_name, c.current_qi,
                     COALESCE(r.major_realm, '') || COALESCE(r.sub_stage, '') AS realm,
                     r.order_index,
                     c.hp, c.hp_max, c.atk, c.def, c.spd,
                     COALESCE(c.spirit_stones, 0) AS spirit_stones,
                     COALESCE(es.equipment_atk, 0) AS equipment_atk,
                     COALESCE(es.equipment_def, 0) AS equipment_def,
                     COALESCE(es.equipment_hp, 0) AS equipment_hp,
                     COALESCE(es.equipment_spd, 0) AS equipment_spd,
                     COALESCE(t.stat_bonuses ->> 'hp', '0')::numeric *
                       CASE t.rarity
                         WHEN 'uncommon' THEN 2
                         WHEN 'rare' THEN 4
                         WHEN 'epic' THEN 7
                         WHEN 'legendary' THEN 12
                         ELSE 1
                       END AS technique_hp,
                     COALESCE(t.stat_bonuses ->> 'atk', '0')::numeric *
                       CASE t.rarity
                         WHEN 'uncommon' THEN 2
                         WHEN 'rare' THEN 4
                         WHEN 'epic' THEN 7
                         WHEN 'legendary' THEN 12
                         ELSE 1
                       END AS technique_atk,
                     COALESCE(t.stat_bonuses ->> 'def', '0')::numeric *
                       CASE t.rarity
                         WHEN 'uncommon' THEN 2
                         WHEN 'rare' THEN 4
                         WHEN 'epic' THEN 7
                         WHEN 'legendary' THEN 12
                         ELSE 1
                       END AS technique_def,
                     COALESCE(t.stat_bonuses ->> 'spd', '0')::numeric *
                       CASE t.rarity
                         WHEN 'uncommon' THEN 2
                         WHEN 'rare' THEN 4
                         WHEN 'epic' THEN 7
                         WHEN 'legendary' THEN 12
                         ELSE 1
                       END AS technique_spd
              FROM characters c
              JOIN realms r ON r.id = c.realm_id
              LEFT JOIN techniques t ON t.id = c.active_technique
              LEFT JOIN equipment_stats es ON es.character_id = c.id
            ), effective_stats AS (
              SELECT *,
                     GREATEST(0, ROUND(technique_hp + equipment_hp)) AS total_hp_bonus,
                     atk + technique_atk + equipment_atk AS effective_atk,
                     def + technique_def + equipment_def AS effective_def,
                     spd + technique_spd + equipment_spd AS effective_spd
              FROM base_stats
            ), ranked AS (
              SELECT id, character_name, realm,
                     GREATEST(1, ROUND(
                       LEAST(
                         GREATEST(1, hp_max) + total_hp_bonus,
                         GREATEST(0, hp) + total_hp_bonus
                       ) * 0.18
                       + effective_atk * 5
                       + effective_def * 4
                       + effective_spd * 2
                     ))::bigint AS score,
                     ROW_NUMBER() OVER (
                       ORDER BY GREATEST(1, ROUND(
                         LEAST(
                           GREATEST(1, hp_max) + total_hp_bonus,
                           GREATEST(0, hp) + total_hp_bonus
                         ) * 0.18
                         + effective_atk * 5
                         + effective_def * 4
                         + effective_spd * 2
                       )) DESC,
                       order_index DESC, current_qi DESC, id ASC
                     ) AS rank
              FROM effective_stats
            )
            SELECT id, character_name, realm, score, rank
            FROM ranked
            WHERE rank <= $1 OR id = $2
            ORDER BY rank`;

      const rankedRows = (await client.query(rankedSql, [limit, character.id])).rows;
      const leaderboard = rankedRows.filter((row) => Number(row.rank) <= limit);
      const myRank = Number(rankedRows.find((row) => row.id === character.id)?.rank || 0);
      return { type, leaderboard, my_rank: myRank };
    });
    return res.json(result);
  } catch (error) { return next(error); }
}

module.exports = {
  getGameState, getInventory, getRecipes, getTechniques, getEquipment, getBattleHistory, getExplorationHistory,
  startRetreat, endRetreat, explore, chooseEvent, startCraft, collectCraft, startForging, collectForging, useItem, equipTechnique,
  protectItem, recycleItem, equipWeapon, unequipWeapon, protectEquipment, recycleEquipment,
  fightEnemy, avoidEncounter, rest, getAnnouncements, getTitles, setTitle, dailyCheckin, getAchievements, getLeaderboard,
};
