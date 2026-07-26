-- 功法的原离线加成改为主动闭关加成。旧列仅保留用于历史迁移兼容。
ALTER TABLE techniques
  ADD COLUMN IF NOT EXISTS retreat_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.0;

UPDATE techniques
SET retreat_multiplier = offline_multiplier;

-- 扩展功法中每组第 6 本原为离线吐纳流，现改为闭关流。
UPDATE techniques
SET description =
  CASE rarity
    WHEN 'common' THEN '凡品'
    WHEN 'uncommon' THEN '良品'
    WHEN 'rare' THEN '上品'
    WHEN 'epic' THEN '珍品'
    WHEN 'legendary' THEN '绝品'
    ELSE ''
  END || major_realm || '功法，以闭关修炼为要，修习后提升闭关效率，并形成独特的吐纳路数。'
WHERE code LIKE 'tech_%_006'
   OR code LIKE 'tech_%_016'
   OR code LIKE 'tech_%_026'
   OR code LIKE 'tech_%_036'
   OR code LIKE 'tech_%_046'
   OR code LIKE 'tech_%_056'
   OR code LIKE 'tech_%_066'
   OR code LIKE 'tech_%_076'
   OR code LIKE 'tech_%_086'
   OR code LIKE 'tech_%_096';

UPDATE techniques
SET description = '道家守一之法，心无旁骛，闭关修炼效果大幅提升。适合稳守洞府、长时参悟的修炼者。'
WHERE code = 'qingxin_wuwei';
