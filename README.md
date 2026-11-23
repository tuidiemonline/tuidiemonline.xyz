# TÚI ĐIỂM ONLINE · BẢN 43b (MAIN · CLIXWALL + GIỮ NGUYÊN MỌI VÁ VÍ)

File nén: **tuidiemonline-final.zip** · giải nén đè vào đúng thư mục repo nhánh `main`.

## 🟢 BẢN 43b · Xoá offerwall.me, tích hợp ClixWall (23/11 · 18:3x)

### Đã xoá sạch khỏi `index.html`
- Module `<script type="module">` gọi `https://tuidiem-webhook.vercel.app/api/offerwall-url`.
- Modal `#owmModal` / `#owmIframe`, iframe tab `#owmTabIframe`, crop `-46px` của Offerwall.me.
- Các hàm `goiApi / layUrlNhiemVu / hienLoi / napNhiemVu`, mọi câu báo lỗi Vercel Firewall.
- **Giữ nguyên** `/api/withdraw` (rút tiền) và `listenUserChanges()` — không phải offerwall.me.

### Đã thêm
| File | Việc |
|---|---|
| `index.html` | iframe ClixWall đúng mẫu, `user=` = UID Firebase (encode), chỉ gắn `src` sau Auth; poll `clixwall:inbox` mỗi 15s; `tdClixApply()` cộng ví 1 lần rồi `clixwall:ack` |
| `convex/http.js` | **mới** · `/clixwallPostback` nhận GET + form-POST, verify `secret`, chống trùng `transaction_id`, xử lý `Completed` / `Reversed` |
| `convex/clixwall.js` | **mới** · patch `td_wallet`, ghi `td_claims` + `td_history`, phát inbox cho frontend |

**3 file `tasks.js` / `convex_tasks.js` / `convex/tasks.js` GIỮ NGUYÊN TỪNG BYTE.**
`tdWApply` / `tdPaintWallet` / `refreshCoins` / `tdDayV3Bump` / daily-task sheet **không đụng**
→ các vá 42f → 42v (điểm danh 1 lần, F5 không nháy, không tăng ví ảo, nhận nhiệm vụ tăng Coin hôm nay, mỗi acc 1 kho) vẫn còn nguyên.

### Cấu hình 1 lần trên Convex (BẮT BUỘC)
```bash
cd ~/test-code/tuidiemonline-final
npx convex env set CLIXWALL_SECRET 'dán_Secret_trong_ô_Secret_của_ClixWall'
npx convex env set CLIXWALL_COIN_RATE 1000
npm install && npx convex deploy
```
`CLIXWALL_COIN_RATE 1000` = `user_payout` 0.001 USD → **1 coin**. Nếu trong dashboard
ClixWall bạn đã đặt *currency value* (user_payout đã là coin), đặt `CLIXWALL_COIN_RATE 1`.

### Postback URL điền trong ClixWall → Sites → Integrate → Set postback URL
```
https://tough-canary-511.convex.site/clixwallPostback?user_id={user_id}&txn={transaction_id}&reward={user_payout}&status={status}&secret={secret}
```
Bấm **Fill sample values → Send test**: phải trả `200 OK`. Sau đó vào Ẩn danh,
mở tab **Offers**, hoàn thành 1 offer → `Coin hôm nay` + `Thu nhập` + `Lịch sử` tăng cùng lúc.

> Secret **không có trong zip**. Nếu quên set, endpoint trả `500 CLIXWALL_SECRET chua duoc dat`;
> sai secret trả `401 INVALID_SECRET` — không bao giờ cộng coin bậy.

> **Đính chính:** tin trước mình nói «BẢN 42v đã sửa» nhưng **lúc đó chưa tạo
> file zip**, chỉ là tên dự kiến. File này mới là **42v thật**: đã mở đúng bản
> `42u` bạn gửi, dựng harness chạy thật để tái hiện lỗi rồi mới vá.

## 🔴 BẢN 42v · Lịch sử có +5/+10 mà "Coin hôm nay" đứng im 60 (23/11 · 17:00)

**Tái hiện được bằng code (không đoán):** sau BẢN 42h ví Convex được tạo lại
từ số thấp, nên `coin_state.today` của server chỉ **20~30**, trong khi ledger
ngày trên máy đã **60** (gộp bằng `max()` từ các bản trước). Mỗi lần bấm
"Nhận", `claimTask` trả `r.today = 25/35` → `tdDayV3Sync()` lại dùng
`Math.max(60, 25) = 60` → **không bao giờ tăng**. `histAdd()` thì ghi độc
lập vào kho riêng nên popup vẫn hiện đủ dòng `+5 / +10`. Đúng 3 ảnh bạn chụp.

| Bước | 42u (lỗi) | 42v |
|---|---|---|
| F5 query `(135, 20)` | `60 / 165` | `60 / 165` |
| Nhận nhiệm vụ **+5** | `60` ❌ `170` | **`65`** ✅ `170` |
| F5 ×3 sau khi nhận | `60 / 165` ❌ | **`65 / 170`** ✅ |
| Nhận tiếp **+10** | `60` ❌ | **`75 / 180`** ✅ |
| Đổi thẻ −50 (force) | `125` | **`130`** ✅ |

**Vá 3 chỗ (chỉ `index.html`):**
1. `tdWApply(..., opts)` nhận thêm `opts.reward`. Khi là **mutation có reward**
   (`claim_task` / `spin_wheel`), gọi `tdDayV3Bump(reward)` cộng **thẳng reward
   thật** vào ledger ngày — không còn trông vào số tuyệt đối của server.
   `tdDayV3Sync` vẫn set `__tdServerTodayAt` nên `tdAfterCheckin` **không bump
   thêm lần nữa** → điểm danh vẫn đúng 1 lần +10.
2. `total` cũng đi theo **reward thật** trên nền local. Query
   (`refreshCoins` / `sync`) giờ **không đụng vào total**: không tăng (giữ vá
   42u hết `165→195→225`) **và không kéo lui** `170→165` ngay sau khi vừa nhận.
   Đổi thẻ / thu hồi vẫn giảm đúng qua `opts.force`.
3. 4 call site truyền `reward`: `applyCoins(c,isClaim,reward)` (engine),
   `CoinBridge.claim` (BẢN 10), `spin_wheel` (`gain`), và `tdApplyCoin` giữ
   nguyên `opts` cho `refreshCoins` (query, không reward).

**Giữ nguyên:** 42u (F5 không cộng dồn), 42t (pre-fill khung hình đầu, hết
nháy `0/20`), 42r (nút Làm/Nhận), 42o (mỗi UID 1 ví), OTP, Admin online.

---

## 🟠 BẢN 42u · Bệnh 165 → 195 → 225 (23/11 · 16:31)

**Tái hiện được chính xác bằng code:** seed ví `165` + offset `30` (do BẢN
42l lưu từ hồi server Convex còn `135`), rồi cho `coin_state` trả **đúng ví
hiện tại** (đây là hành vi của `tdLocalRpc` / chế độ máy khi REST lỗi):

| Lần | `coin_state` trả | `tdServerToDisplay` | `tdWApply` ghi |
|---|---|---|---|
| F5 1 | 165 | 165 + 30 = **195** | **195** |
| F5 2 | 195 | 195 + 30 = **225** | **225** |
| F5 3 | 225 | 225 + 30 = **255** | **255** |

Đúng dãy số trong 3 ảnh bạn chụp. **Không phải user bấm nhận, không phải
server cộng** — là `refreshCoins()` (một **query chỉ đọc**) được 42t cho
quyền `if (T >= o.total) o.total = T`, đẩy số đã cộng offset vào ví rồi vòng
sau lại đọc chính số đó làm nền.

