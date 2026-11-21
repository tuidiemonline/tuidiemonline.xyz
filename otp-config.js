/* otp-config.js · CẤU HÌNH 2 LINK (BẢN 29 · GỬI MAIL THẬT)
1) TD_CONVEX_URL   -> dữ liệu: coin / nhiệm vụ / tên đăng nhập /
                      biệt danh / admin. Deployment prod đã deploy.
2) TD_OTP_DEFAULT  -> server gửi mail OTP (Render + Brevo API).
                      Mã 6 số được SINH ở SERVER, gửi qua HTTPS 443,
                      KHÔNG còn hiện trên form, KHÔNG còn devCode.

✅ Đã điền sẵn cả 2 link. Không cần ?otp=, không ô dán link, không F12.
⚠️ TUYỆT ĐỐI KHÔNG dán BREVO_API_KEY (xkeysib-...) vào file này hay
bất kỳ file nào trong repo. Key chỉ nằm trong Environment của Render.
Nếu lỡ lộ key: vào Brevo xoá key cũ, tạo key mới, update trên Render.

Đổi link: sửa đúng 1 dòng rồi push repo web (GitHub Pages).
*/

/* BẢN 32: neu URL nay khac voi deployment ma `npx convex deploy` dang dung,
khong can sua file - mo web voi ?convex=https://xxxx.convex.cloud
hoac go trong Console: tdSetConvex('https://xxxx.convex.cloud')
*/
window.TD_CONVEX_URL  = 'https://tough-canary-511.convex.cloud';
window.TD_OTP_DEFAULT = 'http://localhost:3000';

