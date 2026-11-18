# Túi Điểm Online — bộ file hoàn chỉnh (đã ráp khớp)

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
Web đang dùng đăng nhập Google Firebase, không gọi OTP email. Giữ server này chỉ để dùng riêng / sau này:
```bash
GMAIL_USER=... GMAIL_PASS=... npm start
```
- Render: Start Command `npm start`, thêm env `GMAIL_USER`, `GMAIL_PASS`; Render tự cấp `PORT`.
- UptimeRobot ping `https://<link-render>/health` mỗi 5 phút để khỏi ngủ.

## Đã sửa gì so với các bản trước
- `server.cjs`: **bỏ hardcode** email/App Password, chuyển hết sang `process.env` → hết lỗi `Missing credentials for "PLAIN"` mà vẫn không lộ mật khẩu trong code.
- Thêm `/health` để ping giữ service thức.
- `package.json`: gộp đủ `express + nodemailer + convex`, thêm script `convex:deploy`.
- `index.html`, `convex/tasks.js`: **giữ nguyên 100%** (đã đối soát khớp URL + tên hàm, không sửa logic của bạn).
- Thêm `CNAME` và `auth.config.js.example` điền sẵn Firebase project `tui-diem-online-455e2`.

## Bảo mật — làm ngay hôm nay
1. App Password Gmail (`vfoo rbkv bmji leqz`) đã lộ trong ảnh/chat → vào Google Account → **thu hồi**, tạo cái mới, cập nhật env Render.
2. GitHub Token `ghp_...` đã gõ thẳng vào lệnh → Settings → Developer settings → **Revoke**, tạo token mới.
3. Dọn lịch sử Termux: `rm -f ~/.bash_history && history -c`
4. Firebase `apiKey` trong `index.html` là key public (bình thường), nhưng nên giới hạn domain trong Firebase Console.

## Kiểm tra nhanh
Mở `https://tuidiemonline.xyz` → đăng nhập Google → xem số coin 4.774 / 260 hôm nay có hiện đúng không. Nếu hiện đúng là Convex + Pages đã thông suốt.
