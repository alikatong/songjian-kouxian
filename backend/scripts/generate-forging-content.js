const fs = require('node:fs');
const path = require('node:path');

const realms = [
  ['mortal', '凡人', '尘世', 0, 'luoxia', '粗铁', '韧皮', '凡火砂'],
  ['lianpi', '练皮境', '铜皮', 1, 'qingyun_foothill', '青铜', '铜纹皮', '淬皮砂'],
  ['lianggu', '练骨境', '铁骨', 5, 'blackstone_forest', '玄铁', '铁脊皮', '骨火晶'],
  ['yijin', '易筋境', '玉筋', 9, 'mist_forest', '雾银', '玉筋丝', '青木髓'],
  ['xisui', '洗髓境', '净髓', 13, 'clear_spring_cliff', '泉心钢', '净水绡', '冰魄砂'],
  ['huanxue', '换血境', '赤血', 17, 'red_maple_valley', '赤炼铜', '血枫革', '赤阳晶'],
  ['tianren', '天人境', '天感', 21, 'mirror_lake', '天镜银', '星纹绡', '感灵玉'],
  ['lianqi', '炼气期', '灵息', 25, 'spirit_vein_valley', '灵脉铁', '聚灵绡', '灵息核'],
  ['zhujia', '筑基期', '道基', 29, 'sect_outer_court', '道纹钢', '玄元绡', '地脉心'],
  ['jindan', '金丹期', '丹火', 33, 'alchemy_peak', '丹霞金', '火蚕绡', '丹火髓'],
  ['yuanying', '元婴期', '婴息', 37, 'ancient_soul_ruins', '魂银', '养魂绡', '婴息玉'],
  ['huashen', '化神期', '法相', 41, 'law_abyss', '法纹金', '相罗绡', '法则晶'],
  ['dacheng', '大乘期', '渡劫', 45, 'heaven_gate', '劫雷金', '天劫绡', '雷劫心'],
];

const armorTypes = [
  ['armor', '甲', '重甲护住周身要害，偏重防御与气血。'],
  ['robe', '袍', '法袍以阵纹卸力，兼顾防御与身法。'],
  ['crown', '冠', '灵冠镇护识海，兼顾气血与防御。'],
  ['boots', '履', '云履稳固下盘，以身法避开杀招。'],
  ['shield', '盾', '法盾正面化解攻势，防御最为突出。'],
];
const suffixes = ['初铸', '镇岳'];
const rarities = ['common', 'common', 'uncommon', 'uncommon', 'rare', 'rare', 'epic', 'epic', 'legendary', 'legendary'];
const rarityCn = { common: '凡品', uncommon: '良品', rare: '上品', epic: '珍品', legendary: '绝品' };
const multipliers = { common: 1, uncommon: 1.25, rare: 1.65, epic: 2.2, legendary: 3 };
const costs = {
  common: [3, 2, 1], uncommon: [5, 3, 2], rare: [8, 5, 3], epic: [13, 8, 5], legendary: [21, 13, 8],
};
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => sqlString(JSON.stringify(value));

const itemRows = [];
const armorRows = [];
const weaponRecipeUpdates = [];

