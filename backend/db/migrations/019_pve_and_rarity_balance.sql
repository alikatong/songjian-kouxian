CREATE TABLE IF NOT EXISTS rarity_drop_rates (
  rarity VARCHAR(20) PRIMARY KEY,
  weight INT NOT NULL CHECK (weight > 0),
  sort_order SMALLINT NOT NULL UNIQUE
);

INSERT INTO rarity_drop_rates (rarity, weight, sort_order) VALUES
  ('common', 1000000, 1),
  ('uncommon', 120000, 2),
  ('rare', 18000, 3),
  ('epic', 2500, 4),
  ('legendary', 250, 5)
ON CONFLICT (rarity) DO UPDATE SET weight = EXCLUDED.weight, sort_order = EXCLUDED.sort_order;

UPDATE area_material_drops SET weight = 2 WHERE item_id IN (SELECT id FROM items WHERE rarity = 'legendary');
UPDATE area_material_drops SET weight = 20 WHERE item_id IN (SELECT id FROM items WHERE rarity = 'epic');
UPDATE area_material_drops SET weight = 180 WHERE item_id IN (SELECT id FROM items WHERE rarity = 'rare');
UPDATE area_material_drops SET weight = 1200 WHERE item_id IN (SELECT id FROM items WHERE rarity = 'uncommon');
UPDATE area_material_drops SET weight = GREATEST(weight, 10000) WHERE item_id IN (SELECT id FROM items WHERE rarity = 'common');

-- Quality now creates a material difference. Categories keep distinct identities.
UPDATE techniques SET
  qi_multiplier = (CASE rarity
    WHEN 'legendary' THEN 2.25 WHEN 'epic' THEN 1.75 WHEN 'rare' THEN 1.40
    WHEN 'uncommon' THEN 1.18 ELSE 1.05 END
    + CASE category WHEN '吐纳' THEN 0.20 WHEN '悟道' THEN 0.08 ELSE 0 END),
  offline_multiplier = (CASE rarity
    WHEN 'legendary' THEN 1.80 WHEN 'epic' THEN 1.50 WHEN 'rare' THEN 1.30
    WHEN 'uncommon' THEN 1.15 ELSE 1.05 END
    + CASE category WHEN '吐纳' THEN 0.20 ELSE 0 END),
  breakthrough_bonus = CASE category WHEN '悟道' THEN CASE rarity
    WHEN 'legendary' THEN 0.15 WHEN 'epic' THEN 0.10 WHEN 'rare' THEN 0.06
    WHEN 'uncommon' THEN 0.03 ELSE 0.01 END ELSE 0 END,
  event_bonus = CASE category WHEN '身法' THEN CASE rarity
    WHEN 'legendary' THEN 0.25 WHEN 'epic' THEN 0.16 WHEN 'rare' THEN 0.10
    WHEN 'uncommon' THEN 0.05 ELSE 0.02 END ELSE 0 END;

CREATE TABLE IF NOT EXISTS enemies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(60) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  area_code VARCHAR(50) NOT NULL REFERENCES areas(code) ON DELETE CASCADE,
  rank VARCHAR(20) NOT NULL CHECK (rank IN ('normal', 'elite', 'boss')),
  hp INT NOT NULL CHECK (hp > 0),
  atk INT NOT NULL CHECK (atk > 0),
  def INT NOT NULL CHECK (def >= 0),
  spd INT NOT NULL CHECK (spd > 0),
  qi_reward INT NOT NULL DEFAULT 0,
  stone_reward INT NOT NULL DEFAULT 0,
  material_rate NUMERIC(6,5) NOT NULL CHECK (material_rate >= 0 AND material_rate <= 1),
  description TEXT NOT NULL
);

INSERT INTO enemies (code, name, area_code, rank, hp, atk, def, spd, qi_reward, stone_reward, material_rate, description)
SELECT 'enemy_' || a.code, a.name || '游荡凶兽', a.code, 'normal',
  80 + a.min_realm_order * 55, 8 + a.min_realm_order * 8, 3 + a.min_realm_order * 3, 8 + a.min_realm_order * 2,
  120 + a.min_realm_order * 80, 4 + a.min_realm_order * 2, 0.35,
  '适合检验当前功法与武器的常规敌人，胜利后有35%概率获得区域材料。'
FROM areas a
ON CONFLICT (code) DO UPDATE SET hp=EXCLUDED.hp, atk=EXCLUDED.atk, def=EXCLUDED.def, spd=EXCLUDED.spd, qi_reward=EXCLUDED.qi_reward, stone_reward=EXCLUDED.stone_reward, material_rate=EXCLUDED.material_rate, description=EXCLUDED.description;

INSERT INTO enemies (code, name, area_code, rank, hp, atk, def, spd, qi_reward, stone_reward, material_rate, description)
SELECT 'elite_' || a.code, a.name || '异变妖物', a.code, 'elite',
  145 + a.min_realm_order * 85, 12 + a.min_realm_order * 11, 5 + a.min_realm_order * 5, 10 + a.min_realm_order * 3,
  300 + a.min_realm_order * 180, 10 + a.min_realm_order * 5, 0.65,
  '属性明显高于常规敌人，胜利后有65%概率获得区域材料，并提供更多灵气与灵石。'
FROM areas a
ON CONFLICT (code) DO UPDATE SET hp=EXCLUDED.hp, atk=EXCLUDED.atk, def=EXCLUDED.def, spd=EXCLUDED.spd, qi_reward=EXCLUDED.qi_reward, stone_reward=EXCLUDED.stone_reward, material_rate=EXCLUDED.material_rate, description=EXCLUDED.description;

INSERT INTO enemies (code, name, area_code, rank, hp, atk, def, spd, qi_reward, stone_reward, material_rate, description)
SELECT 'boss_' || a.code, a.name || '守关首领', a.code, 'boss',
  230 + a.min_realm_order * 125, 16 + a.min_realm_order * 14, 8 + a.min_realm_order * 7, 12 + a.min_realm_order * 3,
  700 + a.min_realm_order * 350, 25 + a.min_realm_order * 10, 1.0,
  '本区域最危险的对手。首次击败后解除对应大境界突破门槛，材料必定掉落。'
FROM areas a
ON CONFLICT (code) DO UPDATE SET hp=EXCLUDED.hp, atk=EXCLUDED.atk, def=EXCLUDED.def, spd=EXCLUDED.spd, qi_reward=EXCLUDED.qi_reward, stone_reward=EXCLUDED.stone_reward, material_rate=EXCLUDED.material_rate, description=EXCLUDED.description;

UPDATE realms SET boss_required = FALSE;
UPDATE realms SET boss_required = TRUE WHERE order_index IN (
  SELECT current_r.order_index FROM realms current_r
  JOIN realms next_r ON next_r.order_index = current_r.order_index + 1
  WHERE next_r.major_realm <> current_r.major_realm
);

CREATE INDEX IF NOT EXISTS idx_enemies_area ON enemies(area_code, rank);
CREATE INDEX IF NOT EXISTS idx_battle_logs_enemy_result ON battle_logs(character_id, enemy_code, result);
