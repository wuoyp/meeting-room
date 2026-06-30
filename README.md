# Hệ thống Quản lý & Đặt lịch Phòng họp

Ứng dụng Node.js (Express) + PostgreSQL gồm **2 chức năng chính** + **Đăng ký/Đăng nhập phân quyền**:

1. **Quản lý phòng họp** (`quan-ly-phong-hop.html`) — Chỉ **Admin** mới truy cập được. Thêm / Sửa / Xoá / Tìm kiếm / Lọc / Phân trang danh sách phòng họp.
2. **Đặt lịch họp** (`index.html`) — Mọi tài khoản đã đăng nhập (Admin & User) đều dùng được: xem lịch theo Ngày/Tuần/Tháng/Năm, đặt phòng, kiểm tra trùng lịch tự động. User chỉ sửa/xoá được lịch họp do chính mình tạo; Admin sửa/xoá được mọi lịch.
3. **Đăng ký / Đăng nhập** (`login.html`, `signup.html`) — Giao diện theo mẫu thiết kế TechX, đăng nhập bằng **Email + Mật khẩu** (có "Ghi nhớ đăng nhập", "Quên mật khẩu" và nút Google chỉ hiển thị, chưa hoạt động). Đăng ký yêu cầu Họ & tên, Địa chỉ, Giới tính, Email, Mật khẩu, đồng ý Điều khoản — tài khoản mới luôn ở vai trò **User**.

## Cấu trúc project

```
meeting-room-app/
├── config/
│   ├── db.js              # Kết nối PostgreSQL (connection pool, pg)
│   ├── auth.js             # Sinh/giải mã JWT, middleware verifyToken & requireAdmin
│   └── seed.js             # Tự tạo tài khoản admin mặc định khi khởi động lần đầu
├── routes/
│   ├── auth.js              # API đăng ký / đăng nhập / lấy thông tin user hiện tại
│   ├── rooms.js              # API CRUD phòng họp (đọc: cần login, ghi: chỉ Admin)
│   └── bookings.js           # API CRUD lịch họp (cần login, check trùng giờ, check quyền sở hữu)
├── public/
│   ├── login.html                 # Trang đăng nhập / đăng ký
│   ├── index.html                  # Trang đặt lịch họp
│   ├── quan-ly-phong-hop.html      # Trang quản lý phòng họp (chỉ Admin)
│   └── auth-guard.js                # Script dùng chung: bảo vệ trang, gắn JWT vào fetch, hiển thị user/logout
├── sql/
│   └── init.sql            # Script tạo Database + Table (Users, Rooms, Bookings) + dữ liệu mẫu
├── server.js                # Khởi động Express server
├── package.json
└── .env.example
```

## Bước 1 — Cài đặt PostgreSQL

1. Dùng PostgreSQL local (cài trực tiếp hoặc qua Docker `postgres:16`), hoặc dùng dịch vụ managed miễn phí như Neon (neon.tech) / Vercel Postgres — khuyên dùng nếu định deploy lên Vercel.
2. Mở `psql`, pgAdmin, hoặc SQL editor của Neon/Vercel, chạy file `sql/init.sql` để tạo các bảng `Users`, `Rooms`, `Bookings` và dữ liệu mẫu cho `Rooms`.

> Bảng `Users` được tạo trống. Tài khoản **admin mặc định** sẽ được ứng dụng **tự động tạo** khi chạy `npm start` lần đầu (xem Bước 3).

## Bước 2 — Cấu hình kết nối

```bash
cp .env.example .env
```

Cách dễ nhất: dán nguyên **connection string** Postgres (Neon/Vercel Postgres tự cấp sẵn) vào `DATABASE_URL`, đồng thời đổi `JWT_SECRET` thành một chuỗi bí mật ngẫu nhiên:

```
DATABASE_URL=postgres://user:password@host:5432/dbname
PORT=3000
JWT_SECRET=mot-chuoi-bi-mat-rat-dai-va-kho-doan
JWT_EXPIRES_IN=8h
```

Nếu chạy Postgres local không có `DATABASE_URL`, có thể khai báo rời `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSL` (xem `.env.example`).

## Bước 3 — Cài dependencies & chạy

```bash
npm install
npm start
```

Lần chạy đầu tiên (khi bảng `Users` đang trống), console sẽ in ra:
```
👤 Đã tạo tài khoản mặc định:
   Admin -> admin@techx.vn / Admin@123
   User  -> user@techx.vn / User@123
```
**Hãy đổi mật khẩu các tài khoản này ngay** khi triển khai thực tế (cập nhật trực tiếp trong CSDL hoặc tự bổ sung API đổi mật khẩu nếu cần).

