CREATE TABLE IF NOT EXISTS exploration_logs (
  id BIGSERIAL PRIMARY KEY,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  area_code VARCHAR(50) NOT NULL,
  area_name VARCHAR(100) NOT NULL,
  event_code VARCHAR(50) NOT NULL,
  event_title VARCHAR(100) NOT NULL,
  choice_text TEXT NOT NULL,
  narrative TEXT NOT NULL,
  rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
  explored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exploration_logs_character_id
  ON exploration_logs(character_id, id DESC);
