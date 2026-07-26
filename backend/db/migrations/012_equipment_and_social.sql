-- 武器装备、角色画像与聊天。
CREATE TABLE IF NOT EXISTS equipment (
  id               SERIAL PRIMARY KEY,
  code             VARCHAR(60) UNIQUE NOT NULL,
  name             VARCHAR(100) NOT NULL,
  slot             VARCHAR(20) NOT NULL DEFAULT 'weapon' CHECK (slot IN ('weapon')),
  weapon_type      VARCHAR(30) NOT NULL,
  rarity           VARCHAR(20) NOT NULL DEFAULT 'common',
  major_realm      VARCHAR(50) NOT NULL,
  required_order   INT NOT NULL DEFAULT 0,
  attack_bonus     INT NOT NULL DEFAULT 0 CHECK (attack_bonus >= 0),
  defense_bonus    INT NOT NULL DEFAULT 0 CHECK (defense_bonus >= 0),
  hp_bonus         INT NOT NULL DEFAULT 0 CHECK (hp_bonus >= 0),
  speed_bonus      INT NOT NULL DEFAULT 0 CHECK (speed_bonus >= 0),
  description      TEXT NOT NULL,
  source_description TEXT NOT NULL,
  image_url        VARCHAR(255),
  area_code        VARCHAR(50) REFERENCES areas(code)
);

CREATE TABLE IF NOT EXISTS character_equipment (
  id               SERIAL PRIMARY KEY,
  character_id     INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  equipment_id     INT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  quantity         INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  equipped         BOOLEAN NOT NULL DEFAULT FALSE,
  obtained_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (character_id, equipment_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id                BIGSERIAL PRIMARY KEY,
  sender_user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_user_id INT REFERENCES users(id) ON DELETE CASCADE,
  channel           VARCHAR(20) NOT NULL CHECK (channel IN ('global', 'direct')),
  body              VARCHAR(200) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((channel = 'global' AND recipient_user_id IS NULL) OR
         (channel = 'direct' AND recipient_user_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_equipment_realm ON equipment(required_order, rarity, weapon_type);
CREATE INDEX IF NOT EXISTS idx_character_equipment ON character_equipment(character_id, equipped);
CREATE INDEX IF NOT EXISTS idx_chat_global ON chat_messages(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_direct ON chat_messages(sender_user_id, recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_users ON friendships(requester_id, addressee_id, status);
