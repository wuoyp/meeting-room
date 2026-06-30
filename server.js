const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { getPool } = require('./config/db');
const { ensureDefaultAccounts } = require('./config/seed');

const authRouter = require('./routes/auth');
const roomsRouter = require('./routes/rooms');
const bookingsRouter = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Phục vụ giao diện tĩnh (3 trang HTML: login, đặt lịch, quản lý phòng)
app.use(express.static(path.join(__dirname, 'public')));

// API - Đăng ký / Đăng nhập
app.use('/api/auth', authRouter);
// API - Chức năng 1: Quản lý phòng họp (yêu cầu đăng nhập, ghi dữ liệu yêu cầu role admin)
app.use('/api/rooms', roomsRouter);
// API - Chức năng 2: Đặt lịch họp (yêu cầu đăng nhập)
app.use('/api/bookings', bookingsRouter);

// Trang đăng nhập / đăng ký
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Trang Đặt lịch họp (mặc định)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Trang Quản lý phòng họp
app.get('/quan-ly-phong-hop.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quan-ly-phong-hop.html'));
});

// Trang Quản lý đặt phòng (Admin)
app.get('/quan-ly-dat-phong.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quan-ly-dat-phong.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Không tìm thấy endpoint' });
});

async function start() {
  try {
    const pool = await getPool();
    await ensureDefaultAccounts(pool);
  } catch (err) {
    console.error('⚠️  Không thể khởi tạo tài khoản admin mặc định:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  });
}

// Khi chạy local (node server.js / npm start) thì start() bình thường.
// Khi deploy lên Vercel, file api/index.js sẽ import "app" trực tiếp
// (không gọi app.listen vì Vercel tự quản lý việc nhận request).
if (require.main === module) {
  start();
} else {
  // Vẫn cần đảm bảo có tài khoản mặc định khi chạy trên Vercel,
  // nhưng không block việc export app.
  try {
    const pool = getPool();
    ensureDefaultAccounts(pool).catch(err => {
      console.error('⚠️  Không thể khởi tạo tài khoản admin mặc định:', err.message);
    });
  } catch (err) {
    console.error('⚠️  Không thể khởi tạo kết nối database:', err.message);
  }
}

module.exports = app;