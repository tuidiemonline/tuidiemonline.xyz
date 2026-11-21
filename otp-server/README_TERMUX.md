# Túi Điểm Online · Gói Convex cho Termux (BƯỚC 5 ĐÃ SỬA)

## Bước 5 cũ (bỏ đi, hay lỗi quyền trên Termux)
```bash
npm install -g convex
convex login
convex deploy
```

## Bước 5 mới → chỉ cần 1 lệnh
```bash
bash deploy-termux.sh
```
Script tự chạy: `npm install` → `npx convex login` → `npx convex deploy` → tự sửa `CONVEX_URL` trong `index.html`.
Không cài global, không cần quyền root.

---

## Copy dán vào Termux từ đầu (lần đầu tiên)

```bash
pkg update -y && pkg install nodejs-lts unzip -y
termux-setup-storage
cd ~
unzip ~/storage/downloads/tuidiemonline_termux.zip -d td-convex
cd td-convex/tuidiemonline_termux
bash deploy-termux.sh
```
> `termux-setup-storage` hiện bảng cấp quyền -> bấm **Allow**.
> File zip nằm ở `Downloads` thì đường dẫn là `~/storage/downloads/...`.

### Khi `npx convex login` hiện ra
Termux thường **không tự mở được trình duyệt** → nó in ra 1 link + 1 mã.
Bạn **copy link đó mở bằng Chrome**, đăng nhập tài khoản Convex, dán mã → quay lại Termux là xong.

### Khi `npx convex deploy` hỏi
Lần đầu nó hỏi **chọn team / đặt tên project** → gõ theo hướng dẫn trên màn hình.
Deploy xong terminal in ra `https://ten-cua-ban.convex.cloud` → script tự lấy và ghi vào `index.html`.

---

## Sau khi deploy: 2 việc cuối

**1. Up `index.html` (trong thư mục này) lên GitHub Pages**
Repo `tuidiemonline/tuidiemonline.xyz` → nhánh `main` → đè file `index.html` → Commit.
Đợi 1–2 phút, mở `tuidiemonline.xyz` → gõ `tdDiag()` trong Console để kiểm tra 4 hàm.

**2. (Tuỳ chọn, nhưng nên làm) Khoá chống giả UID**
- Mở `convex/auth.config.js`, thay `REPLACE_WITH_FIREBASE_PROJECT_ID` bằng Project ID thật.
- Trong `index.html` đổi `window.TD_CONVEX_AUTH = false;` → `true;`
- Chạy lại:
```bash
npx convex deploy
npx convex env set STRICT_AUTH 1
```
Lúc này server chỉ tin `identity.subject` từ Firebase, **bỏ qua hẳn `p_uid`**.

> Chưa làm bước 2: web vẫn chạy, reward / ngày / tiến trình game vẫn do server chốt,
> nhưng UID có thể bị giả qua DevTools. Nên làm sớm.

---

## File trong gói

| File | Đi đâu |
|---|---|
| `index.html` | **GitHub Pages** (up đè). Không đưa vào `convex/` |
| `convex/tasks.js` | 8 hàm RPC, khớp `window.TD_RPC_MAP` |
| `convex/schema.js` | 4 bảng + `lastReportAt` |
| `convex/crons.js` | Dọn record cũ lúc 00:00 VN (17:00 UTC) |
| `convex/auth.config.js` | Project ID Firebase (điền sau) |
| `deploy-termux.sh` | Bước 5 mới |
| `cap-nhat-url.sh` | Tự gán URL deployment vào `index.html` |
| `package.json` | `convex` là dependency local |

❌ Đừng copy cả `.zip` lên host, đừng để thư mục `convex/` lộ ra web tĩnh.

---

## Logic đã chốt trên server (tóm tắt)

- **Không tự cộng coin**: chỉ `claimTask` khi user bấm **Nhận**. Ghi `coin_task_claims` **trước**, cộng coin **sau** → F5 / gọi lại API không nhận 2 lần.
- **Bỏ qua** `p_reward / p_day / p_limit / p_ready / p_games / p_progress / p_game_elapsed`. Reward lấy từ `RULES`.
- **Đếm giờ bằng đồng hồ server**: frontend báo nhịp mỗi 15s; server tự cộng `now - lastReportAt`. Gap > 20s = tắt web / thoát game → **mất game đang dở**, giữ nguyên số game đã lưu.
- Ví dụ đúng ý bạn: đã lưu 4 game (20p), game 5 mới 4p rồi tắt web → vào lại bấm **Làm** vẫn còn `4/50`, game 5 đếm lại từ 0.
- **Vòng quay**: bấm **GO** (`spinWheel`) mới mở khoá +5 coin. Bấm Làm rồi out không tính.
- **Chia sẻ**: phải có `p_share=true` (đăng bài + xác nhận) mới nhận +20.
- **Reset 00:00 giờ VN** nhờ lọc theo `day`.

## 9 nhiệm vụ (đã xoá 3 nhiệm vụ Xem 10/20/50 quảng cáo)

| ID | Thưởng | Điều kiện |
|---|---|---|
| `checkin` | +10 | Điểm danh, 1 lần/ngày |
| `login` | +5 | Đăng nhập mỗi ngày |
| `spin` | +5 | Phải bấm GO |
| `play` | +5 | 1 game · 5 phút |
| `ref` | +20 | Đăng bài + xác nhận |
| `taxi` | +10 | Stickman Warriors · 15 phút |
| `peak` | +20 | 5 game · 10p/game |
| `king` | +50 | 15 game · 15p/game |
| `block` | +100 | 30 game · 10p/game |
| `ads5` | +200 | 50 game · 5p/game |
