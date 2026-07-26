CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'operator', 'support', 'auditor')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  token_version INT NOT NULL DEFAULT 0,
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id INT REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_username VARCHAR(50) NOT NULL,
  admin_role VARCHAR(20) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(100),
  reason TEXT,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id UUID NOT NULL,
  idempotency_key UUID,
  ip_address VARCHAR(64),
  user_agent VARCHAR(255),
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_code VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_logs(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_logs(admin_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_idempotency_keys (
  id BIGSERIAL PRIMARY KEY,
  admin_id INT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  idempotency_key UUID NOT NULL,
  request_hash VARCHAR(64) NOT NULL,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  response_status INT,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (admin_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_admin_idempotency_created ON admin_idempotency_keys(created_at DESC);

CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 100),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'withdrawn')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by INT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by INT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(status, pinned DESC, priority DESC, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS resource_ledger (
  id BIGSERIAL PRIMARY KEY,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  resource_type VARCHAR(30) NOT NULL,
  resource_id INT,
  delta BIGINT NOT NULL,
  balance_after BIGINT,
  source_type VARCHAR(50) NOT NULL,
  source_id VARCHAR(100),
  description TEXT NOT NULL,
  operator_type VARCHAR(20) NOT NULL DEFAULT 'system',
  operator_id INT,
  request_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resource_ledger_character ON resource_ledger(character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_ledger_resource ON resource_ledger(resource_type, resource_id, created_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INT NOT NULL DEFAULT 0;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'banned'));

ALTER TABLE characters ADD COLUMN IF NOT EXISTS admin_version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'visible';
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS moderated_by INT REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_moderation_status_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_moderation_status_check
  CHECK (moderation_status IN ('visible', 'hidden'));

ALTER TABLE auction_listings DROP CONSTRAINT IF EXISTS auction_listings_status_check;
ALTER TABLE auction_listings ADD CONSTRAINT auction_listings_status_check
  CHECK (status IN ('active', 'sold', 'cancelled', 'admin_cancelled'));

