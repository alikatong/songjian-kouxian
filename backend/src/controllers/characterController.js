const { body, validationResult } = require('express-validator');
const { withTransaction } = require('../config/db');
const {
  getCharacterRow,
  serializeCharacter,
  settleOffline,
  addInventory,
} = require('../services/gameService');
const {
  combatStats,
  ascensionMultiplierForRarity,
  breakthroughProfile,
  breakthroughChance,
  breakthroughLoss,
} = require('../utils/gameMath');

async function getCharacter(req, res, next) {
  try {
    const payload = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) return null;
      const gain = await settleOffline(client, character);
      return serializeCharacter(character, gain);
    });
    if (!payload) return res.status(404).json({ error: '角色不存在', code: 'NO_CHARACTER' });
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
}

const createValidation = [
  body('name').trim().isLength({ min: 2, max: 12 }).withMessage('角色名需要 2-12 个字符'),
  body('gender').isIn(['male', 'female']).withMessage('请选择角色性别'),
];

async function createCharacter(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  try {
    const payload = await withTransaction(async (client) => {
      if (await getCharacterRow(client, req.user.userId, true)) {
        const conflict = new Error('已存在角色，无法重复创建');
        conflict.status = 409;
        throw conflict;
      }
      const realm = (await client.query("SELECT id, qi_base_per_sec FROM realms WHERE code = 'mortal'")).rows[0];
      if (!realm) throw new Error('境界数据尚未初始化');
      const origin = (await client.query(
        'SELECT * FROM origins ORDER BY -LN(GREATEST(RANDOM(), 0.000001)) / weight LIMIT 1',
      )).rows[0];
      if (!origin) throw new Error('出身数据尚未初始化');
      const technique = (await client.query(
        "SELECT id FROM techniques WHERE code IN ('tech_mortal_001', 'tuna_jue') ORDER BY code LIMIT 1",
      )).rows[0];
      const bonuses = origin.stat_bonuses || {};
      const hpBonus = Number(bonuses.hp || 0);
      const atkBonus = Number(bonuses.atk || 0);
      const defBonus = Number(bonuses.def || 0);
      const spdBonus = Number(bonuses.spd || 0);
      const inserted = await client.query(
        `INSERT INTO characters
           (user_id, name, realm_id, qi_per_second, active_technique, active_title,
            origin_id, gender, hp, hp_max, atk, def, spd, bonus_hp, bonus_atk, bonus_def, bonus_spd, fate_points)
         VALUES ($1, $2, $3, $4, $5, '肉体凡胎', $6, $7,
                 $8, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
        [req.user.userId, req.body.name, realm.id, realm.qi_base_per_sec, technique?.id || null,
          origin.id, req.body.gender, 100 + hpBonus, 10 + atkBonus, 5 + defBonus, 10 + spdBonus,
          hpBonus, atkBonus, defBonus, spdBonus, Number(bonuses.fate_points || 0)],
      );
      const id = inserted.rows[0].id;
      await client.query(
        "INSERT INTO character_titles (character_id, title) VALUES ($1, '肉体凡胎') ON CONFLICT DO NOTHING",
        [id],
      );
      await addInventory(client, id, 'herb_scraps', 4);
      await addInventory(client, id, 'spring_water', 3);
      for (const [code, quantity] of Object.entries(origin.starter_items || {})) {
        await addInventory(client, id, code, Number(quantity));
      }
      for (let materialIndex = 1; materialIndex <= 5; materialIndex += 1) {
        await addInventory(client, id, `mat_mortal_${materialIndex}`, 4);
      }
      await addInventory(client, id, 'forge_metal_mortal', 5);
      await addInventory(client, id, 'forge_hide_mortal', 3);
      await addInventory(client, id, 'forge_core_mortal', 2);
      if (technique) {
        await client.query(
          'INSERT INTO character_techniques (character_id, technique_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, technique.id],
        );
      }
      await client.query(
        `INSERT INTO character_recipes (character_id, item_id)
         SELECT $1, id FROM items WHERE code IN ('pill_mortal_01', 'pill_mortal_02', 'pill_mortal_03', 'guard_mortal', 'stamina_pill_mortal')
         ON CONFLICT (character_id, item_id) DO NOTHING`,
        [id],
      );
      await client.query(
        `INSERT INTO character_equipment_recipes(character_id, equipment_id)
         SELECT $1, id FROM equipment WHERE code IN ('weapon_mortal_01', 'armor_mortal_01')
         ON CONFLICT (character_id, equipment_id) DO NOTHING`,
        [id],
      );
      return serializeCharacter(await getCharacterRow(client, req.user.userId));
    });
    return res.status(201).json(payload);
  } catch (error) {
    if (error.code === '23505') error.status = 409;
    return next(error);
  }
}

async function breakthrough(req, res, next) {
  try {
    const result = await withTransaction(async (client) => {
      const character = await getCharacterRow(client, req.user.userId, true);
      if (!character) {
        const error = new Error('角色不存在'); error.status = 404; throw error;
      }
      if (character.retreat_started_at) {
        const error = new Error('闭关期间不能破境，请先出关'); error.status = 409; throw error;
      }
      await settleOffline(client, character);
      if (BigInt(character.current_qi) < BigInt(character.qi_required)) {
        const error = new Error('灵气不足，无法突破'); error.status = 400; throw error;
      }
      if (character.boss_required) {
        const won = await client.query(
          `SELECT 1 FROM battle_logs bl
           JOIN enemies e ON e.code = bl.enemy_code
           JOIN areas a ON a.code = e.area_code
           WHERE bl.character_id = $1 AND bl.result = 'win' AND e.rank = 'boss'
             AND a.major_realm = $2 LIMIT 1`,
          [character.id, character.major_realm],
        );
        if (!won.rowCount) {
          const error = new Error('需要先击败守关首领'); error.status = 409; throw error;
        }
      }
      const nextRealm = (await client.query(
        'SELECT * FROM realms WHERE order_index = $1', [character.order_index + 1],
      )).rows[0];
      if (!nextRealm) {
        const error = new Error('已达当前版本最高境界'); error.status = 409; throw error;
      }

      const isMajorBreakthrough = nextRealm.major_realm !== character.major_realm;
      let itemBonus = 0;
      let protectedFailure = false;
      const consumedItems = [];
      const consumeBreakthroughItem = async (itemCode, expectedType) => {
        if (typeof itemCode !== 'string' || !itemCode) return;
        const item = (await client.query(
          `SELECT i.id, i.code, i.type, i.effect, inv.quantity
           FROM inventories inv JOIN items i ON i.id = inv.item_id
           WHERE inv.character_id = $1 AND i.code = $2 AND i.type = $3
           FOR UPDATE OF inv`,
          [character.id, itemCode, expectedType],
        )).rows[0];
        if (!item || item.quantity < 1 || item.effect?.realm_code !== character.realm_code) {
          const error = new Error(expectedType === 'breakthrough_protection'
            ? '所选护脉丹不可用于当前境界'
            : '所选突破丹食不可用于当前境界');
          error.status = 400; throw error;
        }
        const deducted = await client.query(
          'UPDATE inventories SET quantity = quantity - 1 WHERE character_id = $1 AND item_id = $2 AND quantity > 0',
          [character.id, item.id],
        );
        if (!deducted.rowCount) throw new Error('突破道具扣除失败');
        if (['breakthrough', 'major_breakthrough'].includes(expectedType)) itemBonus += Number(item.effect.breakthrough_rate || 0);
        if (expectedType === 'breakthrough_protection') protectedFailure = Boolean(item.effect.protection);
        consumedItems.push(item.code);
      };
      await consumeBreakthroughItem(req.body.boost_item_code || req.body.item_code, 'breakthrough');
      if (isMajorBreakthrough && typeof req.body.major_pill_code !== 'string') {
        const error = new Error('大境界突破必须服用对应守关破境丹'); error.status = 400; throw error;
      }
      await consumeBreakthroughItem(req.body.major_pill_code, 'major_breakthrough');
      await consumeBreakthroughItem(req.body.protection_item_code, 'breakthrough_protection');
      let techniqueBonus = 0;
      if (character.active_technique) {
        const technique = (await client.query(
          'SELECT breakthrough_bonus FROM techniques WHERE id = $1', [character.active_technique],
        )).rows[0];
        techniqueBonus = Number(technique?.breakthrough_bonus || 0);
      }
      const risk = breakthroughProfile({ orderIndex: character.order_index, isMajorBreakthrough });
      const chance = breakthroughChance({
        baseChance: risk.baseChance,
        itemBonus,
        techniqueBonus,
        failureCount: character.breakthrough_failures,
      });
      const success = Math.random() < chance;
      let lossPercent = 0;
      let demoted = false;
      if (success) {
        const ascensionMultiplier = isMajorBreakthrough
          ? ascensionMultiplierForRarity(character.technique_rarity)
          : 1;
        const nextMajorStatMultiplier = Number(character.major_stat_multiplier || 1) * ascensionMultiplier;
        const stats = combatStats(nextRealm.order_index, nextMajorStatMultiplier);
        await client.query(
          `UPDATE characters SET realm_id = $1, current_qi = 0,
             qi_per_second = $2, hp = $3, hp_max = $3, atk = $4, def = $5, spd = $6,
             major_stat_multiplier = $7, breakthrough_failures = 0, last_online_at = NOW()
           WHERE id = $8`,
          [nextRealm.id, nextRealm.qi_base_per_sec,
            stats.hp + Number(character.bonus_hp || 0),
            stats.atk + Number(character.bonus_atk || 0),
             stats.def + Number(character.bonus_def || 0),
             stats.spd + Number(character.bonus_spd || 0), nextMajorStatMultiplier, character.id],
        );
        if (isMajorBreakthrough) {
          await client.query(
            `INSERT INTO character_ascensions
             (character_id, from_realm_id, to_realm_id, technique_id, technique_rarity, multiplier)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [character.id, character.realm_id, nextRealm.id, character.active_technique,
              character.technique_rarity || 'common', ascensionMultiplier],
          );
        }
        if (nextRealm.title_unlock) {
          await client.query(
            'INSERT INTO character_titles (character_id, title) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [character.id, nextRealm.title_unlock],
          );
        }
        await client.query(
          `INSERT INTO character_recipes (character_id, item_id)
           SELECT $1, id FROM items WHERE code = $2
           ON CONFLICT (character_id, item_id) DO NOTHING`,
          [character.id, `guard_${nextRealm.code}`],
        );
      } else {
        lossPercent = protectedFailure ? 0 : breakthroughLoss({
          orderIndex: character.order_index,
          isMajorBreakthrough,
          random: Math.random(),
        });
        const currentRealm = {
          id: character.realm_id,
          order_index: character.order_index,
          qi_required: character.qi_required,
          qi_base_per_sec: character.qi_per_second,
        };
        let failureRealm = currentRealm;
        if (isMajorBreakthrough && !protectedFailure) {
          failureRealm = (await client.query(
            'SELECT * FROM realms WHERE order_index = $1',
            [Math.max(0, character.order_index - 1)],
          )).rows[0] || currentRealm;
          demoted = failureRealm.id !== character.realm_id;
        }
        const retainedQi = protectedFailure
          ? character.current_qi
          : Math.floor(Number(failureRealm.qi_required) * (1 - lossPercent));
        const failureStats = combatStats(failureRealm.order_index, character.major_stat_multiplier);
        await client.query(
          `UPDATE characters SET realm_id = $1, current_qi = $2, qi_per_second = $3,
             hp = $4, hp_max = $4, atk = $5, def = $6, spd = $7,
             breakthrough_failures = LEAST(breakthrough_failures + 1, 4), last_online_at = NOW()
           WHERE id = $8`,
          [failureRealm.id, retainedQi, failureRealm.qi_base_per_sec,
            failureStats.hp + Number(character.bonus_hp || 0),
            failureStats.atk + Number(character.bonus_atk || 0),
            failureStats.def + Number(character.bonus_def || 0),
            failureStats.spd + Number(character.bonus_spd || 0), character.id],
        );
      }
      const updated = await getCharacterRow(client, req.user.userId);
      return {
        success,
        chance: Math.round(chance * 100),
        protected: protectedFailure,
        loss_percent: Math.round(lossPercent * 100),
        demoted,
        consumed_items: consumedItems,
        message: success
          ? `破境成功，已踏入${updated.major_realm}${updated.sub_stage || ''}`
          : protectedFailure
            ? '破境失败，护脉丹稳住了气机：灵气与境界均未受损。'
            : `破境失败，损失 ${Math.round(lossPercent * 100)}% 灵气${demoted ? `，境界跌至${updated.major_realm}${updated.sub_stage || ''}` : ''}。`,
        character: serializeCharacter(updated),
      };
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = { getCharacter, createCharacter, breakthrough, createValidation };
