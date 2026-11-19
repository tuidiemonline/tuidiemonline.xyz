# TÚI ĐIỂM ONLINE · BẢN 32 (hết CONVEX_ERROR)

File nén: **tuidiemonline-final.zip** · bung ra = thư mục `tuidiemonline-final/`.

---

## 1. Lỗi bạn vừa gặp là gì

Ảnh 16:21 / 16:22 hiện `CONVEX_ERROR · Chưa tải được nhiệm vụ vé.` và toast
`Chưa kết nối được hệ thống (CONVEX_ERROR)`. Đây **không phải lỗi cache, không
phải lỗi Render/Brevo, cũng không phải lỗi đồng hồ vòng quay**.

Chuỗi sự kiện thật:

1. Web gọi `POST https://tough-canary-511.convex.cloud/api/query`
   với `path = tasks:ticketState`.
2. Convex trả `{ status: "error", errorMessage: "..." }` (chưa deploy hàm,
   sai deployment URL, schema/validator chặn, hoặc hàm văng lỗi).
3. Code cũ **nuốt `errorMessage`**, chỉ giữ `code = 'CONVEX_ERROR'` → bạn chỉ
   thấy 1 chữ chung chung, không biết sửa cái gì.
4. `syncTickets()` văng lỗi → `__tkState` null → trang vé đứng chữ
   "Đang tải..." / hiện ô lỗi + nút Thử lại; `connNotice()` bắn toast đỏ ở
   trang nhiệm vụ.

> ⚠️ Mình **không truy cập được deployment Convex của bạn từ đây** để đọc log,
> nên không thể khẳng định `errorMessage` cụ thể là dòng nào. Bản 32 làm 2 việc:
> **in rõ lỗi thật ra Console** để bạn sửa tận gốc, **và web không bao giờ chết
> nữa** dù lỗi đó còn hay hết.

---

## 2. Bản 32 sửa những gì

### A. `tdRestRpc` — tự phục hồi (sửa trong `index.html`)
- **Timeout 8s** thay vì chờ vô hạn (mạng treo / deployment ngủ).
- **In lỗi thật**: `HTTP 403 ...`, `CONVEX: Could not find function ...`,
  `CONVEX: Uncaught Error ...` kèm URL + tên hàm + UID. Mở F12 → Console
  hoặc gõ `tdDiag()` / `TD_LAST_CONVEX_ERROR` là thấy ngay.
- **Tự xuống CHẾ ĐỘ MÁY** khi Convex không sống: `tdLocalRpc()` trả đủ
  `coin_state / ticket_state / claim_ticket / do_checkin / claim_task /
  spin_wheel / ping_login / today_stats ...` bằng `localStorage`.
- Dữ liệu máy **vẫn tách theo `tdacc:<uid>:`** (bản 30) + thêm prefix
  `tdloc:<uid>:` → **2 acc hay 5.000 acc vẫn không trùng nhau**. Reset đúng
  00:00 giờ VN, giữ coin/vé/kim cương qua ngày.
- **Mỗi 30s tự thử lại Convex 1 lần**; server sống → tự lấy lại số của server
  (server vẫn là nguồn chân lý). Không cần bấm Thử lại.
- `connNotice()` không còn bắn toast đỏ; `renderTickets()` hiện dòng nhỏ
  *"Đang lưu trên máy · tự đồng bộ khi server sẵn sàng"* thay vì dòng lỗi.

### B. Đổi URL Convex không cần sửa file
Nếu `npx convex deploy` đang đẩy sang deployment **khác** `tough-canary-511.convex.cloud`:

```
https://tuidiemonline.xyz/?convex=https://ten-that.convex.cloud
```
URL được lưu vào `localStorage`, dùng cho mọi lần sau. Hoặc gõ trong Console:
```js
tdSetConvex('https://ten-that.convex.cloud')
tdSetConvex('')          // xoá, về mặc định
```
Lấy URL thật: chạy `npx convex deploy` (nó in URL), hoặc mở `npx convex dashboard`.

### C. `convex/tasks.js` (và 2 bản tham chiếu) — bớt nguồn văng lỗi
- `uidOf()`: `ctx.auth.getUserIdentity()` được bọc `try/catch` → auth config
  lỗi không làm **mọi query** văng `CONVEX_ERROR`.
- Thêm `safeInsert()`; `addCoins` / `claimTicket` / `ensureState` không còn để
  1 lần insert bị schema từ chối làm sập cả RPC.
