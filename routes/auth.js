const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');
const { signToken, verifyToken } = require('../config/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return {
    id: user.Id,
    email: user.Email,
    fullName: user.FullName,
    address: user.Address,
    gender: user.Gender,
    role: user.Role
  };
}

// POST /api/auth/register - Đăng ký tài khoản (luôn tạo với role = 'user')
router.post('/register', async (req, res) => {
  const { fullName, address, gender, email, password } = req.body;

  if (!fullName || !address || !gender || !email || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin đăng ký' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Email không hợp lệ' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
  }

  try {
    const pool = getPool();

    const exists = await pool.query('SELECT "Id" FROM "Users" WHERE "Email" = $1', [email]);
    if (exists.rows.length) {
      return res.status(409).json({ error: 'Email này đã được đăng ký' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = await pool.query(
      `INSERT INTO "Users" ("Email", "PasswordHash", "FullName", "Address", "Gender", "Role")
       VALUES ($1, $2, $3, $4, $5, 'user')
       RETURNING *`,
      [email, hash, fullName, address, gender]
    );

    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi đăng ký' });
  }
});

// POST /api/auth/login - Đăng nhập
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
  }

  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM "Users" WHERE "Email" = $1', [email]);

    const user = result.rows[0];
    if (!user || !bcrypt.compareSync(password, user.PasswordHash)) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
  }
});

// GET /api/auth/me - Lấy thông tin tài khoản đang đăng nhập (theo token)
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
