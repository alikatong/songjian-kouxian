-- 炼器是稳定装备来源，基础炼材不能稀有到让系统失去可玩性。
UPDATE area_material_drops SET weight = 18000
WHERE item_id IN (SELECT id FROM items WHERE code LIKE 'forge_metal_%');

UPDATE area_material_drops SET weight = 14000
WHERE item_id IN (SELECT id FROM items WHERE code LIKE 'forge_hide_%');

UPDATE area_material_drops SET weight = 9000
WHERE item_id IN (SELECT id FROM items WHERE code LIKE 'forge_core_%');
