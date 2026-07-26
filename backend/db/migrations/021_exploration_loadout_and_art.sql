-- 游历精力、分境界养神丹、双装备位与区域场景图。

ALTER TABLE areas
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS explore_stamina_cost SMALLINT NOT NULL DEFAULT 6;

UPDATE areas SET
  image_url = '/assets/areas/' || code || '.webp',
  explore_stamina_cost = CASE code
    WHEN 'luoxia' THEN 6 WHEN 'qingyun_foothill' THEN 7 WHEN 'blackstone_forest' THEN 8
    WHEN 'mist_forest' THEN 9 WHEN 'clear_spring_cliff' THEN 10 WHEN 'red_maple_valley' THEN 11
    WHEN 'mirror_lake' THEN 12 WHEN 'spirit_vein_valley' THEN 13 WHEN 'sect_outer_court' THEN 14
    WHEN 'alchemy_peak' THEN 15 WHEN 'ancient_soul_ruins' THEN 16 WHEN 'law_abyss' THEN 17
    WHEN 'heaven_gate' THEN 18 ELSE 6 END;

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS combat_role VARCHAR(20);
UPDATE equipment SET combat_role = CASE
  WHEN weapon_type IN ('fan', 'staff') THEN 'defense'
  ELSE 'attack'
END WHERE combat_role IS NULL;
ALTER TABLE equipment ALTER COLUMN combat_role SET NOT NULL;
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_combat_role_check;
ALTER TABLE equipment ADD CONSTRAINT equipment_combat_role_check CHECK (combat_role IN ('attack', 'defense'));

ALTER TABLE character_equipment ADD COLUMN IF NOT EXISTS equipped_slot VARCHAR(20);
UPDATE character_equipment SET equipped_slot = 'attack'
WHERE equipped = TRUE AND equipped_slot IS NULL
  AND equipment_id IN (SELECT id FROM equipment WHERE combat_role = 'attack');
UPDATE character_equipment SET equipped_slot = 'defense'
WHERE equipped = TRUE AND equipped_slot IS NULL
  AND equipment_id IN (SELECT id FROM equipment WHERE combat_role = 'defense');
