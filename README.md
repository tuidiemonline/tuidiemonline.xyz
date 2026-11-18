# BẢN 25 · ĐỦ FILE · 1 LINK DUY NHẤT (18/11/2026)

> **Link duy nhất: `https://tough-canary-511.convex.cloud`**
> Vừa lo coin / nhiệm vụ / tên user, VỪA lo OTP 6 số.
> Không còn ô dán link `xxx.onrender.com`, không còn nút **Lưu**,
> không còn cảnh báo "Render đang ngủ".

## Có gì trong gói (10 file)
| File | Việc cần làm |
|---|---|
| `index.html` | đẩy lên GitHub Pages |
| `otp-config.js` | đẩy lên GitHub Pages (chứa 1 link ở trên) |
| `convex/tasks.js` | `npx convex deploy` (Bản 11 + OTP) |
| `convex_tasks.js` | **bản gốc Bản 11 bạn gửi**, để đối chiếu, KHÔNG deploy |
| `server.cjs` | giữ lại, dùng khi đông user (gửi mail Gmail thật) |
| `convex/auth.config.js.example` | mẫu, không bắt buộc |
| `README.md` / `CNAME` / `package.json` / `.gitignore` | phụ |

`convex/tasks.js` = đúng file `convex_tasks.js` bạn gửi, chỉ thêm:
`p_otp`, `checkName`, chặn trùng biệt danh, `requestOtp`, `verifyOtp`.
**Toàn bộ logic Bản 11 (12 nhiệm vụ, admin, khoá acc, đổi thẻ...) giữ nguyên.**

## Cài đặt (Termux) — 4 lệnh, KHÔNG BỎ LỆNH `git`
```bash
cd ~/tuidiemonline_termux
cp /storage/emulated/0/Download/tuidiemonline-final.zip .
unzip -o tuidiemonline-final.zip && cp -r tuidiemonline-final/* .
npx convex deploy
git add index.html otp-config.js convex/tasks.js README.md CNAME
git commit -m "ban 25 - du file, 1 link convex"
git push origin main
```
Nhập Username `tuidiemonline` + Token GitHub khi `git push` hỏi.
Đợi 1-2 phút, mở `https://tuidiemonline.xyz/?v=25` hoặc **cửa sổ ẩn danh**.

> ⚠️ Lần trước web vẫn hiện ô `https://xxx.onrender.com` là do **3 lệnh git
> chưa chạy** (terminal chỉ chạy `unzip` + `npx convex deploy` rồi đứng yên).
> Phải thấy dòng `git push` báo thành công thì Pages mới đổi.

## Kiểm tra nhanh
- Ô dán link + nút **Lưu** phải **BIẾN MẤT HẲN**.
- Bấm **Gửi mã OTP** → hiện `Mã OTP (chế độ test): 123456` ngay trên form.
- Nhập 6 số → **Xác thực** → tích xanh ✅ → mới cho **Tiếp tục**.
- Quên mật khẩu: Gmail → Gửi mã → Xác thực → Mật khẩu mới + Nhập lại.
- Mật khẩu yếu (thiếu HOA / thường / số / ký tự đặc biệt / <8 ký tự) = chặn.
- Tên đăng nhập = Biệt danh = chặn; trùng tên user khác = "đã được sử dụng rồi".
- Chữ "(bắt buộc)" đã xoá, chỉ còn "(không bắt buộc)"; "Đổi mật khẩu" màu trắng.

## Về 2 link Convex (đọc kỹ để không nhầm)
- `tough-canary-511` = **prod**, nơi `npx convex deploy` vừa đẩy code OTP lên. Dùng cái này.
- `fabulous-capybara-90` = deployment **khác** (từng tạo trước đó). Nó không có
  2 hàm OTP nên trỏ vào đó sẽ báo thiếu function. Muốn dùng lại thì phải deploy
  code sang chính deployment đó rồi sửa 1 dòng `TD_CONVEX_URL`.
- Mở link `.convex.cloud` trên trình duyệt chỉ thấy trang báo "đang hoạt động"
  (kèm lỗi dịch tự động của Google) — **bình thường**, không phải web hỏng.

## Khi đông user (đúng kế hoạch "mốt đổi sau")
Dán link Render thật vào `TD_OTP_DEFAULT` trong `otp-config.js` → web tự gửi
mail Gmail OTP thật, không sửa thêm dòng nào. Gmail cá nhân gửi tối đa
~500 mail/ngày; vượt quá thì chuyển Resend / SendGrid / Firebase Auth.

## Lưu ý
- Giữ `ads.txt` trên repo, đừng `git add .` (lần trước đẩy cả `node_modules`).
- `server.cjs` **không** đẩy lên GitHub Pages; nó chỉ chạy trên Render.
- Mã OTP: 5 phút, sai 5 lần khoá, gửi lại là mã cũ mất hiệu lực.
