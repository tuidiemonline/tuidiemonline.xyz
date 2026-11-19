# TÚI ĐIỂM ONLINE · BẢN 30 (tổng hợp mọi sửa đổi)

File nén: **tuidiemonline-final.zip** · bung ra = thư mục `tuidiemonline-final/`.

---

## 1. Những gì đã sửa trong bản này

### A. OTP / gửi mail thật (giữ nguyên từ bản 28)
- `otp-server/server.cjs`: Brevo HTTPS API (cổng 443), đủ 7 route
  `/health  /  /verify  /api/request-otp  /api/verify-otp  /request-otp  /send-otp`.
  Mã 6 số sinh ở server, lưu RAM 5 phút, xác thực xong xoá, chống dùng lại.
- `otp-config.js`: **đã điền sẵn** cả 2 link (Convex + Render), không cần sửa tay.
- `otp-server/package.json`, `render.yaml`: sạch, không `nodemailer`, không key.
- **Không có API key trong bất kỳ file nào.** Key chỉ nằm ở Render → Environment.

### B. Giao diện OTP đăng ký (theo ảnh 196–200)
- Placeholder `Mã OTP` → **`nhập mã`** (chữ thường, nhỏ).
- **Bỏ icon khiên** trong ô OTP.
- **Xoá sạch chữ dưới ô**: `‹ Gửi lại mã`, timer, `Mã 6 số gửi tới Gmail...`.
- Nút `Gửi` → **`Gửi mã`** (hiện rõ, không bị cụt), cả `Gửi mã` + `Xác thực`
  thu nhỏ, chữ nhỏ.
- Đổi màu xanh → **nền đen `#000`, chữ trắng**, viền `#333`.
- Vẫn giữ text `Xác thực thành công` (không ✅), vẫn bắt xác thực mới đăng ký được.

### C. Quên mật khẩu · 3 bước rõ ràng (theo ảnh 202–204)
| Tab | Nội dung |
|---|---|
| 1 | **Chỉ** ô `nhập gmail` + nút **Tiếp tục** |
| 2 | Gmail **bị che** (`su***@gmail.com`) + `[nhập otp] [Gửi mã] [Xác thực]` → bấm **Xác thực** đúng mã mới sang tab 3 |
| 3 | `mật khẩu mới` + `xác nhận mật khẩu` → **Đổi mật khẩu** → `Đổi mật khẩu thành công` |

- Ô Gmail + ô OTP đều **nhỏ lại, chữ nhỏ, nền đen chữ trắng**.
- Bỏ icon khiên, bỏ mọi dòng chữ dư (chỉ hiện thông báo khi có lỗi).
- Giữ nguyên id cũ để các hàm bản trước gọi không văng lỗi.

### D. Cài đặt · dòng "Đổi mật khẩu" (ảnh 211)
- Ép nền `#111c2e`, viền `var(--r-line)`, chữ `#cbd5e1`, mũi tên `#64748b`
  → **giống hệt** dòng `Giới tính` / `Ngày sinh`. Áp cả trang cá nhân.

### E. Ví coin + hồ sơ: MỘT TÀI KHOẢN = MỘT KHO (ảnh 205–210) ⭐
Trước đây `coinsOf(null)` trả `4774` và `ensureWallet` seed `4774/260` cho
**mọi uid** → acc mới thấy y hệt acc `shinotoh`. Đã sửa trong cả 3 file
`convex/tasks.js`, `tasks.js`, `convex_tasks.js`:

