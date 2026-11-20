const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { newDb } = require('pg-mem');
const { Client } = require('pg');
const { combatStats } = require('../src/utils/gameMath');

const migrationsDir = path.join(__dirname, '../db/migrations');
const balanceMigration = '035_rebalance_progression_and_loadouts.sql';
const baselineMigrations = fs.readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql') && name < balanceMigration)
  .sort();

test('baseline migrations build a fresh database and seed playable content', async () => {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = db.adapters.createPg();
  const client = new adapter.Client();
  await client.connect();
  for (const migration of baselineMigrations) {
    const sql = fs.readFileSync(path.join(migrationsDir, migration), 'utf8');
    await client.query(sql);
  }

  const realms = await client.query('SELECT count(*)::int AS count FROM realms');
  const techniques = await client.query('SELECT count(*)::int AS count FROM techniques');
  const items = await client.query('SELECT count(*)::int AS count FROM items');
  const events = await client.query('SELECT count(*)::int AS count FROM events');
  const areas = await client.query('SELECT count(*)::int AS count FROM areas');
  const equipment = await client.query('SELECT count(*)::int AS count FROM equipment');
  const staminaPills = await client.query(
    "SELECT count(*)::int AS count FROM items WHERE code LIKE 'stamina_pill_%'",
  );
  const illustratedAreas = await client.query(
    'SELECT count(*)::int AS count FROM areas WHERE image_url IS NOT NULL AND explore_stamina_cost BETWEEN 6 AND 18',
  );
  const classifiedEquipment = await client.query(
    "SELECT count(*)::int AS count FROM equipment WHERE combat_role IN ('attack', 'defense')",
  );
  const defenseEquipment = await client.query(
    "SELECT count(*)::int AS count FROM equipment WHERE combat_role = 'defense' AND weapon_type IN ('armor','robe','crown','boots','shield')",
  );
  const forgeMaterials = await client.query(
    "SELECT count(*)::int AS count FROM items WHERE code LIKE 'forge_%'",
  );
  const equipmentRecipes = await client.query(
    'SELECT count(*)::int AS count FROM equipment WHERE recipe IS NOT NULL',
  );
  const protectionItems = await client.query(
    "SELECT count(*)::int AS count FROM items WHERE type = 'breakthrough_protection'",
  );
  const firstRealm = await client.query("SELECT qi_required FROM realms WHERE code = 'mortal'");
  const dropRules = await client.query('SELECT count(area_code)::int AS count FROM area_drop_rules');
  const materialDrops = await client.query('SELECT count(item_id)::int AS count FROM area_material_drops');
  const enemies = await client.query('SELECT count(*)::int AS count FROM enemies');
  const rarityRates = await client.query('SELECT rarity, weight FROM rarity_drop_rates ORDER BY sort_order');
  const recipeRows = await client.query('SELECT code, recipe FROM items WHERE recipe IS NOT NULL');
  const itemCodes = new Set((await client.query('SELECT code FROM items')).rows.map((row) => row.code));
  const techniqueCoverage = await client.query(
    `SELECT major_realm, count(*)::int AS count FROM techniques
     WHERE code LIKE 'tech_%' GROUP BY major_realm`,
  );
  const pillCoverage = await client.query(
    `SELECT major_realm, count(*)::int AS count FROM items
     WHERE type = 'pill' GROUP BY major_realm`,
  );
  const retreatTechniques = await client.query(
    'SELECT count(*)::int AS count FROM techniques WHERE retreat_multiplier > 1',
  );
  const staleOfflineDescriptions = await client.query(
    "SELECT count(*)::int AS count FROM techniques WHERE description LIKE '%离线修炼%'",
  );
  const boostPills = await client.query("SELECT count(*)::int AS count FROM items WHERE type='breakthrough'");
  const majorPills = await client.query("SELECT count(*)::int AS count FROM items WHERE type='major_breakthrough'");
  const bossMaterials = await client.query("SELECT count(*)::int AS count FROM items WHERE type='boss_material'");
  const legendaryEquipmentArt = await client.query(
    "SELECT count(*)::int AS count FROM equipment WHERE rarity='legendary' AND image_url LIKE '/assets/equipment/legendary/%'",
  );
  const legendaryRobes = await client.query(
    "SELECT count(*)::int AS count FROM equipment WHERE rarity='legendary' AND combat_role='defense' AND weapon_type='robe'",
  );
  const legendaryArmors = await client.query(
    "SELECT count(*)::int AS count FROM equipment WHERE rarity='legendary' AND combat_role='defense' AND weapon_type='armor'",
  );
  const bossArt = await client.query(
    "SELECT count(*)::int AS count FROM enemies WHERE rank='boss' AND image_url LIKE '/assets/bosses/%'",
  );
  const shopGoods = await client.query('SELECT count(*)::int AS count FROM shop_goods WHERE active=TRUE');
  const mailRows = await client.query('SELECT count(*)::int AS count FROM mail_messages');
  const auctionRows = await client.query('SELECT count(*)::int AS count FROM auction_listings');
  const explorationLogs = await client.query('SELECT count(*)::int AS count FROM exploration_logs');
  assert.equal(realms.rows[0].count, 49);
  assert.equal(techniques.rows[0].count, 1305);
  assert.ok(items.rows[0].count >= 919);
  assert.equal(events.rows[0].count, 137);
  assert.equal(areas.rows[0].count, 13);
  assert.equal(equipment.rows[0].count, 390);
  assert.equal(staminaPills.rows[0].count, 13);
  assert.equal(illustratedAreas.rows[0].count, 13);
  assert.equal(classifiedEquipment.rows[0].count, 390);
  assert.equal(defenseEquipment.rows[0].count, 130);
  assert.equal(forgeMaterials.rows[0].count, 39);
  assert.equal(equipmentRecipes.rows[0].count, 390);
  assert.equal(protectionItems.rows[0].count, 48);
  assert.equal(Number(firstRealm.rows[0].qi_required), 150000);
  assert.equal(dropRules.rows[0].count, 52);
  assert.ok(materialDrops.rows[0].count >= 78);
  assert.equal(enemies.rows[0].count, 39);
  assert.deepEqual(rarityRates.rows.map((row) => Number(row.weight)), [1000000, 120000, 18000, 2500, 250]);
  assert.deepEqual(
    recipeRows.rows.flatMap((row) => Object.keys(row.recipe)
      .filter((code) => !itemCodes.has(code))
      .map((code) => `${row.code}:${code}`)),
    [],
  );
  assert.equal(techniqueCoverage.rows.length, 13);
  assert.ok(techniqueCoverage.rows.every((row) => row.count >= 100));
  assert.equal(pillCoverage.rows.length, 13);
  assert.ok(pillCoverage.rows.every((row) => row.count >= 50));
  assert.ok(retreatTechniques.rows[0].count > 0);
  assert.equal(staleOfflineDescriptions.rows[0].count, 0);
  assert.equal(boostPills.rows[0].count, 36);
  assert.equal(majorPills.rows[0].count, 12);
  assert.equal(bossMaterials.rows[0].count, 12);
  assert.equal(legendaryEquipmentArt.rows[0].count, 39);
  assert.equal(legendaryRobes.rows[0].count, 13);
  assert.equal(legendaryArmors.rows[0].count, 13);
  assert.equal(bossArt.rows[0].count, 13);
  assert.ok(shopGoods.rows[0].count > 0);
  assert.equal(mailRows.rows[0].count, 0);
  assert.equal(auctionRows.rows[0].count, 0);
  assert.equal(explorationLogs.rows[0].count, 0);
  await client.end();
});

