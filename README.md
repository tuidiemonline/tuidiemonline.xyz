# TÚI ĐIỂM ONLINE · BẢN 34 (TỔNG HỢP TOÀN BỘ YÊU CẦU)

File nén: **tuidiemonline-final.zip** · giải nén ra đúng thư mục `tuidiemonline-final/`.

> Đã mở **hết 15 file** trong gói, rà từng dòng, vá tổng hợp và kiểm tra chéo.
> Giữ nguyên những cái đã chạy tốt: OTP Render + Brevo, đồng hồ vòng quay 24h
> toàn cục, chế độ máy chống `CONVEX_ERROR`, 1 khung nhập duy nhất, 1 acc 1 ví.

---

## 1. ⭐ Hai sổ coin RIÊNG BIỆT (quan trọng nhất)

| | Coin hôm nay | Thu nhập của tôi |
|---|---|---|
| Ý nghĩa | Coin **kiếm được** trong ngày | **Tổng** coin từ khi tạo acc |
| Khi kiếm +n | **+n** | **+n** |
| Qua 00:00 VN | **về 0**, đếm lại | **giữ nguyên**, không reset |
| Khi tiêu (đổi thẻ cào) | **đứng yên** | **-n** |

- Ví dụ đúng: đang có **4.000** → kiếm 10 → `Coin hôm nay = 10`,
  `Thu nhập = 4.010`. **Không bao giờ** biến thành 10.
- Sang ngày mai: `Coin hôm nay = 0`, `Thu nhập vẫn 4.010`.
- Đổi thẻ 10.000đ (9.000 coin): `Thu nhập = ...`, `Coin hôm nay` vẫn giữ số đã kiếm.
- Kiếm coin → **cả 2 số nhảy ngay lập tức**, kể cả đang chế độ máy.
- Server Convex trả về số **nhỏ hơn** (chưa có ví / đang offline) → **không được ghi đè** mất số của máy. Chỉ nhận số thấp hơn sau khi tiêu coin thật (`force`).
- Kho lưu `tdacc:<uid>:wallet` → 2 acc hay **5.000 acc vẫn độc lập**.
- Backend `convex/tasks.js` đã đúng sẵn: `addCoins` cộng cả 2, `exchangeDiamonds` chỉ trừ `coins`, `coinState` reset `today` theo `todayDate`. Bản 34 chỉ sửa phía web để không ghi đè nữa.

## 2. Các yêu cầu khác đã gom hết

1. **Nhận +5 coin / +3 vé** → `Coin hôm nay`, `Thu nhập của tôi`, **vé tím trong vòng quay** cập nhật **ngay** (hết cảnh bấm xong vẫn `0`).
2. **Xoá chữ** *"Đang lưu trên máy · tự đồng bộ khi server sẵn sàng"* ở trang Thưởng vé hàng tuần (nút **Thử lại** vẫn giữ).
3. **Đổi biệt danh**: bấm *Cập nhật thông tin* → lưu theo UID, cập nhật `tdAccountInfo` + gọi lại `renderSettings()` → thoát ra **thấy đổi ngay**, không còn hiện `Quandeptrai`. Hồ sơ `tdacc:<uid>:profile` nên acc A không dính acc B.
4. **Mọi thông tin cho phép sửa** (biệt danh / giới tính / ngày sinh / SĐT) đều tự làm mới giao diện khi bấm Cập nhật.
5. **Ngày sinh tự thêm `/`**: gõ `22` → `22/`, `12` → `22/12/`, `2004` → `22/12/2004`. Chỉ nhận số, tối đa `DD/MM/YYYY`, bấm xóa vẫn được (không bị chèn lại dấu `/`).
6. **Số điện thoại `+84` cố định**: user chỉ gõ `965479975`, không cần gõ `0` đầu; lỡ gõ `0` hoặc `84` cũng tự bỏ. Áp cả ô Cài đặt lẫn ô Đăng ký.
7. **Gmail trong Cài đặt**: 1 dòng, thẳng hàng, căn phải, không xuống dòng / không vỡ khung (chữ quá dài thì thu gọn có dấu `…`).
8. **Liên hệ hỗ trợ**: bỏ Zalo, đổi sang **Messenger** `https://m.me/tuidiemonline.cskh` (cả popup nạp kim cương + hướng dẫn gửi bill).
9. **Điều khoản tick 1 lần duy nhất**: lưu `td_policy_agreed_v1`. Tắt web, đăng xuất, đăng nhập acc khác → dấu tích cam **vẫn sẵn**, không phải tick lại. Áp cả đăng nhập tay lẫn nút Google.
10. **Trang Đăng ký có nút quay lại** góc trái đầu trang: **khung ĐEN, mũi tên TRẮNG, KHÔNG viền xanh** (đúng lời dặn cuối). Bấm → về Đăng nhập.
11. Đồng bộ **3 file `tasks.js`** (trước đó chỉ khác mỗi đoạn tiêu đề, thân code đã giống) → giờ identical 100%.

