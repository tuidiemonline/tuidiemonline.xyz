/* ==================================================================
otp-config.js · CẤU HÌNH 1 LINK DUY NHẤT  (BẢN 25)
------------------------------------------------------------------
    https://tough-canary-511.convex.cloud

Link này VỪA là backend dữ liệu (coin / nhiệm vụ / tên đăng nhập /
biệt danh), VỪA là server OTP (tasks:requestOtp + tasks:verifyOtp
nằm trong convex/tasks.js). index.html đọc TD_CONVEX_URL ở dòng dưới
-> MỌI USER dùng chung, không ai phải dán link.

✅ Không cần Render · không cần ?otp= · không còn ô dán link · không cần F12.
✅ Đăng ký & Quên mật khẩu: Gửi mã OTP -> nhập 6 số -> Xác thực -> tích xanh ✅.
✅ Đang test: mã 6 số hiện ngay trên form (server trả devCode).
   Khi đông user: dán link Render (server.cjs + Gmail SMTP) vào
   TD_OTP_DEFAULT -> tự gửi mail Gmail thật, KHÔNG sửa thêm dòng nào.

⚠️ Link cũ fabulous-capybara-90 là DEPLOYMENT KHÁC (project khác).
   Lần deploy bạn bấm Yes nên 2 hàm OTP nằm ở deployment prod bên trên.
   Muốn dùng link cũ: phải deploy code sang chính deployment đó thì
   mới có tasks:requestOtp / tasks:verifyOtp, rồi sửa 1 dòng này.

Đổi deployment: sửa ĐÚNG 1 DÒNG TD_CONVEX_URL rồi chạy:
  npx convex deploy
  git add . && git commit -m "doi link convex" && git push origin main
================================================================== */
window.TD_CONVEX_URL = 'https://tough-canary-511.convex.cloud';
window.TD_OTP_DEFAULT = 'https://otp-server-xvsk.onrender.com';   // (tuỳ chọn) link Render gửi mail thật; để trống = dùng Convex
