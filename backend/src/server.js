const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app  = require('./app');
const PORT = process.env.PORT || 3001;

const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`缺少必要环境变量: ${missing.join(', ')}`);
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 64) {
  throw new Error('生产环境 JWT_SECRET 必须至少 64 个字符');
}

app.listen(PORT, () => {
  console.log(`松间叩仙后端已启动: http://localhost:${PORT}`);
  console.log(`   环境: ${process.env.NODE_ENV || 'development'}`);
});
