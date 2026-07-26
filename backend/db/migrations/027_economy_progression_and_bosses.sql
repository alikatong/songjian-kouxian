CREATE TABLE IF NOT EXISTS mail_messages (
  id BIGSERIAL PRIMARY KEY,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  item_id INT REFERENCES items(id),
  equipment_id INT REFERENCES equipment(id),
  quantity INT NOT NULL DEFAULT 0 CHECK(quantity>=0),
  spirit_stones BIGINT NOT NULL DEFAULT 0 CHECK(spirit_stones>=0),
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW()+INTERVAL '30 days')
);
CREATE INDEX IF NOT EXISTS idx_mail_character ON mail_messages(character_id, claimed, created_at DESC);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS major_stat_multiplier NUMERIC(30,8) NOT NULL DEFAULT 1;
ALTER TABLE characters ALTER COLUMN hp TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN hp_max TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN atk TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN def TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN spd TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN bonus_hp TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN bonus_atk TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN bonus_def TYPE BIGINT;
ALTER TABLE characters ALTER COLUMN bonus_spd TYPE BIGINT;
ALTER TABLE equipment ALTER COLUMN attack_bonus TYPE BIGINT;
ALTER TABLE equipment ALTER COLUMN defense_bonus TYPE BIGINT;
ALTER TABLE equipment ALTER COLUMN hp_bonus TYPE BIGINT;
ALTER TABLE equipment ALTER COLUMN speed_bonus TYPE BIGINT;
ALTER TABLE enemies ALTER COLUMN hp TYPE BIGINT;
ALTER TABLE enemies ALTER COLUMN atk TYPE BIGINT;
ALTER TABLE enemies ALTER COLUMN def TYPE BIGINT;
ALTER TABLE enemies ALTER COLUMN spd TYPE BIGINT;
UPDATE characters SET major_stat_multiplier=3.00000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='common')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 1 AND 4);
UPDATE characters SET major_stat_multiplier=9.00000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='common')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 5 AND 8);
UPDATE characters SET major_stat_multiplier=27.00000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='common')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 9 AND 12);
UPDATE characters SET major_stat_multiplier=81.00000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='common')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 13 AND 16);
UPDATE characters SET major_stat_multiplier=243.00000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='common')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 17 AND 20);
UPDATE characters SET major_stat_multiplier=729.00000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='common')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 21 AND 24);
UPDATE characters SET major_stat_multiplier=2187.00000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='common')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 25 AND 28);
UPDATE characters SET major_stat_multiplier=6561.00000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='common')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 29 AND 32);
UPDATE characters SET major_stat_multiplier=19683.00000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='common')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 33 AND 36);
UPDATE characters SET major_stat_multiplier=59049.00000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='common')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 37 AND 40);
UPDATE characters SET major_stat_multiplier=177147.00000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='common')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 41 AND 44);
UPDATE characters SET major_stat_multiplier=531441.00000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='common')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 45 AND 48);
UPDATE characters SET major_stat_multiplier=3.05000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='uncommon')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 1 AND 4);
UPDATE characters SET major_stat_multiplier=9.30250000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='uncommon')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 5 AND 8);
UPDATE characters SET major_stat_multiplier=28.37262500
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='uncommon')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 9 AND 12);
UPDATE characters SET major_stat_multiplier=86.53650625
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='uncommon')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 13 AND 16);
UPDATE characters SET major_stat_multiplier=263.93634406
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='uncommon')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 17 AND 20);
UPDATE characters SET major_stat_multiplier=805.00584939
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='uncommon')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 21 AND 24);
UPDATE characters SET major_stat_multiplier=2455.26784064
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='uncommon')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 25 AND 28);
UPDATE characters SET major_stat_multiplier=7488.56691396
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='uncommon')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 29 AND 32);
UPDATE characters SET major_stat_multiplier=22840.12908757
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='uncommon')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 33 AND 36);
UPDATE characters SET major_stat_multiplier=69662.39371708
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='uncommon')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 37 AND 40);
UPDATE characters SET major_stat_multiplier=212470.30083709
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='uncommon')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 41 AND 44);
UPDATE characters SET major_stat_multiplier=648034.41755312
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='uncommon')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 45 AND 48);
UPDATE characters SET major_stat_multiplier=3.10000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='rare')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 1 AND 4);
UPDATE characters SET major_stat_multiplier=9.61000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='rare')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 5 AND 8);
UPDATE characters SET major_stat_multiplier=29.79100000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='rare')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 9 AND 12);
UPDATE characters SET major_stat_multiplier=92.35210000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='rare')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 13 AND 16);
UPDATE characters SET major_stat_multiplier=286.29151000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='rare')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 17 AND 20);
UPDATE characters SET major_stat_multiplier=887.50368100
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='rare')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 21 AND 24);
UPDATE characters SET major_stat_multiplier=2751.26141110
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='rare')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 25 AND 28);
UPDATE characters SET major_stat_multiplier=8528.91037441
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='rare')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 29 AND 32);
UPDATE characters SET major_stat_multiplier=26439.62216067
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='rare')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 33 AND 36);
UPDATE characters SET major_stat_multiplier=81962.82869808
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='rare')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 37 AND 40);
UPDATE characters SET major_stat_multiplier=254084.76896405
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='rare')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 41 AND 44);
UPDATE characters SET major_stat_multiplier=787662.78378855
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='rare')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 45 AND 48);
UPDATE characters SET major_stat_multiplier=3.15000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='epic')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 1 AND 4);
UPDATE characters SET major_stat_multiplier=9.92250000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='epic')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 5 AND 8);
UPDATE characters SET major_stat_multiplier=31.25587500
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='epic')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 9 AND 12);
UPDATE characters SET major_stat_multiplier=98.45600625
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='epic')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 13 AND 16);
UPDATE characters SET major_stat_multiplier=310.13641969
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='epic')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 17 AND 20);
UPDATE characters SET major_stat_multiplier=976.92972202
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='epic')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 21 AND 24);
UPDATE characters SET major_stat_multiplier=3077.32862435
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='epic')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 25 AND 28);
UPDATE characters SET major_stat_multiplier=9693.58516670
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='epic')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 29 AND 32);
UPDATE characters SET major_stat_multiplier=30534.79327511
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='epic')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 33 AND 36);
UPDATE characters SET major_stat_multiplier=96184.59881658
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='epic')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 37 AND 40);
UPDATE characters SET major_stat_multiplier=302981.48627223
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='epic')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 41 AND 44);
UPDATE characters SET major_stat_multiplier=954391.68175753
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='epic')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 45 AND 48);
UPDATE characters SET major_stat_multiplier=3.20000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='legendary')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 1 AND 4);
UPDATE characters SET major_stat_multiplier=10.24000000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='legendary')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 5 AND 8);
UPDATE characters SET major_stat_multiplier=32.76800000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='legendary')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 9 AND 12);
UPDATE characters SET major_stat_multiplier=104.85760000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='legendary')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 13 AND 16);
UPDATE characters SET major_stat_multiplier=335.54432000
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='legendary')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 17 AND 20);
UPDATE characters SET major_stat_multiplier=1073.74182400
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='legendary')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 21 AND 24);
UPDATE characters SET major_stat_multiplier=3435.97383680
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='legendary')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 25 AND 28);
UPDATE characters SET major_stat_multiplier=10995.11627776
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='legendary')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 29 AND 32);
UPDATE characters SET major_stat_multiplier=35184.37208883
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='legendary')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 33 AND 36);
UPDATE characters SET major_stat_multiplier=112589.99068426
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='legendary')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 37 AND 40);
UPDATE characters SET major_stat_multiplier=360287.97018964
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='legendary')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 41 AND 44);
UPDATE characters SET major_stat_multiplier=1152921.50460685
WHERE major_stat_multiplier=1
  AND active_technique IN (SELECT id FROM techniques WHERE rarity='legendary')
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 45 AND 48);
UPDATE characters SET major_stat_multiplier=3.00000000
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 1 AND 4);
UPDATE characters SET major_stat_multiplier=9.00000000
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 5 AND 8);
UPDATE characters SET major_stat_multiplier=27.00000000
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 9 AND 12);
UPDATE characters SET major_stat_multiplier=81.00000000
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 13 AND 16);
UPDATE characters SET major_stat_multiplier=243.00000000
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 17 AND 20);
UPDATE characters SET major_stat_multiplier=729.00000000
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 21 AND 24);
UPDATE characters SET major_stat_multiplier=2187.00000000
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 25 AND 28);
UPDATE characters SET major_stat_multiplier=6561.00000000
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 29 AND 32);
UPDATE characters SET major_stat_multiplier=19683.00000000
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 33 AND 36);
UPDATE characters SET major_stat_multiplier=59049.00000000
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 37 AND 40);
UPDATE characters SET major_stat_multiplier=177147.00000000
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 41 AND 44);
UPDATE characters SET major_stat_multiplier=531441.00000000
WHERE major_stat_multiplier=1 AND active_technique IS NULL
  AND realm_id IN (SELECT id FROM realms WHERE order_index BETWEEN 45 AND 48);