**Vá 3 chỗ:**
1. `tdWApply(total, today, diamonds, opts)`: chỉ **mutation có reward**
   (`opts.claim` / `opts.force`: claim_task, spin_wheel, exchange, admin)
   được **tăng** `o.total`. Query (`refreshCoins` / `sync` / `CoinBridge.sync`)
   chỉ được **giữ nguyên hoặc hạ** (đổi thẻ, thu hồi) — hết cộng dồn.
2. `tdApplyCoin(..., opts)` + 4 call site sau mutation truyền `{claim:true}`;
   `applyCoins(c, isClaim)` phân biệt `sync()` (query) và `claim()` (mutation).
3. `tdCoinOffset(S)`: offset là **hằng số**, có `td_coin_offset_base` rồi thì
   trả số đã lưu, **không tính lại** `local - S` mỗi lần F5.

**Sau vá:** F5 ×3 vẫn `165` · bấm Nhận +10 → `175` · đổi thẻ −50 → `125`.
Giữ nguyên 42t (pre-fill khung hình đầu, hết nháy 0/20), 42r (nút Làm/Nhận),
42o (mỗi UID 1 ví), OTP, Admin online realtime.



> **Đính chính thẳng (quan trọng):**
> - `42p` / `42q` / `42s` ở các tin nhắn trước chỉ là **tên dự kiến**, khi đó
>   **chưa có file zip nào được tạo**. Chỉ có `42r` (file thật) và giờ là `42t`.
> - **42r vẫn nháy là do mình đoán sai.** Mình bảo *"anon thì giữ nguyên số
>   đang hiện trên màn hình"* — nhưng **F5 là DOM MỚI**, không hề có "số cũ".
>   HTML viết sẵn `>0</div>` / `>0</span>`; B6 inline gọi `tdPaintWallet()`,
>   42r `return null` → cái **0 của HTML ở lại** → `45 → 0 → 45`.
>   Còn `20` do `reconcileTodayState()` chạy ở top-level trước khi Auth về,
>   `tdForcePaint()` + `updatePointsUI()` gán `__serverToday` từ kho `anon`.
> - Không cần `npx convex deploy`, không đụng Render / `otp-server`.
>   **Chỉ đẩy repo web `tuidiemonline.xyz`.**

## 🆕 BẢN 42t · Bệnh gốc (23/11 · 16:12)

4 đường cùng ghi số trong lúc `tdOwner() === 'anon'`:

| Đường | 42r | 42t |
|---|---|---|
| HTML `<div id="profileWalletAmount">0</div>` + B6 | `return null` → **0** | pre-fill **45** ngay |
| `reconcileTodayState()` (top-level, trước Auth) | `tdForcePaint()` → **20** | thoát sớm |
| `refreshCoins()` trả `15/20` | `tdWApply` ghi ví anon | bỏ qua kết quả |
| `updatePointsUI()` wrapper | gán `__serverCoins/__serverToday` | không gán khi anon |

**Cách vá:**
- `tdBootOwner()` = UID đang đăng nhập, hoặc (khi Auth chưa về) `td_ck_uid`
  — RAW, BAN 42d đã lưu acc cuối và **không xoá lúc đăng xuất**. **Chỉ để đọc.**
- `tdWalletV3ReadOwner(owner)`: đọc thuần `td_wallet_v3:<owner>` +
  `td_day_v3:<owner>:<ngày VN>` + mirror, **không seed / không migrate /
  không ghi bất kỳ key nào / không set `__server*` / không tạo offset**.
- `tdPaintWallet()` anon → vẽ ngay số thật của acc cuối → B6 không còn để lại 0.
  Chưa từng đăng nhập → `0` thật (đúng).
- `tdWApply` / `tdForcePaint` / `reconcileTodayState` / `updatePointsUI` /
  `refreshCoins` / `tdDayV3Set`: **anon → không nhận số server, không ghi,
  chỉ vẽ lại số đã lưu**. Auth khôi phục → `tdResetOwnerCache()` sync 1 lần.
- Dọn 1 lần các key rác `tdacc:anon:*`, `td_*_v3:anon*`, `td_mirror_today`,
  `td_wallet_v3_seeded` (dùng `Storage.prototype.key` gốc, trước namespace).

**Kết quả:** 1 lần F5 = `45 · 60` ngay khung hình đầu, không còn `0` hay `20`.
Vẫn giữ: mỗi UID 1 ví, đổi acc không lẫn, điểm danh 1 lần/ngày VN, nút
«Làm»/«Nhận» đúng, OTP, Admin online realtime, Convex `tough-canary-511`.



## 🆕 BẢN 42r · 2 lỗi mới (23/11 · 15:50 / 15:56)

### 1. Chưa quay vòng quay mà đã hiện nút «Nhận»

Bộ nhiệm vụ **BẢN 10** (đè `window.renderDailyTaskSheet` ở cuối file) dùng
`ST_KEY='td_task_state_v3'`, `td_games_*`, `td_prog_*`, `td_active_v3` qua
`localStorage`. Key đi qua `map()` namespace theo `tdUid()` **tại thời điểm gọi**:
lúc F5 / vừa đăng xuất / Auth chưa khôi phục → `tdUid()=''` → ghi
`tdacc:anon:*`. Acc B vào sau đọc đúng kho `anon` của acc A → thấy
`done.spin=1` → vẽ **«Nhận»**. Bấm vào `claim_task` trên Convex kiểm tra theo
UID thật → trả *«Bạn chưa hoàn thành nhiệm vụ này!»*. Đúng ảnh bạn chụp.

**Vá:**
- `ST_KEY` → `td_task_state_v4:<owner>:<ngày VN>`, PERSIST riêng
  `td_task_state_v4:p:<owner>`; `gKey/pKey/actKey` đều có `<owner>`; đọc/ghi
  qua `tdRaw` (RAW), **chặn hoàn toàn khi `owner='anon'`**.
- `renderDailyTaskSheet()`: `done` chỉ tin khi có UID thật (riêng nhiệm vụ
  `free` vẫn sẵn sàng). Chưa xong → **«Làm»** / «Làm tiếp».
- `claimDailyTask()`: validate kép ngay tại nút — chưa `done` thì hiện
  *«Bạn chưa hoàn thành nhiệm vụ này!»* + mở đúng luồng làm, **không gọi server**.
- `tdResetOwnerCache()` gọi lại `renderDailyTaskSheet()` khi Auth khôi phục /
  đổi acc → danh sách vẽ lại theo đúng acc.

### 2. Reset là 45 → 15 → 45, Coin hôm nay 60 → 20 → 60

Không phải React, không phải cache trình duyệt. `refreshCoins()` chạy **trước
khi Firebase Auth khôi phục** → `tdOwner()='anon'` → `tdCoinOffset()` tạo offset
`...:anon = 0` → `tdWApply(15,20)` ghi ví `anon` rồi `tdPaintWallet()` vẽ
**15 / 20** lên DOM. Auth về sau → owner thật, offset `30` → vẽ lại **45 / 60**.

**Vá:** khi `owner='anon'` thì `tdPaintWallet()` **giữ nguyên số đang hiện**
(không vẽ), `tdWalletV3Write()` không ghi ví / không set `__serverCoins`,
`tdCoinOffset()` trả `0` không lưu. Sau khi Auth khôi phục,
`tdResetOwnerCache()` đã vẽ đúng số thật 1 lần duy nhất.

### Giữ nguyên từ 42o / 42l / 42i / 42h / 42g
Mỗi UID 1 ví `td_wallet_v3:<owner>` · `td_day_v3` gộp `max()` · offset ví riêng
từng acc · điểm danh 1 lần/ngày VN · lịch sử · OTP · Admin online realtime ·
Convex `tough-canary-511` · 3 file `tasks.js` giống hệt nhau.



## 🆕 BẢN 42o · Đổi acc vẫn thấy "Coin hôm nay 60" của acc trước

