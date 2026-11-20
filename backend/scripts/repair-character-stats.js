const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { pool } = require('../src/config/db');
const { combatStats } = require('../src/utils/gameMath');

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function repairCharacter() {
  const username = option('--username');
  const apply = process.argv.includes('--apply');
  const reason = option('--reason') || '按当前境界重算基础属性并保留伤势比例';

  if (!username || process.argv.includes('--multiplier')) {
    throw new Error('用法：node scripts/repair-character-stats.js --username <用户名> [--apply] [--reason <原因>]');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT c.*, r.order_index
       FROM characters c JOIN users u ON u.id = c.user_id
       JOIN realms r ON r.id = c.realm_id
       WHERE u.username = $1 FOR UPDATE OF c`,
      [username],
    );
    const character = result.rows[0];
    if (!character) throw new Error('Character not found');

    const base = combatStats(character.order_index);
    const next = {
      major_stat_multiplier: 1,
      hp_max: base.hp + Number(character.bonus_hp || 0),
      atk: base.atk + Number(character.bonus_atk || 0),
      def: base.def + Number(character.bonus_def || 0),
      spd: base.spd + Number(character.bonus_spd || 0),
    };
    const oldHp = Number(character.hp);
    const oldHpMax = Math.max(1, Number(character.hp_max));
    next.hp = Math.min(next.hp_max, Math.max(1, Math.round(next.hp_max * Math.min(1, Math.max(0, oldHp / oldHpMax)))));

    const before = {
      major_stat_multiplier: String(character.major_stat_multiplier),
      hp: String(character.hp), hp_max: String(character.hp_max),
      atk: String(character.atk), def: String(character.def), spd: String(character.spd),
    };
    console.log(JSON.stringify({ username, dry_run: !apply, before, after: next }, null, 2));

    if (!apply) {
      await client.query('ROLLBACK');
      return;
    }

    await client.query(
      `INSERT INTO character_stat_repairs(character_id, reason, before_state, after_state)
       VALUES ($1, $2, $3::jsonb, $4::jsonb)`,
      [character.id, reason, JSON.stringify(before), JSON.stringify(next)],
    );
    await client.query(
      `UPDATE characters
       SET major_stat_multiplier = $1, hp = $2, hp_max = $3, atk = $4, def = $5, spd = $6
       WHERE id = $7`,
      [next.major_stat_multiplier, next.hp, next.hp_max, next.atk, next.def, next.spd, character.id],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

repairCharacter().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
