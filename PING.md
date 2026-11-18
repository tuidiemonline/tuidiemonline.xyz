# Giữ Render không ngủ (MIỄN PHÍ)

Render gói Free tự "ngủ" sau ~15 phút không có request. Mã OTP đang chờ
nằm trong RAM của server -> ngủ là mất, lần bấm đầu tiên cũng chậm ~50s.

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