**Triệu chứng (23/11 · 15:28)**: acc A có `Coin hôm nay 60` / `Thu nhập 4.774`,
đăng xuất sang acc B thì **Coin hôm nay vẫn 60** dù acc B chỉ có `30`.

**Nguyên nhân thật (đọc từ `index.html`, không phải đoán):**
1. `td_mirror_today` là **key RAW chung, không gắn UID**. `tdDayV3Get()` đọc
   key này để gộp `today` → acc B kéo `60` của acc A.
2. `tdWalletV3Write()` ghi 4 bản mirror, trong đó **2 bản không có owner**
   (`tdRaw.set(k,v)` và `tdacc:anon:k`) → `tdWalletV3Read()` của acc mới lại
   seed từ `tdRaw.get('userPoints')` = số của acc trước.
3. `td_wallet_v3_seeded` cũng là **1 key chung**: chỉ acc đầu tiên được phép
   migrate, các acc sau bị logic `allowAnon` xử lý sai.
4. `tdOwner()` fallback sang `td_ck_uid` / `firebaseUid` (UID của acc TRƯỚC,
   được giữ lại để duy trì điểm danh) → trong khoảnh khắc đổi acc, mọi lần
   ghi ví vẫn ghi vào ví acc A.

**Server Convex đã đúng sẵn**: `uidOf()` + `ensureWallet(uid)` + `fUid(q,uid)`,
`DEMO_WALLETS` rỗng, `uid=""` không tạo ví. Mỗi UID 1 document `td_wallet`.
Vì vậy **không cần `npx convex deploy` lại** và không đụng `otp-server`/Render.

**Cách vá:**
- `tdOwner()` = acc **đang đăng nhập** (`fbAuth.currentUser` / `__tdActiveUid`),
  bỏ fallback sang UID cũ. Điểm danh vẫn có `ckOwner()` riêng dùng `td_ck_uid`
  khi chưa có uid (F5) → giữ nguyên "đã điểm danh hôm nay" qua đăng xuất.
- Mọi key RAW đều có owner: `tdSeedKey()` = `td_wallet_v3_seeded:<owner>`,
  `tdMirrorKey()` = `td_mirror_today:<owner>`, `tdCoinOffsetKey()` đã có owner.
- Bỏ hẳn mirror `RAW không uid` + `tdacc:anon:*`; `tdOldWalletKeys()` chỉ đọc
  key mang chính owner đó → acc mới bắt đầu đúng **0 / 0**, không kéo số acc cũ.
- `onAuthStateChanged` chốt owner ngay dòng đầu (trước mọi `return`), đổi acc
  thì `tdResetOwnerCache()` xoá cache RAM rồi vẽ lại ví; `confirmLogout()` khoá
  owner về `anon` trước khi `signOut`.

**Kết quả:** 300.000 acc trên cùng 1 trình duyệt vẫn tách bạch từng acc:
`Coin hôm nay`, `Thu nhập`, `Lịch sử`, `Kim cương`, `Lượt quay`, trạng thái
điểm danh đều theo `<uid>`. Qua 00:00 giờ VN chỉ `today` của acc đó về 0.



> Đã mở **hết 15 file** trong gói, rà từng dòng, vá tổng hợp và kiểm tra chéo
> (xem **BẢN 42c** ở cuối file). Giữ nguyên những cái đã chạy tốt: OTP Render +
> Brevo, đồng hồ vòng quay 24h toàn cục, chế độ máy chống `CONVEX_ERROR`,
> 1 khung nhập duy nhất, 1 acc 1 ví.



## 🆕 BẢN 42l · Quay +10/+50 mà "Thu nhập của tôi" đứng im & đổi đơn vị hiện 0

**Triệu chứng (23/11 · 13:45 / 13:48)**: Lịch sử hôm nay hiện đủ
`Vòng quay may mắn +10 · +50 · +10 ...`, **Coin hôm nay = 60**, nhưng
**Thu nhập của tôi vẫn `9.774`**. Bấm sang **Kim cương** rồi bấm lại **Coin**
thì hiện **`0 Coin`**, phải **F5** mới về `9.774`.

### Nguyên nhân thật (đọc từ chính `index.html` trong gói)
1. **`tdWApply` chốt `if (T >= o.total) o.total = T`**. Sau BẢN 42h ví trên
   Convex được tạo lại từ **0** (seed `demoOf(uid)` không áp cho uid thật),
   trong khi máy còn **9.774** đã migrate. Mọi lần `coin_state` / `claim_task`
   / `spin_wheel` trả `coins` nhỏ hơn 9.774 đều **bị từ chối** → tổng đứng im.
   `today` lại đi bằng `max()` nên vẫn lên 60 → đúng 3 ô lệch nhau.
2. **BẢN 42i đã vá nhầm chỗ B6**: đoạn inline của ô **Coin hôm nay**
   (`#todayPoints`) bị thay thành code vẽ **`#profileWalletAmount`**, còn B6
   của ô **Thu nhập** vẫn đọc `localStorage.userPoints` qua namespace. Cộng
   `tdPaint` / `tdWPaint` / `updateProfileWalletUI` / 2 B6 = **5 nơi cùng ghi
   1 ô**, và nhánh Kim cương xoá `__tdPaintTotal` → 1 khung hình `0`.

### Đã vá (chỉ `index.html` + `README.md` · 13 file còn lại giữ nguyên byte)
- **Offset 1 lần** `td_coin_offset_v1:<owner>` = `9.774 - coins_server_đầu`.
  Mọi `coins` từ server đi qua `tdServerToDisplay()` trước khi so sánh/gán:
  server **+10 → giao diện +10**, đổi thẻ server **−100 → giao diện −100**,
  không rớt về 0. Offset lưu RAW, **riêng từng acc**.
- **Xoá cả 2 B6 inline**, gom thành **1 hàm `tdPaintWallet()`** duy nhất,
  được gọi ngay trong `tdWSet()` (mỗi lần ghi ví), `toggleWalletMode()`,
  `openProfile()`, `tdPaint()`, `tdWPaint()`. Không còn `__tdPaintTotal` guard.
- Kim cương đọc `o.diamonds`, Coin đọc `o.today`/`o.total` từ **cùng 1 ví RAW**
  → chuyển qua lại **không bao giờ hiện 0**, không cần F5.
- Giữ nguyên: `td_day_v3` (Coin hôm nay không nháy 20↔10), `ck` chống điểm
  danh 2 lần, lịch sử `td_hist_v2`, OTP 42c, Admin 42g/42h, 3 file `tasks.js`.

**Kết quả**: quay 1 lần = `Thu nhập +10` · `Coin hôm nay +10` · `Lịch sử 1 dòng`.
Đổi Kim cương ↔ Coin giữ nguyên `9.774` (đã cộng). Qua 00:00 VN → `today = 0`,
`tổng` không đổi.

> ⚠️ **Chỉ đẩy repo web `tuidiemonline.xyz`**. Convex 42h đã chạy tốt,
> **không cần** `npx convex deploy` lại; Render / `otp-server` không đụng.
> Sau khi Pages cập nhật, mở **cửa sổ Ẩn danh** để test sạch.

## 🆕 BẢN 42i · Coin hôm nay nháy 20 ↔ 10 & tổng thu nhập không cộng sau vòng quay

**Triệu chứng (23/11 · 13:12)**: Lịch sử hôm nay đã hiện đủ
`Vòng quay may mắn +10 / +50 / +20 ...` nhưng ô **Thu nhập của tôi** đứng
yên `9.774`; ô **Coin hôm nay** đang `20` thì `reconcile` kéo về `10` rồi
`refreshCoins` lại đẩy về `20`.

