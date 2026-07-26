-- 清理旧版本将扇、杖误放进护器位留下的存档状态。
UPDATE character_equipment
SET equipped = FALSE, equipped_slot = NULL
WHERE equipped_slot = 'defense'
  AND equipment_id IN (SELECT id FROM equipment WHERE combat_role <> 'defense');
