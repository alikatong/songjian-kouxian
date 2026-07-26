-- ============================================================
-- 004_seed_items.sql  — 填充道具数据（20条，幂等）
-- ============================================================

INSERT INTO items
  (code, name, type, rarity, description, effect, recipe, craft_time_s)
VALUES
  -- ══════════════════════════════════════════════
  -- 突破丹食（12种，对应12个有圆满的大境界）
  -- ══════════════════════════════════════════════
  ('mopi_san',
   '磨皮散', 'breakthrough', 'common',
   '以百草精华研磨而成，服用后皮肤如被细沙磨砺，突破练皮境圆满的成功率大增。',
   '{"breakthrough_rate": 0.30, "realm_code": "lianpi_full"}',
   '{"herb_scraps": 3, "spring_water": 2}',
   120),

  ('tiegu_bing',
   '铁骨饼', 'breakthrough', 'common',
   '以矿石精粉与兽骨炼制而成，香脆可口，吃完骨骼酸胀两刻钟，突破练骨境圆满无忧。',
   '{"breakthrough_rate": 0.30, "realm_code": "lianggu_full"}',
   '{"ore_powder": 2, "beast_bone": 2, "honey": 1}',
   150),

  ('yujin_tang',
   '玉筋汤', 'breakthrough', 'common',
   '青藤筋与玉露熬制的汤药，饮下后大筋如丝绸般柔韧，突破易筋境圆满的关键辅助。',
   '{"breakthrough_rate": 0.30, "realm_code": "yijin_full"}',
   '{"green_vine": 3, "jade_dew": 2}',
   180),

  ('jingsui_lu',
   '净髓露', 'breakthrough', 'uncommon',
   '取千年冰泉之水，加入净化类草药提炼而成。服用后骨髓一阵清凉，杂质尽去，突破洗髓境圆满必备。',
   '{"breakthrough_rate": 0.30, "realm_code": "xisui_full"}',
   '{"千年冰草": 2, "净化丹草": 3, "冰泉水": 2}',
   240),

  ('xinxue_gao',
   '新血糕', 'breakthrough', 'uncommon',
   '以赤色灵果和新鲜兽血制成的糕点，色泽红润，食后气血翻涌，助力换血境圆满突破。',
   '{"breakthrough_rate": 0.30, "realm_code": "huanxue_full"}',
   '{"赤色灵果": 2, "兽血": 2, "糯米": 3}',
   240),

  ('ganying_bing',
   '感应饼', 'breakthrough', 'uncommon',
   '取天人感应时刻的晨露揉入面团烘制，食后神识敏锐，助力天人境圆满与灵根觉醒。',
   '{"breakthrough_rate": 0.30, "realm_code": "tianren_full"}',
   '{"天露": 3, "灵麦": 2, "感应草": 1}',
   300),

  ('yinqi_tang',
   '引气糖', 'breakthrough', 'uncommon',
   '炼气期专用甜食，以蜂蜜和聚气草熬制，入口甘甜，引导天地灵气汇入丹田，助力炼气圆满。',
   '{"breakthrough_rate": 0.30, "realm_code": "lianqi_full"}',
   '{"聚气草": 3, "野蜂蜜": 2}',
   300),

  ('dianjt_gao',
   '奠基糕', 'breakthrough', 'rare',
   '声名远播的突破辅助道具，以地脉灵土与百年灵芝制成，奠定道基的最后一块基石。',
   '{"breakthrough_rate": 0.30, "realm_code": "zhujia_full"}',
   '{"地脉灵土": 2, "百年灵芝": 1, "灵麦粉": 3}',
   360),

  ('ningdan_bing',
   '凝丹饼', 'breakthrough', 'rare',
   '金丹期的关键道具，以金色矿砂与丹火之精炼制，服用后丹田金光大盛，助力金丹圆满。',
   '{"breakthrough_rate": 0.30, "realm_code": "jindan_full"}',
   '{"金色矿砂": 2, "丹火精": 1, "灵石粉": 2}',
   420),

  ('yuying_tang',
   '育婴汤', 'breakthrough', 'rare',
   '元婴期专用，以本命灵血与天地精华熬成，汤色金黄，助力本命元婴突破最后枷锁。',
   '{"breakthrough_rate": 0.30, "realm_code": "yuanying_full"}',
   '{"本命灵血": 1, "天地精华": 2, "灵芝": 2}',
   480),

  ('huashen_cha',
   '化神茶', 'breakthrough', 'epic',
   '以法则碎片煮入天外灵泉中制成，茶香缭绕间神识与天地交融，助力化神圆满。',
   '{"breakthrough_rate": 0.30, "realm_code": "huashen_full"}',
   '{"法则碎片": 1, "天外灵泉": 2, "化神草": 1}',
   600),

  ('dujie_dan',
   '渡劫丹', 'breakthrough', 'legendary',
   '传说中的仙丹，以九种天材地宝炼制，服用后可增强对天劫雷霆的抵御，助力大乘圆满飞升。',
   '{"breakthrough_rate": 0.30, "realm_code": "dacheng_full"}',
   '{"九天灵草": 1, "雷霆晶石": 1, "上古丹方": 1}',
   900),

  -- ══════════════════════════════════════════════
  -- 修炼辅助道具（4种）
  -- ══════════════════════════════════════════════
  ('juling_xiang',
   '聚灵香', 'buff', 'uncommon',
   '点燃后香气弥漫，灵气浓度倍增，修炼速度提升2倍，持续30分钟。',
   '{"qi_multiplier": 2.0, "duration_min": 30}',
   '{"spirit_grass": 3, "incense_wood": 2}',
   120),

  ('chenxin_cha',
   '沉心茶', 'buff', 'common',
   '使心神安定，排除杂念，灵气修炼速度小幅提升，持续1小时。休闲挂机必备。',
   '{"qi_multiplier": 1.3, "duration_min": 60}',
   '{"沉心草": 2, "清泉水": 3}',
   90),

  ('lingquan_lu',
   '灵泉露', 'buff', 'rare',
   '取自天然灵泉的精华，一滴顶十年功，修炼速度大幅提升3倍，持续15分钟。',
   '{"qi_multiplier": 3.0, "duration_min": 15}',
   '{"天然灵泉": 3, "净化符": 1}',
   180),

  ('tiancai_pian',
   '天材地宝碎片', 'buff', 'epic',
   '不知名的上古遗物碎片，散发神秘气息，随机提供一种强力短时增益效果。',
   '{"random_buff": true, "duration_min": 20}',
   NULL,
   0),

  -- ══════════════════════════════════════════════
  -- 探索消耗道具（4种）
  -- ══════════════════════════════════════════════
  ('ganliang_bao',
   '干粮包', 'explore', 'common',
   '结实耐饿的口粮，探索时携带可延长探索时间，并小幅提高遭遇事件的概率。',
   '{"explore_bonus": 0.1}',
   '{"grain": 3, "wild_fruit": 2}',
   60),

  ('pixie_xiang',
   '辟邪香', 'explore', 'uncommon',
   '点燃后可驱散邪祟，探索时降低遭遇凶险事件的概率，同时提高奇缘事件出现率。',
   '{"evil_reduce": 0.3, "fate_boost": 0.2}',
   '{"辟邪草": 3, "香木": 2}',
   120),

  ('yinlu_fu',
   '引路符', 'explore', 'uncommon',
   '古法绘制的引路符纸，探索时指引方向，大幅提高发现稀有地点的概率。',
   '{"rare_location_boost": 0.5}',
   '{"符纸": 2, "朱砂": 1, "灵墨": 1}',
   150),

  ('ganying_shi',
   '感应石', 'explore', 'rare',
   '天然形成的感应矿石，探索时持握可感应附近的灵气波动，触发特殊剧情事件的概率大增。',
   '{"story_event_boost": 0.6}',
   NULL,
   0),

  -- MVP 可循环产出的基础材料
  ('herb_scraps', '药材碎末', 'material', 'common', '山野间常见的药材边角料。', NULL, NULL, 0),
  ('spring_water', '清泉水', 'material', 'common', '清冽的山泉水，适合入药。', NULL, NULL, 0),
  ('ore_powder', '矿石粉', 'material', 'common', '含有微弱灵性的矿粉。', NULL, NULL, 0),
  ('beast_bone', '兽骨', 'material', 'common', '淬炼筋骨类丹食的材料。', NULL, NULL, 0),
  ('honey', '野蜂蜜', 'material', 'common', '山林野蜂酿出的甜蜜。', NULL, NULL, 0),
  ('green_vine', '青藤', 'material', 'common', '韧性极佳的药用藤蔓。', NULL, NULL, 0),
  ('jade_dew', '玉露', 'material', 'uncommon', '清晨凝结的灵露。', NULL, NULL, 0),
  ('grain', '粮食', 'material', 'common', '制作干粮的基础谷物。', NULL, NULL, 0),
  ('wild_fruit', '野果', 'material', 'common', '探索途中采到的酸甜野果。', NULL, NULL, 0),
  ('spirit_grass', '灵草', 'material', 'uncommon', '蕴含稀薄灵气的草药。', NULL, NULL, 0),
  ('incense_wood', '香木屑', 'material', 'common', '可用于炼制香类道具。', NULL, NULL, 0)

ON CONFLICT (code) DO NOTHING;
