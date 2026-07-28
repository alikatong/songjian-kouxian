-- 成就定义表
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- cultivation, combat, exploration, social, collection
  icon VARCHAR(50),
  requirement JSONB NOT NULL, -- {"type": "reach_realm", "realm_code": "jindan_early"}
  reward JSONB, -- {"spirit_stones": 1000, "fate_points": 5, "title": "金丹之路"}
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 角色成就进度表
CREATE TABLE IF NOT EXISTS character_achievements (
  id SERIAL PRIMARY KEY,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  achievement_id INT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (character_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_character_achievements_character
  ON character_achievements(character_id, completed);

-- 排行榜快照表（每周更新）
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id SERIAL PRIMARY KEY,
  leaderboard_type VARCHAR(50) NOT NULL, -- weekly_qi, all_time_realm, breakthrough_count
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  character_name VARCHAR(50) NOT NULL,
  realm VARCHAR(50),
  score BIGINT NOT NULL,
  rank INT NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_type_date
  ON leaderboard_snapshots(leaderboard_type, snapshot_date DESC, rank);

-- 插入基础成就
INSERT INTO achievements (code, name, description, category, requirement, reward, sort_order) VALUES
  ('first_breakthrough', '初窥门径', '完成第一次境界突破', 'cultivation', '{"type": "breakthrough_count", "count": 1}', '{"spirit_stones": 100, "fate_points": 1}', 1),
  ('reach_lianqi', '踏入修仙', '突破至炼气期', 'cultivation', '{"type": "reach_realm", "realm_code": "lianqi_early"}', '{"spirit_stones": 500, "fate_points": 2, "title": "炼气修士"}', 2),
  ('reach_jindan', '金丹凝聚', '突破至金丹期', 'cultivation', '{"type": "reach_realm", "realm_code": "jindan_early"}', '{"spirit_stones": 5000, "fate_points": 10, "title": "金丹之路"}', 3),
  ('win_10_battles', '初露锋芒', '战胜10场战斗', 'combat', '{"type": "win_battles", "count": 10}', '{"spirit_stones": 200, "fate_points": 1}', 10),
  ('win_50_battles', '身经百战', '战胜50场战斗', 'combat', '{"type": "win_battles", "count": 50}', '{"spirit_stones": 1000, "fate_points": 3}', 11),
  ('defeat_first_boss', '首领克星', '击败第一个区域首领', 'combat', '{"type": "defeat_boss", "count": 1}', '{"spirit_stones": 300, "fate_points": 2}', 12),
  ('explore_100', '游历千里', '完成100次游历', 'exploration', '{"type": "exploration_count", "count": 100}', '{"spirit_stones": 500, "fate_points": 2}', 20),
  ('collect_10_techniques', '博览群经', '收录10本功法谱', 'collection', '{"type": "technique_count", "count": 10}', '{"spirit_stones": 300, "fate_points": 1}', 30),
  ('collect_50_recipes', '丹道大师', '收录50张丹谱', 'collection', '{"type": "recipe_count", "count": 50}', '{"spirit_stones": 800, "fate_points": 3}', 31),
  ('add_first_friend', '结识道友', '添加第一位好友', 'social', '{"type": "friend_count", "count": 1}', '{"spirit_stones": 100}', 40)
ON CONFLICT (code) DO NOTHING;
