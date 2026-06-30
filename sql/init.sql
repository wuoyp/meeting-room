-- =========================================================
-- Script tạo Table, dữ liệu mẫu cho hệ thống
-- Quản lý phòng họp & Đặt lịch họp (PostgreSQL)
-- Chạy script này trên database Postgres của bạn
-- (Neon / Vercel Postgres / psql) trước khi khởi động app.
-- Database tự nó (vd: "neondb" hoặc do Vercel cấp) đã được
-- tạo sẵn khi bạn khởi tạo project trên Neon/Vercel, không
-- cần lệnh CREATE DATABASE ở đây.
-- =========================================================

-- Cho phép sinh UUID tự động (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- BẢNG "Users" (Tài khoản) - Đăng ký / Đăng nhập / Phân quyền
-- =========================================================
CREATE TABLE IF NOT EXISTS "Users" (
    "Id"           SERIAL PRIMARY KEY,
    "Email"        VARCHAR(200)  NOT NULL UNIQUE,
    "PasswordHash" VARCHAR(255)  NOT NULL,
    "FullName"     VARCHAR(200)  NOT NULL,
    "Address"      VARCHAR(300)  NULL,
    "Gender"       VARCHAR(20)   NULL,            -- 'Nam', 'Nữ', 'Khác'
    "Role"         VARCHAR(20)   NOT NULL DEFAULT 'user', -- 'admin' hoặc 'user'
    "CreatedAt"    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =========================================================
-- BẢNG "Rooms" (Phòng họp) - Chức năng 1: Quản lý phòng họp
-- =========================================================
CREATE TABLE IF NOT EXISTS "Rooms" (
    "Id"          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "Name"        VARCHAR(200) NOT NULL,
    "Location"    VARCHAR(200) NOT NULL,
    "Capacity"    INTEGER      NOT NULL,
    "Equipment"   VARCHAR(500) NULL,
    "Status"      VARCHAR(50)  NOT NULL DEFAULT 'Sẵn sàng',
    "CreatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "UpdatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =========================================================
-- BẢNG "Bookings" (Lịch họp) - Chức năng 2: Đặt lịch họp
-- =========================================================
CREATE TABLE IF NOT EXISTS "Bookings" (
    "Id"          SERIAL PRIMARY KEY,
    "Title"       VARCHAR(300) NOT NULL,
    "Members"     VARCHAR(500) NOT NULL,
    "RoomId"      UUID         NOT NULL REFERENCES "Rooms"("Id"),
    "BookingDate" DATE         NOT NULL,
    "StartTime"   CHAR(5)      NOT NULL,   -- format HH:mm
    "EndTime"     CHAR(5)      NOT NULL,   -- format HH:mm
    "Owner"       VARCHAR(200) NOT NULL,
    "CreatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "UpdatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index hỗ trợ kiểm tra trùng lịch (room + ngày)
CREATE INDEX IF NOT EXISTS "IX_Bookings_Room_Date" ON "Bookings"("RoomId", "BookingDate");

-- =========================================================
-- DỮ LIỆU MẪU - PHÒNG HỌP
-- =========================================================
INSERT INTO "Rooms" ("Name", "Location", "Capacity", "Equipment", "Status")
SELECT * FROM (VALUES
    ('Phòng P101', 'Tầng 1', 10, 'Máy chiếu, Bảng trắng', 'Sẵn sàng'),
    ('Phòng P102', 'Tầng 1', 6,  'TV màn hình, Wifi',     'Sẵn sàng'),
    ('Phòng P103', 'Tầng 1', 20, 'Máy chiếu, Loa, Mic',   'Đang hoạt động'),
    ('Phòng P203', 'Tầng 2', 8,  'Bảng trắng',            'Sẵn sàng')
) AS seed("Name", "Location", "Capacity", "Equipment", "Status")
WHERE NOT EXISTS (SELECT 1 FROM "Rooms");

-- =========================================================
-- GHI CHÚ: Tài khoản mặc định
-- =========================================================
-- Ứng dụng sẽ TỰ ĐỘNG tạo 2 tài khoản mặc định khi khởi động
-- lần đầu (nếu bảng "Users" đang trống), xem chi tiết config/seed.js:
--   Admin -> Email: admin@techx.vn   | Mật khẩu: Admin@123
--   User  -> Email: user@techx.vn    | Mật khẩu: User@123
-- Hãy đổi mật khẩu các tài khoản này ngay khi triển khai thực tế.
