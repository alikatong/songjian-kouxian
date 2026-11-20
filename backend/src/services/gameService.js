const {
  RETREAT_MULTIPLIER,
  offlineGain,
  breakthroughProfile,
  breakthroughChance,
  retreatGain,
  battleTraits,
  effectiveHp,
} = require('../utils/gameMath');

const CHARACTER_SELECT = `
  SELECT c.*,
         r.code AS realm_code,
         r.major_realm,
         r.sub_stage,
         r.order_index,
         r.qi_required,
         r.qi_base_per_sec,
         r.boss_required,
         r.title_unlock,
         r.description AS realm_description,
         r.phase,
         nr.major_realm AS next_major_realm,
         o.code AS origin_code,
         o.name AS origin_name,
         o.description AS origin_description,
         o.stat_bonuses AS origin_bonuses,
         COALESCE(t.retreat_multiplier, 1) AS retreat_technique_multiplier,
         COALESCE(t.qi_multiplier, 1) AS technique_qi_multiplier,
         t.code AS technique_code,
         t.name AS technique_name,
         t.rarity AS technique_rarity,
         t.description AS technique_description,
         t.category AS technique_category,
         COALESCE(t.breakthrough_bonus, 0) AS breakthrough_bonus,
         t.stat_bonuses AS technique_stat_bonuses,
         COALESCE(t.event_bonus, 0) AS technique_event_bonus,
         ae.code AS attack_weapon_code,
         ae.name AS attack_weapon_name,
         ae.rarity AS attack_weapon_rarity,
         ae.major_realm AS attack_weapon_major_realm,
         ae.weapon_type AS attack_weapon_type,
         ae.attack_bonus AS attack_weapon_attack,
         ae.defense_bonus AS attack_weapon_defense,
         ae.hp_bonus AS attack_weapon_hp,
         ae.speed_bonus AS attack_weapon_speed,
         ae.image_url AS attack_weapon_image_url,
         de.code AS defense_weapon_code,
         de.name AS defense_weapon_name,
         de.rarity AS defense_weapon_rarity,
         de.major_realm AS defense_weapon_major_realm,
         de.weapon_type AS defense_weapon_type,
         de.attack_bonus AS defense_weapon_attack,
         de.defense_bonus AS defense_weapon_defense,
         de.hp_bonus AS defense_weapon_hp,
         de.speed_bonus AS defense_weapon_speed,
         de.image_url AS defense_weapon_image_url
  FROM characters c
  JOIN realms r ON r.id = c.realm_id
  LEFT JOIN realms nr ON nr.order_index = r.order_index + 1
  LEFT JOIN origins o ON o.id = c.origin_id
  LEFT JOIN techniques t ON t.id = c.active_technique
  LEFT JOIN LATERAL (
    SELECT e.* FROM character_equipment ce JOIN equipment e ON e.id = ce.equipment_id
    WHERE ce.character_id = c.id AND ce.equipped_slot = 'attack' LIMIT 1
  ) ae ON TRUE
  LEFT JOIN LATERAL (
    SELECT e.* FROM character_equipment ce JOIN equipment e ON e.id = ce.equipment_id
    WHERE ce.character_id = c.id AND ce.equipped_slot = 'defense' LIMIT 1
  ) de ON TRUE
  WHERE c.user_id = $1`;

async function getCharacterRow(client, userId, lock = false) {
  const result = await client.query(`${CHARACTER_SELECT}${lock ? ' FOR UPDATE OF c' : ''}`, [userId]);
  return result.rows[0] || null;
}

const STAMINA_MAX = 100;
const STAMINA_REGEN_SECONDS = 300;

async function settleStamina(client, row) {
  const current = Math.max(0, Number(row.stamina ?? STAMINA_MAX));
  if (current >= STAMINA_MAX) {
    row.stamina = current;
    return 0;
  }
  const updatedAt = new Date(row.stamina_updated_at || Date.now()).getTime();
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
  const restored = Math.min(STAMINA_MAX - current, Math.floor(elapsedSeconds / STAMINA_REGEN_SECONDS));
  if (restored < 1) {
    row.stamina = current;
    return 0;
  }
  const stamina = current + restored;
  const nextUpdatedAt = stamina >= STAMINA_MAX
    ? new Date()
    : new Date(updatedAt + restored * STAMINA_REGEN_SECONDS * 1000);
  await client.query(
    'UPDATE characters SET stamina = $1, stamina_updated_at = $2 WHERE id = $3',
    [stamina, nextUpdatedAt, row.id],
  );
  row.stamina = stamina;
  row.stamina_updated_at = nextUpdatedAt;
  return restored;
}

