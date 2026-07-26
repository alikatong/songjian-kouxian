-- 为已有角色补齐三张初始丹谱所需的凡人材料。
INSERT INTO inventories (character_id, item_id, quantity)
SELECT c.id, i.id, 4 FROM characters c JOIN items i ON TRUE
WHERE i.code IN ('mat_mortal_1', 'mat_mortal_2', 'mat_mortal_3', 'mat_mortal_4', 'mat_mortal_5')
ON CONFLICT (character_id, item_id)
DO UPDATE SET quantity = GREATEST(inventories.quantity, EXCLUDED.quantity);
