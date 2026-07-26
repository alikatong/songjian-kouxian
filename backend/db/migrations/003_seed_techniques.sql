-- ============================================================
-- 003_seed_techniques.sql  — 填充功法数据（5条，幂等）
-- ============================================================

INSERT INTO techniques
  (code, name, rarity, description,
   qi_multiplier, offline_multiplier, breakthrough_bonus, event_bonus,
   unlock_condition)
VALUES
  ('tuna_jue',
   '吐纳诀', 'common',
   '最基础的修炼功法，引气入体，循序渐进。适合初入修炼者，无任何副作用。灵气获取速度小幅提升。',
   1.10, 1.00, 0.00, 0.00,
   NULL),

  ('lianti_xinfa',
   '炼体心法', 'common',
   '专为凡躯淬体阶段设计的功法，强化肉体与道基的契合度。使用突破丹食时效果显著增强。',
   1.00, 1.00, 0.20, 0.00,
   'phase:1'),

  ('qingxin_wuwei',
   '清心无为经', 'rare',
   '道家无为之法，心无旁骛，离线修炼效果大幅提升。适合事务繁忙、无法长时间在线的修炼者。',
   1.00, 1.50, 0.00, 0.00,
   'realm:lianqi_early'),

  ('wuxing_guiyuan',
   '五行归元诀', 'rare',
   '融合金木水火土五行之力，修炼速度与探索奇缘双提升。探索时更容易遭遇奇异事件。',
   1.20, 1.20, 0.00, 0.30,
   'realm:zhujia_early'),

  ('tiandao_wuqing',
   '天道无情篇', 'legendary',
   '传说中上古仙人留下的残卷，修炼者以天道为师，冷酷无情却威力无匹。灵气获取与突破成功率双提升，但此法需要极强意志力。',
   1.25, 1.00, 0.15, 0.00,
   'realm:jindan_early')

ON CONFLICT (code) DO NOTHING;