- Acc mới (chưa có `td_wallet`) → **0 coin / 0 coin hôm nay**.
- Acc cũ đã có ví (`shinotoh` 4.774 / 260) → **giữ nguyên**, không patch.
- `uidOf()` chuẩn hoá `p_uid`, `ensureWallet` từ chối tạo ví cho uid rỗng.
- **BẢN 30 (sửa lỗi 2 acc trùng `Quandeptrai` / trùng 4.774)**:
  - `window.tdUid()` luôn lấy UID của acc **đang đăng nhập**, bỏ cache RAM
    `__tdUid` của acc trước → mọi `p_uid` gửi lên Convex đều đúng người.
  - Mọi key `localStorage` (coin, biệt danh, lịch sử, profile `tuidiem_profile_v1`…)
    tự động thêm namespace `tdacc:<uid>:`. Acc A không thể đọc nick / ví của acc B,
    dù có 2 hay 5.000 acc. Key hệ thống (Firebase Auth, session, link OTP,
    map tên đăng nhập) được giữ nguyên để không bị đăng xuất ngoài ý muốn.
  - Fallback frontend `4774 / 260` → **`0 / 0`**. Acc mới chưa có ví không còn
    hiện 4.774 của acc cũ trong lúc chờ server.
  - Khi đổi acc chỉ reset biến RAM (`__serverCoins`, `tdAccountInfo`…),
    **KHÔNG xoá bảng `users` / `wallets`, KHÔNG cần migration** — dữ liệu cũ
    đã có sẵn field `uid`, chỉ cần client gửi đúng UID là tự tách.
  - Đăng xuất rồi đăng nhập lại: mỗi acc hiện đúng biệt danh, đúng Gmail,
    đúng số coin của mình.
- Acc A cày 3.000, acc B cày 5.000 → mỗi acc một document riêng, đăng xuất
  rồi đăng nhập lại lấy đúng số của mình.

> Nếu sau này **reset DB** và muốn khôi phục riêng acc demo: mở
> `convex/tasks.js`, điền UID Firebase vào `DEMO_WALLETS`
> (lấy ở Cài đặt → ID tài khoản). Để trống = ai mới cũng bắt đầu từ 0.

### E2. Ô nhập mã / quên mật khẩu: 1 khung duy nhất (ảnh 201, 197)
- Bỏ viền + bo góc của `input` (khung **trong**), giữ nguyên khung **ngoài**
  `#333` bo góc 8px → hết 2 đường viền lệch nhau. Áp cả OTP đăng ký lẫn
  `nhập gmail` / `nhập otp` trong Quên mật khẩu, 2 bên cùng màu, cùng độ dày.

### F. Lỗi `npx convex deploy` (ảnh 189–193)
- **Đã thêm `package.json` ở thư mục gốc** (bản zip trước bị thiếu → Convex báo
  `Unable to read your package.json`).

### G. Giữ Render thức (ảnh hỏi "làm kiểu gì")
- Thêm **`PING.md`**: UptimeRobot FREE (50 monitor, 5 phút) hoặc cron-job.org FREE.

---

## 2. Cấu trúc file (18 + 1 mới)

```
tuidiemonline-final/
├── index.html                  ← web (BẢN 30, sửa nhiều nhất)
├── otp-config.js               ← 2 link, đã điền sẵn
├── package.json                ← MỚI · để npx convex deploy chạy được
├── CNAME                       ← tuidiemonline.xyz
├── README.md                   ← file này
├── PING.md                     ← MỚI · hướng dẫn ping /health free
├── convex/
│   ├── tasks.js                ← DEPLOY THẬT (ví tách theo uid)
│   └── auth.config.js.example
├── tasks.js                    ← bản tham chiếu (giống convex/tasks.js)
├── convex_tasks.js             ← bản tham chiếu (giống convex/tasks.js)
├── otp-server/
│   ├── server.cjs              ← Brevo API, 7 route
│   ├── package.json
│   ├── render.yaml
│   └── .gitignore
└── backup/                     ← bản gốc bạn gửi, giữ nguyên để đối chiếu
    ├── index_ban25.html
    ├── otp-config_ban25.js
    ├── tasks_ban25.js
    ├── convex_tasks_ban11.js
    └── tuidiemonline-final-cu.zip
```

---

## 3. LỆNH CẬP NHẬT (dán nguyên vào Termux)

