-- 旧藏品保留原 ID 与所有权，只有精选条目进入常规图鉴与掉落池。
ALTER TABLE techniques ADD COLUMN featured BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE equipment ADD COLUMN featured BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE techniques SET featured = code LIKE 'tech_%' AND (
  code LIKE '%001' OR code LIKE '%002' OR code LIKE '%003' OR code LIKE '%004' OR code LIKE '%005'
);

UPDATE techniques AS t SET
  qi_multiplier = CASE t.category WHEN '吐纳' THEN 1.45 WHEN '悟道' THEN 1.15 ELSE 1.00 END,
  retreat_multiplier = CASE t.category WHEN '吐纳' THEN 1.20 ELSE 1.00 END,
  breakthrough_bonus = CASE t.category WHEN '悟道' THEN 0.12 ELSE 0 END,
  event_bonus = CASE t.category WHEN '悟道' THEN 0.20 ELSE 0 END,
  stat_bonuses = CASE t.category
    WHEN '炼体' THEN jsonb_build_object('atk', round(s.power * 0.025), 'hp', round(s.power * 0.06))
    WHEN '护体' THEN jsonb_build_object('def', round(s.power * 0.025), 'hp', round(s.power * 0.13))
    WHEN '身法' THEN jsonb_build_object('spd', round(s.power * 0.04), 'atk', round(s.power * 0.015))
    ELSE '{}'::jsonb END,
  description = CASE t.category
    WHEN '吐纳' THEN '调匀周天灵息，专精自然修炼和闭关。'
    WHEN '炼体' THEN '以气淬骨，蓄劲三合，适合正面交锋。'
    WHEN '护体' THEN '气沉周身，先稳住开局，再徐徐反击。'
    WHEN '身法' THEN '寻隙换位，擅长避让攻势与抢占先手。'
    WHEN '悟道' THEN '静观灵机，擅长破境，也更容易发现游历异宝。'
    ELSE t.description END,
  source_description = CASE WHEN t.featured THEN '在对应境界游历取得；入境即可修习。' ELSE '旧藏功法，已收录者可继续修习。' END,
  required_order = CASE WHEN t.featured THEN s.min_realm_order ELSE t.required_order END
FROM (SELECT major_realm, min_realm_order, 100 + 22 * max_realm_order + max_realm_order * max_realm_order AS power FROM areas) s
WHERE t.major_realm = s.major_realm;

UPDATE techniques SET qi_multiplier = 1.20 WHERE code IN ('tuna_jue','lianti_xinfa');

UPDATE equipment SET featured = FALSE WHERE rarity <> 'legendary';
UPDATE equipment AS e SET featured = TRUE, rarity = 'common'
FROM (SELECT min(id) AS id FROM equipment WHERE rarity <> 'legendary' GROUP BY area_code, weapon_type) selected
WHERE e.id = selected.id;

-- 原来的盾型条目后来被替换为绝品袍和甲，补回独立盾型，不改动原来的藏品。
INSERT INTO equipment (code, name, slot, weapon_type, rarity, major_realm, required_order,
                       description, source_description, area_code, combat_role)
SELECT 'shield_' || split_part(r.code, '_', 1) || '_01' AS code, a.name || '·守隙盾' AS name,
       'weapon', 'shield', 'common', a.major_realm, a.min_realm_order, '坚盾护身。', '对应区域炼制。', a.code, 'defense'
FROM areas a JOIN realms r ON r.order_index = a.min_realm_order;

-- 同档器物各有偏重，绝品用少量数值增加余量，特性仍由器型决定。
UPDATE equipment AS e SET
  attack_bonus = round(s.power * s.atk * CASE WHEN e.rarity = 'legendary' THEN 1.15 ELSE 1 END),
  defense_bonus = round(s.power * s.def * CASE WHEN e.rarity = 'legendary' THEN 1.15 ELSE 1 END),
  hp_bonus = round(s.power * s.hp * CASE WHEN e.rarity = 'legendary' THEN 1.15 ELSE 1 END),
  speed_bonus = round(s.power * s.spd * CASE WHEN e.rarity = 'legendary' THEN 1.15 ELSE 1 END),
  required_order = CASE WHEN e.featured AND e.rarity <> 'legendary' THEN s.min_realm_order ELSE e.required_order END,
  description = s.description,
  source_description = CASE WHEN NOT e.featured THEN '旧藏器物，已经获得的器物与器谱可继续使用。'
    WHEN e.rarity = 'legendary' THEN '对应区域的稀有掉落，或收录器谱后炼制。' ELSE '对应区域游历可掉落；解锁该境界即可炼制。' END,
  recipe_source_description = CASE WHEN e.featured AND e.rarity <> 'legendary' THEN '解锁该境界自动掌握器谱。' ELSE e.recipe_source_description END,
  recipe = CASE WHEN e.featured AND e.rarity <> 'legendary' THEN jsonb_build_object(
    'mat_' || split_part(e.code, '_', 2) || '_' || s.material, 2,
    'mat_' || split_part(e.code, '_', 2) || CASE e.combat_role WHEN 'attack' THEN '_2' ELSE '_3' END, 1) ELSE e.recipe END,
  craft_time_s = CASE WHEN e.featured AND e.rarity <> 'legendary' THEN 45 + s.min_realm_order * 2 ELSE e.craft_time_s END
