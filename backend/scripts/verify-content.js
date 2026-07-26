require('dotenv').config();
const { pool } = require('../src/config/db');

async function verify() {
  const counts = (await pool.query(`
    SELECT
      (SELECT count(*)::int FROM techniques) AS techniques,
      (SELECT count(*)::int FROM items WHERE type = 'pill') AS pills,
      (SELECT count(*)::int FROM events) AS events,
      (SELECT count(*)::int FROM areas) AS areas,
      (SELECT count(*)::int FROM origins) AS origins,
      (SELECT count(*)::int FROM equipment) AS equipment,
      (SELECT count(*)::int FROM items WHERE code LIKE 'stamina_pill_%') AS stamina_pills,
      (SELECT count(*)::int FROM areas WHERE image_url IS NOT NULL) AS illustrated_areas,
      (SELECT count(*)::int FROM equipment WHERE combat_role IN ('attack','defense')) AS classified_equipment,
      (SELECT count(*)::int FROM equipment WHERE combat_role='attack') AS weapons,
      (SELECT count(*)::int FROM equipment WHERE combat_role='defense') AS armor,
      (SELECT count(*)::int FROM equipment WHERE recipe IS NOT NULL) AS equipment_recipes,
      (SELECT count(*)::int FROM items WHERE code LIKE 'forge_%') AS forging_materials,
      (SELECT count(*)::int FROM chat_messages) AS chat_messages
  `)).rows[0];
  const techniqueCoverage = (await pool.query(`
    SELECT min(count)::int AS minimum, max(count)::int AS maximum
    FROM (
      SELECT major_realm, count(*) FROM techniques
      WHERE code LIKE 'tech_%' GROUP BY major_realm
    ) coverage
  `)).rows[0];
  const pillCoverage = (await pool.query(`
    SELECT min(count)::int AS minimum, max(count)::int AS maximum
    FROM (
      SELECT major_realm, count(*) FROM items
      WHERE type = 'pill' GROUP BY major_realm
    ) coverage
  `)).rows[0];
  const equipmentCoverage = (await pool.query(`
    SELECT min(count)::int AS minimum, max(count)::int AS maximum
    FROM (
      SELECT major_realm, count(*) FROM equipment GROUP BY major_realm
    ) coverage
  `)).rows[0];
  console.log(JSON.stringify({ counts, techniqueCoverage, pillCoverage, equipmentCoverage }, null, 2));
}

verify()
  .catch((error) => {
    console.error(`内容校验失败：${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
