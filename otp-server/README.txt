TÚI ĐIỂM ONLINE · BẢN 12
=========================
Sửa TRỰC TIẾP trên 2 file bạn gửi (index.html + convex_tasks.js).
Không viết lại từ đầu, không đụng schema.ts, không cần auth.config.js,
không đổi key admin td2026admin.

--- 3 FILE TRONG GÓI ---
1) index.html       -> upload ĐÈ lên GitHub (thư mục gốc), rồi Ctrl+F5
2) convex_tasks.js  -> copy thành convex/tasks.js rồi `npx convex deploy`
3) README.txt       -> file này
(kèm thêm tuidiem_capnhat.zip để unzip 1 phát ra cả 3)

--- TERMUX (dán 1 lần) ---
cd ~/td-convex/tuidiemonline_termux
unzip -o ~/storage/downloads/tuidiem_capnhat.zip -d .
cp convex_tasks.js convex/tasks.js
npx convex deploy
cp index.html ~/storage/downloads/index.html
→ up đè index.html lên GitHub → đợi 1-2 phút → Ctrl+F5.

⚠️ CÓ `npx convex deploy` (thêm 3 hàm: resolveLogin / registerProfile / myProfile).

================================================================
CÁI BẠN HỎI: ĐĂNG NHẬP BẰNG GMAIL VÀ CẢ TÊN ĐĂNG NHẬP
================================================================
Firebase Auth gốc CHỈ biết Email + Mật khẩu, không có khái niệm
"tên đăng nhập". Bản 12 giả lập thêm 1 lớp ánh xạ trên Convex:

LÚC ĐĂNG KÝ
- Vẫn tạo tài khoản Firebase bằng Gmail thật (giữ Quên mật khẩu,
  xác thực Gmail, đổi mật khẩu).
- Đồng thời lưu vào bảng td_users:
  username (viết thường) + email + biệt danh + điện thoại.
- Tên đăng nhập VÀ Gmail đều phải DUY NHẤT. Kiểm tra trùng TRƯỚC
  khi tạo acc Firebase nên không còn acc mồ côi.
- Tên đăng nhập: 3-32 ký tự, chỉ chữ / số / . _ - (không gõ Gmail
  vào ô Tên đăng nhập).
- Mật khẩu: đúng mật khẩu lúc đăng ký, do Firebase giữ, web không sửa.

LÚC ĐĂNG NHẬP (ô "Tên đăng nhập hoặc Gmail")
- Có dấu @  -> coi là Gmail, đăng nhập thẳng.
- Không có @ -> gọi Convex resolveLogin để đổi sang Gmail đã đăng ký,
  rồi signInWithEmailAndPassword(Gmail đó, mật khẩu).
- Thứ tự tìm: localStorage -> Convex (nguồn chính) -> Firestore usernames.
- Vì Convex là nguồn chính, dù Firestore Rules còn chặt
  ("Missing or insufficient permissions") thì đăng ký VẪN lưu được
  ánh xạ, không còn chuyện "đăng ký ok mà báo Không tìm thấy tài khoản
  với tên đăng nhập này".

================================================================
3 LỖI LIÊN QUAN ĐÃ CHỐT LUÔN
================================================================
1) "Chưa xác thực Gmail mà vẫn vào web bình thường"
   Nguyên nhân thật: tdDoLogin cũ signOut nhưng QUÊN xoá td_session,
   nên F5 là script trong <head> lại add class td-signed -> vào web.
   Giờ: giữ nguyên phiên Firebase (để bấm "Kiểm tra lại" được),
   xoá td_session + bật cờ tdVerifyBlocking chặn cả onAuthStateChanged
   + phủ màn hình "Xác thực Gmail" có 3 nút:
     📧 Gửi lại email xác nhận
     ✅ Đã bấm link · Kiểm tra lại  (user.reload() rồi tự vào web)
     Đăng xuất · dùng tài khoản khác

   >>> NẾU VẪN KHÔNG NHẬN ĐƯỢC MAIL <<<
   - Kiểm tra Hộp thư đến + Thư rác / Spam (mail từ noreply@....firebaseapp.com).
   - Bấm "Gửi lại email xác nhận", Firebase giới hạn ~5 mail/giờ/địa chỉ.
   - Cấu hình SMTP tuỳ chỉnh trong Authentication > Templates > SMTP settings
     (Gmail cần App Password 16 ký tự) nếu muốn mail vào Inbox chắc chắn.
   - Hoặc TẮT bắt buộc xác thực tạm thời: mở Console trình duyệt chạy
       localStorage.setItem('td_skip_verify','1'); location.reload();
     (hoặc sửa dòng TD_REQUIRE_VERIFY = true thành false trong index.html).
     Nhớ gỡ lại bằng localStorage.removeItem('td_skip_verify') khi xong.
   - Trên Firebase Console > Authentication > Users > menu 3 chấm của user
     có thể đánh dấu email đã xác nhận thủ công nếu có tuỳ chọn đó.