### Nguyên nhân thật (đọc từ chính `index.html` trong gói)
1. **`tdWGet()`/`tdWSet()` bị namespace 2 lần.** `tdWKey()` trả
   `tdacc:<uid>:wallet`, nhưng `Storage.prototype` đã bị `map()` bọc → key
   vật lý là `tdacc:<UID-HIEN-TAI>:tdacc:<uid>:wallet`. Lúc Firebase Auth
   chưa khôi phục `UID-HIEN-TAI = anon` → **1 acc có 2 pho ví**. Vòng quay
   ghi pho A, `openProfile()` / B6 đọc pho B → tổng thu nhập không tăng.
2. **Hai nguồn "Coin hôm nay" đánh nhau.** `td_daily_v2` (42f) chỉ đếm
   điểm danh = **10**, trong khi `coin_state.today` của Convex đếm **mọi**
   khoản trong ngày = **20+**. `reconcileTodayState()` (mỗi 60s, khi hiện tab,
   DOMContentLoaded) gọi `tdForcePaint(10)` → ghi đè ví về 10; 30s sau
   `refreshCoins()` gọi `tdApplyCoin(r.today=20)` → lại 20. Đúng cái nháy.
3. `updatePointsUI()` bản 16/11 ép `localStorage.userPoints = __serverCoins`
   mỗi lần vẽ → số vừa cộng bị ghi đè lại.

### Đã vá (chỉ `index.html` + `README.md`, 13 file còn lại giữ nguyên byte)
- Kho RAW **`td_wallet_v3:<owner>`** + **`td_day_v3:<owner>:<ngày VN>`**,
  `owner = tdOwner()` (đã có `td_ck_uid` từ 42d) → **không đổi theo Auth**.
  Tự migrate dữ liệu cũ từ mọi key namespace bằng `max()`.
- `tdDayV3Sync(serverToday)` gộp bằng **max()**: trong ngày **không bao giờ
  giảm**; chỉ về 0 thật sự lúc qua 00:00 VN (`{reset:true}`).
- `tdAfterCheckin()` **không tự cộng +10 nữa** (server đã tính) → hết đếm đôi.
- `tdWApply` / `tdWAdd` / `tdWSyncLocal` / `saveLocalState` /
  `updatePointsUI()` / B6 inline đều đọc chung 1 ví RAW.
- Giữ nguyên: `ck` chống điểm danh 2 lần, lịch sử `td_hist_v2`, OTP 42c,
  Admin 42g/42h, 3 file `tasks.js`, `otp-server/*`.

**Kết quả**: 1 lần quay = `Thu nhập +10` · `Coin hôm nay` tăng đúng 1 lần ·
`Lịch sử` 1 dòng. Đứng yên ở 20 (không nháy 10). Qua 00:00 VN → `0`.

> ⚠️ Lần này **chỉ đẩy repo web `tuidiemonline.xyz`**. Convex đã deploy
> 42h thành công, **không cần** `npx convex deploy` lại; Render / `otp-server`
> cũng không đụng. Dùng cửa sổ Ẩn danh để test.

## 🆕 BẢN 42h · Admin vẫn đỏ SAU KHI `npx convex deploy` đã báo thành công

**Triệu chứng (12:07)**: Termux đã hiện
`✓ Deployed Convex functions to https://tough-canary-511.convex.cloud`,
đã cài `npm install` + `convex ai-files install` xong, nhưng trang
`?admin=td2026admin` vẫn hiện:

```
🔴 Convex chưa sống
🔴 Chưa kết nối được Convex — Admin không đọc được dữ liệu thật.
Lý do: CONVEX: [Request ID: cf7a...] Server Error
Hàm: tasks:listOnlineUsers
```

### Nguyên nhân thật (đọc được từ chính file trong zip)
**Không phải** sai URL, **không phải** thiếu heartbeat, **không phải** cache,
**không phải** thiếu biến môi trường. URL prod đã đúng sẵn ở
`otp-config.js` → `https://tough-canary-511.convex.cloud`.

Lỗi nằm ở **3 file `tasks.js`**: đoạn khai báo **hằng số tên bảng bị rụng**.
`T_USERS`, `WALLET`, `T_TASK`, `T_CLAIMS`, `T_TICKETS`, `T_DIA`,
`T_HISTORY`, `T_NOTICES` được dùng ở 20/39 handler nhưng **không được định
nghĩa**. `node --check` vẫn PASS (lỗi runtime, không phải cú pháp), CLI vẫn
deploy thành công, nhưng hàm nào chạy cũng văng
`ReferenceError: T_USERS is not defined` → Convex trả
`[Request ID: ...] Server Error`. Admin vì thế luôn đỏ, còn web chính âm thầm
chạy **chế độ máy** (nên coin vẫn tăng nhưng không ghi lên server).

### Đã sửa
- 3 file (`tasks.js`, `convex_tasks.js`, `convex/tasks.js`) đều được thêm lại
  khối 8 hằng số tên bảng ngay sau `import`, **vẫn giống hệt từng byte**.
  Schemaless: không cần `schema.ts`, bảng tự tạo ở lần `insert` đầu tiên.
- `uidOf()`: guard `typeof process !== 'undefined'` để không văng lỗi ở runtime
  không có `process`.
- `index.html`: thêm `window.TD_BUILD = 'BAN 42h'` (gõ `TD_BUILD` trong Console
  để biết web đang chạy bản nào); ô báo lỗi Admin hiện thêm **URL đang trỏ**
  và hướng dẫn đúng (`deploy lại bản 42h`) thay vì câu chung chung.
- `README.md`: mục này. **13 file còn lại giữ nguyên từng byte**
  (CNAME, PING.md, package.json, otp-config.js, `.gitignore`,
  `convex/auth.config.js.example`, `otp-server/*` …).

### Kiểm chứng
- Mô phỏng Convex runtime (mock `ctx.db` schemaless): **39/39 handler chạy
  không lỗi** (trước sửa: 20 handler lỗi `is not defined`).
- `listOnlineUsers` → `{ok:true, total:1, rows:[...]}` · 100 user online →
  `total = 100` (cộng 1 user test = 101) · sai khoá admin → bị từ chối.
- `node --check` 3 file tasks + `otp-config.js` + `otp-server/server.cjs`: PASS.
- 3 file tasks: cùng SHA-256 · `testzip OK` · 15/15 file trong zip khớp bản đã sửa.

### ⚠️ VIỆC BẮT BUỘC (2 nơi, không làm thì vẫn đỏ)
1. Đẩy zip lên **repo web** `tuidiemonline.xyz` (GitHub Pages) — lệnh như mọi bản.
2. **Deploy lại Convex** từ đúng thư mục có `convex/tasks.js` bản 42h:
```bash
cd ~/test-code/tuidiemonline-final && npx convex deploy
```
   CLI hỏi `Do you want to push ... now?` → gõ `Y`. URL prod vẫn là
   `https://tough-canary-511.convex.cloud`, **không cần** `tdSetConvex(...)`.
3. Mở Admin bằng **cửa sổ Ẩn danh** (tránh cache) → phải hiện
   `🟢 Đã kết nối Convex · N user online`. Mở thêm 1 tab web thường đăng nhập,
   đợi ~10s (nhịp tim) rồi quay lại Admin → số tăng.

> Render / `otp-server` **không cần deploy lại** lần này.

## 🆕 BẢN 42g · Rà soát & sửa TOÀN BỘ `?admin=td2026admin`

**Triệu chứng (11:35)**: Đang mở web bình thường `tuidiemonline.xyz`, sang tab
`?admin=td2026admin` thì `User đang hoạt động = 0` / *"Chưa có user nào đang
mở web"*, dù user vẫn online. Yêu cầu: dù 100.000 user cũng phải hiện đủ.

