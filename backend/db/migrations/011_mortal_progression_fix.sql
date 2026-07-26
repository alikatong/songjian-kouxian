-- 凡人也需要完成最初的感气积累，避免 0 灵气直接突破。
UPDATE realms SET qi_required = 500 WHERE code = 'mortal' AND qi_required = 0;
