const { Pool } = require('pg');
require('dotenv').config();

// Hỗ trợ cả 2 cách cấu hình:
// 1) DATABASE_URL (Neon / Vercel Postgres tự cấp sẵn dạng connection string)
// 2) Từng biến rời: PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
const connectionString = process.env.DATABASE_URL;

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: { rejectUnauthorized: false } // Neon/Vercel Postgres yêu cầu SSL
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      database: process.env.PGDATABASE || 'meeting_room_db',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      ssl: (process.env.PGSSL || 'false') === 'true' ? { rejectUnauthorized: false } : false
    };

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool(poolConfig);
    pool.on('error', err => {
      console.error('❌ Lỗi không mong muốn từ Postgres pool:', err.message);
    });
    console.log('✅ Đã khởi tạo kết nối Postgres');
  }
  return pool;
}

module.exports = { getPool };