function portraitUrls(originCode, gender = 'male') {
  if (!originCode) {
    return { portrait_url: null, portrait_fallback_url: null };
  }
  const normalizedGender = gender === 'female' ? 'female' : 'male';
  const filename = originCode === 'hunter_family' && normalizedGender === 'female'
    ? 'hunter_family_female_refined.webp'
    : `${originCode}_${normalizedGender}.webp`;
  return {
    portrait_url: `/assets/portraits/${filename}`,
    portrait_fallback_url: `/assets/portraits/${originCode}.png`,
  };
}

function serializeCharacter(row, offlineGain = 0) {
  const techniqueStats = row.technique_stat_bonuses || {};
  const equipmentView = (role) => {
    const code = row[`${role}_weapon_code`];
    if (!code) return null;
    return {
      code,
      name: row[`${role}_weapon_name`],
      rarity: row[`${role}_weapon_rarity`],
      major_realm: row[`${role}_weapon_major_realm`],
      weapon_type: row[`${role}_weapon_type`],
      combat_role: role,
      battle_trait: battleTraits[row[`${role}_weapon_type`]] || null,
      image_url: row[`${role}_weapon_image_url`],
      bonuses: {
        atk: Number(row[`${role}_weapon_attack`] || 0),
        def: Number(row[`${role}_weapon_defense`] || 0),
        hp: Number(row[`${role}_weapon_hp`] || 0),
        spd: Number(row[`${role}_weapon_speed`] || 0),
      },
    };
  };
  const attackEquipment = equipmentView('attack');
  const defenseEquipment = equipmentView('defense');
  const weaponStats = [attackEquipment, defenseEquipment].reduce((total, item) => ({
    atk: total.atk + Number(item?.bonuses.atk || 0),
    def: total.def + Number(item?.bonuses.def || 0),
    hp: total.hp + Number(item?.bonuses.hp || 0),
    spd: total.spd + Number(item?.bonuses.spd || 0),
  }), { atk: 0, def: 0, hp: 0, spd: 0 });
  const baseHp = Number(row.hp || 0);
  const baseHpMax = Number(row.hp_max || 0);
  const baseAtk = Number(row.atk || 0);
  const baseDef = Number(row.def || 0);
  const baseSpd = Number(row.spd || 0);
  const totalHpBonus = Number(techniqueStats.hp || 0) + weaponStats.hp;
  const buffActive = row.qi_buff_expires_at && new Date(row.qi_buff_expires_at).getTime() > Date.now();
  const buffMultiplier = buffActive ? Number(row.qi_buff_multiplier || 1) : 1;
  const effectiveQi = Number(row.qi_per_second) * Number(row.technique_qi_multiplier || 1) * buffMultiplier;
  const retreatActive = Boolean(row.retreat_started_at);
  const retreatElapsed = retreatActive
    ? Math.max(0, Math.floor((Date.now() - new Date(row.retreat_started_at).getTime()) / 1000))
    : 0;
  const retreatProjected = retreatActive ? Math.min(
    Math.max(0, Number(row.qi_required) - Number(row.current_qi)),
    retreatGain({
      elapsedSeconds: retreatElapsed,
      capHours: row.offline_qi_cap_hrs,
      qiPerSecond: effectiveQi,
      multiplier: Number(row.retreat_technique_multiplier || 1),
    }),
  ) : 0;
  const isMajorBreakthrough = Boolean(row.next_major_realm && row.next_major_realm !== row.major_realm);
  const breakthrough = breakthroughProfile({ orderIndex: row.order_index, isMajorBreakthrough });
  const currentBreakthroughChance = breakthroughChance({
    baseChance: breakthrough.baseChance,
    techniqueBonus: Number(row.breakthrough_bonus || 0),
    failureCount: row.breakthrough_failures,
  });
  return {
    id: row.id,
    name: row.name,
    gender: row.gender || 'male',
    avatar_url: row.avatar_url,
    title: row.active_title || '肉体凡胎',
    realm: `${row.major_realm}${row.sub_stage || ''}`,
    major_realm: row.major_realm,
    realm_code: row.realm_code,
    realm_desc: row.realm_description,
    realm_order: row.order_index,
    major_stat_multiplier: Number(row.major_stat_multiplier || 1),
    phase: row.phase,
    current_qi: Number(row.current_qi),
    qi_required: Number(row.qi_required),
    qi_per_second: retreatActive ? 0 : Number(effectiveQi.toFixed(2)),
    natural_qi_per_second: Number(effectiveQi.toFixed(2)),
    offline_gain: Number(offlineGain),
    offline_qi_cap_hrs: row.offline_qi_cap_hrs,
    retreat: {
      active: retreatActive,
      started_at: row.retreat_started_at || null,
      elapsed_seconds: retreatElapsed,
      projected_gain: retreatProjected,
      rate_per_second: Number((effectiveQi * Number(row.retreat_technique_multiplier || 1) * RETREAT_MULTIPLIER).toFixed(2)),
      multiplier: RETREAT_MULTIPLIER,
      technique_multiplier: Number(row.retreat_technique_multiplier || 1),
      total_multiplier: Number((RETREAT_MULTIPLIER * Number(row.retreat_technique_multiplier || 1)).toFixed(2)),
    },
    breakthrough: {
      is_max: row.next_major_realm === null,
      base_chance: breakthrough.baseChance,
      current_chance: currentBreakthroughChance,
      loss_min: breakthrough.lossMin,
      loss_max: breakthrough.lossMax,
      is_major: isMajorBreakthrough,
    },
    active_qi_buff: buffActive ? {
      multiplier: buffMultiplier,
      expires_at: row.qi_buff_expires_at,
    } : null,
    technique: row.technique_name || null,
    active_technique: row.technique_code ? {
      code: row.technique_code,
      name: row.technique_name,
      rarity: row.technique_rarity,
      description: row.technique_description,
      battle_trait: battleTraits[row.technique_category] || null,
    } : null,
    origin: row.origin_code ? {
      code: row.origin_code,
      name: row.origin_name,
      description: row.origin_description,
      bonuses: row.origin_bonuses || {},
    } : null,
    ...portraitUrls(row.origin_code, row.gender),
    equipped_weapons: { attack: attackEquipment, defense: defenseEquipment },
    equipped_weapon: attackEquipment || defenseEquipment,
    breakthrough_failures: row.breakthrough_failures,
    spirit_stones: Number(row.spirit_stones),
    fate_points: row.fate_points,
    stamina: {
      current: Number(row.stamina ?? STAMINA_MAX),
      max: STAMINA_MAX,
      regen_seconds: STAMINA_REGEN_SECONDS,
      next_restore_seconds: Number(row.stamina ?? STAMINA_MAX) >= STAMINA_MAX ? 0 : Math.max(1,
        STAMINA_REGEN_SECONDS - Math.floor((Date.now() - new Date(row.stamina_updated_at).getTime()) / 1000) % STAMINA_REGEN_SECONDS),
    },
    has_pending_event: Boolean(row.pending_event_id),
    stats: {
      hp: effectiveHp(baseHp, baseHpMax, totalHpBonus),
      hp_max: baseHpMax + totalHpBonus,
      atk: baseAtk + Number(techniqueStats.atk || 0) + weaponStats.atk,
      def: baseDef + Number(techniqueStats.def || 0) + weaponStats.def,
      spd: baseSpd + Number(techniqueStats.spd || 0) + weaponStats.spd,
      traits: [row.technique_category, attackEquipment?.weapon_type, defenseEquipment?.weapon_type]
        .filter((trait) => Object.hasOwn(battleTraits, trait)),
    },
  };
}

