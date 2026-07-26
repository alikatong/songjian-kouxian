-- Retreat state, slower progression, and one protection recipe for every realm stage.
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS retreat_started_at TIMESTAMPTZ;

ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_breakthrough_failures_check;
ALTER TABLE characters
  ADD CONSTRAINT characters_breakthrough_failures_check
  CHECK (breakthrough_failures BETWEEN 0 AND 5);

-- Existing values made the first stages last only minutes. Six times the requirement
-- keeps early progress readable while letting later realms become long-term goals.
UPDATE realms
SET qi_required = qi_required * 6
WHERE qi_required > 0;

INSERT INTO items
  (code, name, type, rarity, description, effect, recipe, craft_time_s,
   major_realm, source_description, required_order)
SELECT
  'guard_' || r.code,
  r.major_realm || COALESCE(r.sub_stage, '') || '护脉丹',
  'breakthrough_protection',
  CASE
    WHEN r.order_index >= 40 THEN 'legendary'
    WHEN r.order_index >= 28 THEN 'epic'
    WHEN r.order_index >= 16 THEN 'rare'
    WHEN r.order_index >= 4 THEN 'uncommon'
    ELSE 'common'
  END,
  '破境前服下可稳定经脉。若本次破境失败，灵气不会损失，也不会因冲击大境界失败而跌境。',
  ('{"protection":true,"realm_code":"' || r.code || '"}')::jsonb,
  ('{"mat_' ||
    CASE r.major_realm
      WHEN '凡人' THEN 'mortal' WHEN '练皮境' THEN 'lianpi' WHEN '练骨境' THEN 'lianggu'
      WHEN '易筋境' THEN 'yijin' WHEN '洗髓境' THEN 'xisui' WHEN '换血境' THEN 'huanxue'
      WHEN '天人境' THEN 'tianren' WHEN '炼气期' THEN 'lianqi' WHEN '筑基期' THEN 'zhujia'
      WHEN '金丹期' THEN 'jindan' WHEN '元婴期' THEN 'yuanying' WHEN '化神期' THEN 'huashen'
      ELSE 'dacheng'
    END || '_1":' || (3 + (r.order_index / 16))::text || ',"mat_' ||
    CASE r.major_realm
      WHEN '凡人' THEN 'mortal' WHEN '练皮境' THEN 'lianpi' WHEN '练骨境' THEN 'lianggu'
      WHEN '易筋境' THEN 'yijin' WHEN '洗髓境' THEN 'xisui' WHEN '换血境' THEN 'huanxue'
      WHEN '天人境' THEN 'tianren' WHEN '炼气期' THEN 'lianqi' WHEN '筑基期' THEN 'zhujia'
      WHEN '金丹期' THEN 'jindan' WHEN '元婴期' THEN 'yuanying' WHEN '化神期' THEN 'huashen'
      ELSE 'dacheng'
    END || '_2":' || (2 + (r.order_index / 20))::text || '}')::jsonb,
  90 + r.order_index * 8,
  r.major_realm,
  '对应境界游历事件可能发现丹谱；收录后可在丹炉炼制。',
  r.order_index
FROM realms r
WHERE r.order_index < (SELECT MAX(order_index) FROM realms)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  rarity = EXCLUDED.rarity,
  description = EXCLUDED.description,
  effect = EXCLUDED.effect,
  recipe = EXCLUDED.recipe,
  craft_time_s = EXCLUDED.craft_time_s,
  major_realm = EXCLUDED.major_realm,
  source_description = EXCLUDED.source_description,
  required_order = EXCLUDED.required_order;

-- Existing characters know the protection recipe for their current stage.
INSERT INTO character_recipes (character_id, item_id)
SELECT c.id, i.id
FROM characters c
JOIN realms r ON r.id = c.realm_id
JOIN items i ON i.code = 'guard_' || r.code
ON CONFLICT (character_id, item_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_characters_retreat
  ON characters(retreat_started_at) WHERE retreat_started_at IS NOT NULL;
