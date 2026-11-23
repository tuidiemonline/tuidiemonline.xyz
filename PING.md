# Giữ Render không ngủ (MIỄN PHÍ)

Render gói Free tự "ngủ" sau ~15 phút không có request, lần bấm đầu tiên
chậm ~50s. Từ **BẢN 42c** mã OTP được kèm *vé ký HMAC* lưu ở trình duyệt
nên restart không còn làm mất phiên — nhưng ping vẫn cần để tránh cold start
(lần đầu gửi mã / xác thực có thể timeout 15s).

## Cách dùng (khuyên dùng): UptimeRobot — FREE 100%

- Free: **50 monitor**, interval tối thiểu **5 phút**, báo lỗi qua email.
- Vào `https://uptimerobot.com` → đăng ký → **Add New Monitor**
  - Monitor Type: `HTTP(s)`
  - Friendly Name: `OTP Server`
  - URL: `https://otp-server-xvsk.onrender.com/health`
  - Monitoring Interval: `5 minutes`
  - → **Create Monitor**

## Cách khác (cũng FREE): cron-job.org

- Vào `https://cron-job.org` → **Create Cronjob**
  - Title: `Ping tuidiemonline`
  - URL: `https://otp-server-xvsk.onrender.com/health`
  - Schedule: mỗi **10 phút**

## Kiểm tra

Mở `https://otp-server-xvsk.onrender.com/health` phải ra:
```
{"status":"ok","brevo":"ready"}
```

> Không cần VPS, không cần script chạy trên điện thoại. Chỉ cần 1 monitor
> bên ngoài gọi vào `/health` là đủ.