### Nguyên nhân thật (3 lỗi chồng, không phải "thiếu heartbeat" như đoán trước)
1. **Giả thành công khi Convex chưa sống** *(lỗi gốc)*: `tdRestRpc()` khi gọi
   Convex lỗi sẽ rơi xuống `tdLocalRpc()`, mà nhánh `default` của nó trả
   `{ ok:true, rows:[] }` cho **mọi** RPC Admin / presence / thông báo / đổi thẻ.
   Admin nhận `ok:true, rows:[]` → hiện "Chưa có user nào" / "Đã gửi thông báo"
   / "Không có đơn chờ" **toàn là giả**. Đây là lý do badge luôn `0`.
   → Kiểm tra kỹ: heartbeat **đã có sẵn** (`setInterval(heartbeat, 10000)`),
   `updatePresence` / `listOnlineUsers` **đã có sẵn** trong `tasks.js`.
2. **Cắt cứng 100 user**: `listOnlineUsers` có `rows.slice(0, 100)` → 100.000
   user online cũng chỉ hiện 100, badge cũng chỉ đếm 100.
3. **Tab nền trên điện thoại**: `ONLINE_MS = 20000`, nhưng Chrome Android
   throttle `setInterval` của tab ẩn lên ≥ 60s. Vừa chuyển sang tab Admin là
   tab web bị ngắt nhịp tim → quá 20s → user biến mất khỏi danh sách.

### Đã kiểm tra TỪNG chức năng Admin
| Chức năng | Trạng thái | Sửa 42g |
|---|---|---|
| Cổng `?admin=td2026admin` (3 chỗ key) | ✅ đúng | Sửa lại dòng hướng dẫn đổi key cho chính xác |
| User đang hoạt động / badge đếm | ❌ luôn 0 | `total`, bỏ `slice(0,100)`, 3 trạng thái rõ ràng |
| Nhịp tim 10s + `updatePresence` | ✅ có sẵn | Thêm `visibilitychange/pageshow/focus/pagehide/td:net` → gọi ngay; chờ Auth không bỏ cuộc |
| Tự cập nhật mỗi 10 giây | ✅ có sẵn | Thêm `tdProbeConvex()` trước mỗi vòng (không chờ 30s) |
| Tìm UID (cả online + offline) | ⚠️ giả rỗng | Báo lỗi thật; nới 20 → 100 + `total` |
| Gửi thông báo cho tất cả user | ⚠️ giả "Đã gửi" | Báo `🔴 Chưa gửi được: Convex chưa kết nối` |
| Thông báo tự xoá sau 7 ngày | ✅ `NOTICE_TTL_MS` + `adminGcHistory` | Giữ nguyên |
| Đơn đổi thẻ cào (chờ / duyệt / từ chối) | ⚠️ giả "Không có đơn" | Báo lỗi thật ở cả 3 chỗ |
| Lịch sử đơn đổi thẻ (tab ›) | ⚠️ giả rỗng | Báo lỗi thật; giữ bind closure BẢN 11 |
| Chi tiết user / Cộng-thu coin / Khoá acc / Mở khoá | ✅ 34 hàm `onclick` đều có định nghĩa | Giữ nguyên |
| Điểm danh 1 lần = +10 (42f) | ✅ 24/24 PASS | **Không đụng** |
| OTP 6 số đổi mật khẩu / Render | ✅ | **Không đụng** |

### Đã sửa
- `index.html`: `TD_STRICT_RPC` — 21 RPC bắt buộc có server **không** fallback
  local, trả `{ok:false, offline:true, msg, fn}`; `tdProbeConvex()` thử lại ngay.
  `loadOnline()` phân biệt **đã kết nối / sai khoá / chưa kết nối** kèm lý do +
  tên hàm + hướng dẫn; badge dùng `r.total`. Thêm dòng `🟢 Đã kết nối Convex`.
- 3 file `tasks.js`: `ONLINE_MS 20s → 120s`, bỏ `slice(0,100)` → trả
  `rows` đầy đủ + `total`, `adminFindUser` trả `total`. **3 file vẫn giống hệt nhau.**

### ⚠️ VIỆC BẮT BUỘC (không làm thì Admin vẫn hiện đỏ, nhưng sẽ nói RÕ lý do)
Đẩy `index.html` lên **GitHub Pages** chưa đủ: các hàm `tasks:listOnlineUsers`,
`tasks:updatePresence`, `tasks:sendNotice`… nằm ở **Convex**, phải deploy riêng:
```bash
cd ~/test-code && npx convex deploy
```
Sau đó mở lại Admin → dòng trạng thái phải là `🟢 Đã kết nối Convex · N user online`.
Nếu vẫn đỏ, gõ trong Console: `tdSetConvex('https://<tên>.convex.cloud')`.

## BẢN 42f · Bấm 1 lần +10 mà "Coin hôm nay" nhảy 20 → sửa thành 10

- **Triệu chứng (01:37)**: Bấm điểm danh **1 lần**, `Lịch sử hôm nay` chỉ có
  **1 dòng +10 coin**, `Thu nhập của tôi` cũng chỉ tăng **+10**, nhưng ô
  `Coin hôm nay` lại hiện **20**. Chuỗi liên tiếp đúng `1 ngày`.
- **Nguyên nhân thật**: Bản 42e lấy `todayPoints` (biến tạm) làm baseline trong
  `tdAfterCheckin()`, trong khi `claimPoints()` đã `todayPoints += 10`. Thêm vào
  đó, lúc **Firebase Auth khôi phục** (`anon` → `uid` thật), lần
  `reconcileTodayState()` thứ 2 đọc nhầm pho `tdacc:<uid>:todayPoints` còn **10
  của hôm qua** → `10 + 10 = 20` được vẽ lên ô Thống kê. Server vẫn cộng đúng
  1 lần nên tổng ví & lịch sử không sai → lệch giữa 3 ô.
- **Sửa**:
  - Sổ ngày RAW `td_daily_v2:<uid>:<ngày VN>` thêm cờ **`ck`** (đã điểm danh
    hôm nay). `tdAfterCheckin()` **không đọc `todayPoints` nữa**, chỉ đọc sổ RAW:
    `ck = true` → giữ nguyên, chưa có → `base + 10`. 1 ngày đúng 1 lần +10.
  - Xoá **2 chỗ** `todayPoints += CK_REWARD` trong `claimPoints()` (nhánh server
    & fallback). Giờ chỉ có **1 nơi duy nhất** cộng coin hôm nay.
  - `reconcileTodayState()`: khi sổ RAW đã có mốc hôm nay thì **bỏ qua cached**
    namespace → không kéo lại số 10 của hôm qua sau khi Auth khôi phục.
  - `tdForcePaint()` giữ `total` bằng `max(wallet, __serverCoins, userPoints)`
    → `Thu nhập của tôi` **không bao giờ bị về 0** khi đổi UID.
  - Firestore `todayPoints` ghi theo sổ RAW thay vì biến tạm.
- **Kết quả**: 1 lần bấm = `Thu nhập +10` · `Coin hôm nay 10` · `Lịch sử 1 dòng
  +10`. Bấm lại / server báo `ok:false` → vẫn **10**, không thành 20. Qua 00:00
  giờ VN → `0 → 10`. Đổi acc → sổ riêng.
- Chỉ đổi `index.html` + `README.md`. **13 file còn lại giữ nguyên từng byte**;
  không đụng OTP server / Render / Convex / `tasks.js`.

## BẢN 42e · Ngày 2 bấm điểm danh: thống kê + lịch sử đều hiện +10

- **Triệu chứng**: Ngày 1 nhận 10 coin → "Coin hôm nay" và "Lịch sử hôm nay"
  đều hiện. Sang **Ngày 2 (00:20)** bấm nhận → tổng thu nhập vẫn tăng đúng,
  nhưng **"Coin hôm nay" đứng yên** và **lịch sử không thêm dòng +10**.
