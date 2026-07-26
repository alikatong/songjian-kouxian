require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    const schema = process.env.DB_SCHEMA || process.env.DB_USER || 'public';
    const databaseUser = process.env.DB_USER;
    if (!/^[a-z_][a-z0-9_]*$/i.test(schema) || !/^[a-z_][a-z0-9_]*$/i.test(databaseUser)) {
      throw new Error('DB_SCHEMA 和 DB_USER 只能包含字母、数字和下划线');
    }
    if (schema !== 'public') {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}" AUTHORIZATION "${databaseUser}"`);
      await client.query(`SET search_path TO "${schema}", public`);
    }

    // 确保迁移版本记录表存在
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        run_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 读取 migrations/ 目录下所有 .sql 文件，按文件名排序
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = path.basename(file, '.sql');

      // 检查是否已执行
      const { rows } = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [version]
      );
      if (rows.length > 0) {
        console.log(`[跳过] ${file} （已执行）`);
        continue;
      }

      // 执行 SQL 文件
      console.log(`[执行] ${file} ...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        await client.query('COMMIT');
        console.log(`[完成] ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[失败] ${file}:`, err.message);
        throw err;
      }
    }

    console.log('\n✅ 所有迁移执行完毕');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});
