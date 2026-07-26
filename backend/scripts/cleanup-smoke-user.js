require('dotenv').config();
const { pool } = require('../src/config/db');

const username = process.argv[2];
if (!username || (!username.startsWith('ui_') && !username.startsWith('smoke_'))) {
  console.error('只允许清理 ui_ 或 smoke_ 前缀的验收账号');
  process.exit(1);
}

pool.query('DELETE FROM users WHERE username = $1 RETURNING username', [username])
  .then((result) => console.log(result.rowCount ? `已清理验收账号：${username}` : '验收账号不存在'))
  .catch((error) => {
    console.error(`清理失败：${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