UPDATE characters SET
  hp=((100+0*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+0*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+0*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+0*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+0*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=0);
UPDATE characters SET
  hp=((100+1*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+1*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+1*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+1*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+1*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=1);
UPDATE characters SET
  hp=((100+2*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+2*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+2*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+2*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+2*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=2);
UPDATE characters SET
  hp=((100+3*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+3*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+3*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+3*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+3*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=3);
UPDATE characters SET
  hp=((100+4*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+4*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+4*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+4*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+4*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=4);
UPDATE characters SET
  hp=((100+5*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+5*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+5*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+5*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+5*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=5);
UPDATE characters SET
  hp=((100+6*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+6*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+6*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+6*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+6*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=6);
UPDATE characters SET
  hp=((100+7*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+7*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+7*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+7*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+7*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=7);
UPDATE characters SET
  hp=((100+8*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+8*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+8*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+8*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+8*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=8);
UPDATE characters SET
  hp=((100+9*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+9*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+9*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+9*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+9*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=9);
UPDATE characters SET
  hp=((100+10*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+10*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+10*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+10*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+10*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=10);
UPDATE characters SET
  hp=((100+11*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+11*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+11*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+11*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+11*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=11);
UPDATE characters SET
  hp=((100+12*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+12*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+12*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+12*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+12*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=12);
UPDATE characters SET
  hp=((100+13*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+13*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+13*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+13*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+13*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=13);
UPDATE characters SET
  hp=((100+14*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+14*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+14*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+14*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+14*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=14);
UPDATE characters SET
  hp=((100+15*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+15*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+15*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+15*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+15*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=15);
UPDATE characters SET
  hp=((100+16*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+16*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+16*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+16*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+16*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=16);
UPDATE characters SET
  hp=((100+17*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+17*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+17*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+17*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+17*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=17);
UPDATE characters SET
  hp=((100+18*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+18*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+18*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+18*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+18*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=18);
UPDATE characters SET
  hp=((100+19*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+19*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+19*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+19*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+19*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=19);
UPDATE characters SET
  hp=((100+20*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+20*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+20*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+20*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+20*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=20);
UPDATE characters SET
  hp=((100+21*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+21*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+21*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+21*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+21*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=21);
UPDATE characters SET
  hp=((100+22*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+22*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+22*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+22*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+22*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=22);
UPDATE characters SET
  hp=((100+23*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+23*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+23*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+23*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+23*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=23);
UPDATE characters SET
  hp=((100+24*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+24*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+24*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+24*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+24*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=24);
UPDATE characters SET
  hp=((100+25*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+25*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+25*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+25*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+25*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=25);
UPDATE characters SET
  hp=((100+26*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+26*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+26*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+26*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+26*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=26);
UPDATE characters SET
  hp=((100+27*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+27*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+27*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+27*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+27*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=27);
UPDATE characters SET
  hp=((100+28*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+28*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+28*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+28*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+28*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=28);
UPDATE characters SET
  hp=((100+29*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+29*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+29*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+29*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+29*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=29);
UPDATE characters SET
  hp=((100+30*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+30*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+30*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+30*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+30*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=30);
UPDATE characters SET
  hp=((100+31*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+31*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+31*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+31*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+31*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=31);
UPDATE characters SET
  hp=((100+32*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+32*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+32*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+32*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+32*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=32);
UPDATE characters SET
  hp=((100+33*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+33*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+33*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+33*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+33*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=33);
UPDATE characters SET
  hp=((100+34*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+34*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+34*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+34*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+34*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=34);
UPDATE characters SET
  hp=((100+35*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+35*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+35*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+35*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+35*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=35);
UPDATE characters SET
  hp=((100+36*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+36*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+36*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+36*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+36*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=36);
UPDATE characters SET
  hp=((100+37*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+37*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+37*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+37*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+37*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=37);
UPDATE characters SET
  hp=((100+38*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+38*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+38*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+38*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+38*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=38);
UPDATE characters SET
  hp=((100+39*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+39*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+39*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+39*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+39*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=39);
UPDATE characters SET
  hp=((100+40*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+40*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+40*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+40*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+40*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=40);
UPDATE characters SET
  hp=((100+41*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+41*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+41*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+41*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+41*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=41);
UPDATE characters SET
  hp=((100+42*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+42*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+42*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+42*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+42*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=42);
UPDATE characters SET
  hp=((100+43*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+43*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+43*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+43*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+43*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=43);
UPDATE characters SET
  hp=((100+44*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+44*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+44*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+44*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+44*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=44);
UPDATE characters SET
  hp=((100+45*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+45*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+45*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+45*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+45*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=45);
UPDATE characters SET
  hp=((100+46*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+46*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+46*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+46*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+46*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=46);
UPDATE characters SET
  hp=((100+47*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+47*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+47*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+47*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+47*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=47);
UPDATE characters SET
  hp=((100+48*60)*major_stat_multiplier+bonus_hp)::bigint,
  hp_max=((100+48*60)*major_stat_multiplier+bonus_hp)::bigint,
  atk=((10+48*9)*major_stat_multiplier+bonus_atk)::bigint,
  def=((5+48*4)*major_stat_multiplier+bonus_def)::bigint,
  spd=((10+48*2)*major_stat_multiplier+bonus_spd)::bigint
WHERE realm_id IN (SELECT id FROM realms WHERE order_index=48);
-- 坊市经济、玩家拍卖、邮箱、分阶破境丹、首领门槛与美术路径。

ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_stamina_check;
ALTER TABLE characters ADD CONSTRAINT characters_stamina_check CHECK (stamina BETWEEN 0 AND 999);

ALTER TABLE enemies ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);
UPDATE enemies SET image_url='/assets/bosses/' || code || '.webp' WHERE rank='boss';

UPDATE equipment SET image_url='/assets/equipment/legendary/' || code || '.webp' WHERE rarity='legendary';
UPDATE equipment SET weapon_type='robe', name='凡尘玄衣', description='凡人绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_mortal_09';
UPDATE equipment SET weapon_type='armor', name='凡尘道铠', description='凡人绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_mortal_10';
UPDATE equipment SET weapon_type='robe', name='铜皮玄衣', description='练皮境绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_lianpi_09';
UPDATE equipment SET weapon_type='armor', name='铜皮道铠', description='练皮境绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_lianpi_10';
UPDATE equipment SET weapon_type='robe', name='铁骨玄衣', description='练骨境绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_lianggu_09';
UPDATE equipment SET weapon_type='armor', name='铁骨道铠', description='练骨境绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_lianggu_10';
UPDATE equipment SET weapon_type='robe', name='玉筋玄衣', description='易筋境绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_yijin_09';
UPDATE equipment SET weapon_type='armor', name='玉筋道铠', description='易筋境绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_yijin_10';
UPDATE equipment SET weapon_type='robe', name='净髓玄衣', description='洗髓境绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_xisui_09';
UPDATE equipment SET weapon_type='armor', name='净髓道铠', description='洗髓境绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_xisui_10';
UPDATE equipment SET weapon_type='robe', name='赤血玄衣', description='换血境绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_huanxue_09';
UPDATE equipment SET weapon_type='armor', name='赤血道铠', description='换血境绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_huanxue_10';
UPDATE equipment SET weapon_type='robe', name='天感玄衣', description='天人境绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_tianren_09';
UPDATE equipment SET weapon_type='armor', name='天感道铠', description='天人境绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_tianren_10';
UPDATE equipment SET weapon_type='robe', name='灵息玄衣', description='炼气期绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_lianqi_09';
UPDATE equipment SET weapon_type='armor', name='灵息道铠', description='炼气期绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_lianqi_10';
UPDATE equipment SET weapon_type='robe', name='道基玄衣', description='筑基期绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_zhujia_09';
UPDATE equipment SET weapon_type='armor', name='道基道铠', description='筑基期绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_zhujia_10';
UPDATE equipment SET weapon_type='robe', name='丹火玄衣', description='金丹期绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_jindan_09';
UPDATE equipment SET weapon_type='armor', name='丹火道铠', description='金丹期绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_jindan_10';
UPDATE equipment SET weapon_type='robe', name='婴息玄衣', description='元婴期绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_yuanying_09';
UPDATE equipment SET weapon_type='armor', name='婴息道铠', description='元婴期绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_yuanying_10';
UPDATE equipment SET weapon_type='robe', name='法相玄衣', description='化神期绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_huashen_09';
UPDATE equipment SET weapon_type='armor', name='法相道铠', description='化神期绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_huashen_10';
UPDATE equipment SET weapon_type='robe', name='渡劫玄衣', description='大乘期绝品护器。以灵丝与护阵织成的玄衣，着重气血、防御与身法。' WHERE code='armor_dacheng_09';
UPDATE equipment SET weapon_type='armor', name='渡劫道铠', description='大乘期绝品护器。以本境界核心炼材铸成的道铠，牺牲轻灵换取极致防御。' WHERE code='armor_dacheng_10';

CREATE TABLE IF NOT EXISTS shop_goods (
  id SERIAL PRIMARY KEY, item_id INT NOT NULL UNIQUE REFERENCES items(id),
  price BIGINT NOT NULL CHECK(price>0), required_order INT NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS auction_listings (
  id BIGSERIAL PRIMARY KEY, seller_character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  buyer_character_id INT REFERENCES characters(id) ON DELETE SET NULL, item_id INT REFERENCES items(id),
  equipment_id INT REFERENCES equipment(id), quantity INT NOT NULL CHECK(quantity>0), unit_price BIGINT NOT NULL CHECK(unit_price>0),
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','sold','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sold_at TIMESTAMPTZ,
  CHECK((item_id IS NOT NULL AND equipment_id IS NULL) OR (item_id IS NULL AND equipment_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_auction_active ON auction_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_seller ON auction_listings(seller_character_id, status);

UPDATE items SET type='legacy_breakthrough', description='旧制破境之物，药性已散，可保留收藏或处理。' WHERE type='breakthrough';

INSERT INTO items (code,name,type,rarity,description,effect,recipe,craft_time_s,image_url,major_realm,source_description,required_order) VALUES
('boost_lianpi_early','铜皮承脉丹','breakthrough','common','练皮境初期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.1,"realm_code":"lianpi_early"}'::jsonb,'{"mat_lianpi_1":2,"mat_lianpi_2":2}'::jsonb,140,'/assets/pills/realm_lianpi.webp','练皮境','丹谱于练皮境对应区域游历收录；所需两味材料均在该区域获得。',1),
('boost_lianpi_mid','铜皮贯玄丹','breakthrough','common','练皮境中期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.11,"realm_code":"lianpi_mid"}'::jsonb,'{"mat_lianpi_3":2,"mat_lianpi_4":2}'::jsonb,140,'/assets/pills/realm_lianpi.webp','练皮境','丹谱于练皮境对应区域游历收录；所需两味材料均在该区域获得。',1),
('boost_lianpi_late','铜皮圆真丹','breakthrough','common','练皮境后期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.12,"realm_code":"lianpi_late"}'::jsonb,'{"mat_lianpi_5":2,"mat_lianpi_6":2}'::jsonb,140,'/assets/pills/realm_lianpi.webp','练皮境','丹谱于练皮境对应区域游历收录；所需两味材料均在该区域获得。',1),
('boost_lianggu_early','铁骨承脉丹','breakthrough','uncommon','练骨境初期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.1,"realm_code":"lianggu_early"}'::jsonb,'{"mat_lianggu_1":2,"mat_lianggu_2":2}'::jsonb,160,'/assets/pills/realm_lianggu.webp','练骨境','丹谱于练骨境对应区域游历收录；所需两味材料均在该区域获得。',5),
('boost_lianggu_mid','铁骨贯玄丹','breakthrough','uncommon','练骨境中期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.11,"realm_code":"lianggu_mid"}'::jsonb,'{"mat_lianggu_3":2,"mat_lianggu_4":2}'::jsonb,160,'/assets/pills/realm_lianggu.webp','练骨境','丹谱于练骨境对应区域游历收录；所需两味材料均在该区域获得。',5),
('boost_lianggu_late','铁骨圆真丹','breakthrough','uncommon','练骨境后期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.12,"realm_code":"lianggu_late"}'::jsonb,'{"mat_lianggu_5":2,"mat_lianggu_6":2}'::jsonb,160,'/assets/pills/realm_lianggu.webp','练骨境','丹谱于练骨境对应区域游历收录；所需两味材料均在该区域获得。',5),
('boost_yijin_early','玉筋承脉丹','breakthrough','uncommon','易筋境初期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.1,"realm_code":"yijin_early"}'::jsonb,'{"mat_yijin_1":2,"mat_yijin_2":2}'::jsonb,180,'/assets/pills/realm_yijin.webp','易筋境','丹谱于易筋境对应区域游历收录；所需两味材料均在该区域获得。',9),
('boost_yijin_mid','玉筋贯玄丹','breakthrough','uncommon','易筋境中期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.11,"realm_code":"yijin_mid"}'::jsonb,'{"mat_yijin_3":2,"mat_yijin_4":2}'::jsonb,180,'/assets/pills/realm_yijin.webp','易筋境','丹谱于易筋境对应区域游历收录；所需两味材料均在该区域获得。',9),
('boost_yijin_late','玉筋圆真丹','breakthrough','uncommon','易筋境后期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.12,"realm_code":"yijin_late"}'::jsonb,'{"mat_yijin_5":2,"mat_yijin_6":2}'::jsonb,180,'/assets/pills/realm_yijin.webp','易筋境','丹谱于易筋境对应区域游历收录；所需两味材料均在该区域获得。',9),
('boost_xisui_early','净髓承脉丹','breakthrough','uncommon','洗髓境初期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.1,"realm_code":"xisui_early"}'::jsonb,'{"mat_xisui_1":3,"mat_xisui_2":2}'::jsonb,200,'/assets/pills/realm_xisui.webp','洗髓境','丹谱于洗髓境对应区域游历收录；所需两味材料均在该区域获得。',13),
('boost_xisui_mid','净髓贯玄丹','breakthrough','uncommon','洗髓境中期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.11,"realm_code":"xisui_mid"}'::jsonb,'{"mat_xisui_3":3,"mat_xisui_4":2}'::jsonb,200,'/assets/pills/realm_xisui.webp','洗髓境','丹谱于洗髓境对应区域游历收录；所需两味材料均在该区域获得。',13),
('boost_xisui_late','净髓圆真丹','breakthrough','uncommon','洗髓境后期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.12,"realm_code":"xisui_late"}'::jsonb,'{"mat_xisui_5":3,"mat_xisui_6":2}'::jsonb,200,'/assets/pills/realm_xisui.webp','洗髓境','丹谱于洗髓境对应区域游历收录；所需两味材料均在该区域获得。',13),
('boost_huanxue_early','赤血承脉丹','breakthrough','rare','换血境初期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.1,"realm_code":"huanxue_early"}'::jsonb,'{"mat_huanxue_1":3,"mat_huanxue_2":2}'::jsonb,220,'/assets/pills/realm_huanxue.webp','换血境','丹谱于换血境对应区域游历收录；所需两味材料均在该区域获得。',17),
('boost_huanxue_mid','赤血贯玄丹','breakthrough','rare','换血境中期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.11,"realm_code":"huanxue_mid"}'::jsonb,'{"mat_huanxue_3":3,"mat_huanxue_4":2}'::jsonb,220,'/assets/pills/realm_huanxue.webp','换血境','丹谱于换血境对应区域游历收录；所需两味材料均在该区域获得。',17),
('boost_huanxue_late','赤血圆真丹','breakthrough','rare','换血境后期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.12,"realm_code":"huanxue_late"}'::jsonb,'{"mat_huanxue_5":3,"mat_huanxue_6":2}'::jsonb,220,'/assets/pills/realm_huanxue.webp','换血境','丹谱于换血境对应区域游历收录；所需两味材料均在该区域获得。',17),
('boost_tianren_early','天感承脉丹','breakthrough','rare','天人境初期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.1,"realm_code":"tianren_early"}'::jsonb,'{"mat_tianren_1":3,"mat_tianren_2":3}'::jsonb,240,'/assets/pills/realm_tianren.webp','天人境','丹谱于天人境对应区域游历收录；所需两味材料均在该区域获得。',21),
('boost_tianren_mid','天感贯玄丹','breakthrough','rare','天人境中期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.11,"realm_code":"tianren_mid"}'::jsonb,'{"mat_tianren_3":3,"mat_tianren_4":3}'::jsonb,240,'/assets/pills/realm_tianren.webp','天人境','丹谱于天人境对应区域游历收录；所需两味材料均在该区域获得。',21),
('boost_tianren_late','天感圆真丹','breakthrough','rare','天人境后期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.12,"realm_code":"tianren_late"}'::jsonb,'{"mat_tianren_5":3,"mat_tianren_6":3}'::jsonb,240,'/assets/pills/realm_tianren.webp','天人境','丹谱于天人境对应区域游历收录；所需两味材料均在该区域获得。',21),
('boost_lianqi_early','灵息承脉丹','breakthrough','rare','炼气期初期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.1,"realm_code":"lianqi_early"}'::jsonb,'{"mat_lianqi_1":3,"mat_lianqi_2":3}'::jsonb,260,'/assets/pills/realm_lianqi.webp','炼气期','丹谱于炼气期对应区域游历收录；所需两味材料均在该区域获得。',25),
('boost_lianqi_mid','灵息贯玄丹','breakthrough','rare','炼气期中期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.11,"realm_code":"lianqi_mid"}'::jsonb,'{"mat_lianqi_3":3,"mat_lianqi_4":3}'::jsonb,260,'/assets/pills/realm_lianqi.webp','炼气期','丹谱于炼气期对应区域游历收录；所需两味材料均在该区域获得。',25),
('boost_lianqi_late','灵息圆真丹','breakthrough','rare','炼气期后期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.12,"realm_code":"lianqi_late"}'::jsonb,'{"mat_lianqi_5":3,"mat_lianqi_6":3}'::jsonb,260,'/assets/pills/realm_lianqi.webp','炼气期','丹谱于炼气期对应区域游历收录；所需两味材料均在该区域获得。',25),
('boost_zhujia_early','道基承脉丹','breakthrough','epic','筑基期初期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.1,"realm_code":"zhujia_early"}'::jsonb,'{"mat_zhujia_1":4,"mat_zhujia_2":3}'::jsonb,280,'/assets/pills/realm_zhujia.webp','筑基期','丹谱于筑基期对应区域游历收录；所需两味材料均在该区域获得。',29),
('boost_zhujia_mid','道基贯玄丹','breakthrough','epic','筑基期中期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.11,"realm_code":"zhujia_mid"}'::jsonb,'{"mat_zhujia_3":4,"mat_zhujia_4":3}'::jsonb,280,'/assets/pills/realm_zhujia.webp','筑基期','丹谱于筑基期对应区域游历收录；所需两味材料均在该区域获得。',29),
('boost_zhujia_late','道基圆真丹','breakthrough','epic','筑基期后期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.12,"realm_code":"zhujia_late"}'::jsonb,'{"mat_zhujia_5":4,"mat_zhujia_6":3}'::jsonb,280,'/assets/pills/realm_zhujia.webp','筑基期','丹谱于筑基期对应区域游历收录；所需两味材料均在该区域获得。',29),
('boost_jindan_early','丹火承脉丹','breakthrough','epic','金丹期初期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.1,"realm_code":"jindan_early"}'::jsonb,'{"mat_jindan_1":4,"mat_jindan_2":3}'::jsonb,300,'/assets/pills/realm_jindan.webp','金丹期','丹谱于金丹期对应区域游历收录；所需两味材料均在该区域获得。',33),
('boost_jindan_mid','丹火贯玄丹','breakthrough','epic','金丹期中期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.11,"realm_code":"jindan_mid"}'::jsonb,'{"mat_jindan_3":4,"mat_jindan_4":3}'::jsonb,300,'/assets/pills/realm_jindan.webp','金丹期','丹谱于金丹期对应区域游历收录；所需两味材料均在该区域获得。',33),
('boost_jindan_late','丹火圆真丹','breakthrough','epic','金丹期后期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.12,"realm_code":"jindan_late"}'::jsonb,'{"mat_jindan_5":4,"mat_jindan_6":3}'::jsonb,300,'/assets/pills/realm_jindan.webp','金丹期','丹谱于金丹期对应区域游历收录；所需两味材料均在该区域获得。',33),
('boost_yuanying_early','婴息承脉丹','breakthrough','epic','元婴期初期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.1,"realm_code":"yuanying_early"}'::jsonb,'{"mat_yuanying_1":4,"mat_yuanying_2":3}'::jsonb,320,'/assets/pills/realm_yuanying.webp','元婴期','丹谱于元婴期对应区域游历收录；所需两味材料均在该区域获得。',37),
('boost_yuanying_mid','婴息贯玄丹','breakthrough','epic','元婴期中期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.11,"realm_code":"yuanying_mid"}'::jsonb,'{"mat_yuanying_3":4,"mat_yuanying_4":3}'::jsonb,320,'/assets/pills/realm_yuanying.webp','元婴期','丹谱于元婴期对应区域游历收录；所需两味材料均在该区域获得。',37),
('boost_yuanying_late','婴息圆真丹','breakthrough','epic','元婴期后期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.12,"realm_code":"yuanying_late"}'::jsonb,'{"mat_yuanying_5":4,"mat_yuanying_6":3}'::jsonb,320,'/assets/pills/realm_yuanying.webp','元婴期','丹谱于元婴期对应区域游历收录；所需两味材料均在该区域获得。',37),
('boost_huashen_early','法相承脉丹','breakthrough','legendary','化神期初期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.1,"realm_code":"huashen_early"}'::jsonb,'{"mat_huashen_1":4,"mat_huashen_2":3}'::jsonb,340,'/assets/pills/realm_huashen.webp','化神期','丹谱于化神期对应区域游历收录；所需两味材料均在该区域获得。',41),
('boost_huashen_mid','法相贯玄丹','breakthrough','legendary','化神期中期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.11,"realm_code":"huashen_mid"}'::jsonb,'{"mat_huashen_3":4,"mat_huashen_4":3}'::jsonb,340,'/assets/pills/realm_huashen.webp','化神期','丹谱于化神期对应区域游历收录；所需两味材料均在该区域获得。',41),
('boost_huashen_late','法相圆真丹','breakthrough','legendary','化神期后期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.12,"realm_code":"huashen_late"}'::jsonb,'{"mat_huashen_5":4,"mat_huashen_6":3}'::jsonb,340,'/assets/pills/realm_huashen.webp','化神期','丹谱于化神期对应区域游历收录；所需两味材料均在该区域获得。',41),
('boost_dacheng_early','渡劫承脉丹','breakthrough','legendary','大乘期初期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.1,"realm_code":"dacheng_early"}'::jsonb,'{"mat_dacheng_1":5,"mat_dacheng_2":4}'::jsonb,360,'/assets/pills/realm_dacheng.webp','大乘期','丹谱于大乘期对应区域游历收录；所需两味材料均在该区域获得。',45),
('boost_dacheng_mid','渡劫贯玄丹','breakthrough','legendary','大乘期中期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.11,"realm_code":"dacheng_mid"}'::jsonb,'{"mat_dacheng_3":5,"mat_dacheng_4":4}'::jsonb,360,'/assets/pills/realm_dacheng.webp','大乘期','丹谱于大乘期对应区域游历收录；所需两味材料均在该区域获得。',45),
('boost_dacheng_late','渡劫圆真丹','breakthrough','legendary','大乘期后期专用增幅丹。冲击下一小境界时提供有限助力，不替代功法、器装与风险承担。','{"breakthrough_rate":0.12,"realm_code":"dacheng_late"}'::jsonb,'{"mat_dacheng_5":5,"mat_dacheng_6":4}'::jsonb,360,'/assets/pills/realm_dacheng.webp','大乘期','丹谱于大乘期对应区域游历收录；所需两味材料均在该区域获得。',45)
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,rarity=EXCLUDED.rarity,description=EXCLUDED.description,effect=EXCLUDED.effect,recipe=EXCLUDED.recipe,craft_time_s=EXCLUDED.craft_time_s,image_url=EXCLUDED.image_url,major_realm=EXCLUDED.major_realm,source_description=EXCLUDED.source_description,required_order=EXCLUDED.required_order;

INSERT INTO items (code,name,type,rarity,description,effect,recipe,craft_time_s,image_url,major_realm,source_description,required_order) VALUES
('boss_core_luoxia','凡尘首领真髓','boss_material','uncommon','luoxia守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。',NULL,NULL,0,NULL,'凡人','击败凡人对应副本的守关首领必定获得。',0),
('boss_core_qingyun_foothill','铜皮首领真髓','boss_material','uncommon','qingyun_foothill守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。',NULL,NULL,0,NULL,'练皮境','击败练皮境对应副本的守关首领必定获得。',4),
('boss_core_blackstone_forest','铁骨首领真髓','boss_material','uncommon','blackstone_forest守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。',NULL,NULL,0,NULL,'练骨境','击败练骨境对应副本的守关首领必定获得。',8),
('boss_core_mist_forest','玉筋首领真髓','boss_material','rare','mist_forest守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。',NULL,NULL,0,NULL,'易筋境','击败易筋境对应副本的守关首领必定获得。',12),
('boss_core_clear_spring_cliff','净髓首领真髓','boss_material','rare','clear_spring_cliff守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。',NULL,NULL,0,NULL,'洗髓境','击败洗髓境对应副本的守关首领必定获得。',16),
('boss_core_red_maple_valley','赤血首领真髓','boss_material','rare','red_maple_valley守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。',NULL,NULL,0,NULL,'换血境','击败换血境对应副本的守关首领必定获得。',20),
('boss_core_mirror_lake','天感首领真髓','boss_material','epic','mirror_lake守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。',NULL,NULL,0,NULL,'天人境','击败天人境对应副本的守关首领必定获得。',24),
('boss_core_spirit_vein_valley','灵息首领真髓','boss_material','epic','spirit_vein_valley守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。',NULL,NULL,0,NULL,'炼气期','击败炼气期对应副本的守关首领必定获得。',28),
('boss_core_sect_outer_court','道基首领真髓','boss_material','epic','sect_outer_court守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。',NULL,NULL,0,NULL,'筑基期','击败筑基期对应副本的守关首领必定获得。',32),
('boss_core_alchemy_peak','丹火首领真髓','boss_material','legendary','alchemy_peak守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。',NULL,NULL,0,NULL,'金丹期','击败金丹期对应副本的守关首领必定获得。',36),
('boss_core_ancient_soul_ruins','婴息首领真髓','boss_material','legendary','ancient_soul_ruins守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。',NULL,NULL,0,NULL,'元婴期','击败元婴期对应副本的守关首领必定获得。',40),
('boss_core_law_abyss','法相首领真髓','boss_material','legendary','law_abyss守关首领的本命真髓，只能在击败该首领后获得，是大境界破境丹的核心药引。',NULL,NULL,0,NULL,'化神期','击败化神期对应副本的守关首领必定获得。',44)
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,rarity=EXCLUDED.rarity,description=EXCLUDED.description,major_realm=EXCLUDED.major_realm,source_description=EXCLUDED.source_description,required_order=EXCLUDED.required_order;

INSERT INTO items (code,name,type,rarity,description,effect,recipe,craft_time_s,image_url,major_realm,source_description,required_order) VALUES
('major_pill_mortal','凡尘启灵丹','major_breakthrough','uncommon','从凡人跨入练皮境的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。','{"breakthrough_rate":0.16,"realm_code":"mortal","major_breakthrough":true}'::jsonb,'{"boss_core_luoxia":1,"mat_mortal_1":4,"mat_mortal_2":3}'::jsonb,300,'/assets/pills/realm_mortal.webp','凡人','首次击败凡人守关首领后领悟丹谱；核心药引仅由该首领掉落。',0),
('major_pill_lianpi','铜皮铸骨丹','major_breakthrough','uncommon','从练皮境跨入练骨境的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。','{"breakthrough_rate":0.16,"realm_code":"lianpi_full","major_breakthrough":true}'::jsonb,'{"boss_core_qingyun_foothill":1,"mat_lianpi_1":4,"mat_lianpi_2":3}'::jsonb,345,'/assets/pills/realm_lianpi.webp','练皮境','首次击败练皮境守关首领后领悟丹谱；核心药引仅由该首领掉落。',4),
('major_pill_lianggu','铁骨易筋丹','major_breakthrough','uncommon','从练骨境跨入易筋境的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。','{"breakthrough_rate":0.16,"realm_code":"lianggu_full","major_breakthrough":true}'::jsonb,'{"boss_core_blackstone_forest":1,"mat_lianggu_1":4,"mat_lianggu_2":3}'::jsonb,390,'/assets/pills/realm_lianggu.webp','练骨境','首次击败练骨境守关首领后领悟丹谱；核心药引仅由该首领掉落。',8),
('major_pill_yijin','玉筋洗髓丹','major_breakthrough','rare','从易筋境跨入洗髓境的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。','{"breakthrough_rate":0.16,"realm_code":"yijin_full","major_breakthrough":true}'::jsonb,'{"boss_core_mist_forest":1,"mat_yijin_1":5,"mat_yijin_2":3}'::jsonb,435,'/assets/pills/realm_yijin.webp','易筋境','首次击败易筋境守关首领后领悟丹谱；核心药引仅由该首领掉落。',12),
('major_pill_xisui','净髓换血丹','major_breakthrough','rare','从洗髓境跨入换血境的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。','{"breakthrough_rate":0.16,"realm_code":"xisui_full","major_breakthrough":true}'::jsonb,'{"boss_core_clear_spring_cliff":1,"mat_xisui_1":5,"mat_xisui_2":4}'::jsonb,480,'/assets/pills/realm_xisui.webp','洗髓境','首次击败洗髓境守关首领后领悟丹谱；核心药引仅由该首领掉落。',16),
('major_pill_huanxue','赤血感天丹','major_breakthrough','rare','从换血境跨入天人境的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。','{"breakthrough_rate":0.16,"realm_code":"huanxue_full","major_breakthrough":true}'::jsonb,'{"boss_core_red_maple_valley":1,"mat_huanxue_1":5,"mat_huanxue_2":4}'::jsonb,525,'/assets/pills/realm_huanxue.webp','换血境','首次击败换血境守关首领后领悟丹谱；核心药引仅由该首领掉落。',20),
('major_pill_tianren','天人引气丹','major_breakthrough','epic','从天人境跨入炼气期的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。','{"breakthrough_rate":0.16,"realm_code":"tianren_full","major_breakthrough":true}'::jsonb,'{"boss_core_mirror_lake":1,"mat_tianren_1":6,"mat_tianren_2":4}'::jsonb,570,'/assets/pills/realm_tianren.webp','天人境','首次击败天人境守关首领后领悟丹谱；核心药引仅由该首领掉落。',24),
('major_pill_lianqi','灵息筑基丹','major_breakthrough','epic','从炼气期跨入筑基期的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。','{"breakthrough_rate":0.16,"realm_code":"lianqi_full","major_breakthrough":true}'::jsonb,'{"boss_core_spirit_vein_valley":1,"mat_lianqi_1":6,"mat_lianqi_2":4}'::jsonb,615,'/assets/pills/realm_lianqi.webp','炼气期','首次击败炼气期守关首领后领悟丹谱；核心药引仅由该首领掉落。',28),
('major_pill_zhujia','道基抱丹丸','major_breakthrough','epic','从筑基期跨入金丹期的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。','{"breakthrough_rate":0.16,"realm_code":"zhujia_full","major_breakthrough":true}'::jsonb,'{"boss_core_sect_outer_court":1,"mat_zhujia_1":6,"mat_zhujia_2":5}'::jsonb,660,'/assets/pills/realm_zhujia.webp','筑基期','首次击败筑基期守关首领后领悟丹谱；核心药引仅由该首领掉落。',32),
('major_pill_jindan','金丹育婴丹','major_breakthrough','legendary','从金丹期跨入元婴期的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。','{"breakthrough_rate":0.16,"realm_code":"jindan_full","major_breakthrough":true}'::jsonb,'{"boss_core_alchemy_peak":1,"mat_jindan_1":7,"mat_jindan_2":5}'::jsonb,705,'/assets/pills/realm_jindan.webp','金丹期','首次击败金丹期守关首领后领悟丹谱；核心药引仅由该首领掉落。',36),
('major_pill_yuanying','婴息化神丹','major_breakthrough','legendary','从元婴期跨入化神期的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。','{"breakthrough_rate":0.16,"realm_code":"yuanying_full","major_breakthrough":true}'::jsonb,'{"boss_core_ancient_soul_ruins":1,"mat_yuanying_1":7,"mat_yuanying_2":5}'::jsonb,750,'/assets/pills/realm_yuanying.webp','元婴期','首次击败元婴期守关首领后领悟丹谱；核心药引仅由该首领掉落。',40),
('major_pill_huashen','法相渡劫丹','major_breakthrough','legendary','从化神期跨入大乘期的必备破境丹。药引源自守关首领，服下后仍需承受破境失败风险。','{"breakthrough_rate":0.16,"realm_code":"huashen_full","major_breakthrough":true}'::jsonb,'{"boss_core_law_abyss":1,"mat_huashen_1":7,"mat_huashen_2":5}'::jsonb,795,'/assets/pills/realm_huashen.webp','化神期','首次击败化神期守关首领后领悟丹谱；核心药引仅由该首领掉落。',44)
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,rarity=EXCLUDED.rarity,description=EXCLUDED.description,effect=EXCLUDED.effect,recipe=EXCLUDED.recipe,craft_time_s=EXCLUDED.craft_time_s,image_url=EXCLUDED.image_url,major_realm=EXCLUDED.major_realm,source_description=EXCLUDED.source_description,required_order=EXCLUDED.required_order;

INSERT INTO character_recipes(character_id,item_id)
SELECT c.id,i.id FROM characters c JOIN realms r ON r.id=c.realm_id JOIN items i ON i.code='boost_' || r.code
ON CONFLICT DO NOTHING;

INSERT INTO shop_goods(item_id,price,required_order)
SELECT id, CASE rarity WHEN 'legendary' THEN 900 WHEN 'epic' THEN 360 WHEN 'rare' THEN 140 WHEN 'uncommon' THEN 55 ELSE 18 END + required_order*4, required_order
FROM items WHERE type='material' AND code LIKE 'mat_%'
ON CONFLICT(item_id) DO UPDATE SET price=EXCLUDED.price,required_order=EXCLUDED.required_order,active=TRUE;
INSERT INTO shop_goods(item_id,price,required_order)
SELECT id, 60+required_order*8, required_order FROM items WHERE code LIKE 'stamina_pill_%'
ON CONFLICT(item_id) DO UPDATE SET price=EXCLUDED.price,required_order=EXCLUDED.required_order,active=TRUE;

UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 4 WHEN 'epic' THEN 3 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 1 ELSE 1 END ELSE CASE rarity WHEN 'legendary' THEN 1 WHEN 'epic' THEN 0 WHEN 'rare' THEN 0 WHEN 'uncommon' THEN 0 ELSE 0 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 2 WHEN 'epic' THEN 1 WHEN 'rare' THEN 1 WHEN 'uncommon' THEN 1 ELSE 0 END ELSE CASE rarity WHEN 'legendary' THEN 0 WHEN 'epic' THEN 0 WHEN 'rare' THEN 0 WHEN 'uncommon' THEN 0 ELSE 0 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 42 WHEN 'epic' THEN 28 WHEN 'rare' THEN 18 WHEN 'uncommon' THEN 12 ELSE 8 END ELSE CASE rarity WHEN 'legendary' THEN 5 WHEN 'epic' THEN 3 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 2 ELSE 1 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 1 WHEN 'epic' THEN 1 WHEN 'rare' THEN 1 WHEN 'uncommon' THEN 0 ELSE 0 END ELSE CASE rarity WHEN 'legendary' THEN 1 WHEN 'epic' THEN 0 WHEN 'rare' THEN 0 WHEN 'uncommon' THEN 0 ELSE 0 END END
WHERE major_realm='凡人';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 85 WHEN 'elite' THEN 125 ELSE 200 END,
 atk=CASE rank WHEN 'normal' THEN 7 WHEN 'elite' THEN 8 ELSE 9 END,
 def=CASE rank WHEN 'normal' THEN 4 WHEN 'elite' THEN 5 ELSE 5 END,
 spd=CASE rank WHEN 'normal' THEN 9 WHEN 'elite' THEN 10 ELSE 11 END
WHERE area_code='luoxia';
UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 24 WHEN 'epic' THEN 16 WHEN 'rare' THEN 10 WHEN 'uncommon' THEN 7 ELSE 5 END ELSE CASE rarity WHEN 'legendary' THEN 3 WHEN 'epic' THEN 2 WHEN 'rare' THEN 1 WHEN 'uncommon' THEN 1 ELSE 1 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 11 WHEN 'epic' THEN 8 WHEN 'rare' THEN 5 WHEN 'uncommon' THEN 3 ELSE 2 END ELSE CASE rarity WHEN 'legendary' THEN 1 WHEN 'epic' THEN 1 WHEN 'rare' THEN 1 WHEN 'uncommon' THEN 0 ELSE 0 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 202 WHEN 'epic' THEN 134 WHEN 'rare' THEN 86 WHEN 'uncommon' THEN 58 ELSE 38 END ELSE CASE rarity WHEN 'legendary' THEN 24 WHEN 'epic' THEN 14 WHEN 'rare' THEN 10 WHEN 'uncommon' THEN 7 ELSE 5 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 5 WHEN 'epic' THEN 3 WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 2 ELSE 1 END ELSE CASE rarity WHEN 'legendary' THEN 2 WHEN 'epic' THEN 1 WHEN 'rare' THEN 1 WHEN 'uncommon' THEN 1 ELSE 0 END END
WHERE major_realm='练皮境';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 408 WHEN 'elite' THEN 600 ELSE 960 END,
 atk=CASE rank WHEN 'normal' THEN 39 WHEN 'elite' THEN 47 ELSE 48 END,
 def=CASE rank WHEN 'normal' THEN 19 WHEN 'elite' THEN 24 ELSE 27 END,
 spd=CASE rank WHEN 'normal' THEN 32 WHEN 'elite' THEN 36 ELSE 39 END
WHERE area_code='qingyun_foothill';
UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 208 WHEN 'epic' THEN 139 WHEN 'rare' THEN 89 WHEN 'uncommon' THEN 59 ELSE 40 END ELSE CASE rarity WHEN 'legendary' THEN 25 WHEN 'epic' THEN 15 WHEN 'rare' THEN 10 WHEN 'uncommon' THEN 7 ELSE 5 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 95 WHEN 'epic' THEN 63 WHEN 'rare' THEN 41 WHEN 'uncommon' THEN 27 ELSE 18 END ELSE CASE rarity WHEN 'legendary' THEN 11 WHEN 'epic' THEN 7 WHEN 'rare' THEN 5 WHEN 'uncommon' THEN 3 ELSE 2 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 1512 WHEN 'epic' THEN 1008 WHEN 'rare' THEN 648 WHEN 'uncommon' THEN 432 ELSE 288 END ELSE CASE rarity WHEN 'legendary' THEN 180 WHEN 'epic' THEN 108 WHEN 'rare' THEN 72 WHEN 'uncommon' THEN 54 ELSE 36 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 23 WHEN 'epic' THEN 16 WHEN 'rare' THEN 12 WHEN 'uncommon' THEN 8 ELSE 5 END ELSE CASE rarity WHEN 'legendary' THEN 11 WHEN 'epic' THEN 7 WHEN 'rare' THEN 5 WHEN 'uncommon' THEN 3 ELSE 2 END END
WHERE major_realm='练骨境';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 3060 WHEN 'elite' THEN 4500 ELSE 7200 END,
 atk=CASE rank WHEN 'normal' THEN 337 WHEN 'elite' THEN 406 ELSE 421 END,
 def=CASE rank WHEN 'normal' THEN 158 WHEN 'elite' THEN 203 ELSE 225 END,
 spd=CASE rank WHEN 'normal' THEN 158 WHEN 'elite' THEN 180 ELSE 194 END
WHERE area_code='blackstone_forest';
UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 1032 WHEN 'epic' THEN 688 WHEN 'rare' THEN 442 WHEN 'uncommon' THEN 295 ELSE 197 END ELSE CASE rarity WHEN 'legendary' THEN 123 WHEN 'epic' THEN 74 WHEN 'rare' THEN 49 WHEN 'uncommon' THEN 37 ELSE 25 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 465 WHEN 'epic' THEN 310 WHEN 'rare' THEN 199 WHEN 'uncommon' THEN 133 ELSE 89 END ELSE CASE rarity WHEN 'legendary' THEN 55 WHEN 'epic' THEN 33 WHEN 'rare' THEN 22 WHEN 'uncommon' THEN 17 ELSE 11 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 7258 WHEN 'epic' THEN 4838 WHEN 'rare' THEN 3110 WHEN 'uncommon' THEN 2074 ELSE 1382 END ELSE CASE rarity WHEN 'legendary' THEN 864 WHEN 'epic' THEN 518 WHEN 'rare' THEN 346 WHEN 'uncommon' THEN 259 ELSE 173 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 98 WHEN 'epic' THEN 68 WHEN 'rare' THEN 49 WHEN 'uncommon' THEN 34 ELSE 23 END ELSE CASE rarity WHEN 'legendary' THEN 45 WHEN 'epic' THEN 30 WHEN 'rare' THEN 19 WHEN 'uncommon' THEN 11 ELSE 8 END END
WHERE major_realm='易筋境';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 14688 WHEN 'elite' THEN 21600 ELSE 34560 END,
 atk=CASE rank WHEN 'normal' THEN 1671 WHEN 'elite' THEN 2015 ELSE 2088 END,
 def=CASE rank WHEN 'normal' THEN 775 WHEN 'elite' THEN 996 ELSE 1107 END,
 spd=CASE rank WHEN 'normal' THEN 665 WHEN 'elite' THEN 756 ELSE 816 END
WHERE area_code='mist_forest';
UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 4321 WHEN 'epic' THEN 2880 WHEN 'rare' THEN 1852 WHEN 'uncommon' THEN 1234 ELSE 823 END ELSE CASE rarity WHEN 'legendary' THEN 514 WHEN 'epic' THEN 309 WHEN 'rare' THEN 206 WHEN 'uncommon' THEN 154 ELSE 103 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 1939 WHEN 'epic' THEN 1293 WHEN 'rare' THEN 831 WHEN 'uncommon' THEN 554 ELSE 369 END ELSE CASE rarity WHEN 'legendary' THEN 231 WHEN 'epic' THEN 139 WHEN 'rare' THEN 92 WHEN 'uncommon' THEN 69 ELSE 46 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 29938 WHEN 'epic' THEN 19958 WHEN 'rare' THEN 12830 WHEN 'uncommon' THEN 8554 ELSE 5702 END ELSE CASE rarity WHEN 'legendary' THEN 3564 WHEN 'epic' THEN 2138 WHEN 'rare' THEN 1426 WHEN 'uncommon' THEN 1069 ELSE 713 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 379 WHEN 'epic' THEN 262 WHEN 'rare' THEN 190 WHEN 'uncommon' THEN 131 ELSE 87 END ELSE CASE rarity WHEN 'legendary' THEN 175 WHEN 'epic' THEN 117 WHEN 'rare' THEN 73 WHEN 'uncommon' THEN 44 ELSE 29 END END
WHERE major_realm='洗髓境';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 60588 WHEN 'elite' THEN 89100 ELSE 142560 END,
 atk=CASE rank WHEN 'normal' THEN 6995 WHEN 'elite' THEN 8435 ELSE 8744 END,
 def=CASE rank WHEN 'normal' THEN 3232 WHEN 'elite' THEN 4155 ELSE 4617 END,
 spd=CASE rank WHEN 'normal' THEN 2566 WHEN 'elite' THEN 2916 ELSE 3149 END
WHERE area_code='clear_spring_cliff';
UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 16636 WHEN 'epic' THEN 11091 WHEN 'rare' THEN 7130 WHEN 'uncommon' THEN 4753 ELSE 3169 END ELSE CASE rarity WHEN 'legendary' THEN 1980 WHEN 'epic' THEN 1188 WHEN 'rare' THEN 792 WHEN 'uncommon' THEN 594 ELSE 396 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 7450 WHEN 'epic' THEN 4967 WHEN 'rare' THEN 3193 WHEN 'uncommon' THEN 2129 ELSE 1419 END ELSE CASE rarity WHEN 'legendary' THEN 887 WHEN 'epic' THEN 532 WHEN 'rare' THEN 355 WHEN 'uncommon' THEN 266 ELSE 177 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 114307 WHEN 'epic' THEN 76205 WHEN 'rare' THEN 48989 WHEN 'uncommon' THEN 32659 ELSE 21773 END ELSE CASE rarity WHEN 'legendary' THEN 13608 WHEN 'epic' THEN 8165 WHEN 'rare' THEN 5443 WHEN 'uncommon' THEN 4082 ELSE 2722 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 1390 WHEN 'epic' THEN 962 WHEN 'rare' THEN 695 WHEN 'uncommon' THEN 481 ELSE 321 END ELSE CASE rarity WHEN 'legendary' THEN 642 WHEN 'epic' THEN 428 WHEN 'rare' THEN 267 WHEN 'uncommon' THEN 160 ELSE 107 END END
WHERE major_realm='换血境';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 231336 WHEN 'elite' THEN 340200 ELSE 544320 END,
 atk=CASE rank WHEN 'normal' THEN 26934 WHEN 'elite' THEN 32479 ELSE 33668 END,
 def=CASE rank WHEN 'normal' THEN 12417 WHEN 'elite' THEN 15965 ELSE 17739 END,
 spd=CASE rank WHEN 'normal' THEN 9409 WHEN 'elite' THEN 10692 ELSE 11547 END
WHERE area_code='red_maple_valley';
UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 60930 WHEN 'epic' THEN 40620 WHEN 'rare' THEN 26113 WHEN 'uncommon' THEN 17409 ELSE 11606 END ELSE CASE rarity WHEN 'legendary' THEN 7254 WHEN 'epic' THEN 4352 WHEN 'rare' THEN 2901 WHEN 'uncommon' THEN 2176 ELSE 1451 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 27250 WHEN 'epic' THEN 18167 WHEN 'rare' THEN 11679 WHEN 'uncommon' THEN 7786 ELSE 5190 END ELSE CASE rarity WHEN 'legendary' THEN 3244 WHEN 'epic' THEN 1946 WHEN 'rare' THEN 1298 WHEN 'uncommon' THEN 973 ELSE 649 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 416405 WHEN 'epic' THEN 277603 WHEN 'rare' THEN 178459 WHEN 'uncommon' THEN 118973 ELSE 79315 END ELSE CASE rarity WHEN 'legendary' THEN 49572 WHEN 'epic' THEN 29743 WHEN 'rare' THEN 19829 WHEN 'uncommon' THEN 14872 ELSE 9914 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 4928 WHEN 'epic' THEN 3412 WHEN 'rare' THEN 2464 WHEN 'uncommon' THEN 1706 ELSE 1137 END ELSE CASE rarity WHEN 'legendary' THEN 2274 WHEN 'epic' THEN 1516 WHEN 'rare' THEN 948 WHEN 'uncommon' THEN 569 ELSE 379 END END
WHERE major_realm='天人境';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 842724 WHEN 'elite' THEN 1239300 ELSE 1982880 END,
 atk=CASE rank WHEN 'normal' THEN 98648 WHEN 'elite' THEN 118958 ELSE 123310 END,
 def=CASE rank WHEN 'normal' THEN 45417 WHEN 'elite' THEN 58393 ELSE 64881 END,
 spd=CASE rank WHEN 'normal' THEN 33359 WHEN 'elite' THEN 37908 ELSE 40941 END
WHERE area_code='mirror_lake';
UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 215857 WHEN 'epic' THEN 143905 WHEN 'rare' THEN 92510 WHEN 'uncommon' THEN 61673 ELSE 41116 END ELSE CASE rarity WHEN 'legendary' THEN 25697 WHEN 'epic' THEN 15418 WHEN 'rare' THEN 10279 WHEN 'uncommon' THEN 7709 ELSE 5139 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 96447 WHEN 'epic' THEN 64298 WHEN 'rare' THEN 41334 WHEN 'uncommon' THEN 27556 ELSE 18371 END ELSE CASE rarity WHEN 'legendary' THEN 11482 WHEN 'epic' THEN 6889 WHEN 'rare' THEN 4593 WHEN 'uncommon' THEN 3445 ELSE 2296 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 1469664 WHEN 'epic' THEN 979776 WHEN 'rare' THEN 629856 WHEN 'uncommon' THEN 419904 ELSE 279936 END ELSE CASE rarity WHEN 'legendary' THEN 174960 WHEN 'epic' THEN 104976 WHEN 'rare' THEN 69984 WHEN 'uncommon' THEN 52488 ELSE 34992 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 17059 WHEN 'epic' THEN 11810 WHEN 'rare' THEN 8529 WHEN 'uncommon' THEN 5905 ELSE 3937 END ELSE CASE rarity WHEN 'legendary' THEN 7873 WHEN 'epic' THEN 5249 WHEN 'rare' THEN 3281 WHEN 'uncommon' THEN 1968 ELSE 1312 END END
WHERE major_realm='炼气期';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 2974320 WHEN 'elite' THEN 4374000 ELSE 6998400 END,
 atk=CASE rank WHEN 'normal' THEN 349483 WHEN 'elite' THEN 421435 ELSE 436853 END,
 def=CASE rank WHEN 'normal' THEN 160745 WHEN 'elite' THEN 206672 ELSE 229635 END,
 spd=CASE rank WHEN 'normal' THEN 115474 WHEN 'elite' THEN 131220 ELSE 141718 END
WHERE area_code='spirit_vein_valley';
UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 746773 WHEN 'epic' THEN 497849 WHEN 'rare' THEN 320046 WHEN 'uncommon' THEN 213364 ELSE 142242 END ELSE CASE rarity WHEN 'legendary' THEN 88902 WHEN 'epic' THEN 53341 WHEN 'rare' THEN 35561 WHEN 'uncommon' THEN 26670 ELSE 17780 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 333430 WHEN 'epic' THEN 222287 WHEN 'rare' THEN 142899 WHEN 'uncommon' THEN 95266 ELSE 63510 END ELSE CASE rarity WHEN 'legendary' THEN 39694 WHEN 'epic' THEN 23816 WHEN 'rare' THEN 15878 WHEN 'uncommon' THEN 11908 ELSE 7939 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 5070341 WHEN 'epic' THEN 3380227 WHEN 'rare' THEN 2173003 WHEN 'uncommon' THEN 1448669 ELSE 965779 END ELSE CASE rarity WHEN 'legendary' THEN 603612 WHEN 'epic' THEN 362167 WHEN 'rare' THEN 241445 WHEN 'uncommon' THEN 181084 ELSE 120722 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 57999 WHEN 'epic' THEN 40153 WHEN 'rare' THEN 29000 WHEN 'uncommon' THEN 20077 ELSE 13384 END ELSE CASE rarity WHEN 'legendary' THEN 26769 WHEN 'epic' THEN 17846 WHEN 'rare' THEN 11154 WHEN 'uncommon' THEN 6692 ELSE 4461 END END
WHERE major_realm='筑基期';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 10261404 WHEN 'elite' THEN 15090300 ELSE 24144480 END,
 atk=CASE rank WHEN 'normal' THEN 1209061 WHEN 'elite' THEN 1457985 ELSE 1511326 END,
 def=CASE rank WHEN 'normal' THEN 555717 WHEN 'elite' THEN 714493 ELSE 793881 END,
 spd=CASE rank WHEN 'normal' THEN 392610 WHEN 'elite' THEN 446148 ELSE 481840 END
WHERE area_code='sect_outer_court';
UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 2537926 WHEN 'epic' THEN 1691951 WHEN 'rare' THEN 1087683 WHEN 'uncommon' THEN 725122 ELSE 483414 END ELSE CASE rarity WHEN 'legendary' THEN 302134 WHEN 'epic' THEN 181280 WHEN 'rare' THEN 120854 WHEN 'uncommon' THEN 90640 ELSE 60427 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 1132560 WHEN 'epic' THEN 755040 WHEN 'rare' THEN 485383 WHEN 'uncommon' THEN 323589 ELSE 215726 END ELSE CASE rarity WHEN 'legendary' THEN 134829 WHEN 'epic' THEN 80897 WHEN 'rare' THEN 53931 WHEN 'uncommon' THEN 40449 ELSE 26966 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 17195069 WHEN 'epic' THEN 11463379 WHEN 'rare' THEN 7369315 WHEN 'uncommon' THEN 4912877 ELSE 3275251 END ELSE CASE rarity WHEN 'legendary' THEN 2047032 WHEN 'epic' THEN 1228219 WHEN 'rare' THEN 818813 WHEN 'uncommon' THEN 614110 ELSE 409406 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 194468 WHEN 'epic' THEN 134632 WHEN 'rare' THEN 97234 WHEN 'uncommon' THEN 67316 ELSE 44877 END ELSE CASE rarity WHEN 'legendary' THEN 89754 WHEN 'epic' THEN 59836 WHEN 'rare' THEN 37398 WHEN 'uncommon' THEN 22439 ELSE 14959 END END
WHERE major_realm='金丹期';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 34799544 WHEN 'elite' THEN 51175800 ELSE 81881280 END,
 atk=CASE rank WHEN 'normal' THEN 4109023 WHEN 'elite' THEN 4954998 ELSE 5136279 END,
 def=CASE rank WHEN 'normal' THEN 1887600 WHEN 'elite' THEN 2426914 ELSE 2696571 END,
 spd=CASE rank WHEN 'normal' THEN 1316399 WHEN 'elite' THEN 1495908 ELSE 1615581 END
WHERE area_code='alchemy_peak';
UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 8506599 WHEN 'epic' THEN 5671066 WHEN 'rare' THEN 3645685 WHEN 'uncommon' THEN 2430457 ELSE 1620305 END ELSE CASE rarity WHEN 'legendary' THEN 1012690 WHEN 'epic' THEN 607614 WHEN 'rare' THEN 405076 WHEN 'uncommon' THEN 303807 ELSE 202538 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 3794489 WHEN 'epic' THEN 2529659 WHEN 'rare' THEN 1626209 WHEN 'uncommon' THEN 1084140 ELSE 722760 END ELSE CASE rarity WHEN 'legendary' THEN 451725 WHEN 'epic' THEN 271035 WHEN 'rare' THEN 180690 WHEN 'uncommon' THEN 135517 ELSE 90345 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 57537346 WHEN 'epic' THEN 38358230 WHEN 'rare' THEN 24658862 WHEN 'uncommon' THEN 16439242 ELSE 10959494 END ELSE CASE rarity WHEN 'legendary' THEN 6849684 WHEN 'epic' THEN 4109810 WHEN 'rare' THEN 2739874 WHEN 'uncommon' THEN 2054905 ELSE 1369937 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 644815 WHEN 'epic' THEN 446410 WHEN 'rare' THEN 322408 WHEN 'uncommon' THEN 223205 ELSE 148803 END ELSE CASE rarity WHEN 'legendary' THEN 297607 WHEN 'epic' THEN 198405 WHEN 'rare' THEN 124003 WHEN 'uncommon' THEN 74402 ELSE 49601 END END
WHERE major_realm='元婴期';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 116444628 WHEN 'elite' THEN 171242100 ELSE 273987360 END,
 atk=CASE rank WHEN 'normal' THEN 13772589 WHEN 'elite' THEN 16608122 ELSE 17215736 END,
 def=CASE rank WHEN 'normal' THEN 6324148 WHEN 'elite' THEN 8131047 ELSE 9034497 END,
 spd=CASE rank WHEN 'normal' THEN 4364902 WHEN 'elite' THEN 4960116 ELSE 5356925 END
WHERE area_code='ancient_soul_ruins';
UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 28198259 WHEN 'epic' THEN 18798840 WHEN 'rare' THEN 12084968 WHEN 'uncommon' THEN 8056646 ELSE 5371097 END ELSE CASE rarity WHEN 'legendary' THEN 3356936 WHEN 'epic' THEN 2014161 WHEN 'rare' THEN 1342774 WHEN 'uncommon' THEN 1007081 ELSE 671387 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 12573894 WHEN 'epic' THEN 8382596 WHEN 'rare' THEN 5388812 WHEN 'uncommon' THEN 3592541 ELSE 2395027 END ELSE CASE rarity WHEN 'legendary' THEN 1496892 WHEN 'epic' THEN 898135 WHEN 'rare' THEN 598757 WHEN 'uncommon' THEN 449068 ELSE 299378 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 190468454 WHEN 'epic' THEN 126978970 WHEN 'rare' THEN 81629338 WHEN 'uncommon' THEN 54419558 ELSE 36279706 END ELSE CASE rarity WHEN 'legendary' THEN 22674816 WHEN 'epic' THEN 13604890 WHEN 'rare' THEN 9069926 WHEN 'uncommon' THEN 6802445 ELSE 4534963 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 2118678 WHEN 'epic' THEN 1466777 WHEN 'rare' THEN 1059339 WHEN 'uncommon' THEN 733389 ELSE 488926 END ELSE CASE rarity WHEN 'legendary' THEN 977851 WHEN 'epic' THEN 651901 WHEN 'rare' THEN 407438 WHEN 'uncommon' THEN 244463 ELSE 162975 END END
WHERE major_realm='化神期';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 385471872 WHEN 'elite' THEN 566870400 ELSE 906992640 END,
 atk=CASE rank WHEN 'normal' THEN 45654325 WHEN 'elite' THEN 55053745 ELSE 57067906 END,
 def=CASE rank WHEN 'normal' THEN 20956490 WHEN 'elite' THEN 26944059 ELSE 29937843 END,
 spd=CASE rank WHEN 'normal' THEN 14341821 WHEN 'elite' THEN 16297524 ELSE 17601326 END
WHERE area_code='law_abyss';
UPDATE equipment SET
 attack_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 92630166 WHEN 'epic' THEN 61753444 WHEN 'rare' THEN 39698643 WHEN 'uncommon' THEN 26465762 ELSE 17643841 END ELSE CASE rarity WHEN 'legendary' THEN 11027401 WHEN 'epic' THEN 6616440 WHEN 'rare' THEN 4410960 WHEN 'uncommon' THEN 3308220 ELSE 2205480 END END,
 defense_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 41292966 WHEN 'epic' THEN 27528644 WHEN 'rare' THEN 17696985 WHEN 'uncommon' THEN 11797990 ELSE 7865327 END ELSE CASE rarity WHEN 'legendary' THEN 4915829 WHEN 'epic' THEN 2949498 WHEN 'rare' THEN 1966332 WHEN 'uncommon' THEN 1474749 ELSE 983166 END END,
 hp_bonus=CASE combat_role WHEN 'defense' THEN CASE rarity WHEN 'legendary' THEN 624974616 WHEN 'epic' THEN 416649744 WHEN 'rare' THEN 267846264 WHEN 'uncommon' THEN 178564176 ELSE 119042784 END ELSE CASE rarity WHEN 'legendary' THEN 74401740 WHEN 'epic' THEN 44641044 WHEN 'rare' THEN 29760696 WHEN 'uncommon' THEN 22320522 ELSE 14880348 END END,
 speed_bonus=CASE combat_role WHEN 'attack' THEN CASE rarity WHEN 'legendary' THEN 6908733 WHEN 'epic' THEN 4782969 WHEN 'rare' THEN 3454367 WHEN 'uncommon' THEN 2391485 ELSE 1594323 END ELSE CASE rarity WHEN 'legendary' THEN 3188646 WHEN 'epic' THEN 2125764 WHEN 'rare' THEN 1328603 WHEN 'uncommon' THEN 797162 ELSE 531441 END END
WHERE major_realm='大乘期';
UPDATE enemies SET
 hp=CASE rank WHEN 'normal' THEN 1264829580 WHEN 'elite' THEN 1860043500 ELSE 2976069600 END,
 atk=CASE rank WHEN 'normal' THEN 149972650 WHEN 'elite' THEN 180849372 ELSE 187465813 END,
 def=CASE rank WHEN 'normal' THEN 68821610 WHEN 'elite' THEN 88484927 ELSE 98316585 END,
 spd=CASE rank WHEN 'normal' THEN 46766808 WHEN 'elite' THEN 53144100 ELSE 57395628 END
WHERE area_code='heaven_gate';
