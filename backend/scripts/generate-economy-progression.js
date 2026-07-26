const fs = require('node:fs');
const path = require('node:path');

const majors = [
  ['mortal', '凡人', '凡尘', 'luoxia'],
  ['lianpi', '练皮境', '铜皮', 'qingyun_foothill'],
  ['lianggu', '练骨境', '铁骨', 'blackstone_forest'],
  ['yijin', '易筋境', '玉筋', 'mist_forest'],
  ['xisui', '洗髓境', '净髓', 'clear_spring_cliff'],
  ['huanxue', '换血境', '赤血', 'red_maple_valley'],
  ['tianren', '天人境', '天感', 'mirror_lake'],
  ['lianqi', '炼气期', '灵息', 'spirit_vein_valley'],
  ['zhujia', '筑基期', '道基', 'sect_outer_court'],
  ['jindan', '金丹期', '丹火', 'alchemy_peak'],
  ['yuanying', '元婴期', '婴息', 'ancient_soul_ruins'],
  ['huashen', '化神期', '法相', 'law_abyss'],
  ['dacheng', '大乘期', '渡劫', 'heaven_gate'],
];

const stages = [
  ['early', '初期', '承脉丹', 0.10, 1, 2],
  ['mid', '中期', '贯玄丹', 0.11, 3, 4],
  ['late', '后期', '圆真丹', 0.12, 5, 6],
];

const majorPills = [
  ['mortal', '凡尘启灵丹'], ['lianpi', '铜皮铸骨丹'],
  ['lianggu', '铁骨易筋丹'], ['yijin', '玉筋洗髓丹'],
  ['xisui', '净髓换血丹'], ['huanxue', '赤血感天丹'],
  ['tianren', '天人引气丹'], ['lianqi', '灵息筑基丹'],
  ['zhujia', '道基抱丹丸'], ['jindan', '金丹育婴丹'],
  ['yuanying', '婴息化神丹'], ['huashen', '法相渡劫丹'],
];

