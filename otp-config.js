/* ==================================================================
   otp-config.js · CẤU HÌNH OTP SERVER (1 DÒNG DUY NHẤT)
   ------------------------------------------------------------------
   File này nằm cùng thư mục với index.html trên GitHub Pages.
   Sửa ĐÚNG 1 DÒNG bên dưới rồi push lên repo -> MỌI USER đều dùng
   chung link OTP, không cần sửa index.html, không cần vào Console,
   không cần mở ?otp=... trên từng máy.

   Ví dụ sau khi deploy server.cjs lên Render:
     window.TD_OTP_DEFAULT = 'https://tuidiemonline-otp.onrender.com';

   Để '' = chưa bật OTP: web vẫn chạy, form đăng ký hiện ô dán link
   để admin cấu hình nhanh. Khi có link, OTP trở thành BẮT BUỘC.
   ================================================================== */
window.TD_OTP_DEFAULT = '';
