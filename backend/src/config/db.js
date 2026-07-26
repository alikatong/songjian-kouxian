const { Pool } = require('pg');

const schema = process.env.DB_SCHEMA || 'public';
if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) {
  throw new Error('DB_SCHEMA 只能包含字母、数字和下划线');
}

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // 生产环境 Aliyun RDS 通常不需要 SSL，保留开关
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  options: `-c search_path=${schema},public`,
  max: 10,               // 连接池最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('数据库连接池错误:', err.message);
});

/**
 * 封装 pool.query，方便统一调用
 * @param {string} text  SQL 语句
 * @param {Array}  params 参数列表
 */
const query = (text, params) => pool.query(text, params);

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction, schema };