- **Nguyên nhân**: 3 sổ (`wallet`, `todayPoints`, `tdacc:<uid>:hist:<ngày>`)
  đều đi qua lớp namespace `tdacc:<uid>:`. Lúc mới tải trang Firebase Auth
  **chưa kịp khôi phục** → `uid = ''` → ghi/đọc nhầm sổ `anon`; thêm vào đó
  script B6 ở khung hình đầu vẽ lại số cached của ngày hôm trước lên
  `#todayPoints`. Server thì vẫn cộng đúng nên tổng thu nhập tăng.
- **Sửa**: sổ RAW `td_daily_v2:<uid>:<ngày VN>` + `td_hist_v2:<uid>:<ngày VN>`
  (dùng `td_ck_uid` của BẢN 42d, không chờ Auth). Một hàm duy nhất
  `tdAfterCheckin()` đồng bộ **cùng lúc** 3 chỗ: ô Thống kê, ví wallet, popup
  Lịch sử (kèm sự kiện `td:hist`). Có migrate dữ liệu 42c/42d cũ.
- `reconcileTodayState()` lúc 00:00 giờ VN ghi `today = 0` vào wallet **và vẽ lại
  DOM ngay** → lần nhận tiếp theo thấy rõ **0 → 10**.
- Nhánh `ok:false` (server đã ghi nhận hôm nay) cũng được đồng bộ, nhưng
  **không cộng thêm 10 coin** (idempotent). Đổi acc → sổ riêng.
- Chỉ đổi `index.html` + `README.md`. **13 file còn lại giữ nguyên từng byte**;
  không đụng OTP server / Render / Convex / `tasks.js`.

## BẢN 42d · Điểm danh không mất trạng thái khi đăng xuất

- **Lỗi cũ**: `CK_KEY` đi qua namespace `tdacc:<uid>:`; `confirmLogout()` xoá
  `firebaseUid` rồi reload, lúc đó Firebase Auth chưa kịp khôi phục → `uid = ''`
  → đọc nhầm kho `tdacc:anon:` → nút hiện lại **"Nhận ngay 10 coin"**. Bấm vào
  thì server (đã cộng 10 coin) trả `ok:false` nên mới nhảy thành
  **"Bạn đã điểm danh hôm nay rồi"**.
- **Sửa**: kho RAW `td_ck_state:<uid>` + `td_ck_uid` (lưu UID cuối, **không xoá
  khi đăng xuất**), đọc được ngay ở lần render đầu tiên. Thêm `renderCheckin()`
  sau `onAuthStateChanged` và vài nhịp đầu sau `DOMContentLoaded`.
- Cùng acc + cùng ngày → giữ **"Bạn đã điểm danh hôm nay rồi"**; đổi acc → kho
  riêng; quá **00:00 giờ VN** → `getTodayVN()` đổi ngày → tự reset (đã có
  `refreshAtMidnight()` + `visibilitychange`). Server vẫn chặn cộng trùng.
- Chỉ đổi `index.html` + `README.md`. **13 file còn lại giữ nguyên từng byte**;
  không đụng OTP server / Render / Convex.

## BẢN 42c · Khớp toàn bộ 15 file + vá 3 lỗi (xem chi tiết cuối file)

- `index.html` ↔ `otp-server/server.cjs` ↔ `otp-config.js`: cùng
  `https://otp-server-xvsk.onrender.com`, cùng 3 route `/api/request-otp`,
  `/api/verify-otp`, `/api/reset-password`, cùng quy tắc mật khẩu ≥8 ký tự
  (HOA + thường + số + ký tự đặc biệt).
- Vá chữ đỏ **"Not found"**, vá mất phiên khi Render restart, vá
  `FIREBASE_PROJECT_ID` lệch project (mặc định `tui-diem-online-455e2`
  = đúng `firebaseConfig.projectId` trong `index.html`).
- Sửa **6 file**, giữ nguyên **9 file** từng byte. Không xung đột.

## 🆕 BẢN 42 · đổi mật khẩu THẬT (lịch sử · đã được 42c thay thế)

1. **Quên mật khẩu** *(đã thay ở 42c)*: OTP 6 số → server cấp `resetToken`
   → `/api/reset-password` → Firebase Admin SDK. Không còn gọi
   `accounts:sendOobCode` từ trình duyệt (Firebase từ chối, xem BẢN 42).
2. **Đổi mk trong Cài đặt**: `u.reload()` → đúng pass hiện tại mới cho đổi
   → `reauthenticateWithCredential` → `updatePassword` → tự đăng xuất
   → đăng nhập lại bằng pass mới. Sai pass hiện tại hiện rõ chữ báo lỗi.
3. **BẢN 42c có động tới** `otp-server/server.cjs`, `otp-server/render.yaml`,
   `package.json` gốc, `PING.md`, `README.md`, `index.html`.
   **Vẫn không đụng**: `otp-config.js`, `convex_tasks.js`, `tasks.js`,
   `convex/`, `CNAME`, `otp-server/package.json`, 2 file `.gitignore`.
   `render.yaml` vẫn `branch: main` — nên **Render không tự lấy code mới**,
   phải bấm Manual Deploy sau khi push.
4. Chạy local đúng giao diện: `python3 -m http.server 8080` trong thư mục repo.
   `node server.cjs` / cổng 3000 là **server OTP** (form "Nhap Email de nhan OTP"),
   không phải trang web chính.

## BẢN 41 · chốt lại thông báo & luồng OTP

1. Bấm **Gửi mã**: chỉ nút đó xoay → hiện `60s` → `59s`…`0s` → `Gửi mã`.
   **Không** xoay thêm chỗ khác, **không** hiện tích xanh khi chưa nhập OTP.
2. Chưa nhập mã mà bấm **Xác thực**: chỉ hiện **`Chưa nhập mã xác thực`**.
   Không loading, không dấu `×` ở bất cứ chỗ nào (cả Đăng ký lẫn Quên mật khẩu).
3. Đã nhập 6 số → **chỉ khe cạnh ô mã** xoay → đúng: tích xanh giữ lại /
   sai: `×` đỏ chỉ ở khe, tự ẩn. Nút "Xác thực" luôn giữ nguyên chữ.
4. Vẫn gọi OTP thật qua Render + Brevo, không giả lập mã. Đăng ký vẫn bắt buộc
   có tích xanh (validate đọc tích từ khe).

## 📌 BẢN 39 · khe nhỏ trong suốt ở chấm đỏ

1. **Không làm khung ô vuông**. Ngay sau ô 6 số (đúng chỗ chấm đỏ) là một
   **khe trong suốt 22px**: không nền, không viền, không bo góc.
2. Mặc định **ẩn** nên không chiếm chỗ → không còn "dư khúc" bên phải.
   Chỉ bấm **Xác thực** (đã nhập đủ 6 số) → khe hiện ra: **vòng xoay 12px** →
   đúng mã **tích xanh 16px** (ảnh bạn gửi, nảy nhẹ) / sai mã **× đỏ 16px**, tự ẩn sau 2s.
   Kích thước **nhỏ mà vẫn thấy rõ** (không bé đến mức mất hút).
3. Áp dụng **cả Đăng ký lẫn popup Quên mật khẩu**. Các nút giữ nguyên chữ;
   riêng nút **Gửi mã** xoay rồi hiện `60s` (bỏ hẳn biểu tượng đồng hồ cát).
4. Vẫn gọi OTP thật qua Render + Brevo (`tdOtpVerify` / `tdOtpRequest`),
   **không giả lập mã**. Đổi Gmail hoặc gửi lại mã → khe tự xoá trạng thái cũ.

## 📌 BẢN 38 · bỏ khung đen, gom OTP, chốt đăng ký / đăng nhập