## 3. Cấu trúc file (15 file)

```
tuidiemonline-final/
├── index.html                  ← BAN 34 (toan bo sua o day)
├── otp-config.js               ← TD_CONVEX_URL + TD_OTP_DEFAULT (giu nguyen)
├── package.json · CNAME · PING.md · README.md · .gitignore
├── convex/tasks.js             ← DEPLOY THAT
├── convex/auth.config.js.example
├── tasks.js · convex_tasks.js  ← ban tham chieu (code giong het)
└── otp-server/
    ├── server.cjs · package.json · render.yaml · .gitignore
```

`otp-server/server.cjs` dùng `process.env.BREVO_API_KEY`, **không có key thật** nào trong gói.

## 4. LỆNH CẬP NHẬT · 1 lần chạy hết (có `unzip`)

```bash
cd ~/tuidiemonline_termux && F=$(find ~ /sdcard/Download -type f \( -name 'tuidiemonline-final.zip' -o -name 'tuidiemonline-final.js' \) 2>/dev/null) && Z=$(ls -t $F 2>/dev/null | head -1) && [ -n "$Z" ] && cp "$Z" ./_ban.zip && unzip -o ./_ban.zip && cp -r tuidiemonline-final/. . && rm -rf tuidiemonline-final _ban.zip backup && git add . && (git commit -m "ban 34 - tong hop" || true) && git push origin main && npx convex deploy
```

> Xoá file zip **cũ** trong repo trước để `ls -t` lấy đúng bản 34.
> Hỏi `Yes` → `Y`. Xong đợi Pages build ~1–2 phút, mở:
> **`https://tuidiemonline.xyz/?v=16`**

## 5. Kiểm tra nhanh sau khi lên web

- Vào Cài đặt → Cập nhật thông tin cá nhân → đổi Biệt danh → bấm Cập nhật → **thoát ra thấy tên mới ngay**.
- Gõ Ngày sinh `22122004` → hiện `22/12/2004`; gõ SĐT `0965479975` → hiện `+84965479975`.
- Vào Nhiệm vụ bấm **Nhận** → `Coin hôm nay` **và** `Thu nhập của tôi` cùng tăng ngay.
- Vào Thưởng vé bấm **Nhận +3 vé** → Vòng quay hiện **3 vé tím** ngay.
- Đăng xuất → vào lại → **không phải tick điều khoản**, dấu cam vẫn còn.
- Bấm **Liên hệ hỗ trợ** → mở `m.me/tuidiemonline.cskh`.
- Console (nếu cần): `tdDiag()` · `TD_NET_MODE` · `TD_LAST_CONVEX_ERROR`.

## 6. Nhắc quan trọng

1. 🔐 Không dán `BREVO_API_KEY` vào file nào; key chỉ nằm ở Render → Environment.
2. ⏰ UptimeRobot ping `/health` 5 phút để Render không ngủ (`PING.md`).
3. 📴 Chế độ máy vẫn là dự phòng (lưu trên thiết bị đó). Khi Convex sống lại, web tự lấy số server; chống F12 / chốt tỉ lệ chỉ có hiệu lực ở chế độ `online`.
4. 🚫 Không `git add .` kéo `node_modules` / zip vào commit (lệnh trên đã dọn).
5. 🧹 Nếu muốn xoá hẳn dữ liệu thử nghiệm cũ trên máy: F12 → `localStorage.clear()` rồi F5 (sẽ mất coin/vé đang lưu ở chế độ máy, cân nhắc trước khi làm).
