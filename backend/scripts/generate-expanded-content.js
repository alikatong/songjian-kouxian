const fs = require('node:fs');
const path = require('node:path');

const output = path.join(__dirname, '../db/migrations/008_expanded_content.sql');

const realms = [
  ['mortal', '凡人', '尘世', 0, 0, 'luoxia', '落霞村', '村舍、溪田与低矮山坡相连，是所有凡人故事开始的地方。', '药材碎末、清泉水、谷物', '野兽与山路意外'],
  ['lianpi', '练皮境', '铜皮', 1, 4, 'qingyun_foothill', '青云山脚', '山脚古道遍布药圃与猎户营地，淬炼皮肉的材料随处可寻。', '硬叶草、赤砂、山兽皮', '山匪与毒虫'],
  ['lianggu', '练骨境', '铁骨', 5, 8, 'blackstone_forest', '黑石林', '黑色石柱如林而立，矿脉与兽穴交错，入夜后常有低沉兽吼。', '铁髓石、兽骨、石乳', '落石与凶兽'],
  ['yijin', '易筋境', '玉筋', 9, 12, 'mist_forest', '迷雾林', '终年不散的雾气遮住藤谷，灵藤与敏捷妖兽都藏在林间。', '青灵藤、风叶、玉露', '迷途与伏击'],
  ['xisui', '洗髓境', '净髓', 13, 16, 'clear_spring_cliff', '清泉崖', '数十道灵泉从崖壁落下，水雾能洗去尘垢，也吸引了许多采药人。', '冰泉、净尘花、寒髓晶', '寒气与滑坠'],
  ['huanxue', '换血境', '赤血', 17, 20, 'red_maple_valley', '赤枫谷', '谷中枫叶终年如血，旺盛生机孕育出滋养气血的珍材。', '赤灵果、血参、兽血晶', '血煞与狂兽'],
  ['tianren', '天人境', '天感', 21, 24, 'mirror_lake', '天镜湖', '湖面倒映天光，风雨与星辰的细微变化都能引发玄妙感应。', '天露、感应草、星砂', '幻象与心障'],
  ['lianqi', '炼气期', '灵息', 25, 28, 'spirit_vein_valley', '灵脉谷', '真正的灵脉在谷底交汇，空气中的灵气已浓到肉眼可辨。', '聚气草、灵泉珠、五行砂', '灵兽与气旋'],
  ['zhujia', '筑基期', '道基', 29, 32, 'sect_outer_court', '仙门外院', '仙门外院连接药田、矿洞与藏经旧阁，任务与机缘同样繁多。', '地脉土、百年芝、灵麦', '傀儡与禁制'],
  ['jindan', '金丹期', '丹火', 33, 36, 'alchemy_peak', '丹霞峰', '山峰被地火映成丹霞色，废弃丹室和火脉孕育着高阶材料。', '丹火精、金灵砂、火髓', '丹毒与火灵'],
  ['yuanying', '元婴期', '婴息', 37, 40, 'ancient_soul_ruins', '古魂遗墟', '断壁间残留上古修士的神念，虚实交错，稍有不慎便会迷失元神。', '魂露、婴息花、古灵木', '残魂与神识冲击'],
  ['huashen', '化神期', '法相', 41, 44, 'law_abyss', '法则渊', '天地法则在深渊上空显形，碎片如流星般坠落又消散。', '法则碎片、化神草、虚空泉', '法则乱流'],
  ['dacheng', '大乘期', '渡劫', 45, 48, 'heaven_gate', '天门绝域', '云海之上雷光不息，凡界最珍贵的材料都藏在天劫余烬之中。', '雷霆晶、九天草、仙露', '雷劫与空间裂隙'],
];

const rarity = (index) => index < 50 ? 'common' : index < 75 ? 'uncommon' : index < 90 ? 'rare' : index < 98 ? 'epic' : 'legendary';
const rarityCn = { common: '凡品', uncommon: '良品', rare: '上品', epic: '珍品', legendary: '绝品' };
const esc = (value) => String(value).replaceAll("'", "''");
const json = (value) => `'${esc(JSON.stringify(value))}'`;
const value = (...fields) => `(${fields.map((field) => typeof field === 'number' ? field : field === null ? 'NULL' : `'${esc(field)}'`).join(', ')})`;

