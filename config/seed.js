const bcrypt = require('bcryptjs');

const DEFAULT_ACCOUNTS = [
  {
    email: 'admin@techx.vn',
    password: 'Admin@123',
    fullName: 'Quản trị viên',
    address: 'Technology X, Hà Nội',
    gender: 'Nam',
    role: 'admin'
  },
  {
    email: 'user@techx.vn',
    password: 'User@123',
    fullName: 'Nguyễn Văn A',
    address: 'Technology X, Hà Nội',
    gender: 'Nam',
    role: 'user'
  }
];

async function ensureDefaultAccounts(pool) {
  const check = await pool.query('SELECT COUNT(*)::int AS cnt FROM "Users"');
  if (check.rows[0].cnt > 0) return;

  for (const acc of DEFAULT_ACCOUNTS) {
    const hash = bcrypt.hashSync(acc.password, 10);
    await pool.query(
      `INSERT INTO "Users" ("Email", "PasswordHash", "FullName", "Address", "Gender", "Role")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [acc.email, hash, acc.fullName, acc.address, acc.gender, acc.role]
    );
  }

  console.log('👤 Đã tạo tài khoản mặc định:');
  console.log('   Admin -> admin@techx.vn / Admin@123');
  console.log('   User  -> user@techx.vn / User@123');
  console.log('   ⚠️  Hãy đổi mật khẩu các tài khoản này khi triển khai thực tế!');
}

module.exports = { ensureDefaultAccounts };