UPDATE character_equipment SET equipped = (equipped_slot IS NOT NULL);
ALTER TABLE character_equipment DROP CONSTRAINT IF EXISTS character_equipment_slot_check;
ALTER TABLE character_equipment ADD CONSTRAINT character_equipment_slot_check
  CHECK (equipped_slot IS NULL OR equipped_slot IN ('attack', 'defense'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_character_equipment_slot
  ON character_equipment(character_id, equipped_slot) WHERE equipped_slot IS NOT NULL;

INSERT INTO items
  (code, name, type, rarity, description, effect, recipe, craft_time_s, image_url,
   major_realm, source_description, required_order)
VALUES
  ('stamina_pill_mortal', '凡尘养神丸', 'pill', 'common', '以尘世灵叶与清露温养精神，恢复25点精力，仅对凡人境有效。',
   '{"stamina_restore":25,"stamina_major_realm":"凡人"}', '{"mat_mortal_1":3,"mat_mortal_2":2}', 90, '/assets/pills/realm_mortal.webp',
   '凡人', '丹方初始收录；两味材料均在落霞村掉落。', 0),
  ('stamina_pill_lianpi', '铜皮养神丸', 'pill', 'common', '药力穿行皮肉，恢复27点精力，仅对练皮境有效。',
   '{"stamina_restore":27,"stamina_major_realm":"练皮境"}', '{"mat_lianpi_1":3,"mat_lianpi_2":2}', 100, '/assets/pills/realm_lianpi.webp',
   '练皮境', '丹谱可在青云山脚获得；材料均在青云山脚掉落。', 1),
  ('stamina_pill_lianggu', '铁骨养神丸', 'pill', 'uncommon', '药力沉入骨髓，恢复29点精力，仅对练骨境有效。',
   '{"stamina_restore":29,"stamina_major_realm":"练骨境"}', '{"mat_lianggu_1":3,"mat_lianggu_2":2}', 110, '/assets/pills/realm_lianggu.webp',
   '练骨境', '丹谱可在黑石林获得；材料均在黑石林掉落。', 5),
  ('stamina_pill_yijin', '玉筋养神丸', 'pill', 'uncommon', '舒展筋络并澄明心神，恢复31点精力，仅对易筋境有效。',
   '{"stamina_restore":31,"stamina_major_realm":"易筋境"}', '{"mat_yijin_1":3,"mat_yijin_2":2}', 120, '/assets/pills/realm_yijin.webp',
   '易筋境', '丹谱可在迷雾林获得；材料均在迷雾林掉落。', 9),
  ('stamina_pill_xisui', '净髓养神丸', 'pill', 'uncommon', '清凉药气洗涤疲惫，恢复33点精力，仅对洗髓境有效。',
   '{"stamina_restore":33,"stamina_major_realm":"洗髓境"}', '{"mat_xisui_1":3,"mat_xisui_2":2}', 130, '/assets/pills/realm_xisui.webp',
   '洗髓境', '丹谱可在清泉崖获得；材料均在清泉崖掉落。', 13),
  ('stamina_pill_huanxue', '赤血养神丸', 'pill', 'rare', '温养新血与神魂，恢复35点精力，仅对换血境有效。',
   '{"stamina_restore":35,"stamina_major_realm":"换血境"}', '{"mat_huanxue_1":3,"mat_huanxue_2":2}', 140, '/assets/pills/realm_huanxue.webp',
   '换血境', '丹谱可在赤枫谷获得；材料均在赤枫谷掉落。', 17),
  ('stamina_pill_tianren', '天感养神丸', 'pill', 'rare', '安定感应并恢复37点精力，仅对天人境有效。',
   '{"stamina_restore":37,"stamina_major_realm":"天人境"}', '{"mat_tianren_1":3,"mat_tianren_2":2}', 150, '/assets/pills/realm_tianren.webp',
   '天人境', '丹谱可在天镜湖获得；材料均在天镜湖掉落。', 21),
  ('stamina_pill_lianqi', '灵息养神丹', 'pill', 'rare', '以灵息补益识海，恢复39点精力，仅对炼气期有效。',
   '{"stamina_restore":39,"stamina_major_realm":"炼气期"}', '{"mat_lianqi_1":3,"mat_lianqi_2":2}', 160, '/assets/pills/realm_lianqi.webp',
   '炼气期', '丹谱可在灵脉谷获得；材料均在灵脉谷掉落。', 25),
  ('stamina_pill_zhujia', '道基养神丹', 'pill', 'epic', '稳固道基并补足神意，恢复41点精力，仅对筑基期有效。',
   '{"stamina_restore":41,"stamina_major_realm":"筑基期"}', '{"mat_zhujia_1":3,"mat_zhujia_2":2}', 170, '/assets/pills/realm_zhujia.webp',
   '筑基期', '丹谱可在仙门外院获得；材料均在仙门外院掉落。', 29),
  ('stamina_pill_jindan', '丹火养神丹', 'pill', 'epic', '丹火温养神识，恢复43点精力，仅对金丹期有效。',
   '{"stamina_restore":43,"stamina_major_realm":"金丹期"}', '{"mat_jindan_1":3,"mat_jindan_2":2}', 180, '/assets/pills/realm_jindan.webp',
   '金丹期', '丹谱可在丹霞峰获得；材料均在丹霞峰掉落。', 33),
  ('stamina_pill_yuanying', '婴息养神丹', 'pill', 'epic', '婴息回转识海，恢复45点精力，仅对元婴期有效。',
   '{"stamina_restore":45,"stamina_major_realm":"元婴期"}', '{"mat_yuanying_1":3,"mat_yuanying_2":2}', 190, '/assets/pills/realm_yuanying.webp',
   '元婴期', '丹谱可在古魂遗墟获得；材料均在古魂遗墟掉落。', 37),
  ('stamina_pill_huashen', '法相养神丹', 'pill', 'legendary', '法相护持元神，恢复47点精力，仅对化神期有效。',
   '{"stamina_restore":47,"stamina_major_realm":"化神期"}', '{"mat_huashen_1":3,"mat_huashen_2":2}', 200, '/assets/pills/realm_huashen.webp',
   '化神期', '丹谱可在法则渊获得；材料均在法则渊掉落。', 41),
  ('stamina_pill_dacheng', '渡劫养神丹', 'pill', 'legendary', '收拢雷劫后的散乱神意，恢复49点精力，仅对大乘期有效。',
   '{"stamina_restore":49,"stamina_major_realm":"大乘期"}', '{"mat_dacheng_1":3,"mat_dacheng_2":2}', 210, '/assets/pills/realm_dacheng.webp',
   '大乘期', '丹谱可在天门绝域获得；材料均在天门绝域掉落。', 45)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, type=EXCLUDED.type, rarity=EXCLUDED.rarity,
  description=EXCLUDED.description, effect=EXCLUDED.effect, recipe=EXCLUDED.recipe,
  craft_time_s=EXCLUDED.craft_time_s, image_url=EXCLUDED.image_url,
  major_realm=EXCLUDED.major_realm, source_description=EXCLUDED.source_description,
  required_order=EXCLUDED.required_order;

-- 同境界药品共享统一美术母题，确保所有破境药与护脉丹都有图。
UPDATE items SET image_url = '/assets/pills/realm_' || CASE major_realm
  WHEN '凡人' THEN 'mortal' WHEN '练皮境' THEN 'lianpi' WHEN '练骨境' THEN 'lianggu'
  WHEN '易筋境' THEN 'yijin' WHEN '洗髓境' THEN 'xisui' WHEN '换血境' THEN 'huanxue'
  WHEN '天人境' THEN 'tianren' WHEN '炼气期' THEN 'lianqi' WHEN '筑基期' THEN 'zhujia'
  WHEN '金丹期' THEN 'jindan' WHEN '元婴期' THEN 'yuanying' WHEN '化神期' THEN 'huashen'
  WHEN '大乘期' THEN 'dacheng' END || '.webp'
WHERE type IN ('breakthrough', 'breakthrough_protection') AND major_realm IS NOT NULL;

UPDATE items SET image_url = '/assets/pills/realm_' || CASE COALESCE(major_realm, '凡人')
  WHEN '凡人' THEN 'mortal' WHEN '洗髓境' THEN 'xisui' WHEN '筑基期' THEN 'zhujia'
  ELSE 'mortal' END || '.webp'
WHERE type = 'buff' AND image_url IS NULL;

INSERT INTO character_recipes (character_id, item_id)
SELECT c.id, i.id FROM characters c JOIN items i ON i.code = 'stamina_pill_mortal'
ON CONFLICT DO NOTHING;