const techniquePrefixes = ['松风', '流云', '抱朴', '观澜', '守一', '归元', '照影', '听雷', '藏锋', '问心'];
const techniqueSuffixes = [
  ['吐纳诀', '吐纳', '灵气运转'], ['炼形功', '炼体', '气血根骨'], ['轻身篇', '身法', '身法速度'],
  ['护体经', '护体', '护身防御'], ['明心录', '悟道', '奇缘感悟'], ['周天法', '吐纳', '闭关修炼'],
  ['锻骨章', '炼体', '攻击气力'], ['踏云步', '身法', '探索机缘'], ['玄甲术', '护体', '气血防御'],
  ['参同契', '悟道', '破境感悟'],
];
const pillRoots = ['回春', '养元', '固本', '凝神', '壮骨', '轻身', '护脉', '聚灵', '清心', '破障'];
const pillForms = ['丹', '丸', '散', '露', '膏'];
const materialNames = ['灵叶', '清露', '玄砂', '玉根', '石髓', '灵果'];
const eventTemplates = [
  ['旧碑残文', '荒草间露出半截古碑，碑面纹路被风雨磨去大半。', '拂去苔痕细读', '你辨认出几句残文，也在碑后找到遗物。', true, false],
  ['负伤采药人', '一名采药人倚着岩壁包扎伤口，药篓散落在旁。', '上前搭手', '对方谢过援手，与你交换了辨药心得。', false, true],
  ['隐秘石洞', '山壁后传来空洞回声，一道仅容侧身通过的裂隙藏在藤蔓后。', '点灯入洞', '洞中没有妖物，只有前人留下的瓶罐与残页。', true, true],
  ['雨后药坡', '骤雨刚停，坡地草叶挂满水珠，泥土中透出清苦药香。', '按叶脉采集', '你避开有毒植株，采到一批新鲜材料。', false, false],
  ['山中小市', '几名行脚人临时支起布棚，以物易物，天黑前便会散去。', '拿材料交换', '你换到少见的手抄本，也听说了附近的产材地点。', true, false],
  ['灵兽足迹', '泥地上留着一串泛光足印，延伸向林木深处。', '保持距离追踪', '足迹尽头散落着灵兽啃食后留下的药材。', false, false],
  ['前人丹室', '焦黑石门后是一间废弃丹室，炉灰仍有微弱余温。', '清理炉台', '你从夹层找到一页丹方，并收起尚能使用的药材。', false, true],
  ['风中经声', '风穿过石孔，竟像有人在远处诵读经文，字句若隐若现。', '静坐聆听', '你记下几段运气法门，心境也随之澄明。', true, false],
  ['断桥彼端', '旧桥断在山涧中央，对岸石台上生着几株罕见灵草。', '寻找稳妥路径', '绕行虽费时间，却平安带回了灵草。', false, false],
  ['夜宿古亭', '暮色将合，古亭梁上挂着褪色木牌，桌面留有新鲜墨迹。', '燃灯查看', '墨迹记载了附近秘径，桌下还压着一只旧木匣。', true, true],
];

const lines = [
  '-- 此文件由 scripts/generate-expanded-content.js 确定性生成。',
  '-- 每个大境界 100 本功法、50 种丹药、6 种材料和 10 条区域事件。',
];

lines.push('INSERT INTO areas (code, name, description, major_realm, min_realm_order, max_realm_order, material_summary, danger_summary) VALUES');
lines.push(realms.map((r) => value(r[5], r[6], r[7], r[1], r[3], r[4], r[8], r[9])).join(',\n') + '\nON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, major_realm=EXCLUDED.major_realm, min_realm_order=EXCLUDED.min_realm_order, max_realm_order=EXCLUDED.max_realm_order, material_summary=EXCLUDED.material_summary, danger_summary=EXCLUDED.danger_summary;');

const materialRows = [];
const techniqueRows = [];
const pillRows = [];
const eventRows = [];

