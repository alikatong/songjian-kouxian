-- MVP 游戏状态扩展。单独迁移以兼容已执行 001 的数据库。
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS spirit_stones BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fate_points INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS breakthrough_failures SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_event_id INT REFERENCES events(id),
  ADD COLUMN IF NOT EXISTS last_explore_at TIMESTAMPTZ;

ALTER TABLE characters
  DROP CONSTRAINT IF EXISTS characters_breakthrough_failures_check;
ALTER TABLE characters
  ADD CONSTRAINT characters_breakthrough_failures_check
  CHECK (breakthrough_failures BETWEEN 0 AND 3);

CREATE INDEX IF NOT EXISTS idx_craft_queue_collect
  ON craft_queue(character_id, is_collected, finish_at);

-- 战斗模块上线前不启用 Boss 硬门槛，避免玩家进度被永久锁死。
UPDATE realms SET boss_required = FALSE;