const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${sqlString(JSON.stringify(value))}::jsonb`;
const imageFor = (key) => `/assets/pills/realm_${key}.webp`;
const ascensionRates = {
  common: 3,
  uncommon: 3.05,
  rare: 3.1,
  epic: 3.15,
  legendary: 3.2,
};
const statBackfillRows = Object.entries(ascensionRates).flatMap(([rarity, rate]) => (
  Array.from({ length: 12 }, (_, index) => {
    const crossings = index + 1;
    const minOrder = 1 + index * 4;
    const maxOrder = minOrder + 3;
    return `UPDATE characters SET major_stat_multiplier=${(rate ** crossings).toFixed(8)}
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity=${sqlString(rarity)})
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN ${minOrder} AND ${maxOrder});`;
  })
)).join('\n');
const commonStatBackfillRows = Array.from({ length: 12 }, (_, index) => {
  const crossings = index + 1;
  const minOrder = 1 + index * 4;
  const maxOrder = minOrder + 3;
  return `UPDATE characters SET major_stat_multiplier=${(ascensionRates.common ** crossings).toFixed(8)}
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN ${minOrder} AND ${maxOrder});`;
}).join('\n');
const statRecalculationRows = Array.from({ length: 49 }, (_, order) => `UPDATE characters SET
  hp=((100+${order}*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+${order}*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+${order}*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+${order}*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+${order}*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=${order});`).join('\n');

const mailSchema = `CREATE TABLE IF NOT EXISTS mail_messages (
  id BIGSERIAL PRIMARY KEY,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  item_id INT REFERENCES items(id),
  equipment_id INT REFERENCES equipment(id),
  quantity INT NOT NULL DEFAULT 0 CHECK(quantity>=0),
  spirit_stones BIGINT NOT NULL DEFAULT 0 CHECK(spirit_stones>=0),
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW()+INTERVAL '30 days')
);
CREATE INDEX IF NOT EXISTS idx_mail_character ON mail_messages(character_id, claimed, created_at DESC);
`;

const statSchema = `ALTER TABLE characters ADD COLUMN IF NOT EXISTS major_stat_multiplier NUMERIC(30,8) NOT NULL DEFAULT 1;
ALTER TABLE characters ALTER COLUMN hp TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN hp_max TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN atk TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN def TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN spd TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN bonus_hp TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN bonus_atk TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN bonus_def TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN bonus_spd TYPE BIGINT;
ALTER TABLE equipment ALTER COLUMN attack_bonus TYPE BIGINT;
ALTER TABLE equipment ALTER COLUMN defense_bonus TYPE BIGINT;
ALTER TABLE equipment ALTER COLUMN hp_bonus TYPE BIGINT;
ALTER TABLE equipment ALTER COLUMN speed_bonus TYPE BIGINT;
ALTER TABLE enemies ALTER COLUMN hp TYPE BIGINT;
ALTER TABLE enemies ALTER COLUMN atk TYPE BIGINT;
ALTER TABLE enemies ALTER COLUMN def TYPE BIGINT;
ALTER TABLE enemies ALTER COLUMN spd TYPE BIGINT;
${statBackfillRows}
${commonStatBackfillRows}
${statRecalculationRows}
`;

const boostRows = [];
for (let majorIndex = 1; majorIndex < majors.length; majorIndex += 1) {
  const [key, majorRealm, theme] = majors[majorIndex];
  for (const [stageCode, stageName, pillSuffix, rate, materialA, materialB] of stages) {
    const realmCode = `${key}_${stageCode}`;
    const rarity = majorIndex >= 11 ? 'legendary' : majorIndex >= 8 ? 'epic' : majorIndex >= 5 ? 'rare' : majorIndex >= 2 ? 'uncommon' : 'common';
    boostRows.push(`(${sqlString(`boost_${realmCode}`)},${sqlString(`${theme}${pillSuffix}`)},'breakthrough',${sqlString(rarity)},${sqlString(`${majorRealm}${stageName}专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。`)},${json({ breakthrough_rate: rate, realm_code: realmCode })},${json({ [`mat_${key}_${materialA}`]: 2 + majorIndex / 4 | 0, [`mat_${key}_${materialB}`]: 2 + majorIndex / 6 | 0 })},${120 + majorIndex * 20},${sqlString(imageFor(key))},${sqlString(majorRealm)},${sqlString(`丹谱于${majorRealm}对应区域游历收录；所需两味材料均在该区域获得。`)},${1 + (majorIndex - 1) * 4})`);
  }
}

const bossMaterialRows = [];
const majorPillRows = [];
for (let index = 0; index < majorPills.length; index += 1) {
  const [key, pillName] = majorPills[index];
  const [, majorRealm, theme, areaCode] = majors[index];
  const currentRealmCode = index === 0 ? 'mortal' : `${key}_full`;
  const requiredOrder = index === 0 ? 0 : index * 4;
  const rarity = index >= 9 ? 'legendary' : index >= 6 ? 'epic' : index >= 3 ? 'rare' : 'uncommon';
  bossMaterialRows.push(`(${sqlString(`boss_core_${areaCode}`)},${sqlString(`${theme}首领真髓`)},'boss_material',${sqlString(rarity)},${sqlString(`${areaCode}守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。`)},NULL,NULL,0,NULL,${sqlString(majorRealm)},${sqlString(`击败${majorRealm}对应副本的守关首领必定获得。`)},${requiredOrder})`);
  const nextMajor = majors[index + 1][1];
  majorPillRows.push(`(${sqlString(`major_pill_${key}`)},${sqlString(pillName)},'major_breakthrough',${sqlString(rarity)},${sqlString(`从${majorRealm}跨入${nextMajor}的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。`)},${json({ breakthrough_rate: 0.16, realm_code: currentRealmCode, major_breakthrough: true })},${json({ [`boss_core_${areaCode}`]: 1, [`mat_${key}_1`]: 4 + Math.floor(index / 3), [`mat_${key}_2`]: 3 + Math.floor(index / 4) })},${300 + index * 45},${sqlString(imageFor(key))},${sqlString(majorRealm)},${sqlString(`首次击败${majorRealm}守关首领后领悟丹谱；核心药引仅由该首领掉落。`)},${requiredOrder})`);
}

const rarityCases = (base, ratios) => `CASE rarity WHEN 'legendary' THEN ${Math.round(base * ratios[4])} WHEN 'epic' THEN ${Math.round(base * ratios[3])} WHEN 'rare' THEN ${Math.round(base * ratios[2])} WHEN 'uncommon' THEN ${Math.round(base * ratios[1])} ELSE ${Math.round(base * ratios[0])} END`;
const balanceUpdates = majors.map(([key, majorRealm, , areaCode], majorIndex) => {
  const order = majorIndex === 0 ? 0 : 1 + (majorIndex - 1) * 4;
  const multiplier = 3 ** majorIndex;
  const hp = Math.round((100 + order * 60) * multiplier);
  const atk = Math.round((10 + order * 9) * multiplier);
  const def = Math.round((5 + order * 4) * multiplier);
  const spd = Math.round((10 + order * 2) * multiplier);
  const weaponAttack = rarityCases(atk, [0.08, 0.12, 0.18, 0.28, 0.42]);
  const armorAttack = rarityCases(atk, [0.01, 0.015, 0.02, 0.03, 0.05]);
  const weaponDefense = rarityCases(def, [0.01, 0.015, 0.02, 0.03, 0.05]);
  const armorDefense = rarityCases(def, [0.08, 0.12, 0.18, 0.28, 0.42]);
  const weaponHp = rarityCases(hp, [0.01, 0.015, 0.02, 0.03, 0.05]);
  const armorHp = rarityCases(hp, [0.08, 0.12, 0.18, 0.28, 0.42]);
  const weaponSpeed = rarityCases(spd, [0.03, 0.045, 0.065, 0.09, 0.13]);
  const armorSpeed = rarityCases(spd, [0.01, 0.015, 0.025, 0.04, 0.06]);
  return `UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN ${weaponAttack} ELSE ${armorAttack} END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN ${armorDefense} ELSE ${weaponDefense} END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN ${armorHp} ELSE ${weaponHp} END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN ${weaponSpeed} ELSE ${armorSpeed} END
