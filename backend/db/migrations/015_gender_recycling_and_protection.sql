-- Character gender, item protection, and server-authoritative recycling.
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10) NOT NULL DEFAULT 'male';

ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_gender_check;
ALTER TABLE characters
  ADD CONSTRAINT characters_gender_check CHECK (gender IN ('male', 'female'));

ALTER TABLE inventories
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE character_equipment
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_inventories_character_locked
  ON inventories(character_id, locked);

CREATE INDEX IF NOT EXISTS idx_character_equipment_locked
  ON character_equipment(character_id, locked, equipped);
