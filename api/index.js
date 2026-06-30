// Vercel sẽ build và chạy file này như một serverless function.
// Nó chỉ import lại Express app đã định nghĩa trong server.js (không tạo app riêng)
// để tránh trùng lặp logic route/middleware.
module.exports = require('../server.js');
