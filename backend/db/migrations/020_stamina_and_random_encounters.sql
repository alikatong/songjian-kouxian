ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS stamina SMALLINT NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS stamina_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS pending_enemy_code VARCHAR(60) REFERENCES enemies(code);

ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_stamina_check;
ALTER TABLE characters ADD CONSTRAINT characters_stamina_check CHECK (stamina BETWEEN 0 AND 100);

INSERT INTO items
  (code, name, type, rarity, description, effect, recipe, craft_time_s, major_realm, source_description, required_order)
VALUES
  ('stamina_pill_mortal', '养神丸', 'pill', 'common',
   '以清泉与草药温养神魂，服用后恢复25点精力，无法超过精力上限。',
   '{"stamina_restore":25}', '{"herb_scraps":3,"spring_water":2}', 90,
   '凡人', '丹方初始收录；药材碎末与清泉水均可在落霞村游历获得。', 0)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description, effect=EXCLUDED.effect,
  recipe=EXCLUDED.recipe, craft_time_s=EXCLUDED.craft_time_s,
  major_realm=EXCLUDED.major_realm, source_description=EXCLUDED.source_description;

INSERT INTO character_recipes (character_id, item_id)
SELECT c.id, i.id FROM characters c, items i WHERE i.code = 'stamina_pill_mortal'
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_characters_pending_enemy ON characters(pending_enemy_code);