async function settleOffline(client, row) {
  const now = Date.now();
  if (row.retreat_started_at) {
    await client.query('UPDATE characters SET last_online_at = NOW() WHERE id = $1', [row.id]);
    row.last_online_at = new Date(now);
    return 0;
  }
  const buffActive = row.qi_buff_expires_at && new Date(row.qi_buff_expires_at).getTime() > now;
  const gain = offlineGain({
    elapsedSeconds: (now - new Date(row.last_online_at).getTime()) / 1000,
    capHours: row.offline_qi_cap_hrs,
    qiPerSecond: row.qi_per_second,
    multiplier: Number(row.technique_qi_multiplier || 1)
      * (buffActive ? Number(row.qi_buff_multiplier || 1) : 1),
  });
  const cap = BigInt(row.qi_required);
  const previousQi = BigInt(row.current_qi);
  const nextQi = previousQi + BigInt(gain);
  const boundedQi = nextQi > cap ? cap : nextQi;
  const appliedGain = boundedQi - previousQi;
  await client.query(
    'UPDATE characters SET current_qi = $1, last_online_at = NOW() WHERE id = $2',
    [boundedQi.toString(), row.id],
  );
  row.current_qi = boundedQi.toString();
  row.last_online_at = new Date(now);
  return Number(appliedGain > 0n ? appliedGain : 0n);
}

