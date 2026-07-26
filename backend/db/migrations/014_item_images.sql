-- 为规则化丹药绑定代码生成的 PNG 图标。
UPDATE items
SET image_url = '/assets/pills/' || code || '.png'
WHERE type = 'pill' AND code LIKE 'pill_%';
