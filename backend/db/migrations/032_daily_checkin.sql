-- 每日签到系统
CREATE TABLE IF NOT EXISTS character_checkins (
  id SERIAL PRIMARY KEY,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  streak_days INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (character_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_character_checkins_character_date
  ON character_checkins(character_id, checkin_date DESC);

-- 添加连续签到记录字段
ALTER TABLE characters ADD COLUMN IF NOT EXISTS checkin_streak INT DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS last_checkin_date DATE;