1. **Bỏ hẳn khung đen** `#tdRegOtpStatus`. Loading xoay + tích xanh giờ nằm
   **ngay trong nút** "Gửi mã" / "Xác thực" (cả Đăng ký lẫn popup Quên mật khẩu).
   Vẫn gọi thật `tdOtpRequest()` / `tdOtpVerify()` (Render + Brevo, mã do server sinh),
   tích xanh lấy từ ảnh bạn gửi, nảy nhẹ `cubic-bezier(.34,1.56,.64,1)`,
   sai mã hiện `×` đỏ 1.6s. Tích **giữ lại** đến khi đổi Gmail / gửi lại mã.
2. **Ô 6 số kéo sát tới số cuối** (`278095`): `64px`, `letter-spacing:.5px`.
   Khung bao quát `.td-reg-otp` và `.td-fg-oneline` đổi `width:fit-content`
   → hết dư khúc bên phải. Áp dụng cả popup Quên mật khẩu.
3. **`+84` dính số** (`+845...`): `gap:0`, `padding-left:1px`, màu `#8b8b8b` /
   `#94a3b8` đúng Gmail · ID · Tên đăng nhập. Con trỏ vẫn đứng ngay sau số 4,
   không xoá được `+84`, không nháy số 8.
4. **Đăng ký**: chỉ **SĐT** được bỏ trống. Thiếu Tên đăng nhập / Gmail / Biệt danh /
   Mật khẩu / Nhập lại mật khẩu, mật khẩu không khớp, hoặc **chưa hiện tích xanh**
   → `Đăng ký thất bại!` (kể cả lúc server OTP chưa sống, không còn "tạm cho đăng ký").
5. **Xác thực Gmail xong → lưu thẳng vào Tài khoản**: Biệt danh, Gmail đã xác thực,
   SĐT (`+84 Chưa cập nhật` nếu bỏ trống), ID do Firebase cấp. Thoát ra là thấy ngay.
6. **Đăng nhập** chấp nhận: tên đăng nhập đã đăng ký **hoặc** tên mới vừa sửa trong
   Tài khoản **hoặc** Gmail đã xác thực tích xanh — với mật khẩu đã đăng ký hoặc
   mật khẩu mới đã đổi qua "Quên mật khẩu" (có thông báo xác nhận thành công).
   `peSave()` ghi thêm `td_user_<biệt danh>` để tên mới cũng resolve được email.

> BẢN 37 cũ (giữ lại dưới dạng lịch sử): ô `80px` + khung đen 22px cạnh ô nhập.
3. **`+84` sát số thật sự** (`+845...`): bỏ hẳn `position:absolute` +
   `padding-left:90px`. Khung giờ là wrapper `flex`, thứ tự
   `icon → +84 → 3px → số`. Cả **Đăng ký** lẫn **Thông tin cá nhân** đều gom
   thành một cụm, không còn `+84 85`.
4. **Màu đồng bộ**: `+84`, các số sau, **Gửi mã / Xác thực** = `#8b8b8b`
   (đúng màu *Tên đăng nhập / Gmail / Mật khẩu*); trang cá nhân `#94a3b8`
   (đúng màu *Gmail / ID*). Placeholder giữ
   `nhập số điện thoại ( không bắt buộc )`.
5. `+84` vẫn là nhãn tĩnh ngoài input: không xoá được, không nháy số `8`,
   con trỏ đứng ngay sau số `4`, lưu tự ghép `+84` + 9 số.

> Giữ nguyên: mũi tên Đăng ký **đen · trắng · không viền xanh**.

---

## 🧪 Test riêng trước khi đưa lên web chính

Có thể (và nên) copy code sang branch / thư mục `test/` để thử ổn định rồi
mới push `main`. **Không copy nguyên OTP + Convex từ bản chính**: hãy tạo
project Convex mới + Render service OTP mới cho bản test, vì dùng chung thì
điểm danh / quay / đăng ký thử sẽ ghi thẳng vào database của user thật.
Khi ổn định, chỉ copy code (không copy data) rồi `npx convex deploy`.

---

## 📌 BẢN 36 (giữ nguyên) · chỉnh giao diện ô SĐT

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
├── index.html                  ← BAN 39 (toan bo sua o day)
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
(pkill -9 -f node 2>/dev/null || true) && cd ~ && rm -rf ~/test-code && mkdir -p ~/test-code && unzip -oq ~/storage/downloads/tuidiemonline-final.zip -d ~/test-code && cd ~/test-code && if [ -d tuidiemonline-final ]; then cd tuidiemonline-final; fi && git init -q && git symbolic-ref HEAD refs/heads/main && git add -A && (git diff --cached --quiet || git -c user.name=tuidiemonline -c user.email=noreply@tuidiemonline.xyz commit -q -m "BAN 42c tong hop 15 file") && (git remote remove origin 2>/dev/null || true) && git remote add origin https://github.com/tuidiemonline/tuidiemonline.xyz.git && git push --force origin HEAD:main && echo "XONG: main len BAN 42c"
```

> Chép file `tuidiemonline-final.zip` vào **Downloads** trước. Thấy `XONG`
> thì **vào Render → service `otp-server` → Manual Deploy (branch main)**,
> đợi `Live`. Đợi Pages build ~1–2 phút, mở **`https://tuidiemonline.xyz/?v=42c`**.

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
- Mở `https://otp-server-xvsk.onrender.com/health` → phải thấy
  `"version":"BAN 42c"`, `"reset":"stateless-otp-ticket"`,
  `"admin":"ready"`, `"project":"tui-diem-online-455e2"`.
  **Nếu vẫn là bản cũ / `admin: "missing ..."` thì đổi mật khẩu chưa chạy được.**
- Quên mật khẩu: Gửi mã → nhập 6 số → Xác thực (tích xanh) → nhập mật khẩu
  mới ≥8 ký tự gồm HOA + thường + số + ký tự đặc biệt → Đổi mật khẩu.

## 6. Test riêng trước khi lên web chính

Có thể: copy nguyên thư mục này sang `test/`, deploy lên **Convex project MỚI**
và **Render OTP service MỚI**, host ở branch `test` / GitHub Pages riêng, test ổn
rồi mới gộp vào `main`. ⚠️ **Không copy nguyên** `TD_CONVEX_URL` + `TD_OTP_DEFAULT`
từ bản chính sang bản test: chung Convex = dữ liệu test ghi thẳng vào database thật,
chung Render OTP = log / rate limit / OTP thật bị lẫn. Mỗi môi trường 1 project riêng.

## 7. Nhắc quan trọng

1. 🔐 Không dán `BREVO_API_KEY` vào file nào; key chỉ nằm ở Render → Environment.
2. ⏰ UptimeRobot ping `/health` 5 phút để Render không ngủ (`PING.md`).
3. 📴 Chế độ máy vẫn là dự phòng (lưu trên thiết bị đó). Khi Convex sống lại, web tự lấy số server; chống F12 / chốt tỉ lệ chỉ có hiệu lực ở chế độ `online`.
4. 🚫 Không `git add .` kéo `node_modules` / zip vào commit (lệnh trên đã dọn).
5. 🧹 Nếu muốn xoá hẳn dữ liệu thử nghiệm cũ trên máy: F12 → `localStorage.clear()` rồi F5 (sẽ mất coin/vé đang lưu ở chế độ máy, cân nhắc trước khi làm).


---

## BẢN 42 · SỬA LOGIC QUÊN MẬT KHẨU (thuần OTP, không còn link)

**Lỗi cũ:** sau khi nhập đúng OTP, web gọi `accounts:sendOobCode` ngay trong
trình duyệt bằng Web API key để tự lấy `oobLink`. Firebase chỉ trả `oobLink`
cho request có token Admin/OAuth → trình duyệt nhận lỗi, `catch` lại nuốt hết
và hiện mãi một câu "bấm Gửi mã lại rồi thử lại nhé". Thêm vào đó
`/api/verify-otp` đã xoá mã khỏi server nên bước đổi mật khẩu không còn gì
để chứng minh đã xác thực.