- `rowsOf()` giữ nguyên cơ chế "bảng chưa tồn tại → trả rỗng".

### D. Giữ nguyên các bản trước
- Bản 30: 1 acc = 1 kho, acc mới 0 coin, ô nhập 1 khung duy nhất.
- Bản 31: đồng hồ *"Kết thúc phiên sau"* chạy 24h toàn cục, không cần cron.
- Bản 28/29: OTP gửi mail thật qua Render + Brevo, `otp-config.js` trỏ sẵn.
- `package.json` ở gốc để `npx convex deploy` không báo thiếu.

---

## 3. Cấu trúc file (đã bỏ `backup/`)

```
tuidiemonline-final/
├── index.html                  ← BẢN 32 (RPC tự phục hồi)
├── otp-config.js               ← TD_CONVEX_URL + TD_OTP_DEFAULT
├── package.json
├── CNAME  ·  PING.md  ·  README.md
├── convex/tasks.js             ← DEPLOY THẬT
├── convex/auth.config.js.example
├── tasks.js  ·  convex_tasks.js   ← bản tham chiếu (cùng nội dung)
└── otp-server/
    ├── server.cjs  ·  package.json  ·  render.yaml  ·  .gitignore
```

---

## 4. LỆNH CẬP NHẬT · 1 lần chạy hết (có giải nén)

```bash
cd ~/tuidiemonline_termux && F=$(find ~ /sdcard/Download -type f \( -name 'tuidiemonline-final.zip' -o -name 'tuidiemonline-final.js' \) 2>/dev/null) && Z=$(ls -t $F 2>/dev/null | head -1) && [ -n "$Z" ] && cp "$Z" ./_ban.zip && unzip -o ./_ban.zip && cp -r tuidiemonline-final/. . && rm -rf tuidiemonline-final _ban.zip backup && git add . && (git commit -m "ban 32 - het CONVEX_ERROR" || true) && git push origin main && npx convex deploy
```

> Xoá file zip **cũ** trong repo trước khi chạy để `ls -t` lấy đúng bản 32.
> Hỏi `Yes` → `Y`. Hỏi GitHub Password → dán Personal Access Token `ghp_...`.

Sau khi Pages build (~1–2 phút) mở: `https://tuidiemonline.xyz/?v=14`

---

## 5. Muốn sửa TẬN GỐC (khuyến khích)

Chế độ máy CHỈ là dự phòng để web không chết; muốn số coin/vé nằm trên server cho mọi thiết bị:

```bash
cd ~/tuidiemonline_termux
cat .env.local                 # xem CONVEX_DEPLOYMENT=dev:... hay prod:...
npx convex deploy              # đọc URL nó in ra
npx convex dashboard           # -> Logs, bấm lại web, đọc dòng đỏ
```

Ba khả năng hay gặp nhất:

| Triệu chứng trong Logs / Console | Sửa |
|---|---|
| `Could not find function tasks:ticketState` | `convex/tasks.js` chưa lên đúng deployment → chạy lại `npx convex deploy` |
| URL trong log khác `tough-canary-511.convex.cloud` | Mở `?convex=<URL thật>` hoặc sửa `TD_CONVEX_URL` trong `otp-config.js` |
| `extra field ... not in the validator` | `convex/schema.ts` cũ khai báo bảng `td_*` → xoá khai báo đó hoặc dùng bảng khác |

Kiểm tra nhanh trên điện thoại (F12 / Console):
```js
tdDiag()                       // thử 4 hàm, in kết quả
TD_NET_MODE                    // 'online' = đang dùng server, 'local' = đang dùng máy
TD_LAST_CONVEX_ERROR           // lý do thật
```

---

## 6. Nhắc quan trọng

1. 🔐 Không dán `BREVO_API_KEY` vào file nào; key chỉ nằm ở Render → Environment.
2. ⏰ Setup UptimeRobot ping `/health` 5 phút (`PING.md`) để Render không ngủ.
3. 📴 **Chế độ máy là dự phòng, lưu trên thiết bị đó**, không đồng bộ sang máy
   khác. Khi Convex sống lại web tự lấy số server; chống F12 / chốt tỉ lệ chỉ
   có hiệu lực ở chế độ `online`.
4. 🚫 Không `git add .` kéo `node_modules` / zip vào commit (lệnh trên đã dọn).