**1 lệnh duy nhất (có cả giải nén + push + deploy):**
```bash
cd ~/tuidiemonline_termux && F=$(find ~ /sdcard/Download -type f \( -name 'tuidiemonline-final.zip' -o -name 'tuidiemonline-final.js' \) 2>/dev/null) && Z=$(ls -t $F 2>/dev/null | head -1) && [ -n "$Z" ] && cp "$Z" ./_ban.zip && unzip -o ./_ban.zip && cp -r tuidiemonline-final/. . && rm -rf tuidiemonline-final _ban.zip backup && git add . && (git commit -m "ban 30 - tong hop" || true) && git push origin main && npx convex deploy
```

**Hoặc làm từng bước:**

```bash
cd ~
unzip -o /storage/emulated/0/Download/tuidiemonline-final.zip -d ~/ban29
ls ~/ban29/tuidiemonline-final
```

**Repo WEB:**
```bash
SRC=~/ban29/tuidiemonline-final
cd ~/tuidiemonline_termux
mkdir -p convex
cp $SRC/index.html $SRC/otp-config.js $SRC/CNAME $SRC/package.json .
cp $SRC/convex/tasks.js convex/tasks.js
git add index.html otp-config.js CNAME package.json convex/tasks.js README.md PING.md 2>/dev/null || \
git add index.html otp-config.js CNAME package.json convex/tasks.js
git commit -m "ban 30 - tach du lieu theo UID, 1 khung nhap, acc moi 0 coin"
git push origin main
```
> Nếu báo `! [rejected] ... (fetch first)` → chạy `git pull origin main --no-rebase`
> (hiện bảng merge thì `Ctrl+X` rồi `Enter`), sau đó `git push origin main` lại.
> Hỏi Username/Password: `tuidiemonline` + **Personal Access Token** `ghp_...`.

**Convex (chạy RIÊNG, hỏi Yes → gõ `Y`):**
```bash
npx convex deploy
```
> ⚠️ **Không xoá** `convex.json` / `.env.local` đang có trong repo Termux.

**Repo `otp-server` (KHÁC repo web):**
```bash
cd ~
[ -d otp-push ] || git clone https://github.com/tuidiemonline/otp-server.git otp-push
cd ~/otp-push && git pull origin main
cp $SRC/otp-server/server.cjs $SRC/otp-server/package.json $SRC/otp-server/render.yaml .
git add server.cjs package.json render.yaml
git commit -m "ban 30 - Brevo day du route" && git push origin main
```

**Kiểm tra 10 giây:**
```bash
grep TD_OTP_DEFAULT ~/tuidiemonline_termux/otp-config.js
```
→ phải ra `https://otp-server-xvsk.onrender.com`

Đợi Render **Live** → mở `/health` → `{"status":"ok","brevo":"ready"}`
→ lên web bấm **Gửi mã**, check Gmail **cả Spam**.

---

## 4. 3 nhắc quan trọng

1. 🔐 **Đổi key Brevo mới**: key `xkeysib-...` đã lộ trong chat. Vào Brevo →
   xoá key cũ → tạo key mới → update biến `BREVO_API_KEY` trên Render.
   **Không dán key vào file nào trong repo.**
2. ⏰ Setup ping `/health` theo `PING.md` để Render Free không ngủ (mã OTP nằm RAM).
3. 🚫 Không `git add .` (kéo zip, `ads.txt`, `node_modules` vào commit).
4. 🧩 **Dữ liệu cũ đã lỡ ghi nhầm** (2 acc cùng `Quandeptrai` / cùng 4.774):
   **KHÔNG xoá bảng `users` / `wallets`, KHÔNG cần migration.** Mọi document
   đều đã có field `uid`; lỗi nằm ở client gửi nhầm `p_uid`. Bản 30 sửa xong
   client → từ đây mỗi acc tự tách. Để sửa lại biệt danh đã bị ghi nhầm,
   đăng nhập đúng acc → Cài đặt → Cập nhật thông tin cá nhân → gõ lại nick
   (gọi `setNickname` với UID đúng). Số coin cũ nếu muốn tách lại thì dùng
   trang Admin cộng/trừ thủ công, không reset DB.
