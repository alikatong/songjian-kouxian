const fs = require('node:fs');
const path = require('node:path');

const realms = [
  ['mortal', '凡人', '尘世', 0, 'luoxia'], ['lianpi', '练皮境', '铜皮', 1, 'qingyun_foothill'],
  ['lianggu', '练骨境', '铁骨', 5, 'blackstone_forest'], ['yijin', '易筋境', '玉筋', 9, 'mist_forest'],
  ['xisui', '洗髓境', '净髓', 13, 'clear_spring_cliff'], ['huanxue', '换血境', '赤血', 17, 'red_maple_valley'],
  ['tianren', '天人境', '天感', 21, 'mirror_lake'], ['lianqi', '炼气期', '灵息', 25, 'spirit_vein_valley'],
  ['zhujia', '筑基期', '道基', 29, 'sect_outer_court'], ['jindan', '金丹期', '丹火', 33, 'alchemy_peak'],
  ['yuanying', '元婴期', '婴息', 37, 'ancient_soul_ruins'], ['huashen', '化神期', '法相', 41, 'law_abyss'],
  ['dacheng', '大乘期', '渡劫', 45, 'heaven_gate'],
];
const weaponTypes = [
  ['sword', '剑', '均衡灵巧'], ['saber', '刀', '刚猛攻击'], ['spear', '枪', '破阵穿透'],
  ['fan', '扇', '轻灵攻势'], ['staff', '杖', '蓄势重击'],
];
const names = ['初鸣', '藏锋', '逐风', '镇岳'];
const rarityFor = (index) => index < 8 ? 'common' : index < 13 ? 'uncommon' : index < 17 ? 'rare' : index < 19 ? 'epic' : 'legendary';
const rarityCn = { common: '凡品', uncommon: '良品', rare: '上品', epic: '珍品', legendary: '绝品' };
const multipliers = { common: 1, uncommon: 1.15, rare: 1.35, epic: 1.6, legendary: 2 };
const escape = (value) => String(value).replaceAll("'", "''");

const rows = [];
for (const [realmKey, realmName, theme, requiredOrder, areaCode] of realms) {
  for (let index = 0; index < 20; index += 1) {
    const [typeCode, typeName, focus] = weaponTypes[Math.floor(index / 4)];
    const quality = rarityFor(index);
    const multiplier = multipliers[quality];
    const base = 4 + requiredOrder * 3;
    const attack = Math.max(1, Math.round(base * multiplier * (typeCode === 'saber' || typeCode === 'spear' ? 1.12 : 1)));
    const defense = typeCode === 'staff' ? Math.max(1, Math.round(base * multiplier * 0.28)) : typeCode === 'sword' ? Math.round(base * 0.08) : 0;
    const hp = typeCode === 'staff' ? Math.max(5, Math.round(base * multiplier * 1.5)) : 0;
    const speed = typeCode === 'fan' ? Math.max(1, Math.round((2 + requiredOrder * 0.3) * multiplier)) : typeCode === 'sword' ? Math.max(1, Math.round((1 + requiredOrder * 0.15) * multiplier)) : 0;
    const code = `weapon_${realmKey}_${String(index + 1).padStart(2, '0')}`;
    const name = `${theme}${names[index % 4]}${typeName}`;
    const description = `${rarityCn[quality]}${realmName}武器，以${focus}见长，攻击是其核心价值。数值遵循本境界装备预算，不会跨越境界形成碾压。`;
    const source = `在${realmName}对应区域游历时有机会获得；装备要求为${realmName}或更高境界。`;
    rows.push(`('${code}','${escape(name)}','weapon','${typeCode}','${quality}','${realmName}',${requiredOrder},${attack},${defense},${hp},${speed},'${escape(description)}','${escape(source)}','/assets/equipment/${code}.png','${areaCode}')`);
  }
}

const sql = `-- 由 scripts/generate-equipment-content.js 确定性生成：每个大境界 20 件武器。\n
INSERT INTO equipment
  (code,name,slot,weapon_type,rarity,major_realm,required_order,attack_bonus,defense_bonus,hp_bonus,speed_bonus,description,source_description,image_url,area_code)
VALUES
${rows.join(',\n')}
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, rarity=EXCLUDED.rarity, required_order=EXCLUDED.required_order,
  attack_bonus=EXCLUDED.attack_bonus, defense_bonus=EXCLUDED.defense_bonus,
  hp_bonus=EXCLUDED.hp_bonus, speed_bonus=EXCLUDED.speed_bonus,
  description=EXCLUDED.description, source_description=EXCLUDED.source_description,
  image_url=EXCLUDED.image_url, area_code=EXCLUDED.area_code;
`;

const output = path.join(__dirname, '../db/migrations/013_seed_equipment.sql');
fs.writeFileSync(output, sql, 'utf8');
console.log(`Generated ${rows.length} weapons at ${output}`);
