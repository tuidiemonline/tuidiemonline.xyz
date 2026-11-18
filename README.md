# Túi Điểm Online — bộ file hoàn chỉnh (BẢN 13 · đã bỏ khung xác thực Gmail)

## Trả lời câu hỏi: "khi nào đưa vào tuidiemonline hoạt động được?"
**Ngay bây giờ.** Không cần chờ thêm bước nào:

| Thành phần | Trạng thái | Link |
|---|---|---|
| Web (GitHub Pages) | ✅ đang chạy | https://tuidiemonline.xyz |
| Backend Convex | ✅ chạy 24/7 trên cloud | https://fabulous-capybara-90.convex.cloud |

`index.html` dòng 1738 đã trỏ đúng URL Convex, bảng RPC map `tasks:*` khớp toàn bộ 34 hàm trong `convex/tasks.js` (coin, nhiệm vụ, vòng quay, đổi thẻ, admin, khoá acc...).
=> **Chỉ cần upload bản `index.html` này lên repo `tuidiemonline.xyz` là web đầy đủ chức năng**, không cần Vercel, không cần giữ Termux mở.

## File nào đẩy lên repo nào

**Repo `tuidiemonline.xyz` (GitHub Pages — web tĩnh)**
- `index.html`  ← file chính, bản này
- `CNAME`       ← `tuidiemonline.xyz`
- `ads.txt`     ← GIỮ NGUYÊN file đang có trên repo (không ghi đè, chứa mã pub AdSense của bạn)
- `README.md`

**Repo `otp-server` (backend)**
- `convex/tasks.js`              ← server Convex, giữ nguyên logic Bản 11/12
- `convex/auth.config.js.example`← mẫu, chưa cần kích hoạt
- `package.json`
- `server.cjs`                  ← OTP server (tùy chọn)
- `.gitignore`

⚠️ Đừng đẩy `server.cjs` lên GitHub Pages (Pages không chạy Node.js). Đẩy `index.html` vào repo backend cũng không sao nhưng thừa.

## Lệnh chạy

Giải nén rồi vào thư mục:
```bash
unzip tuidiemonline-final.zip -d tuidiemonline_termux
cd tuidiemonline_termux/tuidiemonline-final
```

**1. Cập nhật web (Pages tự build trong ~1 phút)**
```bash
git add index.html CNAME README.md
git commit -m "dong bo ban hoan chinh"
git push origin main
```
Vào repo → Settings → Pages → Custom domain gõ `tuidiemonline.xyz` → Save → bật **Enforce HTTPS**.

**2. Deploy lại Convex (chỉ khi sửa tasks.js)**
```bash
npm install
npx convex deploy
```
Xong là tắt Termux thoải mái, Convex tự chạy.

**3. OTP server (KHÔNG bắt buộc cho web hiện tại)**
Web chạy ngay dù chưa có OTP: đăng ký tay / Google vào thẳng, Quên mật khẩu bỏ qua bước mã (vẫn có link đặt lại của Firebase trong Gmail). Bật OTP thật khi có link Render, xem mục BẢN 14 bên dưới:
```bash
GMAIL_USER=... GMAIL_PASS=... npm start
```
- Render: Start Command `npm start`, thêm env `GMAIL_USER`, `GMAIL_PASS`; Render tự cấp `PORT`.
- UptimeRobot ping `https://<link-render>/health` mỗi 5 phút để khỏi ngủ.

## BẢN 14 · Đã sửa gì (yêu cầu: "bạn sửa luôn đi rồi gửi lại file")

**`index.html`**
- **Không cần sửa file khi có link Render nữa.** `TD_OTP_URL` giờ tự nhận theo thứ tự:
  1. Mở đúng 1 lần `https://tuidiemonline.xyz/?otp=https://xxx.onrender.com` → tự lưu vĩnh viễn vào máy.
  2. `localStorage.td_otp_url` (hoặc gõ trong Console: `tdOtpSet('https://xxx.onrender.com')`).
  3. Dòng `window.TD_OTP_DEFAULT = '';` cạnh `CONVEX_URL` nếu muốn gắn cố định.
  Gõ `tdOtpSet('')` để tắt. Chỉ nhận `http/https`, giá trị lạ bị bỏ qua.
