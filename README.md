# TÚI ĐIỂM ONLINE · BẢN 36 (TỔNG HỢP + RÀ LẠI TOÀN BỘ FILE)

File nén: **tuidiemonline-final.zip** · giải nén ra đúng thư mục `tuidiemonline-final/`.

> Đã mở **hết 15 file** trong gói, rà từng dòng, vá tổng hợp và kiểm tra chéo.
> Giữ nguyên những cái đã chạy tốt: OTP Render + Brevo, đồng hồ vòng quay 24h
> toàn cục, chế độ máy chống `CONVEX_ERROR`, 1 khung nhập duy nhất, 1 acc 1 ví.

## 🆕 BẢN 36 · chỉnh giao diện ô SĐT (đúng ảnh chụp)

1. **Đăng ký · `+84` và số quá xa nhau**: bỏ `padding-left:104px`, đưa về
   `90px` → chữ số **nằm ngay sát số 4** của `+84`. Vẫn là nhãn tĩnh ngoài
   input, con trỏ mặc định đứng ngay sau `+84`, không xóa được `+84`.
2. **Đổi màu đồng bộ**: `+84`, các số sau `+84`, và 2 nút **Gửi mã / Xác thực**
   đều dùng `#8b8b8b` = đúng màu placeholder *Tên đăng nhập / Gmail / Mật khẩu*
   (trước đây là trắng đậm, lệch tông).
3. **Thông tin cá nhân · cũng bị hở xa**: hàng SĐT gom `+84` + 9 số thành
   **một cụm sát nhau** (`gap:4px`, input không còn `flex:1` kéo sang phải,
   chữ căn trái). Màu chuyển sang `#94a3b8` = đúng màu **Gmail / ID tài khoản**.
4. **Placeholder mới**: xoá `"Nhập số, bỏ 0 đầu"`, thay bằng
   `"nhập số điện thoại ( không bắt buộc )"` — đăng ký không bắt buộc SĐT,
   để trống vẫn tạo được acc.
5. **Vá thêm lỗi tiềm ẩn**: `tdPhoneDigits` trước đó cắt nhầm 2 chữ số đầu
   của số thật bắt đầu bằng `84` (vd `84559633` → `559633`). Giờ chỉ bỏ mã
   quốc gia khi chuỗi dài có `+84` thật sự (`+84912345678`).

> Mũi tên quay lại trang Đăng ký giữ **nền đen · mũi tên trắng · KHÔNG viền xanh**.

---

## 📌 BẢN 35 · 3 lỗi đã sửa (giữ nguyên)

1. **Điểm danh +10 mà "Coin hôm nay" chỉ +5**: ở chế độ máy `claim_task`
   nhận `p_reward = 0` (để server tự chốt) nhưng lại mặc định `5`. Giờ dùng
   bảng `TD_TASK_REWARD` **khớp 100% với `RULES` của `convex/tasks.js`**
   (`checkin = 10`, `login/spin/play = 5`…). Server `claimTask` cũng trả
   `today` **sau khi cộng** (trước đó đọc giá trị cũ).
2. **Lịch sử hôm nay luôn rỗng**: popup cũ chỉ đọc `__serverHistory` từ Convex,
   nên offline là hiện "Chưa có lượt nào hôm nay". Giờ mọi lần **Điểm danh /
   Nhận nhiệm vụ / Quay vòng quay trúng coin** đều ghi qua `histAdd()` →
   kho `tdacc:<uid>:hist:<ngày>` (tắt web vẫn giữ, sang 00:00 tự đổi sổ).
   Popup gộp **server + máy**, bỏ dòng trùng. 5.000 acc không lẫn lịch sử.
3. **Ô SĐT `+84`**: `+84` giờ là **nhãn tĩnh nằm ngoài input** (cạnh chữ
   "Số điện thoại" / ngay sau icon), **không còn 2 cái +84**, không đè lên
   icon, không nháy số `8` khi bấm xóa. Input chỉ chứa 9 số, bấm vào con trỏ
   **đứng ngay sau `+84`** (không đứng trước dấu `+`), không xóa/sửa được
   `+84`, không gõ được dấu `+`. Lưu vẫn tự ghép thành `+849...`.

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
6. **Số điện thoại `+84` cố định** (BẢN 35 chỉnh lại): `+84` là nhãn tĩnh **ngoài ô nhập**, user chỉ gõ `965479975`, không cần gõ `0` đầu; lỡ gõ `0` hoặc dán cả `+84` cũng tự bỏ. Áp cả ô Cài đặt lẫn ô Đăng ký.
7. **Gmail trong Cài đặt**: 1 dòng, thẳng hàng, căn phải, không xuống dòng / không vỡ khung (chữ quá dài thì thu gọn có dấu `…`).
8. **Liên hệ hỗ trợ**: bỏ Zalo, đổi sang **Messenger** `https://m.me/tuidiemonline.cskh` (cả popup nạp kim cương + hướng dẫn gửi bill).
9. **Điều khoản tick 1 lần duy nhất**: lưu `td_policy_agreed_v1`. Tắt web, đăng xuất, đăng nhập acc khác → dấu tích cam **vẫn sẵn**, không phải tick lại. Áp cả đăng nhập tay lẫn nút Google.
10. **Trang Đăng ký có nút quay lại** góc trái đầu trang: **khung ĐEN, mũi tên TRẮNG, KHÔNG viền xanh** (đúng lời dặn cuối). Bấm → về Đăng nhập.
11. Đồng bộ **3 file `tasks.js`** → bản 35 **identical 100%** (đã `md5sum` kiểm tra), cùng sửa `claimTask` trả `today` sau khi cộng.

