const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { verifyToken, requireAdmin } = require('../config/auth');

const VALID_STATUS = ['Sẵn sàng', 'Đang hoạt động', 'Đang sửa'];

function mapRoom(row) {
  return {
    id: row.Id,
    name: row.Name,
    location: row.Location,
    capacity: row.Capacity,
    equipment: row.Equipment,
    status: row.Status,
    detail: `${row.Location} • ${row.Capacity} người` // dùng cho index.html (room-item-detail)
  };
}

// Tất cả route phòng họp yêu cầu đăng nhập
router.use(verifyToken);

// GET /api/rooms - Lấy danh sách phòng họp (mọi người dùng đã đăng nhập)
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM "Rooms" ORDER BY "Name" ASC');
    res.json(result.rows.map(mapRoom));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách phòng họp' });
  }
});

// GET /api/rooms/:id - Lấy chi tiết 1 phòng
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM "Rooms" WHERE "Id" = $1', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy phòng họp' });
    }
    res.json(mapRoom(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'ID phòng họp không hợp lệ' });
  }
});

// POST /api/rooms - Thêm phòng họp mới (chỉ Admin)
router.post('/', requireAdmin, async (req, res) => {
  const { name, location, capacity, equipment, status } = req.body;

  if (!name || !location || !capacity || !status) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin phòng họp' });
  }
  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: 'Trạng thái phòng không hợp lệ' });
  }
  if (isNaN(parseInt(capacity, 10)) || parseInt(capacity, 10) <= 0) {
    return res.status(400).json({ error: 'Sức chứa phải là số lớn hơn 0' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO "Rooms" ("Name", "Location", "Capacity", "Equipment", "Status")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, location, parseInt(capacity, 10), equipment || null, status]
    );
    res.status(201).json(mapRoom(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi thêm phòng họp' });
  }
});

// PUT /api/rooms/:id - Cập nhật phòng họp (chỉ Admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, location, capacity, equipment, status } = req.body;

  if (!name || !location || !capacity || !status) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin phòng họp' });
  }
  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: 'Trạng thái phòng không hợp lệ' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE "Rooms" SET
         "Name" = $1, "Location" = $2, "Capacity" = $3,
         "Equipment" = $4, "Status" = $5, "UpdatedAt" = NOW()
       WHERE "Id" = $6
       RETURNING *`,
      [name, location, parseInt(capacity, 10), equipment || null, status, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy phòng họp cần cập nhật' });
    }
    res.json(mapRoom(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Không thể cập nhật phòng họp (ID không hợp lệ?)' });
  }
});

// DELETE /api/rooms/:id - Xoá phòng họp (chỉ Admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const pool = getPool();

    // Không cho xoá phòng nếu vẫn còn lịch họp đang sử dụng phòng đó
    const checkBooking = await pool.query(
      'SELECT COUNT(*)::int AS cnt FROM "Bookings" WHERE "RoomId" = $1',
      [req.params.id]
    );
    if (checkBooking.rows[0].cnt > 0) {
      return res.status(400).json({ error: 'Không thể xoá phòng đang có lịch họp. Vui lòng xoá lịch họp liên quan trước.' });
    }

    const result = await pool.query('DELETE FROM "Rooms" WHERE "Id" = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phòng họp cần xoá' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Không thể xoá phòng họp' });
  }
});

module.exports = router;