- **Bỏ hẳn mã 6 số giả** (`Math.random()` hiện lên màn hình) — thứ gây hiểu nhầm "sai OTP / hiện xác thực". Chưa bật OTP thì Quên mật khẩu chuyển thẳng sang bước đặt mật khẩu mới, vẫn gửi link Firebase `sendPasswordResetEmail` để xác nhận quyền sở hữu Gmail.
- Khi đã có URL: `tdOtpRequest()` → `/api/request-otp`, `tdOtpVerify()` → `/api/verify-otp`, mã 6 số thật trong Gmail, hết hạn 5 phút, màn hình hiện `•••••• (xem Gmail)` chứ không lộ mã.
- Giữ nguyên BẢN 13: `TD_REQUIRE_VERIFY = false`, overlay "Xác thực Gmail" không bao giờ hiện; `TD_OTP_REQUIRED = false`.

**`server.cjs`**: giữ nguyên BẢN 13 (CORS + 2 API JSON + `/health` + `process.env`), không đổi.

**`convex/tasks.js`**: giữ nguyên 100%, không đụng logic coin/nhiệm vụ, **không cần `npx convex deploy` lại**.

### Bật OTP thật (2 bước, làm khi nào cũng được)
1. Đẩy `server.cjs` + `package.json` lên Render → Web Service, Start `npm start`, thêm env `GMAIL_USER`, `GMAIL_PASS` (App Password **mới**). UptimeRobot ping `/health` mỗi 5 phút để Render không ngủ.
2. Mở **đúng 1 lần**: `https://tuidiemonline.xyz/?otp=https://<ten-render>.onrender.com`

Xong — **không sửa `index.html`, không upload lại, không mở Termux**. Link được lưu trong máy; những lần sau vào web thường là OTP đã bật. Vào **Quên mật khẩu** → nhận mã 6 số trong Gmail → dán vào ô.
*(Muốn gắn cố định cho mọi máy: dán link vào `TD_OTP_DEFAULT` rồi upload `index.html` 1 lần.)*

> ⚠️ Mình không thể tự điền link Render vì nó do Render cấp **sau khi bạn bấm Deploy** — không có sẵn để đoán. Mọi thứ còn lại đã sửa xong trong file này.

## Đã sửa gì ở các bản trước
- `server.cjs`: **bỏ hardcode** email/App Password, chuyển hết sang `process.env` → hết lỗi `Missing credentials for "PLAIN"` mà vẫn không lộ mật khẩu trong code.
- Thêm `/health` để ping giữ service thức.
- `package.json`: gộp đủ `express + nodemailer + convex`, thêm script `convex:deploy`.
- `convex/tasks.js`: **giữ nguyên 100%** (đã đối soát khớp URL + tên hàm, không sửa logic của bạn).
- Thêm `CNAME` và `auth.config.js.example` điền sẵn Firebase project `tui-diem-online-455e2`.

## Bảo mật — làm ngay hôm nay
1. App Password Gmail cũ đã lộ trong ảnh/chat → vào Google Account → **thu hồi**, tạo cái mới, cập nhật env `GMAIL_PASS` trên Render. (Không còn ghi mật khẩu trong README này nữa.)
2. GitHub Token `ghp_...` đã gõ thẳng vào lệnh → Settings → Developer settings → **Revoke**, tạo token mới.
3. Dọn lịch sử Termux: `rm -f ~/.bash_history && history -c`
4. Firebase `apiKey` trong `index.html` là key public (bình thường), nhưng nên giới hạn domain trong Firebase Console.

## Kiểm tra nhanh
Mở `https://tuidiemonline.xyz` → đăng nhập Google → xem số coin 4.774 / 260 hôm nay có hiện đúng không. Nếu hiện đúng là Convex + Pages đã thông suốt.