## 3. Cấu trúc file (15 file)

```
tuidiemonline-final/
├── index.html                  ← BAN 35 (toan bo sua o day)
├── otp-config.js               ← TD_CONVEX_URL + TD_OTP_DEFAULT (giu nguyen)
├── package.json · CNAME · PING.md · README.md · .gitignore
├── convex/tasks.js             ← DEPLOY THAT
├── convex/auth.config.js.example
├── tasks.js · convex_tasks.js  ← ban tham chieu (identical 100%)
└── otp-server/
    ├── server.cjs · package.json · render.yaml · .gitignore
```

`otp-server/server.cjs` dùng `process.env.BREVO_API_KEY`, **không có key thật** nào trong gói.

## 4. LỆNH CẬP NHẬT · 1 lần chạy hết (có `unzip`)

```bash
cd ~/tuidiemonline_termux && F=$(find ~ /sdcard/Download -type f \( -name 'tuidiemonline-final.zip' -o -name 'tuidiemonline-final.js' \) 2>/dev/null) && Z=$(ls -t $F 2>/dev/null | head -1) && [ -n "$Z" ] && cp "$Z" ./_ban.zip && unzip -o ./_ban.zip && cp -r tuidiemonline-final/. . && rm -rf tuidiemonline-final _ban.zip backup && git add . && (git commit -m "ban 35 - tong hop" || true) && git push origin main && npx convex deploy
```

> Xoá file zip **cũ** trong repo trước để `ls -t` lấy đúng bản 35.
> Hỏi `Yes` → `Y`. Xong đợi Pages build ~1–2 phút, mở:
> **`https://tuidiemonline.xyz/?v=17`**

## 5. Kiểm tra nhanh sau khi lên web

- Vào Cài đặt → Cập nhật thông tin cá nhân → đổi Biệt danh → bấm Cập nhật → **thoát ra thấy tên mới ngay**.
- Gõ Ngày sinh `22122004` → hiện `22/12/2004`; gõ SĐT `0965479975` → hiện `+84965479975`.
- Vào Nhiệm vụ bấm **Nhận** → `Coin hôm nay` **và** `Thu nhập của tôi` cùng tăng ngay.
- **Điểm danh +10** → `Coin hôm nay` phải **+10** (không còn +5).
- Bấm biểu tượng đồng hồ → **Lịch sử hôm nay** hiện đủ: điểm danh, nhiệm vụ, vòng quay (kể cả lúc server chưa sống).
- Vào Thưởng vé bấm **Nhận +3 vé** → Vòng quay hiện **3 vé tím** ngay.
- Ô SĐT: chỉ thấy **một** `+84`, bấm vào gõ `9` là ra `+849`, bấm xóa hết không nháy `8`.
- Đăng xuất → vào lại → **không phải tick điều khoản**, dấu cam vẫn còn.
- Bấm **Liên hệ hỗ trợ** → mở `m.me/tuidiemonline.cskh`.
- Console (nếu cần): `tdDiag()` · `TD_NET_MODE` · `TD_LAST_CONVEX_ERROR`.

## 6. Nhắc quan trọng

1. 🔐 Không dán `BREVO_API_KEY` vào file nào; key chỉ nằm ở Render → Environment.
2. ⏰ UptimeRobot ping `/health` 5 phút để Render không ngủ (`PING.md`).
3. 📴 Chế độ máy vẫn là dự phòng (lưu trên thiết bị đó). Khi Convex sống lại, web tự lấy số server; chống F12 / chốt tỉ lệ chỉ có hiệu lực ở chế độ `online`.
4. 🚫 Không `git add .` kéo `node_modules` / zip vào commit (lệnh trên đã dọn).
5. 🧹 Nếu muốn xoá hẳn dữ liệu thử nghiệm cũ trên máy: F12 → `localStorage.clear()` rồi F5 (sẽ mất coin/vé đang lưu ở chế độ máy, cân nhắc trước khi làm).