for (const [realmKey, realmName, theme, requiredOrder, areaCode, metalName, hideName, coreName] of realms) {
  const materialDefs = [
    [`forge_metal_${realmKey}`, metalName, '锻造攻器与重甲的主材'],
    [`forge_hide_${realmKey}`, hideName, '裁制法袍、灵冠与云履的主材'],
    [`forge_core_${realmKey}`, coreName, '为器物刻入灵性与阵纹的核心'],
  ];
  materialDefs.forEach(([code, name, purpose], index) => {
    const rarity = index === 2 ? (requiredOrder >= 33 ? 'rare' : requiredOrder >= 17 ? 'uncommon' : 'common') : 'common';
    itemRows.push(`(${sqlString(code)},${sqlString(name)},'material',${sqlString(rarity)},${sqlString(`${realmName}炼器材料，${purpose}。`)},${sqlString(realmName)},${sqlString(`在${realmName}对应区域${areaCode}游历获得；妖兽战利品更容易出现炼器材料。`)},${requiredOrder})`);
  });

  for (let index = 0; index < 20; index += 1) {
    const rarity = index < 8 ? 'common' : index < 13 ? 'uncommon' : index < 17 ? 'rare' : index < 19 ? 'epic' : 'legendary';
    const [metal, hide, core] = costs[rarity];
    const weaponCode = `weapon_${realmKey}_${String(index + 1).padStart(2, '0')}`;
    weaponRecipeUpdates.push(`UPDATE equipment SET recipe=${json({ [`forge_metal_${realmKey}`]: metal, [`forge_core_${realmKey}`]: core })}::jsonb, craft_time_s=120+required_order*8, recipe_source_description=major_realm || '对应区域游历可获得器谱。' WHERE code=${sqlString(weaponCode)};`);
  }

  for (let index = 0; index < 10; index += 1) {
    const rarity = rarities[index];
    const multiplier = multipliers[rarity];
    const [typeCode, typeName, focus] = armorTypes[Math.floor(index / 2)];
    const base = 4 + requiredOrder * 3;
    const attack = Math.max(0, Math.round(base * multiplier * 0.08));
    const typeDefense = { armor: 1.25, robe: 0.92, crown: 0.82, boots: 0.65, shield: 1.45 }[typeCode];
    const typeHp = { armor: 2.4, robe: 1.4, crown: 1.9, boots: 1.1, shield: 2.1 }[typeCode];
    const typeSpeed = { armor: 0, robe: 0.13, crown: 0.08, boots: 0.3, shield: 0 }[typeCode];
    const defense = Math.max(2, Math.round(base * multiplier * typeDefense));
    const hp = Math.max(8, Math.round(base * multiplier * typeHp));
    const speed = Math.max(0, Math.round((2 + requiredOrder * 0.25) * multiplier * typeSpeed));
    const [metal, hide, core] = costs[rarity];
    const recipe = ['armor', 'shield'].includes(typeCode)
      ? { [`forge_metal_${realmKey}`]: metal, [`forge_hide_${realmKey}`]: Math.max(1, Math.floor(hide / 2)), [`forge_core_${realmKey}`]: core }
      : { [`forge_hide_${realmKey}`]: hide, [`forge_metal_${realmKey}`]: Math.max(1, Math.floor(metal / 2)), [`forge_core_${realmKey}`]: core };
    const code = `armor_${realmKey}_${String(index + 1).padStart(2, '0')}`;
    const name = `${theme}${suffixes[index % 2]}${typeName}`;
    armorRows.push(`(${sqlString(code)},${sqlString(name)},'weapon',${sqlString(typeCode)},${sqlString(rarity)},${sqlString(realmName)},${requiredOrder},${attack},${defense},${hp},${speed},${sqlString(`${rarityCn[rarity]}${realmName}护器。${focus}攻击仅作最低限度补充，核心价值是生存。`)},${sqlString(`先在${realmName}对应区域获得器谱，再以区域炼材铸造；成品仅有极低概率直接掉落。`)},${sqlString(`/assets/equipment/armor_${realmKey}.webp`)},${sqlString(areaCode)},'defense',${json(recipe)},${120 + requiredOrder * 8 + index * 12},${sqlString(`器谱在${realmName}对应区域游历获得；材料均来自该区域。`)})`);
  }
}

