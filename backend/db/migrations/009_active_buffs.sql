-- 限时修炼辅物的当前效果。独立追加，兼容已经执行 007/008 的远程库。
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS qi_buff_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS qi_buff_expires_at TIMESTAMPTZ;