async function settleRetreat(client, row) {
  if (!row.retreat_started_at) return 0;
  const now = Date.now();
  const buffActive = row.qi_buff_expires_at && new Date(row.qi_buff_expires_at).getTime() > now;
  const effectiveQi = Number(row.qi_per_second)
    * Number(row.technique_qi_multiplier || 1)
    * (buffActive ? Number(row.qi_buff_multiplier || 1) : 1);
  const calculated = retreatGain({
    elapsedSeconds: (now - new Date(row.retreat_started_at).getTime()) / 1000,
    capHours: row.offline_qi_cap_hrs,
    qiPerSecond: effectiveQi,
    multiplier: Number(row.retreat_technique_multiplier || 1),
  });
  const cap = BigInt(row.qi_required);
  const previousQi = BigInt(row.current_qi);
  const available = cap > previousQi ? cap - previousQi : 0n;
  const applied = BigInt(calculated) > available ? available : BigInt(calculated);
  const nextQi = previousQi + applied;
  await client.query(
    `UPDATE characters
     SET current_qi = $1, retreat_started_at = NULL, last_online_at = NOW()
     WHERE id = $2`,
    [nextQi.toString(), row.id],
  );
  row.current_qi = nextQi.toString();
  row.retreat_started_at = null;
  row.last_online_at = new Date(now);
  return Number(applied);
}

async function addInventory(client, characterId, itemCode, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) return;
  await client.query(
    `INSERT INTO inventories (character_id, item_id, quantity)
     SELECT $1, id, $3 FROM items WHERE code = $2
     ON CONFLICT (character_id, item_id)
     DO UPDATE SET quantity = inventories.quantity + EXCLUDED.quantity`,
    [characterId, itemCode, quantity],
  );
}

async function applyEffects(client, character, effects = {}) {
  const qi = Math.max(0, Math.floor(Number(effects.qi) || 0));
  const stones = Math.max(0, Math.floor(Number(effects.spirit_stones) || 0));
  const fate = Math.max(0, Math.floor(Number(effects.fate_points) || 0));
  if (qi || stones || fate) {
    await client.query(
      `UPDATE characters
       SET current_qi = LEAST(current_qi + $1, $2),
           spirit_stones = spirit_stones + $3,
           fate_points = fate_points + $4
       WHERE id = $5`,
      [qi, character.qi_required.toString(), stones, fate, character.id],
    );
  }
  const rewards = [];
  const itemEntries = Object.entries(effects.items || {})
    .map(([code, quantity]) => ({ code, quantity: Math.floor(Number(quantity)) }))
    .filter((item) => item.quantity > 0);
  if (itemEntries.length) {
    const itemRows = (await client.query(
      'SELECT code, name, type, rarity, image_url FROM items WHERE code = ANY($1::text[])',
      [itemEntries.map((item) => item.code)],
    )).rows;
    const itemsByCode = Object.fromEntries(itemRows.map((item) => [item.code, item]));
    for (const entry of itemEntries) {
      await addInventory(client, character.id, entry.code, entry.quantity);
      const item = itemsByCode[entry.code];
      if (!item) continue;
      rewards.push({
        source: 'event',
        category: item.type === 'material' ? 'material' : 'item',
        item_type: item.type,
        code: item.code,
        name: item.name,
        rarity: item.rarity,
        image_url: item.image_url,
        quantity: entry.quantity,
      });
    }
  }
  if (effects.discover_technique) {
    const technique = (await client.query(
      `SELECT t.id, t.code, t.name, t.rarity, t.image_url FROM techniques t
       WHERE t.featured AND t.major_realm = $1 AND t.required_order <= $2
         AND NOT EXISTS (
           SELECT 1 FROM character_techniques ct
           WHERE ct.character_id = $3 AND ct.technique_id = t.id
         )
       ORDER BY RANDOM() LIMIT 1`,
      [character.major_realm, character.order_index, character.id],
    )).rows[0];
    if (technique) {
      await client.query(
        'INSERT INTO character_techniques (character_id, technique_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [character.id, technique.id],
      );
      rewards.push({ source: 'event', category: 'technique', ...technique, quantity: 1 });
    }
  }
  if (effects.discover_recipe) {
    const recipe = (await client.query(
      `SELECT i.id, i.code, i.name, i.rarity, i.image_url FROM items i
       WHERE i.major_realm = $1 AND i.type = 'pill' AND i.required_order <= $2
         AND NOT EXISTS (
           SELECT 1 FROM character_recipes cr
           WHERE cr.character_id = $3 AND cr.item_id = i.id
         )
       ORDER BY RANDOM() LIMIT 1`,
      [character.major_realm, character.order_index, character.id],
    )).rows[0];
    if (recipe) {
      await client.query(
        'INSERT INTO character_recipes (character_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [character.id, recipe.id],
      );
      rewards.push({ source: 'event', category: 'recipe', ...recipe, quantity: 1 });
    }
  }
  return rewards;
}