Truy cập:
- Đăng nhập: http://localhost:3000/login.html
- Đăng ký: http://localhost:3000/signup.html
- Đặt lịch họp (sau khi đăng nhập): http://localhost:3000/
- Quản lý phòng họp (chỉ Admin): http://localhost:3000/quan-ly-phong-hop.html

## Phân quyền

| Hành động                          | User | Admin |
|-------------------------------------|------|-------|
| Đăng nhập / Xem lịch họp             | ✅   | ✅    |
| Tạo lịch họp mới                     | ✅   | ✅    |
| Sửa / Xoá lịch họp **của chính mình** | ✅   | ✅    |
| Sửa / Xoá lịch họp **của người khác** | ❌   | ✅    |
| Xem danh sách phòng họp               | ✅   | ✅    |
| Thêm / Sửa / Xoá phòng họp             | ❌   | ✅    |
| Truy cập trang Quản lý phòng họp        | ❌ (tự chuyển về trang chủ) | ✅ |

Mọi tài khoản đăng ký mới qua `signup.html` đều mặc định là **User**. Để nâng một tài khoản lên **Admin**, người quản trị cần cập nhật trực tiếp cột `Role` trong bảng `Users` (ví dụ: `UPDATE Users SET Role = 'admin' WHERE Email = 'ten@congty.com';`).

## API Endpoints

### Xác thực (`/api/auth`)
| Method | Endpoint           | Mô tả                          |
|--------|----------------------|----------------------------------|
| POST   | /api/auth/register   | Đăng ký tài khoản mới — body: `{fullName, address, gender, email, password}` (role luôn = user) |
| POST   | /api/auth/login       | Đăng nhập — body: `{email, password}`, trả về JWT token |
| GET    | /api/auth/me          | Lấy thông tin tài khoản hiện tại (cần token) |

### Chức năng 1 — Phòng họp (`/api/rooms`) — *yêu cầu đăng nhập, ghi dữ liệu yêu cầu Admin*
| Method | Endpoint           | Mô tả                     |
|--------|---------------------|---------------------------|
| GET    | /api/rooms          | Lấy danh sách phòng       |
| GET    | /api/rooms/:id       | Lấy chi tiết 1 phòng       |
| POST   | /api/rooms          | Thêm phòng mới (Admin)     |
| PUT    | /api/rooms/:id       | Cập nhật phòng (Admin)      |
| DELETE | /api/rooms/:id       | Xoá phòng (Admin, chặn nếu còn lịch họp liên quan) |

### Chức năng 2 — Lịch họp (`/api/bookings`) — *yêu cầu đăng nhập*
| Method | Endpoint              | Mô tả                                  |
|--------|------------------------|------------------------------------------|
| GET    | /api/bookings          | Lấy danh sách lịch họp                  |
| POST   | /api/bookings          | Tạo lịch họp (owner lấy từ token, tự check trùng giờ) |
| PUT    | /api/bookings/:id       | Cập nhật lịch họp (chỉ chủ lịch hoặc Admin) |
| DELETE | /api/bookings/:id       | Xoá lịch họp (chỉ chủ lịch hoặc Admin)       |

Mọi request tới `/api/rooms` và `/api/bookings` đều cần header:
```
Authorization: Bearer <token>
```
(`public/auth-guard.js` đã tự động gắn header này cho mọi `fetch('/api/...')` ở 2 trang giao diện.)

## Lưu ý kỹ thuật

- Mật khẩu được hash bằng `bcryptjs` (10 rounds), không lưu plaintext.
- Token đăng nhập là JWT, lưu ở `localStorage` (key `token`, `user`) phía client; hết hạn theo `JWT_EXPIRES_IN`.
- `auth-guard.js` tự chuyển hướng về `/login.html` nếu chưa đăng nhập hoặc token hết hạn (401), và chặn truy cập trang Quản lý phòng họp nếu không phải Admin.
- `Rooms.Id` và `Bookings.RoomId` dùng kiểu `UNIQUEIDENTIFIER` (GUID) làm khoá chính/khoá ngoại.
- Kiểm tra trùng lịch và kiểm tra quyền sở hữu lịch họp được thực hiện ở backend để đảm bảo tính nhất quán dữ liệu (không chỉ dựa vào frontend).
- CORS đã được mở (`cors()`) để dễ dàng test API riêng nếu cần (ví dụ Postman) — có thể giới hạn lại origin khi triển khai thực tế.