WHERE major_realm=${sqlString(majorRealm)};
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN ${Math.round(hp * 0.85)} WHEN 'elite' THEN ${Math.round(hp * 1.25)} ELSE ${Math.round(hp * 2.0)} END,
 atk=CASE rank WHEN 'normal' THEN ${Math.round(atk * 0.68)} WHEN 'elite' THEN ${Math.round(atk * 0.82)} ELSE ${Math.round(atk * 0.85)} END,
 def=CASE rank WHEN 'normal' THEN ${Math.round(def * 0.70)} WHEN 'elite' THEN ${Math.round(def * 0.90)} ELSE ${Math.round(def * 1.0)} END,
 spd=CASE rank WHEN 'normal' THEN ${Math.round(spd * 0.88)} WHEN 'elite' THEN ${Math.round(spd * 1.0)} ELSE ${Math.round(spd * 1.08)} END
WHERE area_code=${sqlString(areaCode)};`;
}).join('\n');
const legendaryArmorUpdates = majors.flatMap(([key, majorRealm, theme]) => [
  `UPDATE equipment SET weapon_type='robe', name=${sqlString(`${theme}玄衣`)}, description=${sqlString(`${majorRealm}绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。`)} WHERE code=${sqlString(`armor_${key}_09`)};`,
  `UPDATE equipment SET weapon_type='armor', name=${sqlString(`${theme}道铠`)}, description=${sqlString(`${majorRealm}绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。`)} WHERE code=${sqlString(`armor_${key}_10`)};`,
]).join('\n');

const sql = mailSchema + statSchema + `-- 坊市经济、玩家拍卖、邮箱、分阶破境丹、首领门槛与美术路径。\n\n` +
`ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_stamina_check;\n` +
`ALTER TABLE characters ADD CONSTRAINT characters_stamina_check CHECK (stamina BETWEEN 0 AND 999);\n\n` +
`ALTER TABLE enemies ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);\n` +
`UPDATE enemies SET image_url='/assets/bosses/' || code || '.webp' WHERE rank='boss';\n\n` +
`UPDATE equipment SET image_url='/assets/equipment/legendary/' || code || '.webp' WHERE rarity='legendary';\n` +
`${legendaryArmorUpdates}\n\n` +
`CREATE TABLE IF NOT EXISTS shop_goods (\n  id SERIAL PRIMARY KEY, item_id INT NOT NULL UNIQUE REFERENCES items(id),\n  price BIGINT NOT NULL CHECK(price>0), required_order INT NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT TRUE\n);\n` +
`CREATE TABLE IF NOT EXISTS auction_listings (\n  id BIGSERIAL PRIMARY KEY, seller_character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,\n  buyer_character_id INT REFERENCES characters(id) ON DELETE SET NULL, item_id INT REFERENCES items(id),\n  equipment_id INT REFERENCES equipment(id), quantity INT NOT NULL CHECK(quantity>0), unit_price BIGINT NOT NULL CHECK(unit_price>0),\n  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','sold','cancelled')),\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sold_at TIMESTAMPTZ,\n  CHECK((item_id IS NOT NULL AND equipment_id IS NULL) OR (item_id IS NULL AND equipment_id IS NOT NULL))\n);\n` +
`CREATE INDEX IF NOT EXISTS idx_auction_active ON auction_listings(status, created_at DESC);\n` +
`CREATE INDEX IF NOT EXISTS idx_auction_seller ON auction_listings(seller_character_id, status);\n\n` +
`UPDATE items SET type='legacy_breakthrough', description='旧制破境之物，药性已散，可保留收藏或处理。' WHERE type='breakthrough';\n\n` +
`INSERT INTO items (code,name,type,rarity,description,effect,recipe,craft_time_s,image_url,major_realm,source_description,required_order) VALUES\n${boostRows.join(',\n')}\nON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,rarity=EXCLUDED.rarity,description=EXCLUDED.description,effect=EXCLUDED.effect,recipe=EXCLUDED.recipe,craft_time_s=EXCLUDED.craft_time_s,image_url=EXCLUDED.image_url,major_realm=EXCLUDED.major_realm,source_description=EXCLUDED.source_description,required_order=EXCLUDED.required_order;\n\n` +
`INSERT INTO items (code,name,type,rarity,description,effect,recipe,craft_time_s,image_url,major_realm,source_description,required_order) VALUES\n${bossMaterialRows.join(',\n')}\nON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,rarity=EXCLUDED.rarity,description=EXCLUDED.description,major_realm=EXCLUDED.major_realm,source_description=EXCLUDED.source_description,required_order=EXCLUDED.required_order;\n\n` +
`INSERT INTO items (code,name,type,rarity,description,effect,recipe,craft_time_s,image_url,major_realm,source_description,required_order) VALUES\n${majorPillRows.join(',\n')}\nON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,rarity=EXCLUDED.rarity,description=EXCLUDED.description,effect=EXCLUDED.effect,recipe=EXCLUDED.recipe,craft_time_s=EXCLUDED.craft_time_s,image_url=EXCLUDED.image_url,major_realm=EXCLUDED.major_realm,source_description=EXCLUDED.source_description,required_order=EXCLUDED.required_order;\n\n` +
`INSERT INTO character_recipes(character_id,item_id)\nSELECT c.id,i.id FROM characters c JOIN realms r ON r.id=c.realm_id JOIN items i ON i.code='boost_' || r.code\nON CONFLICT DO NOTHING;\n\n` +
`INSERT INTO shop_goods(item_id,price,required_order)\nSELECT id, CASE rarity WHEN 'legendary' THEN 900 WHEN 'epic' THEN 360 WHEN 'rare' THEN 140 WHEN 'uncommon' THEN 55 ELSE 18 END + required_order*4, required_order\nFROM items WHERE type='material' AND code LIKE 'mat_%'\nON CONFLICT(item_id) DO UPDATE SET price=EXCLUDED.price,required_order=EXCLUDED.required_order,active=TRUE;\n` +
`INSERT INTO shop_goods(item_id,price,required_order)\nSELECT id, 60+required_order*8, required_order FROM items WHERE code LIKE 'stamina_pill_%'\nON CONFLICT(item_id) DO UPDATE SET price=EXCLUDED.price,required_order=EXCLUDED.required_order,active=TRUE;\n`;

const finalSql = sql + `\n${balanceUpdates}\n`;

const output = path.join(__dirname, '../db/migrations/027_economy_progression_and_bosses.sql');
fs.writeFileSync(output, finalSql, 'utf8');
console.log(`Generated ${boostRows.length} boost pills, ${majorPillRows.length} major pills, and ${bossMaterialRows.length} boss materials.`);
