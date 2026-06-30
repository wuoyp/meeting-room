const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { verifyToken } = require('../config/auth');

// Tất cả route lịch họp yêu cầu đăng nhập
router.use(verifyToken);

function mapBooking(row) {
  return {
    id: row.Id,
    title: row.Title,
    members: row.Members,
    room: row.RoomId,
    roomName: row.RoomName || row.RoomId,
    date: formatDate(row.BookingDate),
    start: row.StartTime,
    end: row.EndTime,
    owner: row.Owner
  };
}

function formatDate(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function validatePayload(body) {
  const { title, members, room, date, start, end } = body;
  if (!title || !members || !room || !date || !start || !end) {
    return 'Vui lòng nhập đầy đủ thông tin lịch họp';
  }
  if (timeToMinutes(start) >= timeToMinutes(end)) {
    return 'Giờ kết thúc phải sau giờ bắt đầu';
  }
  if (isPastDateTime(date, start)) {
    return 'Không thể đặt phòng cho ngày/giờ trong quá khứ';
  }
  return null;
}

function isPastDateTime(date, start) {
  const now = new Date();
  const todayStr = formatDate(now);
  if (date < todayStr) return true;
  if (date === todayStr) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return timeToMinutes(start) < nowMin;
  }
  return false;
}

// GET /api/bookings - Lấy danh sách lịch họp
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT b.*, r."Name" AS "RoomName"
      FROM "Bookings" b
      LEFT JOIN "Rooms" r ON r."Id" = b."RoomId"
      ORDER BY b."BookingDate" ASC, b."StartTime" ASC
    `);
    res.json(result.rows.map(mapBooking));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách lịch họp' });
  }
});

// POST /api/bookings - Tạo lịch họp mới
router.post('/', async (req, res) => {
  const errMsg = validatePayload(req.body);
  if (errMsg) return res.status(400).json({ error: errMsg });

  const { title, members, room, date, start, end } = req.body;
  const owner = req.user.fullName;

  try {
    const pool = getPool();

    // Kiểm tra phòng có tồn tại
    const roomCheck = await pool.query('SELECT "Id", "Name" FROM "Rooms" WHERE "Id" = $1', [room]);
    if (!roomCheck.rows.length) {
      return res.status(400).json({ error: 'Phòng họp không tồn tại' });
    }
    const roomName = roomCheck.rows[0].Name;

    // Kiểm tra trùng lịch (cùng phòng, cùng ngày, khung giờ giao nhau)
    const conflict = await pool.query(
      `SELECT "Id" FROM "Bookings"
       WHERE "RoomId" = $1 AND "BookingDate" = $2
         AND "StartTime" < $4 AND "EndTime" > $3
       LIMIT 1`,
      [room, date, start, end]
    );
    if (conflict.rows.length) {
      return res.status(409).json({ error: 'Phòng đã được đặt trong khung giờ này' });
    }

    const result = await pool.query(
      `INSERT INTO "Bookings" ("Title", "Members", "RoomId", "BookingDate", "StartTime", "EndTime", "Owner")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, members, room, date, start, end, owner]
    );
    res.status(201).json(mapBooking({ ...result.rows[0], RoomName: roomName }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi tạo lịch họp' });
  }
});

// PUT /api/bookings/:id - Cập nhật lịch họp (chỉ chủ lịch hoặc Admin)
router.put('/:id', async (req, res) => {
  const errMsg = validatePayload(req.body);
  if (errMsg) return res.status(400).json({ error: errMsg });

  const { title, members, room, date, start, end } = req.body;
  const id = parseInt(req.params.id, 10);

  try {
    const pool = getPool();

    const existing = await pool.query('SELECT * FROM "Bookings" WHERE "Id" = $1', [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy lịch họp cần cập nhật' });
    }
    const current = existing.rows[0];
    if (current.Owner !== req.user.fullName && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền sửa lịch họp này' });
    }

    const conflict = await pool.query(
      `SELECT "Id" FROM "Bookings"
       WHERE "RoomId" = $1 AND "BookingDate" = $2
         AND "StartTime" < $4 AND "EndTime" > $3
         AND "Id" <> $5
       LIMIT 1`,
      [room, date, start, end, id]
    );
    if (conflict.rows.length) {
      return res.status(409).json({ error: 'Phòng đã được đặt trong khung giờ này' });
    }

    const result = await pool.query(
      `UPDATE "Bookings" SET
         "Title" = $1, "Members" = $2, "RoomId" = $3,
         "BookingDate" = $4, "StartTime" = $5, "EndTime" = $6,
         "UpdatedAt" = NOW()
       WHERE "Id" = $7
       RETURNING *`,
      [title, members, room, date, start, end, id]
    );
    const roomInfo = await pool.query('SELECT "Name" FROM "Rooms" WHERE "Id" = $1', [room]);
    const roomName = roomInfo.rows[0] && roomInfo.rows[0].Name;
    res.json(mapBooking({ ...result.rows[0], RoomName: roomName }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi cập nhật lịch họp' });
  }
});

// DELETE /api/bookings/:id - Xoá lịch họp (chỉ chủ lịch hoặc Admin)
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const pool = getPool();

    const existing = await pool.query('SELECT * FROM "Bookings" WHERE "Id" = $1', [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy lịch họp cần xoá' });
    }
    const current = existing.rows[0];
    if (current.Owner !== req.user.fullName && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền xoá lịch họp này' });
    }

    await pool.query('DELETE FROM "Bookings" WHERE "Id" = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi xoá lịch họp' });
  }
});

module.exports = router;
