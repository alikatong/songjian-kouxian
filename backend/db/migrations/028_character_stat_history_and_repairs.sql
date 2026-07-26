CREATE TABLE IF NOT EXISTS character_ascensions (
  id BIGSERIAL PRIMARY KEY,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  from_realm_id INT NOT NULL REFERENCES realms(id),
  to_realm_id INT NOT NULL REFERENCES realms(id),
  technique_id INT REFERENCES techniques(id),
  technique_rarity VARCHAR(20) NOT NULL,
  multiplier NUMERIC(30,8) NOT NULL,
  ascended_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_character_ascensions_character ON character_ascensions(character_id, ascended_at);

CREATE TABLE IF NOT EXISTS character_stat_repairs (
  id BIGSERIAL PRIMARY KEY,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  repaired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_character_stat_repairs_character ON character_stat_repairs(character_id, repaired_at DESC);

UPDATE characters
SET breakthrough_failures = LEAST(breakthrough_failures, 4)
WHERE breakthrough_failures > 4;
