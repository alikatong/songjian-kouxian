-- ============================================================
-- 001_create_tables.sql  — 创建所有业务表
-- 幂等：IF NOT EXISTS，可重复执行
-- ============================================================

-- 境界参考表
CREATE TABLE IF NOT EXISTS realms (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR(50)    UNIQUE NOT NULL,
  phase            SMALLINT       NOT NULL,          -- 1=凡躯淬体 2=修仙问道
  major_realm      VARCHAR(50)    NOT NULL,
  sub_stage        VARCHAR(20),                      -- 初期/中期/后期/圆满，凡人为NULL
  order_index      INT            NOT NULL,
  qi_required      BIGINT         NOT NULL DEFAULT 0,
  qi_base_per_sec  NUMERIC(16,2)  NOT NULL DEFAULT 1,
  boss_required    BOOLEAN        NOT NULL DEFAULT FALSE,
  title_unlock     VARCHAR(100),
  description      TEXT,
  image_url        VARCHAR(255)
);

-- 功法表
CREATE TABLE IF NOT EXISTS techniques (
  id                 SERIAL PRIMARY KEY,
  code               VARCHAR(50)   UNIQUE NOT NULL,
  name               VARCHAR(100)  NOT NULL,
  rarity             VARCHAR(20)   NOT NULL DEFAULT 'common',
  description        TEXT,
  qi_multiplier      NUMERIC(5,2)  NOT NULL DEFAULT 1.0,
  offline_multiplier NUMERIC(5,2)  NOT NULL DEFAULT 1.0,
  breakthrough_bonus NUMERIC(5,2)  NOT NULL DEFAULT 0.0,
  event_bonus        NUMERIC(5,2)  NOT NULL DEFAULT 0.0,
  unlock_condition   VARCHAR(255),
  image_url          VARCHAR(255)
);

-- 用户账号表
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)   UNIQUE NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  email         VARCHAR(255),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 角色表
CREATE TABLE IF NOT EXISTS characters (
  id                 SERIAL PRIMARY KEY,
  user_id            INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               VARCHAR(50)   NOT NULL,
  avatar_url         VARCHAR(255),
  realm_id           INT           NOT NULL DEFAULT 1 REFERENCES realms(id),
  current_qi         BIGINT        NOT NULL DEFAULT 0,
  qi_per_second      NUMERIC(16,2) NOT NULL DEFAULT 1.0,
  active_technique   INT           REFERENCES techniques(id),
  active_title       VARCHAR(100),
  offline_qi_cap_hrs SMALLINT      NOT NULL DEFAULT 8,
  last_online_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- 战斗属性
  hp                 INT           NOT NULL DEFAULT 100,
  hp_max             INT           NOT NULL DEFAULT 100,
  atk                INT           NOT NULL DEFAULT 10,
  def                INT           NOT NULL DEFAULT 5,
  spd                INT           NOT NULL DEFAULT 10,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)   -- 每用户一个角色
);

-- 道具定义表
CREATE TABLE IF NOT EXISTS items (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50)   UNIQUE NOT NULL,
  name          VARCHAR(100)  NOT NULL,
  type          VARCHAR(30)   NOT NULL, -- breakthrough/buff/explore/collectible
  rarity        VARCHAR(20)   NOT NULL DEFAULT 'common',
  description   TEXT,
  effect        JSONB,
  recipe        JSONB,
  craft_time_s  INT           NOT NULL DEFAULT 60,
  image_url     VARCHAR(255)
);

-- 背包表
CREATE TABLE IF NOT EXISTS inventories (
  id           SERIAL PRIMARY KEY,
  character_id INT  NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id      INT  NOT NULL REFERENCES items(id),
  quantity     INT  NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  UNIQUE (character_id, item_id)
);

-- 随机事件定义表
CREATE TABLE IF NOT EXISTS events (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR(50)   UNIQUE NOT NULL,
  title            VARCHAR(100)  NOT NULL,
  body             TEXT          NOT NULL,
  image_url        VARCHAR(255),
  area_code        VARCHAR(50),
  min_realm_order  INT           NOT NULL DEFAULT 0,
  max_realm_order  INT           NOT NULL DEFAULT 9999,
  weight           INT           NOT NULL DEFAULT 100,
  choices          JSONB         NOT NULL,
  is_story         BOOLEAN       NOT NULL DEFAULT FALSE
);

-- 角色触发事件记录
CREATE TABLE IF NOT EXISTS character_events (
  id           SERIAL PRIMARY KEY,
  character_id INT        NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  event_id     INT        NOT NULL REFERENCES events(id),
  choice_index SMALLINT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 已解锁称号
CREATE TABLE IF NOT EXISTS character_titles (
  id           SERIAL PRIMARY KEY,
  character_id INT          NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title        VARCHAR(100) NOT NULL,
  unlocked_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (character_id, title)
);

-- 炼制队列
CREATE TABLE IF NOT EXISTS craft_queue (
  id           SERIAL PRIMARY KEY,
  character_id INT         NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id      INT         NOT NULL REFERENCES items(id),
  quantity     INT         NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finish_at    TIMESTAMPTZ NOT NULL,
  is_collected BOOLEAN     NOT NULL DEFAULT FALSE
);

-- 战斗记录
CREATE TABLE IF NOT EXISTS battle_logs (
  id           SERIAL PRIMARY KEY,
  character_id INT          NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  enemy_code   VARCHAR(50)  NOT NULL,
  result       VARCHAR(10)  NOT NULL CHECK (result IN ('win','lose')),
  rounds       SMALLINT,
  loot         JSONB,
  fought_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 好友关系
CREATE TABLE IF NOT EXISTS friendships (
  id           SERIAL PRIMARY KEY,
  requester_id INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','accepted','blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);

-- 好友赠礼记录
CREATE TABLE IF NOT EXISTS gift_logs (
  id          SERIAL PRIMARY KEY,
  sender_id   INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     INT         NOT NULL REFERENCES items(id),
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_claimed  BOOLEAN     NOT NULL DEFAULT FALSE
);

-- 常用查询索引
CREATE INDEX IF NOT EXISTS idx_characters_user_id    ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_char_events_char_id   ON character_events(character_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_char_id   ON battle_logs(character_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_gift_logs_receiver    ON gift_logs(receiver_id, is_claimed);
