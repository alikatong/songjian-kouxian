-- Bring the original hand-authored recipes into the public regional material economy.
-- Every ingredient code below now resolves to an item with an explicit area drop rule.

UPDATE items SET
  recipe = '{"herb_scraps": 2, "spring_water": 3}'::jsonb,
  major_realm = '凡人',
  source_description = '丹方初始收录；药材碎末与清泉水均可在落霞村游历获得。'
WHERE code = 'chenxin_cha';

UPDATE items SET
  recipe = '{"mat_zhujia_3": 3, "mat_zhujia_5": 2, "mat_zhujia_6": 1}'::jsonb,
  major_realm = '筑基期',
  source_description = '丹方可在仙门外院奇遇中发现；所需材料均产自仙门外院。'
WHERE code = 'dianjt_gao';

UPDATE items SET
  recipe = '{"mat_dacheng_1": 1, "mat_dacheng_5": 1, "mat_dacheng_6": 1}'::jsonb,
  major_realm = '大乘期',
  source_description = '丹方可在天门绝域奇遇中发现；所需材料均产自天门绝域。'
WHERE code = 'dujie_dan';

UPDATE items SET
  major_realm = '凡人',
  source_description = '丹方初始收录；粮食与野果均可在落霞村游历获得。'
WHERE code = 'ganliang_bao';

UPDATE items SET
  recipe = '{"mat_tianren_1": 1, "mat_tianren_2": 3, "mat_tianren_5": 2}'::jsonb,
  major_realm = '天人境',
  source_description = '丹方可在天镜湖奇遇中发现；所需材料均产自天镜湖。'
WHERE code = 'ganying_bing';

UPDATE items SET
  recipe = '{"mat_huashen_1": 1, "mat_huashen_2": 2, "mat_huashen_6": 1}'::jsonb,
  major_realm = '化神期',
  source_description = '丹方可在法则渊奇遇中发现；所需材料均产自法则渊。'
WHERE code = 'huashen_cha';

UPDATE items SET
  recipe = '{"mat_xisui_1": 2, "mat_xisui_2": 3, "mat_xisui_4": 2}'::jsonb,
  major_realm = '洗髓境',
  source_description = '丹方可在清泉崖奇遇中发现；所需材料均产自清泉崖。'
WHERE code = 'jingsui_lu';

UPDATE items SET
  major_realm = '筑基期',
  source_description = '丹方可在仙门外院奇遇中发现；灵草产自灵脉谷，香木屑产自仙门外院。'
WHERE code = 'juling_xiang';

UPDATE items SET
  recipe = '{"mat_xisui_2": 3, "mat_xisui_6": 1}'::jsonb,
  major_realm = '洗髓境',
  source_description = '丹方可在清泉崖奇遇中发现；所需材料均产自清泉崖。'
WHERE code = 'lingquan_lu';

UPDATE items SET
  major_realm = '练皮境',
  source_description = '丹方初始收录；药材碎末与清泉水均可在落霞村游历获得。'
WHERE code = 'mopi_san';

UPDATE items SET
  recipe = '{"mat_jindan_3": 2, "mat_jindan_5": 2, "mat_jindan_6": 1}'::jsonb,
  major_realm = '金丹期',
  source_description = '丹方可在丹霞峰奇遇中发现；所需材料均产自丹霞峰。'
WHERE code = 'ningdan_bing';

UPDATE items SET
  recipe = '{"green_vine": 3, "jade_dew": 2}'::jsonb,
  major_realm = '易筋境',
  source_description = '丹方可在迷雾林奇遇中发现；青藤与玉露均产自迷雾林。'
WHERE code = 'pixie_xiang';

UPDATE items SET
  major_realm = '练骨境',
  source_description = '丹方可在黑石林奇遇中发现；矿石粉、兽骨与野蜂蜜均产自黑石林。'
WHERE code = 'tiegu_bing';

UPDATE items SET
  recipe = '{"mat_huanxue_1": 3, "mat_huanxue_5": 2, "mat_huanxue_6": 2}'::jsonb,
  major_realm = '换血境',
  source_description = '丹方可在赤枫谷奇遇中发现；所需材料均产自赤枫谷。'
WHERE code = 'xinxue_gao';

UPDATE items SET
  recipe = '{"mat_lianqi_2": 2, "mat_lianqi_3": 1, "mat_lianqi_5": 1}'::jsonb,
  major_realm = '炼气期',
  source_description = '丹方可在灵脉谷奇遇中发现；所需材料均产自灵脉谷。'
WHERE code = 'yinlu_fu';

UPDATE items SET
  recipe = '{"mat_lianqi_1": 3, "mat_lianqi_5": 2}'::jsonb,
  major_realm = '炼气期',
  source_description = '丹方可在灵脉谷奇遇中发现；所需材料均产自灵脉谷。'
WHERE code = 'yinqi_tang';

UPDATE items SET
  major_realm = '易筋境',
  source_description = '丹方可在迷雾林奇遇中发现；青藤与玉露均产自迷雾林。'
WHERE code = 'yujin_tang';

UPDATE items SET
  recipe = '{"mat_yuanying_1": 1, "mat_yuanying_2": 2, "mat_yuanying_6": 2}'::jsonb,
  major_realm = '元婴期',
  source_description = '丹方可在古魂遗墟奇遇中发现；所需材料均产自古魂遗墟。'
WHERE code = 'yuying_tang';
