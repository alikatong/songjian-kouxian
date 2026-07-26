const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { query, pool } = require('../src/config/db');

async function main() {
  const [usernameArg, passwordArg, displayNameArg, roleArg = 'owner'] = process.argv.slice(2);
  const username = String(usernameArg || '').trim();
  const password = String(passwordArg || '');
  const displayName = String(displayNameArg || username).trim();
  const role = String(roleArg || 'owner').trim();
  if (!/^[A-Za-z0-9_.-]{3,50}$/.test(username)) throw new Error('管理员账号需要 3-50 位字母、数字、点、横线或下划线');
  if (password.length < 12 || password.length > 128) throw new Error('管理员密码需要 12-128 个字符');
  if (!['owner', 'operator', 'support', 'auditor'].includes(role)) throw new Error('角色必须是 owner/operator/support/auditor');
  const hash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO admin_users (username, password_hash, display_name, role)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (username) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           display_name = EXCLUDED.display_name,
           role = EXCLUDED.role,
           active = TRUE,
           token_version = admin_users.token_version + 1,
           updated_at = NOW()
     RETURNING id, username, display_name, role`,
    [username, hash, displayName, role]
  );
  console.log(`管理员已创建或更新: ${result.rows[0].username} (${result.rows[0].role})`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