for (const [realmKey, realmName, theme, minOrder, maxOrder, areaCode, areaName] of realms) {
  const materials = materialNames.map((base, i) => ({
    code: `mat_${realmKey}_${i + 1}`,
    name: `${theme}${base}`,
  }));
  for (const material of materials) {
    materialRows.push(`('${material.code}', '${material.name}', 'material', 'common', '${material.name}产自${areaName}，是${realmName}丹药的常用药材。', NULL, NULL, 0, '${realmName}', '前往${areaName}游历，可从采集、交换和随机事件中获得。', ${minOrder})`);
  }

  for (let index = 0; index < 100; index += 1) {
    const prefix = techniquePrefixes[Math.floor(index / 10)];
    const [suffix, category, focus] = techniqueSuffixes[index % 10];
    const quality = rarity(index);
    const qualityRank = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(quality);
    const qiMultiplier = (1 + qualityRank * 0.04 + (index % 5) * 0.01).toFixed(2);
    const offlineMultiplier = (1 + (category === '吐纳' ? 0.04 + qualityRank * 0.03 : 0)).toFixed(2);
    const breakthroughBonus = category === '悟道' ? (0.01 + qualityRank * 0.01).toFixed(2) : '0.00';
    const eventBonus = category === '身法' ? (0.02 + qualityRank * 0.02).toFixed(2) : '0.00';
    const statBonuses = category === '炼体' ? { hp: 5 + qualityRank * 4, atk: 1 + qualityRank }
      : category === '护体' ? { def: 1 + qualityRank, hp: 3 + qualityRank * 3 }
        : category === '身法' ? { spd: 1 + qualityRank } : {};
    const code = `tech_${realmKey}_${String(index + 1).padStart(3, '0')}`;
    const name = `${theme}${prefix}${suffix}`;
    const description = `${rarityCn[quality]}${realmName}功法，以${focus}为要，修习后提升修炼效率，并形成独特的${category}路数。`;
    const source = `在${areaName}游历时，可能从石刻、旧匣、修士指点或残卷中收录此功法谱。`;
    techniqueRows.push(`('${code}', '${name}', '${quality}', '${description}', ${qiMultiplier}, ${offlineMultiplier}, ${breakthroughBonus}, ${eventBonus}, 'realm:${realmKey}', '${realmName}', '${category}', ${json(statBonuses)}, '${source}', ${minOrder})`);
  }

  for (let index = 0; index < 50; index += 1) {
    const root = pillRoots[Math.floor(index / 5)];
    const form = pillForms[index % 5];
    const quality = rarity(index * 2);
    const qualityRank = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(quality);
    const code = `pill_${realmKey}_${String(index + 1).padStart(2, '0')}`;
    const name = `${theme}${root}${form}`;
    const materialA = materials[index % materials.length];
    const materialB = materials[(index + 2) % materials.length];
    const recipe = { [materialA.code]: 1 + qualityRank, [materialB.code]: 1 + (index % 3) };
    const effectKinds = [
      [{ qi_percent: Number((0.03 + qualityRank * 0.02).toFixed(2)) }, `服用后立即补充当前破境所需灵气的${3 + qualityRank * 2}%。`],
      [{ heal_percent: Number((0.2 + qualityRank * 0.1).toFixed(2)) }, `服用后恢复${20 + qualityRank * 10}%气血。`],
      [{ atk: 1 + qualityRank }, `服用后永久增加${1 + qualityRank}点攻击，每种丹药仅首次生效。`],
      [{ def: 1 + qualityRank }, `服用后永久增加${1 + qualityRank}点防御，每种丹药仅首次生效。`],
      [{ spd: 1 + Math.floor(qualityRank / 2) }, `服用后永久增加${1 + Math.floor(qualityRank / 2)}点身法，每种丹药仅首次生效。`],
      [{ fate_points: 1 + qualityRank }, `服用后获得${1 + qualityRank}点奇缘。`],
    ];
    const [effect, effectText] = effectKinds[index % effectKinds.length];
    const description = `${rarityCn[quality]}${realmName}丹药。${effectText}`;
    const source = `丹方可在${areaName}的丹室遗迹、行脚商人或随机奇遇中发现；所需材料均产自该区域。`;
    pillRows.push(`('${code}', '${name}', 'pill', '${quality}', '${description}', ${json(effect)}, ${json(recipe)}, ${60 + minOrder * 5 + qualityRank * 45}, '${realmName}', '${source}', ${minOrder})`);
  }

  for (let index = 0; index < eventTemplates.length; index += 1) {
    const [title, body, action, result, techniqueFind, recipeFind] = eventTemplates[index];
    const materialA = materials[index % materials.length];
    const materialB = materials[(index + 1) % materials.length];
    const effectsA = { items: { [materialA.code]: 2 + index % 3 }, qi: 30 + minOrder * 20 };
    if (techniqueFind) effectsA.discover_technique = true;
    if (recipeFind) effectsA.discover_recipe = true;
    const effectsB = { items: { [materialB.code]: 2 }, spirit_stones: 3 + minOrder };
    const choices = [
      { text: action, result, effects: effectsA },
      { text: '谨慎查看四周', result: `你没有贸然深入，但在附近收集到一些${materialB.name}。`, effects: effectsB },
    ];
    eventRows.push(`('event_${realmKey}_${String(index + 1).padStart(2, '0')}', '${theme}·${title}', '${body}这里是${areaName}，任何细小痕迹都可能与${realmName}修行有关。', '${areaCode}', ${minOrder}, ${maxOrder}, ${70 + (index % 4) * 15}, ${json(choices)}, false)`);
  }
}