async function awardAreaDrop(client, character, areaCode, category) {
  if (category === 'material') {
    const material = (await client.query(
      `SELECT i.id, i.code, i.name, i.rarity, i.image_url, amd.min_quantity, amd.max_quantity
       FROM area_material_drops amd JOIN items i ON i.id = amd.item_id
       WHERE amd.area_code = $1
       ORDER BY -LN(GREATEST(RANDOM(), 0.000001)) / amd.weight LIMIT 1`,
      [areaCode],
    )).rows[0];
    if (!material) return null;
    const min = Number(material.min_quantity);
    const max = Number(material.max_quantity);
    const quantity = min + Math.floor(Math.random() * (max - min + 1));
    await addInventory(client, character.id, material.code, quantity);
    return { source: 'area', category, code: material.code, name: material.name, rarity: material.rarity, image_url: material.image_url, quantity };
  }

  if (category === 'technique') {
    const rarity = await chooseAvailableRarity(client,
      `SELECT DISTINCT t.rarity FROM techniques t
       WHERE t.featured AND t.major_realm = $1 AND t.required_order <= $2
         AND NOT EXISTS (SELECT 1 FROM character_techniques ct WHERE ct.character_id = $3 AND ct.technique_id = t.id)`,
      [character.major_realm, character.order_index, character.id]);
    if (!rarity) return null;
    const technique = (await client.query(
      `SELECT t.id, t.code, t.name, t.rarity, t.image_url FROM techniques t
       WHERE t.featured AND t.major_realm = $1 AND t.required_order <= $2
         AND NOT EXISTS (SELECT 1 FROM character_techniques ct WHERE ct.character_id = $3 AND ct.technique_id = t.id)
         AND t.rarity = $4
       ORDER BY RANDOM() LIMIT 1`,
      [character.major_realm, character.order_index, character.id, rarity],
    )).rows[0];
    if (!technique) return null;
    await client.query(
      'INSERT INTO character_techniques (character_id, technique_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [character.id, technique.id],
    );
    return { source: 'area', category, code: technique.code, name: technique.name, rarity: technique.rarity, image_url: technique.image_url, quantity: 1 };
  }

  if (category === 'recipe') {
    const rarity = await chooseAvailableRarity(client,
      `SELECT DISTINCT i.rarity FROM items i
       WHERE i.major_realm = $1 AND i.type IN ('pill', 'breakthrough_protection') AND i.required_order <= $2
         AND NOT EXISTS (SELECT 1 FROM character_recipes cr WHERE cr.character_id = $3 AND cr.item_id = i.id)`,
      [character.major_realm, character.order_index, character.id]);
    if (!rarity) return null;
    const recipe = (await client.query(
      `SELECT i.id, i.code, i.name, i.rarity, i.image_url FROM items i
       WHERE i.major_realm = $1 AND i.type IN ('pill', 'breakthrough_protection') AND i.required_order <= $2
         AND NOT EXISTS (SELECT 1 FROM character_recipes cr WHERE cr.character_id = $3 AND cr.item_id = i.id)
         AND i.rarity = $4
       ORDER BY RANDOM() LIMIT 1`,
      [character.major_realm, character.order_index, character.id, rarity],
    )).rows[0];
    if (!recipe) return null;
    await client.query(
      'INSERT INTO character_recipes (character_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [character.id, recipe.id],
    );
    return { source: 'area', category, code: recipe.code, name: recipe.name, rarity: recipe.rarity, image_url: recipe.image_url, quantity: 1 };
  }

  if (category === 'equipment' && Math.random() < 0.12) {
    const rarity = await chooseAvailableRarity(client,
      `SELECT DISTINCT e.rarity FROM equipment e
       WHERE e.featured AND e.rarity = 'legendary' AND e.area_code = $1 AND e.required_order <= $2
         AND NOT EXISTS (SELECT 1 FROM character_equipment_recipes cer
                         WHERE cer.character_id = $3 AND cer.equipment_id = e.id)`,
      [areaCode, character.order_index, character.id]);
    const recipe = rarity ? (await client.query(
      `SELECT e.id, e.code, e.name, e.rarity, e.image_url FROM equipment e
       WHERE e.featured AND e.area_code = $1 AND e.required_order <= $2 AND e.rarity = $4
         AND NOT EXISTS (SELECT 1 FROM character_equipment_recipes cer
                         WHERE cer.character_id = $3 AND cer.equipment_id = e.id)
       ORDER BY RANDOM() LIMIT 1`,
      [areaCode, character.order_index, character.id, rarity],
    )).rows[0] : null;
    if (recipe) {
      await client.query(
        `INSERT INTO character_equipment_recipes(character_id, equipment_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [character.id, recipe.id],
      );
      return { source: 'area', category: 'equipment_recipe', code: recipe.code, name: recipe.name, rarity: recipe.rarity, image_url: recipe.image_url, quantity: 1 };
    }
  }

  const rarity = await chooseAvailableRarity(client,
    `SELECT DISTINCT rarity FROM equipment WHERE featured AND area_code = $1 AND required_order <= $2`,
    [areaCode, character.order_index]);
  if (!rarity) return null;
  const equipment = (await client.query(
    `SELECT id, code, name, rarity, image_url FROM equipment
     WHERE featured AND area_code = $1 AND required_order <= $2 AND rarity = $3
     ORDER BY RANDOM() LIMIT 1`,
    [areaCode, character.order_index, rarity],
  )).rows[0];
  if (!equipment) return null;
  await client.query(
    `INSERT INTO character_equipment (character_id, equipment_id, quantity)
     VALUES ($1, $2, 1)
     ON CONFLICT (character_id, equipment_id)
     DO UPDATE SET quantity = character_equipment.quantity + 1`,
    [character.id, equipment.id],
  );
  return { source: 'area', category, code: equipment.code, name: equipment.name, rarity: equipment.rarity, image_url: equipment.image_url, quantity: 1 };
}

async function chooseAvailableRarity(client, availabilitySql, params) {
  const available = new Set((await client.query(availabilitySql, params)).rows.map((row) => row.rarity));
  if (!available.size) return null;
  const rates = (await client.query('SELECT rarity, weight FROM rarity_drop_rates ORDER BY sort_order')).rows
    .filter((row) => available.has(row.rarity));
  const total = rates.reduce((sum, row) => sum + Number(row.weight), 0);
  let roll = Math.random() * total;
  for (const row of rates) {
    roll -= Number(row.weight);
    if (roll <= 0) return row.rarity;
  }
  return rates[rates.length - 1]?.rarity || null;
}

async function rollAreaDrops(client, character, areaCode) {
  const rules = (await client.query(
    'SELECT category, base_rate, pity_after FROM area_drop_rules WHERE area_code = $1 ORDER BY category',
    [areaCode],
  )).rows;
  const eventBonus = Math.max(0, Number(character.technique_event_bonus || 0));
  const drops = [];
  for (const rule of rules) {
    const pity = (await client.query(
      `SELECT misses FROM character_drop_pity
       WHERE character_id = $1 AND area_code = $2 AND category = $3 FOR UPDATE`,
      [character.id, areaCode, rule.category],
    )).rows[0];
    const misses = Number(pity?.misses || 0);
    const bonus = rule.category === 'material' ? 0 : eventBonus * 0.15;
    const rate = Math.min(0.95, Number(rule.base_rate) + bonus);
    const pityTriggered = misses + 1 >= Number(rule.pity_after);
    const hit = pityTriggered || Math.random() < rate;
    const awarded = hit ? await awardAreaDrop(client, character, areaCode, rule.category) : null;
    const nextMisses = awarded ? 0 : Math.min(Number(rule.pity_after) - 1, misses + 1);
    await client.query(
      `INSERT INTO character_drop_pity (character_id, area_code, category, misses)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (character_id, area_code, category)
       DO UPDATE SET misses = EXCLUDED.misses`,
      [character.id, areaCode, rule.category, nextMisses],
    );
    if (awarded) drops.push({ ...awarded, rate, pity_triggered: pityTriggered });
  }
  return drops;
}

module.exports = {
  getCharacterRow,
  portraitUrls,
  serializeCharacter,
  settleOffline,
  settleRetreat,
  settleStamina,
  addInventory,
  applyEffects,
  rollAreaDrops,
};
