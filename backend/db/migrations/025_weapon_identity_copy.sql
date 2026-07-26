-- 武器主攻、护器主守：统一重建武器说明，避免旧护器语义残留。
UPDATE equipment
SET description =
  CASE rarity
    WHEN 'common' THEN '凡品'
    WHEN 'uncommon' THEN '良品'
    WHEN 'rare' THEN '上品'
    WHEN 'epic' THEN '珍品'
    WHEN 'legendary' THEN '绝品'
    ELSE ''
  END || major_realm || '武器，以' ||
  CASE weapon_type
    WHEN 'sword' THEN '均衡灵巧'
    WHEN 'saber' THEN '刚猛攻击'
    WHEN 'spear' THEN '破阵穿透'
    WHEN 'fan' THEN '轻灵攻势'
    WHEN 'staff' THEN '蓄势重击'
    ELSE '正面攻伐'
  END || '见长，攻击是其核心价值。数值遵循本境界装备预算，不会跨越境界形成碾压。'
WHERE combat_role = 'attack';
