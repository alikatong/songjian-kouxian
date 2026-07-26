INSERT INTO events
  (code, title, body, area_code, min_realm_order, max_realm_order, weight, choices, is_story)
VALUES
  ('herbalist_on_road', '山路上的采药人',
   '一位白发药农背着竹篓在石阶旁歇脚，篓中草木清香随风散开。',
   'luoxia', 0, 12, 120,
   '[{"text":"帮他背一程","result":"老人赠你一包处理好的药材，还指了条近路。","effects":{"items":{"herb_scraps":3,"spring_water":1},"fate_points":1}},{"text":"向他请教辨药","result":"你记下几种草药的叶脉，也在路边采到一些。","effects":{"items":{"herb_scraps":2},"qi":80}}]', false),
  ('clear_stream', '石隙清泉',
   '转过山坳，一线泉水从青石间涌出，水面浮着极淡的灵光。',
   'luoxia', 0, 24, 100,
   '[{"text":"装满水囊","result":"泉水入口清冽，正适合炼制丹食。","effects":{"items":{"spring_water":3},"qi":40}},{"text":"静坐吐纳","result":"水声洗去杂念，你的气息平稳了许多。","effects":{"qi":180}}]', false),
  ('abandoned_quarry', '废弃石场',
   '荒草掩住了旧石场的入口，碎石间偶尔闪过一点金属光泽。',
   'luoxia', 1, 20, 80,
   '[{"text":"翻找矿脉","result":"你敲下几块尚有用处的矿石，又发现一截兽骨。","effects":{"items":{"ore_powder":3,"beast_bone":2}}},{"text":"谨慎绕行","result":"你避开松动的岩壁，在外侧采到几株野草。","effects":{"items":{"herb_scraps":1,"wild_fruit":2},"qi":60}}]', false),
  ('wild_beehive', '老槐树下的蜂巢',
   '老槐树枝叶深处垂着一只蜂巢，甜香引来了不少飞虫。',
   'luoxia', 0, 16, 70,
   '[{"text":"耐心取蜜","result":"你用烟草安抚蜂群，取下一罐野蜂蜜。","effects":{"items":{"honey":2,"incense_wood":2}}},{"text":"采集周围野果","result":"不惊动蜂群也有收获，衣兜很快装满。","effects":{"items":{"wild_fruit":3,"grain":1}}}]', false)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  area_code = EXCLUDED.area_code,
  min_realm_order = EXCLUDED.min_realm_order,
  max_realm_order = EXCLUDED.max_realm_order,
  weight = EXCLUDED.weight,
  choices = EXCLUDED.choices,
  is_story = EXCLUDED.is_story;