lines.push(`INSERT INTO items (code, name, type, rarity, description, effect, recipe, craft_time_s, major_realm, source_description, required_order) VALUES\n${materialRows.join(',\n')}\nON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, major_realm=EXCLUDED.major_realm, source_description=EXCLUDED.source_description, required_order=EXCLUDED.required_order;`);
lines.push(`INSERT INTO techniques (code, name, rarity, description, qi_multiplier, offline_multiplier, breakthrough_bonus, event_bonus, unlock_condition, major_realm, category, stat_bonuses, source_description, required_order) VALUES\n${techniqueRows.join(',\n')}\nON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, rarity=EXCLUDED.rarity, description=EXCLUDED.description, qi_multiplier=EXCLUDED.qi_multiplier, offline_multiplier=EXCLUDED.offline_multiplier, breakthrough_bonus=EXCLUDED.breakthrough_bonus, event_bonus=EXCLUDED.event_bonus, major_realm=EXCLUDED.major_realm, category=EXCLUDED.category, stat_bonuses=EXCLUDED.stat_bonuses, source_description=EXCLUDED.source_description, required_order=EXCLUDED.required_order;`);
lines.push(`INSERT INTO items (code, name, type, rarity, description, effect, recipe, craft_time_s, major_realm, source_description, required_order) VALUES\n${pillRows.join(',\n')}\nON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, rarity=EXCLUDED.rarity, description=EXCLUDED.description, effect=EXCLUDED.effect, recipe=EXCLUDED.recipe, craft_time_s=EXCLUDED.craft_time_s, major_realm=EXCLUDED.major_realm, source_description=EXCLUDED.source_description, required_order=EXCLUDED.required_order;`);
lines.push(`INSERT INTO events (code, title, body, area_code, min_realm_order, max_realm_order, weight, choices, is_story) VALUES\n${eventRows.join(',\n')}\nON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body, area_code=EXCLUDED.area_code, min_realm_order=EXCLUDED.min_realm_order, max_realm_order=EXCLUDED.max_realm_order, weight=EXCLUDED.weight, choices=EXCLUDED.choices, is_story=EXCLUDED.is_story;`);

lines.push(`
-- 新老角色都拥有一套能开始循环的凡人丹谱与基础功法。
INSERT INTO character_recipes (character_id, item_id)
SELECT c.id, i.id FROM characters c JOIN items i ON TRUE
WHERE i.code IN ('pill_mortal_01', 'pill_mortal_02', 'pill_mortal_03')
ON CONFLICT (character_id, item_id) DO NOTHING;

INSERT INTO character_techniques (character_id, technique_id)
SELECT c.id, t.id FROM characters c JOIN techniques t ON TRUE
WHERE t.code = 'tech_mortal_001'
ON CONFLICT (character_id, technique_id) DO NOTHING;
`);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${lines.join('\n\n')}\n`, 'utf8');
console.log(`Generated ${output}`);
console.log(`${techniqueRows.length} techniques, ${pillRows.length} pills, ${materialRows.length} materials, ${eventRows.length} events`);