const sql = `-- 炼器、真正的护器、递增妖兽遭遇率。由 scripts/generate-forging-content.js 确定性生成。\n\n` +
`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS recipe JSONB;\n` +
`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS craft_time_s INT NOT NULL DEFAULT 180;\n` +
`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS recipe_source_description TEXT;\n\n` +
`CREATE TABLE IF NOT EXISTS character_equipment_recipes (\n  id SERIAL PRIMARY KEY,\n  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,\n  equipment_id INT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,\n  obtained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  UNIQUE (character_id, equipment_id)\n);\n` +
`CREATE TABLE IF NOT EXISTS equipment_craft_queue (\n  id SERIAL PRIMARY KEY,\n  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,\n  equipment_id INT NOT NULL REFERENCES equipment(id),\n  quantity INT NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 5),\n  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  finish_at TIMESTAMPTZ NOT NULL,\n  is_collected BOOLEAN NOT NULL DEFAULT FALSE\n);\n` +
`CREATE INDEX IF NOT EXISTS idx_equipment_craft_queue ON equipment_craft_queue(character_id, is_collected, finish_at);\n\n` +
`INSERT INTO items (code,name,type,rarity,description,major_realm,source_description,required_order) VALUES\n${itemRows.join(',\n')}\nON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, rarity=EXCLUDED.rarity, description=EXCLUDED.description, major_realm=EXCLUDED.major_realm, source_description=EXCLUDED.source_description, required_order=EXCLUDED.required_order;\n\n` +
`INSERT INTO area_material_drops (area_code,item_id,weight,min_quantity,max_quantity)\nSELECT a.code, i.id, CASE WHEN i.code LIKE 'forge_core_%' THEN 9000 WHEN i.code LIKE 'forge_hide_%' THEN 14000 ELSE 18000 END, 1, CASE WHEN a.min_realm_order < 17 THEN 3 WHEN a.min_realm_order < 33 THEN 2 ELSE 1 END\nFROM areas a JOIN items i ON i.type='material' AND i.major_realm=a.major_realm AND i.code LIKE 'forge_%'\nON CONFLICT (area_code,item_id) DO UPDATE SET weight=EXCLUDED.weight,min_quantity=EXCLUDED.min_quantity,max_quantity=EXCLUDED.max_quantity;\n\n` +
`UPDATE equipment SET slot='weapon', combat_role='attack', attack_bonus=GREATEST(1,attack_bonus+defense_bonus), defense_bonus=defense_bonus/4, hp_bonus=hp_bonus/4, source_description=major_realm || '对应区域可得器谱和炼材；成品仅以极低概率直接掉落。';\n` +
`${weaponRecipeUpdates.join('\n')}\n\n` +
`INSERT INTO equipment (code,name,slot,weapon_type,rarity,major_realm,required_order,attack_bonus,defense_bonus,hp_bonus,speed_bonus,description,source_description,image_url,area_code,combat_role,recipe,craft_time_s,recipe_source_description) VALUES\n${armorRows.join(',\n')}\nON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,slot=EXCLUDED.slot,weapon_type=EXCLUDED.weapon_type,rarity=EXCLUDED.rarity,required_order=EXCLUDED.required_order,attack_bonus=EXCLUDED.attack_bonus,defense_bonus=EXCLUDED.defense_bonus,hp_bonus=EXCLUDED.hp_bonus,speed_bonus=EXCLUDED.speed_bonus,description=EXCLUDED.description,source_description=EXCLUDED.source_description,image_url=EXCLUDED.image_url,area_code=EXCLUDED.area_code,combat_role=EXCLUDED.combat_role,recipe=EXCLUDED.recipe,craft_time_s=EXCLUDED.craft_time_s,recipe_source_description=EXCLUDED.recipe_source_description;\n\n` +
`UPDATE area_drop_rules SET base_rate=0.18, pity_after=6, description='器物机缘：命中后优先获得未收录器谱，另有5%机会直接获得成品。' WHERE category='equipment';\n\n` +
`ALTER TABLE areas ADD COLUMN IF NOT EXISTS encounter_base_rate NUMERIC(6,5) NOT NULL DEFAULT 0.20;\n` +
`ALTER TABLE areas ADD COLUMN IF NOT EXISTS encounter_pity_after SMALLINT NOT NULL DEFAULT 5;\n` +
`UPDATE areas SET encounter_base_rate=CASE WHEN min_realm_order<9 THEN 0.18 WHEN min_realm_order<25 THEN 0.22 WHEN min_realm_order<37 THEN 0.26 ELSE 0.30 END, encounter_pity_after=5;\n` +
`CREATE TABLE IF NOT EXISTS character_encounter_pity (\n  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,\n  area_code VARCHAR(50) NOT NULL REFERENCES areas(code) ON DELETE CASCADE,\n  misses SMALLINT NOT NULL DEFAULT 0 CHECK(misses BETWEEN 0 AND 4),\n  PRIMARY KEY(character_id,area_code)\n);\n\n` +
`INSERT INTO character_equipment_recipes(character_id,equipment_id) SELECT c.id,e.id FROM characters c JOIN equipment e ON e.code IN ('weapon_mortal_01','armor_mortal_01') ON CONFLICT DO NOTHING;\n`;

const output = path.join(__dirname, '../db/migrations/022_forging_armor_and_encounters.sql');
fs.writeFileSync(output, sql, 'utf8');
console.log(`Generated ${armorRows.length} armors, ${itemRows.length} materials, and ${weaponRecipeUpdates.length} weapon recipes at ${output}`);
