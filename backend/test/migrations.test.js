const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { newDb } = require('pg-mem');

test('all migrations build a fresh database and seed playable content', async () => {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = db.adapters.createPg();
  const client = new adapter.Client();
  await client.connect();
  const migrations = fs.readdirSync(path.join(__dirname, '../db/migrations'))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const migration of migrations) {
    const sql = fs.readFileSync(path.join(__dirname, '../db/migrations', migration), 'utf8');
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