2) "Acc mới tạo thấy 4.774 coin, đáng lẽ 0"
   ensureWallet() cũ seed 4.774 cho MỌI uid mới. Giờ registerProfile()
   TẠO SẴN ví coins:0 ngay lúc đăng ký -> ensureWallet thấy ví có rồi
   nên KHÔNG seed nữa. Acc CŨ đã có ví vẫn giữ nguyên 4.774, không mất coin.

3) "Acc mới trùng biệt danh với acc cũ (Shinotoh)"
   Do localStorage tuidiem_profile_v1 còn dữ liệu acc trước đó.
   Giờ mỗi lần đăng nhập gọi my_profile lấy đúng biệt danh từ server
   rồi đè vào localStorage + Cài đặt. Đăng ký xong cũng ghi nick mới ngay.

================================================================
3 GAME MỚI: BẤM LÀM = VÀO THẲNG GAME
================================================================
Lỗi cũ: dtOpenDirect nhờ gmShow (phụ thuộc feed GamePix), thất bại là
nhảy sang Kho game. Giờ tự dựng iframe toàn màn bằng URL riêng:
  Worms Zone        5 phút   +10 coin
  Wear the Helmet  10 phút   +20 coin
  Bouncy Dunk       5 phút   +10 coin
Có thanh "Đã dùng 0 phút" + nút ✕, mỗi nhiệm vụ đếm RIÊNG, không gộp.
Stickman Warriors 15p vẫn tìm trong feed GamePix như cũ.

================================================================
ADMIN (?admin=td2026admin)
================================================================
Thanh tìm kiếm giờ tìm được theo: UID / Biệt danh / Tên đăng nhập / Gmail.
Mọi thứ khác giữ nguyên: Đơn đổi thẻ cào + mũi tên ›, lịch sử nhiệm vụ
coin 2 ngày, Gian lận + Nguyên nhân, "Mở khóa acc ›", thông báo 7 ngày.

================================================================
FIREBASE CONSOLE · KIỂM TRA 1 LẦN
================================================================
- Authentication > Sign-in method: Email/Password = ĐÃ BẬT (bạn làm rồi) ✅
- Nên TẮT provider "Anonyme / Anonymous" nếu còn bật, để không sinh thêm
  acc ẩn danh (mấy acc Gmail để "—" trong danh sách Users).
- Authentication > Settings > Authorized domains: đã có tuidiemonline.xyz ✅
- Firestore Rules: không còn bắt buộc cho luồng đăng ký nữa, nhưng vẫn nên
  cho phép user đã đăng nhập đọc/ghi collection users để Cài đặt lưu thông tin.

================================================================
CÁC YÊU CẦU CŨ VẪN CÒN NGUYÊN
================================================================
Tỷ lệ thẻ 10k=9.000 / 20k=16.000 / 50k=28.000 / 100k=35.000 /
200k=50.000 / 500k=100.000 coin · 12 nhiệm vụ · 4 nhiệm vụ 5/15/30/50
game không reset 00:00 · chia sẻ gọi navigator.share · đăng ký bắt buộc
hết trừ SĐT · ẩn Nạp & Rút Tiền Mặt, 1 khung "🎁 Đổi thưởng ›" ·
ẩn triệt Game tử thần · popup "Đổi thẻ thành công" nền tối chữ trắng ·
Quên mật khẩu 3 bước qua Gmail.

----------------------------------------------------------------
CHECK TRƯỚC KHI GIAO: 30/30 khối JS inline parse sạch ·
convex_tasks.js node --check OK · div 654/654 · style 21/21 ·
script 32/32 · 3 RPC mới khớp 3 export trên server ✅
