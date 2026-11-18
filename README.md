# TÚI ĐIỂM ONLINE · BẢN 22 (TỔNG HỢP)

Gói này gom **toàn bộ** yêu cầu từ Bản 13 → 21 vào 1 lần sửa. Tên file zip đúng:
`tuidiemonline-final.zip` (bên trong là thư mục `tuidiemonline-final/`).

---

## 1. CÓ GÌ TRONG GÓI

| File | Việc cần làm |
|---|---|
| `index.html` | Upload lên repo `tuidiemonline.xyz` (GitHub Pages) |
| `convex/tasks.js` | Copy thành `convex/tasks.js` rồi `npx convex deploy` **1 lần** |
| `server.cjs` | Chỉ deploy lên Render, **KHÔNG đẩy lên GitHub Pages** |
| `otp-config.js` | **MỚI** · điền 1 dòng link Render rồi push cùng `index.html` |
| `CNAME`, `package.json`, `.gitignore`, `convex/auth.config.js.example` | Giữ nguyên |

> `server.cjs` đã gửi mã OTP thật bằng Gmail SMTP (Nodemailer) từ trước, bản này **giữ nguyên**, chỉ cần cấp đúng `GMAIL_USER` + `GMAIL_PASS` (App Password 16 ký tự) trên Render.

---

## 2. NHỮNG GÌ ĐÃ SỬA

1. **Xoá hẳn khung "Xác thực Gmail" của Firebase** (overlay, CSS, 3 nút, `sendEmailVerification` / `emailVerified`). Đăng ký xong không còn bắt mở Gmail bấm link.
2. **Form đăng ký**: xoá chữ `(bắt buộc)` ở 5 ô, chỉ giữ `Điện thoại (không bắt buộc)`.
3. **OTP ngay dưới ô Gmail** (đăng ký): nút `📧 Gửi mã OTP` → ô 6 số → nút `✅ Xác thực` → đúng mã thì **tự hiện tích xanh ✅**, đổi màu chữ, khoá ô, mới cho bấm `Tiếp tục`. Có đếm ngược 60s + `Gửi lại mã`.
4. **Quên mật khẩu ngoài màn đăng nhập**: cùng luồng OTP đầy đủ trên 1 màn hình — nhập Gmail → Gửi mã → nhập 6 số → Xác thực → tích xanh ✅ → **tự nhảy** sang `Mật khẩu mới` + `Nhập lại mật khẩu mới` → `Đặt lại mật khẩu`.
   - Sửa lỗi ô Gmail bị gộp thành `support...@...@gmail.com`: mỗi lần mở popup là xóa sạch ô.
   - Sửa thông báo mơ hồ `Chưa gửi được OTP`: giờ hiện rõ lý do (chưa có link / sai App Password / Render đang ngủ / CORS).
5. **Mật khẩu mạnh (bắt buộc)**: ≥ 8 ký tự, có **chữ HOA + chữ thường + số + ký tự đặc biệt**. Yếu là chặn ngay, không tạo tài khoản. Áp dụng cả lúc đặt lại mật khẩu.
6. **Tên đăng nhập ≠ Biệt danh** (không cho trùng nhau trên cùng form).
7. **Không ai trùng tên ai**: thêm query `checkName` trên Convex, so sánh không phân biệt hoa thường cho cả `username` lẫn `nickname`. User sau đặt `quan12` khi user trước đã có → hiện `Tên này đã được sử dụng rồi`. `registerProfile` cũng chặn lại phía server để F12 không lách được.
8. **Chữ "Đổi mật khẩu" đổi sang TRẮNG** (cả mục Cài đặt và trang Thông tin cá nhân).
9. **Gmail trong Cài đặt không còn bị cụt** (`support.tuidiemonl...`) → cho xuống dòng, hiện đủ địa chỉ.
10. **Link OTP dùng chung cho mọi user**: thêm `otp-config.js`. Admin điền 1 dòng, push lên, toàn bộ user tự nhận — không cần `?otp=` trên từng điện thoại, không cần Console. Vẫn giữ `?otp=` / `tdOtpSet('...')` làm dự phòng.

