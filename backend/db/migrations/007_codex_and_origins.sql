-- 出身、功法谱、丹谱与游历区域。只追加结构，兼容既有角色。
CREATE TABLE IF NOT EXISTS origins (
  id             SERIAL PRIMARY KEY,
  code           VARCHAR(50) UNIQUE NOT NULL,
  name           VARCHAR(100) NOT NULL,
  description    TEXT NOT NULL,
  stat_bonuses   JSONB NOT NULL DEFAULT '{}',
  starter_items  JSONB NOT NULL DEFAULT '{}',
  weight         INT NOT NULL DEFAULT 100 CHECK (weight > 0)
);

INSERT INTO origins (code, name, description, stat_bonuses, starter_items, weight) VALUES
  ('tenant_family', '佃农之家', '你生在落霞村的佃农家中，自幼下田担水，筋骨比同龄人稍结实。', '{"hp":8}', '{"grain":3,"herb_scraps":1}', 120),
  ('woodcutter_family', '樵户之家', '父母以砍柴为生，你常随他们入山，脚力与胆气略胜常人。', '{"atk":1,"spd":1}', '{"incense_wood":3,"wild_fruit":2}', 110),
  ('herbalist_family', '药农之家', '家中世代辨认山草，你不懂仙丹，却熟悉最寻常的药性。', '{"hp":4}', '{"herb_scraps":4,"spring_water":2}', 100),
  ('hunter_family', '猎户之家', '你在弓弦与兽迹间长大，身手灵便，但仍只是普通凡人子弟。', '{"atk":2}', '{"beast_bone":2,"wild_fruit":2}', 90),
  ('artisan_family', '匠户之家', '家中经营一间小作坊，你从小耳濡目染，做事沉稳细致。', '{"def":1}', '{"ore_powder":3,"incense_wood":1}', 100),
  ('fisher_family', '渔户之家', '你长在溪河边，日日撑篙收网，气息绵长而耐力尚可。', '{"hp":6,"spd":1}', '{"spring_water":3,"grain":2}', 100),
  ('village_teacher', '村塾之家', '父亲在村塾教书，你识得些字，也更容易读懂残缺的古卷。', '{"fate_points":1}', '{"grain":2,"honey":1}', 70),
  ('poor_household', '清贫人家', '家中没有田产与手艺，日子虽紧，却让你比旁人更懂得珍惜机缘。', '{"fate_points":2}', '{"wild_fruit":2,"herb_scraps":2}', 110)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  stat_bonuses = EXCLUDED.stat_bonuses,
  starter_items = EXCLUDED.starter_items,
  weight = EXCLUDED.weight;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS origin_id INT REFERENCES origins(id),
  ADD COLUMN IF NOT EXISTS bonus_hp INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_atk INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_def INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_spd INT NOT NULL DEFAULT 0;

UPDATE characters
SET origin_id = (SELECT id FROM origins WHERE code = 'poor_household')
WHERE origin_id IS NULL;

ALTER TABLE techniques
  ADD COLUMN IF NOT EXISTS major_realm VARCHAR(50),
  ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'cultivation',
  ADD COLUMN IF NOT EXISTS stat_bonuses JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_description TEXT,
  ADD COLUMN IF NOT EXISTS required_order INT NOT NULL DEFAULT 0;

UPDATE techniques SET
  major_realm = COALESCE(major_realm, CASE
    WHEN code IN ('tuna_jue', 'lianti_xinfa') THEN '凡人'
    WHEN code = 'qingxin_wuwei' THEN '炼气期'
    WHEN code = 'wuxing_guiyuan' THEN '筑基期'
    WHEN code = 'tiandao_wuqing' THEN '金丹期'
    ELSE '凡人' END),
  source_description = COALESCE(source_description, '游历时从旧书、石刻或前人遗留的残卷中参悟。');

CREATE TABLE IF NOT EXISTS character_techniques (
  id             SERIAL PRIMARY KEY,
  character_id   INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  technique_id   INT NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
  mastery        SMALLINT NOT NULL DEFAULT 1 CHECK (mastery BETWEEN 1 AND 10),
  acquired_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (character_id, technique_id)
);

INSERT INTO character_techniques (character_id, technique_id)
SELECT id, active_technique FROM characters WHERE active_technique IS NOT NULL
ON CONFLICT (character_id, technique_id) DO NOTHING;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS major_realm VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_description TEXT,
  ADD COLUMN IF NOT EXISTS required_order INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS character_recipes (
  id             SERIAL PRIMARY KEY,
  character_id   INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id        INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  acquired_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (character_id, item_id)
);

CREATE TABLE IF NOT EXISTS character_item_uses (
  id             SERIAL PRIMARY KEY,
  character_id   INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id        INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  used_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (character_id, item_id)
);

-- 既有角色保留 MVP 阶段已经能够炼制的基础丹方。
INSERT INTO character_recipes (character_id, item_id)
SELECT c.id, i.id FROM characters c JOIN items i ON TRUE
WHERE i.code IN ('mopi_san', 'chenxin_cha', 'ganliang_bao')
ON CONFLICT (character_id, item_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS areas (
  id                SERIAL PRIMARY KEY,
  code              VARCHAR(50) UNIQUE NOT NULL,
  name              VARCHAR(100) NOT NULL,
  description       TEXT NOT NULL,
  major_realm       VARCHAR(50) NOT NULL,
  min_realm_order   INT NOT NULL DEFAULT 0,
  max_realm_order   INT NOT NULL DEFAULT 9999,
  material_summary  TEXT NOT NULL,
  danger_summary    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_techniques_realm ON techniques(major_realm, required_order, rarity);
CREATE INDEX IF NOT EXISTS idx_items_realm ON items(major_realm, required_order, type);
CREATE INDEX IF NOT EXISTS idx_character_techniques ON character_techniques(character_id, technique_id);
CREATE INDEX IF NOT EXISTS idx_character_recipes ON character_recipes(character_id, item_id);
CREATE INDEX IF NOT EXISTS idx_events_area_realm ON events(area_code, min_realm_order, max_realm_order);