FROM (SELECT areas.code, areas.min_realm_order,
             100 + 22 * areas.max_realm_order + areas.max_realm_order * areas.max_realm_order AS power, kinds.*
      FROM areas JOIN
  (VALUES
    ('sword', 0.055, 0.00, 0.00, 0.02, '锋刃利于破开重防。', '1'),
    ('saber', 0.065, 0.00, 0.04, 0.00, '刀势厚重，适合追击受伤的敌人。', '3'),
    ('spear', 0.050, 0.00, 0.00, 0.03, '长枪抢先，首轮抢占主动。', '4'),
    ('fan',   0.040, 0.00, 0.00, 0.05, '以退为进，善于闪避后回击。', '5'),
    ('staff', 0.060, 0.01, 0.00, 0.00, '伏雷蓄在杖中，适合持久交锋。', '6'),
    ('armor', 0.000, 0.04, 0.27, 0.00, '重甲护住要害，适合承受猛烈攻击。', '1'),
    ('robe',  0.000, 0.02, 0.23, 0.01, '法袍护息，能在交战中缓慢回气。', '2'),
    ('crown', 0.015, 0.02, 0.17, 0.00, '凝神照魄，容易捕捉对方的破绽。', '4'),
    ('boots', 0.000, 0.01, 0.16, 0.04, '轻履便于闪避，战斗开局尤为实用。', '5'),
    ('shield',0.000, 0.05, 0.21, 0.00, '坚盾护身，负伤之后仍能稳住阵脚。', '6')
  ) AS kinds(weapon_type, atk, def, hp, spd, description, material) ON TRUE) s
WHERE e.area_code = s.code AND e.weapon_type = s.weapon_type;

-- 先换算存量灵气和伤势的进度，再改境界表中的目标和速率。
UPDATE characters AS c SET
  current_qi = round(LEAST(1, c.current_qi::numeric / GREATEST(1, n.old_qi_required)) * n.qi_required),
  qi_per_second = n.qi_rate,
  hp = GREATEST(1, round(LEAST(1, c.hp::numeric / GREATEST(1, c.hp_max)) * (n.power + c.bonus_hp))),
  hp_max = n.power + c.bonus_hp,
  atk = round(n.power * 0.14) + c.bonus_atk,
  def = round(n.power * 0.08) + c.bonus_def,
  spd = round(n.power * 0.12) + c.bonus_spd,
  major_stat_multiplier = 1
FROM (
  SELECT id, qi_required AS old_qi_required, 100 + 22 * order_index + order_index * order_index AS power,
         2 + 2 * order_index AS qi_rate,
         (2 + 2 * order_index) * (180 + 85 * order_index) AS qi_required
  FROM realms
) n WHERE c.realm_id = n.id;

UPDATE realms SET qi_base_per_sec = 2 + 2 * order_index,
  qi_required = (2 + 2 * order_index) * (180 + 85 * order_index);

-- 寻常敌人取区域起点，精英稍晚，守关首领取区域圆满。掉落和历史战报仍引用原敌人。
UPDATE enemies AS e SET
  hp = round(s.power * CASE e.rank WHEN 'boss' THEN 1.78 WHEN 'elite' THEN 1.18 ELSE 0.72 END),
  atk = round(s.power * CASE e.rank WHEN 'boss' THEN 0.115 WHEN 'elite' THEN 0.105 ELSE 0.085 END),
  def = round(s.power * CASE e.rank WHEN 'boss' THEN 0.070 WHEN 'elite' THEN 0.055 ELSE 0.045 END),
  spd = round(s.power * CASE e.rank WHEN 'boss' THEN 0.135 WHEN 'elite' THEN 0.115 ELSE 0.105 END),
  qi_reward = round(s.qi_required * CASE e.rank WHEN 'boss' THEN 0.20 WHEN 'elite' THEN 0.12 ELSE 0.06 END)
FROM (
  SELECT a.code, ranks.rank,
         100 + 22 * r.order_index + r.order_index * r.order_index AS power, r.qi_required
  FROM areas a JOIN (VALUES ('boss'), ('elite'), ('normal')) AS ranks(rank) ON TRUE
  JOIN realms r ON r.order_index = CASE ranks.rank WHEN 'boss' THEN a.max_realm_order
    WHEN 'elite' THEN LEAST(a.max_realm_order, a.min_realm_order + 1) ELSE a.min_realm_order END
) s WHERE e.area_code = s.code AND e.rank = s.rank;

UPDATE area_drop_rules SET pity_after = LEAST(pity_after, 3), base_rate = GREATEST(base_rate, 0.30)
WHERE category = 'technique';

-- 保留首领专属药引，减少与基础器物争抢的普通炼材；更新丹谱文案以反映失败时的保留规则。
UPDATE items SET recipe = jsonb_build_object(
  'boss_core_' || areas.code, 1,
  'mat_' || split_part(items.code, '_', 3) || '_1', 3,
  'mat_' || split_part(items.code, '_', 3) || '_2', 2
), description = '由守关首领的药引炼成，用于冲击下一大境界。仅在破境成功时消耗。'
FROM areas WHERE items.major_realm = areas.major_realm AND items.type = 'major_breakthrough';
