# TÚI ĐIỂM ONLINE · BẢN CHỐT LẦN 5 (16/11/2026)

## Có gì trong zip
- `index.html`        -> up đè lên GitHub (repo tuidiemonline.xyz)
- `convex_tasks.js`   -> copy thành `convex/tasks.js`
- `HUONG_DAN.md`      -> file này

## 2 lỗi đã sửa
1. **CONVEX_ERROR / "Chưa kết nối được hệ thống"**
   Log báo: `Object contains extra field 'legacySeeded' that is not in the validator`.
   Bản 4 ghi `legacySeeded` + `tdFixV4` vào bảng `users_coins` nhưng
   `convex/schema.ts` không khai báo 2 field đó -> Convex chặn MỌI patch.
   → Bản 5 **không ghi 2 field nữa**, và tự **xoá** field dư còn sót trong
   document cũ (patch `undefined`). Cờ chốt chuyển sang `streamBy`
   (field đã có sẵn trong schema) => **KHÔNG cần sửa schema.ts**.

2. **"Coin hôm nay" hiện 3 chấm `…` rồi nháy**
   → Áp đúng cơ chế của "Thu nhập của tôi" cho CẢ 2 ô:
   - Chưa có số server: **giữ số cũ**, không vẽ `…`
   - Server trả số mới: cập nhật **1 lần**
   - Server trả số cũ (F5 / reset): **bỏ qua**, không nháy

## Giữ nguyên
- Chữ "Coin hôm nay" / "Thu nhập của tôi" (không đổi tên)
- Thu nhập = **4.774** · Coin hôm nay = coin kiếm trong ngày, reset 00:00 VN
- Vòng quay: 10 coin **90%** · 25 coin **6%** · 50 coin **4%** ·
  3 hộp quà / 100 / 10.000 = **0%**
- URL `https://fabulous-capybara-90.convex.cloud` · 11 RPC · chặn F12

## Termux — dán 1 lần
```bash
cd ~/td-convex/tuidiemonline_termux
unzip -o ~/storage/downloads/tuidiem_capnhat.zip -d .
cp convex_tasks.js convex/tasks.js
npx convex deploy
cp index.html ~/storage/downloads/index.html
```
Gõ `Y` khi hỏi.

## GitHub
Repo `tuidiemonline.xyz` -> **Add files -> Upload files** -> chọn
`index.html` trong Downloads -> **Commit changes** -> đợi 1-2 phút.

## Kiểm tra
Vào web, Ctrl+F5 (hoặc xoá cache), đợi 2-3 giây:
- Home: **Coin hôm nay 260** (hoặc 0 nếu sang ngày mới) — đứng yên, không 3 chấm
- Tôi: **Thu nhập 4.774 Coin** — đứng yên, không nháy
- Quay thử: chỉ ra 10 / 25 / 50, chữ và số `+… Coin` luôn khớp
- Trang "Thưởng vé hàng tuần": hết thông báo CONVEX_ERROR

Không build, không `.env`, không Dashboard, không `schema.ts`, không đổi link.

## Nếu vẫn còn CONVEX_ERROR
Chạy `npx convex logs --prod --history 50` rồi gửi log.
Trường hợp hiếm: schema của bạn KHÔNG có `streamBy` -> mở
`convex/schema.ts`, trong bảng `users_coins` thêm 1 dòng:
```ts
streamBy: v.optional(v.string()),
```
rồi `npx convex deploy` lại.