test('PostgreSQL 迁移保留旧藏并按比例换算旧角色', { skip: !process.env.BALANCE_TEST_DATABASE_URL }, async () => {
  const client = new Client({ connectionString: process.env.BALANCE_TEST_DATABASE_URL });
  const schema = `balance_test_${randomBytes(8).toString('hex')}`;
  await client.connect();
  try {
    // pg-mem 不支持这次迁移用到的集合更新。真实数据库测试在独立事务中建库，最后整体回滚。
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    for (const name of baselineMigrations) {
      await client.query(fs.readFileSync(path.join(migrationsDir, name), 'utf8'));
    }
    const { rows: [legacy] } = await client.query(`
      WITH account AS (INSERT INTO users(username, password_hash) VALUES ('legacy_player', 'test-only') RETURNING id)
      INSERT INTO characters(user_id, name, realm_id, current_qi, hp, hp_max, atk, bonus_hp, bonus_atk, spirit_stones, major_stat_multiplier)
      SELECT account.id, '旧存档', realms.id, qi_required / 2, 600, 1000, 999999, 10, 7, 4567, 27
      FROM account JOIN realms ON order_index = 20 RETURNING id, realm_id`);
    await client.query(`INSERT INTO character_equipment(character_id, equipment_id, quantity, equipped, equipped_slot)
      SELECT $1, id, 2, TRUE, 'attack' FROM equipment WHERE code = 'weapon_huanxue_18'`, [legacy.id]);

    await client.query(fs.readFileSync(path.join(migrationsDir, balanceMigration), 'utf8'));

    const { rows: [character] } = await client.query(`SELECT c.*, r.qi_required FROM characters c
      JOIN realms r ON r.id = c.realm_id WHERE c.id = $1`, [legacy.id]);
    assert.equal(character.realm_id, legacy.realm_id);
    assert.equal(Number(character.current_qi), Number(character.qi_required) / 2);
    assert.equal(Number(character.hp), Math.round((combatStats(20).hp + 10) * 0.6));
    assert.equal(Number(character.atk), combatStats(20).atk + 7);
    assert.equal(Number(character.spirit_stones), 4567);
    const { rows: equipment } = await client.query(`SELECT e.code, e.featured, ce.quantity, ce.equipped_slot
      FROM character_equipment ce JOIN equipment e ON ce.equipment_id = e.id WHERE ce.character_id = $1`, [legacy.id]);
    assert.deepEqual(equipment, [{ code: 'weapon_huanxue_18', featured: false, quantity: 2, equipped_slot: 'attack' }]);
    const { rows: [totals] } = await client.query(`SELECT
      (SELECT count(*)::int FROM techniques WHERE featured) AS techniques,
      (SELECT count(*)::int FROM equipment WHERE featured) AS equipment,
      (SELECT count(*)::int FROM (
        SELECT recipe FROM equipment WHERE featured UNION ALL SELECT recipe FROM items WHERE type = 'major_breakthrough'
      ) recipes CROSS JOIN LATERAL jsonb_object_keys(recipes.recipe) AS material(code)
      LEFT JOIN items ON items.code = material.code WHERE items.id IS NULL) AS missing_materials`);
    assert.deepEqual(totals, { techniques: 65, equipment: 169, missing_materials: 0 });
  } finally {
    try { await client.query('ROLLBACK'); } finally { await client.end(); }
  }
});