**Luồng mới:** `Gửi mã` → `nhập 6 số` → `Xác thực` (server cấp `resetToken`
ký HMAC, dùng 1 lần, 10 phút) → `Đổi mật khẩu` gọi `/api/reset-password`
→ server dùng **Firebase Admin SDK** đặt mật khẩu mới. Không mở Gmail lần 2,
không dùng link, lỗi thật từ server hiện thẳng lên màn hình.

**Cấu hình 1 lần trên Render** (Environment của service `otp-server`):

| Biến | Lấy ở đâu |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase Console → Project settings → `project_id` |
| `FIREBASE_CLIENT_EMAIL` | Service accounts → Generate new private key → `client_email` |
| `FIREBASE_PRIVATE_KEY` | Cùng file JSON → `private_key` (giữ nguyên cả `\n`) |

`GET /health` trả `admin: "ready"` là xong. Thiếu thì web sẽ báo rõ tên biến
thay vì câu lỗi chung chung. `BREVO_API_KEY` vẫn giữ nguyên để gửi mã OTP.


---

## BẢN 42b · Vá lỗi "đã Xác thực OTP mà vẫn không cho đổi"

**Triệu chứng:** nhập đúng 6 số, hiện tích xanh ✅, sang màn Đổi mật khẩu,
bấm đổi thì hiện *"Bấm Gửi mã → nhập OTP → Xác thực rồi mới đổi mật khẩu nhé"*.

**Nguyên nhân thật:** web đã lên bản mới nhưng **Render vẫn chạy server OTP cũ**.
`/api/verify-otp` bản cũ trả `{ok:true}` **không kèm `resetToken`** → frontend
tưởng chưa xác thực và đổ lỗi sai cho người dùng. (Đã thử gọi
`accounts:sendOobCode` từ server với đủ Referer/Origin → vẫn `403 policy_default_denied`,
nên **không có đường né**: đổi mật khẩu Firebase khi chưa đăng nhập bắt buộc
phải có credential phía server.)

**Đã vá 3 chỗ:**
1. Server `verifyCode(..., true)`: **giữ lại OTP đã xác thực 10 phút** làm bằng chứng
   dự phòng, không xoá ngay nữa. `/api/reset-password` chấp nhận `resetToken`
   **hoặc** `otp` → mất token do reload trang vẫn đổi được.
2. Frontend lưu `resetToken + otp + email` vào `sessionStorage`, tự khôi phục
   bước 3 khi reload; **không còn chặn cứng** bằng câu "chưa xác thực" khi đã có tích xanh.
3. Phân biệt rõ 3 thông báo: chưa xác thực / **server Render chưa Manual Deploy** /
   thiếu 3 biến `FIREBASE_*`. `GET /health` nay trả thêm `"reset": "BAN 42b"`.

**Việc phải làm 1 lần (không thể bỏ):** Render → service `otp-server` →
**Manual Deploy** (branch `main`) để server lên bản 42b, và thêm 3 biến
`FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`
(lấy trong Firebase Console → Project settings → Service accounts →
Generate new private key, giữ nguyên `\n` trong private key).
`/health` phải hiện `admin: "ready"` và `reset: "BAN 42b"`.

Luồng: `Gửi mã` → `nhập 6 số` → `Xác thực` → `Đổi mật khẩu` → server dùng
Firebase Admin SDK đặt mật khẩu mới. Không mở Gmail lần 2, không dùng link.


---

## BẢN 42c · TỔNG HỢP 15 FILE · KHỚP CHÉO & VÁ 3 LỖI

### Đối chiếu (đã mở từng file, không đoán)

| Cặp | Kết quả |
|---|---|
| `otp-config.js` ↔ `index.html` ↔ `server.cjs` | Cùng `https://otp-server-xvsk.onrender.com` ✅ |
| `index.html` gọi 3 API ↔ `server.cjs` định nghĩa | `/api/request-otp`, `/api/verify-otp`, `/api/reset-password` ✅ |
| Quy tắc mật khẩu `strong()` ↔ `strongPw()` | Cùng regex ≥8: HOA + thường + số + ký tự đặc biệt ✅ |
| `firebaseConfig.projectId` ↔ Admin SDK | `tui-diem-online-455e2` (mặc định trong server) ✅ |
| `render.yaml` ↔ `otp-server/package.json` | `branch: main`, `npm install`, `npm start` → `server.cjs`, có `firebase-admin` ✅ |
| 3 file `tasks.js` / `convex_tasks.js` / `convex/tasks.js` | Giữ nguyên từng byte ✅ |
| `CNAME` = `tuidiemonline.xyz` | Khớp CORS + Pages ✅ |

**15 file · sửa 6 · giữ nguyên 9:**

| Sửa (6) | Giữ nguyên từng byte (9) |
|---|---|
| `index.html`<br>`otp-server/server.cjs`<br>`README.md`<br>`package.json`<br>`otp-server/render.yaml`<br>`PING.md` | `otp-config.js`<br>`CNAME`<br>`.gitignore`<br>`convex/tasks.js`<br>`convex/auth.config.js.example`<br>`convex_tasks.js`<br>`tasks.js`<br>`otp-server/package.json`<br>`otp-server/.gitignore` |

### 3 lỗi đã vá

1. **Chữ đỏ `Not found`** — server Render bản cũ trả `404 {ok:false,msg:"Not found"}`.
   Bản 42b chỉ nhận diện 404 dạng text nên hiện thẳng chữ đó ra màn hình.
   Giờ frontend nhận diện `status 404` / `msg = "Not found"` và hiện đúng câu
   *"Server OTP chưa lên BẢN 42c → vào Render bấm Manual Deploy"*; server 42c
   cũng tự trả lời rõ ràng kèm `version` thay vì `Not found`.
2. **Mất phiên khi Render ngủ/restart** — `otpStore` + `resetTokens` cũ nằm trong
   RAM (`PING.md` từng tự ghi nhận "ngủ là mất"). Giờ `ticket` (OTP) và
   `resetToken` là **vé ký HMAC tự chứa email + hạn**, sống qua restart miễn
   `RESET_SECRET` không đổi (mặc định lấy `BREVO_API_KEY`). RAM chỉ còn để chặn
   dùng lại và phục vụ form `/verify` cũ. `tdOtpRequest` cũng **không retry khi
   đã có HTTP response** nữa — trước đây retry phát hành mã thứ 2 → 2 email,
   người dùng nhập mã cũ bị báo sai.
3. **Lệch Firebase project** — `FIREBASE_PROJECT_ID` điền sai →
   `getUserByEmail` báo `user-not-found`. Giờ server mặc định đúng
   `tui-diem-online-455e2`; chỉ còn 2 biến bắt buộc là
   `FIREBASE_CLIENT_EMAIL` và `FIREBASE_PRIVATE_KEY`. `/health` ghi rõ tên biến
   còn thiếu thay vì `missing FIREBASE_*` chung chung.

### Việc phải làm trên Render (1 lần)

`BREVO_API_KEY` giữ nguyên. Thêm/kiểm tra:

| Biến | Giá trị |
|---|---|
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxxx@tui-diem-online-455e2.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Dán nguyên chuỗi, **giữ `\n`**, bỏ dấu ngoặc kép bao ngoài |
| `FIREBASE_PROJECT_ID` | `tui-diem-online-455e2` (tuỳ chọn, đã có mặc định) |

Rồi **Manual Deploy (branch main)** → đợi `Live` → mở `/health` kiểm tra.
Không deploy thì web vẫn hiện đúng câu báo "server chưa lên BẢN 42c",
không còn đổ lỗi cho người nhập OTP nữa.