---

## 3. BẬT OTP THẬT (3 VIỆC, ~5 PHÚT)

**Bước A — Render (đã có sẵn server.cjs)**
- New Web Service → trỏ repo `otp-server`, Start Command: `npm start`
- Environment:
  - `GMAIL_USER` = Gmail gửi mã
  - `GMAIL_PASS` = **App Password 16 ký tự** (không phải mật khẩu đăng nhập)
- Deploy xong copy link dạng `https://xxx.onrender.com`

**Bước B — 1 dòng cấu hình**
Mở `otp-config.js`, sửa:
```js
window.TD_OTP_DEFAULT = 'https://xxx.onrender.com';
```
(Không sửa `index.html`. Có thể thay bằng cách mở 1 lần `https://tuidiemonline.xyz/?otp=https://xxx.onrender.com` hoặc gõ Console `tdOtpSet('https://xxx.onrender.com')`.)

**Bước C — Đẩy code**
```bash
cd ~/tuidiemonline_termux
cp /storage/emulated/0/Download/tuidiemonline-final.zip .
unzip -o tuidiemonline-final.zip
cp -r tuidiemonline-final/* .

# Convex: deploy 1 lần vì có thêm hàm checkName
npx convex deploy

# GitHub Pages
git add index.html otp-config.js README.md CNAME
git commit -m "ban 22 - tong hop OTP, mat khau manh, ten duy nhat"
git push origin main
```
Username: `tuidiemonline` · Password: **Token GitHub mới**.

⚠️ **Không** `git add server.cjs` lên repo Pages. **Không** xoá `ads.txt`. **Không** bấm triển khai trong email Vercel (web đang chạy bằng GitHub Pages).

---

## 4. KIỂM TRA SAU KHI PUSH

1. Vào **Actions** đợi tích xanh ✅ (~1 phút).
2. Mở `https://tuidiemonline.xyz` bằng **cửa sổ ẩn danh** (tránh cache).
3. Test đăng ký:
   - Nhập `quan12` / Gmail / Biệt danh `quan12` → báo *không được giống nhau*.
   - Đặt mật khẩu `123456` → báo *quá yếu*.
   - Đặt `Quan@2026x` → bấm `Gửi mã OTP` → check Gmail (cả **Thư rác**) → nhập 6 số → `Xác thực` → tích xanh ✅ → `Tiếp tục`.
   - Đăng ký lại đúng tên `quan12` bằng Gmail khác → báo *đã được sử dụng rồi*.
4. Test `Quên mật khẩu?` ở màn đăng nhập: luồng OTP → tích xanh → 2 ô mật khẩu mới.

---

## 5. LƯU Ý KHI ĐÔNG USER

- Gmail cá nhân gửi qua SMTP bị giới hạn ~**500 mail/ngày** và Google dễ chặn IP lạ. Mới bắt đầu thì chạy ổn (như bạn đã chốt). Khi đông, đổi sang **Resend / SendGrid**: chỉ sửa `transporter` trong `server.cjs`, `index.html` không đụng gì.
- Render gói free hay "ngủ": cho UptimeRobot ping `https://xxx.onrender.com/health` mỗi 5 phút.
- `otpStore` đang nằm trong RAM: Render restart sẽ mất mã đang chờ. User chỉ cần bấm `Gửi lại mã`.
- Nên **thu hồi App Password Gmail cũ + revoke Token GitHub cũ** nếu từng lộ trong ảnh/chat.

---

## 6. KIỂM TRA KỸ THUẬT ĐÃ CHẠY

- Mọi khối `<script>` inline trong `index.html`: `node --check` sạch.
- `convex/tasks.js`: parse ESM sạch.
- `server.cjs`: `node --check` sạch.
- `convex/tasks.js` giữ nguyên toàn bộ logic ví/coin/nhiệm vụ/admin; chỉ **thêm** `checkName` + 1 đoạn chặn trùng biệt danh trong `registerProfile`.
