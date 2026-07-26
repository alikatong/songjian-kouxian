-- Long-term progression and server-authoritative, visible area drop tables.
UPDATE realms
SET qi_required = qi_required * 50
WHERE qi_required > 0;

CREATE TABLE IF NOT EXISTS area_drop_rules (
  area_code   VARCHAR(50) NOT NULL REFERENCES areas(code) ON DELETE CASCADE,
  category    VARCHAR(20) NOT NULL,
  base_rate   NUMERIC(6,5) NOT NULL CHECK (base_rate > 0 AND base_rate <= 1),
  pity_after  SMALLINT NOT NULL CHECK (pity_after >= 1),
  description TEXT NOT NULL,
  PRIMARY KEY (area_code, category),
  CHECK (category IN ('material', 'technique', 'recipe', 'equipment'))
);

CREATE TABLE IF NOT EXISTS area_material_drops (
  area_code    VARCHAR(50) NOT NULL REFERENCES areas(code) ON DELETE CASCADE,
  item_id      INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  weight       INT NOT NULL DEFAULT 100 CHECK (weight > 0),
  min_quantity SMALLINT NOT NULL DEFAULT 1 CHECK (min_quantity >= 1),
  max_quantity SMALLINT NOT NULL DEFAULT 2 CHECK (max_quantity >= min_quantity),
  PRIMARY KEY (area_code, item_id)
);

CREATE TABLE IF NOT EXISTS character_drop_pity (
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  area_code    VARCHAR(50) NOT NULL REFERENCES areas(code) ON DELETE CASCADE,
  category     VARCHAR(20) NOT NULL,
  misses       SMALLINT NOT NULL DEFAULT 0 CHECK (misses >= 0),
  PRIMARY KEY (character_id, area_code, category),
  FOREIGN KEY (area_code, category) REFERENCES area_drop_rules(area_code, category) ON DELETE CASCADE
);

INSERT INTO area_drop_rules (area_code, category, base_rate, pity_after, description)
SELECT code, 'material', 0.65, 2,
       '区域材料池：命中后按材料权重抽取数量。'
FROM areas
ON CONFLICT (area_code, category) DO UPDATE SET base_rate = EXCLUDED.base_rate, pity_after = EXCLUDED.pity_after, description = EXCLUDED.description;

INSERT INTO area_drop_rules (area_code, category, base_rate, pity_after, description)
SELECT code, 'technique', 0.10, 9,
       '未收录功法谱：品质越高，池内权重越低。'
FROM areas
ON CONFLICT (area_code, category) DO UPDATE SET base_rate = EXCLUDED.base_rate, pity_after = EXCLUDED.pity_after, description = EXCLUDED.description;

INSERT INTO area_drop_rules (area_code, category, base_rate, pity_after, description)
SELECT code, 'recipe', 0.12, 8,
       '未收录丹谱或护脉丹谱：品质越高，池内权重越低。'
FROM areas
ON CONFLICT (area_code, category) DO UPDATE SET base_rate = EXCLUDED.base_rate, pity_after = EXCLUDED.pity_after, description = EXCLUDED.description;

INSERT INTO area_drop_rules (area_code, category, base_rate, pity_after, description)
SELECT code, 'equipment', 0.15, 7,
       '本区域武器：品质越高，池内权重越低。'
FROM areas
ON CONFLICT (area_code, category) DO UPDATE SET base_rate = EXCLUDED.base_rate, pity_after = EXCLUDED.pity_after, description = EXCLUDED.description;

INSERT INTO area_material_drops (area_code, item_id, weight, min_quantity, max_quantity)
SELECT a.code, i.id,
       CASE i.rarity WHEN 'legendary' THEN 5 WHEN 'epic' THEN 12 WHEN 'rare' THEN 28 WHEN 'uncommon' THEN 55 ELSE 100 END,
       1,
       CASE WHEN a.min_realm_order < 17 THEN 3 WHEN a.min_realm_order < 33 THEN 2 ELSE 1 END
FROM areas a
JOIN items i ON i.type = 'material' AND i.major_realm = a.major_realm
ON CONFLICT (area_code, item_id) DO UPDATE SET
  weight = EXCLUDED.weight,
  min_quantity = EXCLUDED.min_quantity,
  max_quantity = EXCLUDED.max_quantity;

INSERT INTO area_material_drops (area_code, item_id, weight, min_quantity, max_quantity)
SELECT mapping.area_code, i.id, mapping.weight, 1, mapping.max_quantity
FROM (VALUES
  ('luoxia', 'herb_scraps', 120, 3), ('luoxia', 'spring_water', 110, 3), ('luoxia', 'grain', 90, 3),
  ('luoxia', 'wild_fruit', 80, 3), ('blackstone_forest', 'ore_powder', 110, 3),
  ('blackstone_forest', 'beast_bone', 100, 2), ('blackstone_forest', 'honey', 60, 2),
  ('mist_forest', 'green_vine', 100, 2), ('mist_forest', 'jade_dew', 55, 2),
  ('spirit_vein_valley', 'spirit_grass', 65, 2), ('sect_outer_court', 'incense_wood', 80, 2)
) AS mapping(area_code, item_code, weight, max_quantity)
JOIN items i ON i.code = mapping.item_code
ON CONFLICT (area_code, item_id) DO UPDATE SET
  weight = EXCLUDED.weight,
  min_quantity = EXCLUDED.min_quantity,
  max_quantity = EXCLUDED.max_quantity;

CREATE INDEX IF NOT EXISTS idx_area_material_drops_area
  ON area_material_drops(area_code, weight DESC);
CREATE INDEX IF NOT EXISTS idx_character_drop_pity_character
  ON character_drop_pity(character_id, area_code);
