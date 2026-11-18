/* ================================================================
TÚI ĐIỂM ONLINE · SERVER  (BẢN 25 · ADMIN TỔNG (server giữ nguyên logic Bản 10): ONLINE / BIỆT DANH / LỊCH SỬ 2 NGÀY / CỘNG-TRỪ COIN / KHOÁ ACC / THÔNG BÁO CHUNG)
File này copy thành: convex/tasks.js  ->  npx convex deploy

LỖI THẬT (log 00:44): "Failed to insert or update a document in table
'users_coins' ... Object contains extra field 'stream' that is not in the
validator". Bảng users_coins CÓ schema.ts định nghĩa riêng (từ code cũ),
nên MỌI patch/insert vào đó đều bị Convex chặn, dù bản 5 đã bỏ
legacySeeded / tdFixV4. Xoá bảng bằng import /dev/null cũng vô dụng vì
pingLogin / claimTask / claimTicket / doCheckin chạy lại là ghi đè ngay.

CÁCH CHỐT LẦN 6: KHÔNG ĐỤNG VÀO 5 BẢNG CŨ NỮA. Toàn bộ ví + tiến trình
chuyển sang 5 bảng MỚI (chưa khai báo trong schema -> Convex để schemaless,
không validate field nữa). Không cần sửa schema.ts, không cần xoá bảng,
không cần Dashboard, không cần .env / build.

  users_coins      -> td_wallet        (ví: coins / today / vé / kim cương)
  task_state       -> td_task_state
  coin_task_claims -> td_claims
  ticket_claims    -> td_ticket_claims
  diamond_logs     -> td_diamond_logs

SỐ: ví mới seed đúng 4.774 coin TỔNG + 260 coin HÔM NAY ngay lúc insert.
Query và Mutation cùng đọc coinsOf(w) -> số trước/sau ghi LUÔN BẰNG NHAU.
Chưa có ví (query chạy trước mutation) vẫn trả 4.774 / 260 -> không nháy 0.
Vòng quay 10 coin 90% · 25 coin 6% · 50 coin 4% · hộp quà/100/10000 = 0%.
BẢN 10: 12 nhiệm vụ (thêm Worms Zone / Wear the Helmet / Bouncy Dunk), 3 vé độc lập, chuỗi 7 ngày, chặn F12, URL prod.

RPC: coinState / coinTaskClaimsToday / ticketState / todayStats
     claimTask / taskReport / pingLogin / claimTicket / doCheckin /
     spinWheel / exchangeDiamonds + 2 internalMutation.
================================================================ */
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/* ---- Ngày Việt Nam (UTC+7), khớp Intl Asia/Ho_Chi_Minh ở frontend ---- */
function dayVN(ms) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(ms || Date.now()));
}
function yesterdayVN() { return dayVN(Date.now() - 86400000); }

/* ---- CẤU HÌNH NHIỆM VỤ (client KHÔNG được gửi reward) ----
3 nhiệm vụ "Xem 10 / 20 / 50 quảng cáo trong game" ĐÃ XOÁ vĩnh viễn.
"ads5" chỉ là tên key cũ, thực chất = Chơi 50 game · 5 phút/game · +200 coin,
KHÔNG phải nhiệm vụ quảng cáo (giữ nguyên id để không gãy frontend).      */
const RULES = {
  checkin: { reward: 10, mode: "free"  },  // điểm danh thẻ riêng trên Home
  login:   { reward: 5,  mode: "free"  },  // đăng nhập mỗi ngày
  spin:    { reward: 5,  mode: "wheel" },  // phải bấm GO
  play:    { reward: 5,  mode: "time", sec: 300, games: 1  },  // 5 phút
  ref:     { reward: 20, mode: "share" },  // chia sẻ mặc định trình duyệt
  taxi:    { reward: 10, mode: "time", sec: 900, games: 1  },  // Stickman · 15p
  worms:   { reward: 10, mode: "time", sec: 300, games: 1  },  // Worms Zone · 5p
  helmet:  { reward: 20, mode: "time", sec: 600, games: 1  },  // Wear the Helmet · 10p · +20 coin
  dunk:    { reward: 10, mode: "time", sec: 300, games: 1  },  // Bouncy Dunk · 5p · +10 coin
  peak:    { reward: 20, mode: "time", sec: 300, games: 5  },  // 5 game · 5p  (PERSIST)
  king:    { reward: 50, mode: "time", sec: 300, games: 15 },  // 15 game · 5p (PERSIST)
  block:   { reward: 100,mode: "time", sec: 600, games: 30 },  // 30 game · 10p(PERSIST)
  ads5:    { reward: 200,mode: "time", sec: 300, games: 50 },  // 50 game · 5p (PERSIST)
};
/* BẢN 10 · 4 nhiệm vụ tích luỹ KHÔNG reset lúc 00:00.
   Chỉ reset tiến trình khi user làm xong VÀ bấm Nhận coin.
   Các nhiệm vụ còn lại vẫn reset 00:00 như cũ. Mỗi taskId có state RIÊNG
   -> phút KHÔNG BAO GIỜ tính chung giữa các nhiệm vụ. */
const PERSIST_TASKS = { peak: 1, king: 1, block: 1, ads5: 1 };
function taskDay(id) { return PERSIST_TASKS[id] ? "PERSIST" : dayVN(); }
const TASK_NAME = {
  checkin: "Điểm danh hàng ngày", login: "Đăng nhập mỗi ngày",
  spin: "Quay vòng may mắn", play: "Chơi game bất kì",
  ref: "Chia sẻ Túi Điểm Online", taxi: "Chơi Stickman Warriors",
  worms: "Chơi Worms Zone", helmet: "Chơi Wear the Helmet",
  dunk: "Chơi Bouncy Dunk",
  peak: "Chơi 5 game khác nhau", king: "Chơi 15 game khác nhau",
  block: "Chơi 30 game khác nhau", ads5: "Chơi 50 game khác nhau",
  wheel_gain: "Vòng quay may mắn trúng coin",
};

/* ---- Nhịp tim: frontend gọi task_report mỗi 15 giây.
Server TỰ ĐẾM bằng đồng hồ của mình, BỎ QUA p_progress / p_games /
p_game_elapsed / p_ready / p_reward / p_day do client gửi -> F12 vô dụng.
gap > 20s (tắt web / F5 / out) = KHÔNG tính thêm giây, NHƯNG GIỮ NGUYÊN
số phút đã chơi của từng game (đúng yêu cầu "lưu 5p đó").              */
const MAX_GAP_MS = 20000;

/* ---- Schemaless: KHÔNG cần schema.ts, KHÔNG cần tạo index ---- */
const fUid = (q, uid) => q.eq(q.field("uid"), uid);
const fUidDay = (q, uid, day) =>
  q.and(q.eq(q.field("uid"), uid), q.eq(q.field("day"), day));
const fUidTaskDay = (q, uid, taskId, day) =>
  q.and(q.eq(q.field("uid"), uid), q.eq(q.field("taskId"), taskId),
        q.eq(q.field("day"), day));

/* ---- Identity: có Firebase JWT thì dùng subject, bỏ qua p_uid.
Chưa cấu hình auth.config.js -> tạm dùng p_uid để web chạy ngay.
Sau khi điền Project ID chạy: npx convex env set STRICT_AUTH 1
để KHOÁ hẳn p_uid (không còn nhận UID giả qua DevTools).          */
async function uidOf(ctx, args) {
  const id = await ctx.auth.getUserIdentity();
  if (id && id.subject) return id.subject;
  if (process.env.STRICT_AUTH === "1") throw new Error("Chưa xác thực Firebase");
  return String(args.p_uid || "").trim();
}
/* ---- SỐ DƯ: MỘT TÀI KHOẢN = MỘT VÍ  ·  BẢN 29 --------------------
   Acc mới (chưa có document td_wallet) LUÔN = 0 coin / 0 coin hôm nay.
   Acc đã có ví (vd. shinotoh 4.774 / 260) GIỮ NGUYÊN, không patch, không
   seed lại -> cày 3.000 hay 5.000 của acc nào chỉ nằm ở acc đó.
   coinsOf(w) là hàm THUẦN: không đụng DB, query & mutation cùng kết quả.

   Nếu sau này reset DB và muốn khôi phục RIÊNG 1 acc demo, điền UID
   Firebase của acc đó vào DEMO_WALLETS (lấy ở Cài đặt → ID tài khoản).
   Để trống = mọi tài khoản mới bắt đầu từ 0.                       */
const DEMO_WALLETS = {
  // "uid_firebase_cua_shinotoh": { coins: 4774, today: 260 },
};
function demoOf(uid) { return DEMO_WALLETS[String(uid || "")] || null; }

function coinsOf(w) {
  if (!w) return 0;
  const c = Number(w.coins);
  return Number.isFinite(c) ? c : 0;
}
/* TỔNG coin ĐÃ KIẾM (chỉ tăng). Ví cũ chưa có field -> lấy coins hiện có. */
function earnedOf(w) {
  if (!w) return 0;
  const n = Number(w.earnedTotal);
  if (Number.isFinite(n)) return n;
  const c = Number(w.coins);
  return Number.isFinite(c) ? c : 0;
}
/* BẢN 8: đọc cờ khoá acc. Bảng chưa tồn tại -> false, không văng lỗi.
   BẢN 9: quá ngày mở khoá thì tự coi như ĐÃ MỞ (không cần admin bấm). */
async function isBanned(ctx, uid) {
  if (!uid) return false;
  const u = await firstOf(ctx, T_USERS, (q) => fUid(q, uid));
  if (!u || !u.banned) return false;
  if (u.unlockAt && Date.now() >= Number(u.unlockAt)) return false;
  return true;
}
async function banGuard(ctx, uid) {
  return (await isBanned(ctx, uid))
    ? { ok: false, msg: "⛔ Tài khoản đã bị khóa. Liên hệ hỗ trợ để mở lại." }
    : null;
}

/* Bảng mới có thể chưa tồn tại ở lần gọi đầu -> trả rỗng thay vì văng lỗi */
async function rowsOf(ctx, table, fn) {
  try {
    const q = ctx.db.query(table);
    return await (fn ? q.filter(fn) : q).collect();
  } catch (e) { return []; }
}
async function firstOf(ctx, table, fn) {
  const r = await rowsOf(ctx, table, fn);
  return r.length ? r[0] : null;
}

/* BẢN 6: KHÔNG còn mergeLegacy / patch undefined / streamBy / legacySeeded /
   tdFixV4. Ví nằm trong bảng schemaless mới -> không bao giờ dính lỗi
   "extra field ... not in the validator" nữa. */
async function displayCoins(ctx, uid, w) { return coinsOf(w); }

async function getWallet(ctx, uid) {
  const rows = await rowsOf(ctx, WALLET, (q) => fUid(q, uid));
  if (!rows.length) return null;
  rows.sort((a, b) => (a._creationTime || 0) - (b._creationTime || 0));
  return rows[0];   /* luôn chọn CÙNG 1 ví dù lỡ có document trùng uid */
}
async function ensureWallet(ctx, uid) {
  if (!uid) return null;   /* BẢN 29: không tạo ví chung cho uid rỗng */
  let w = await getWallet(ctx, uid);
  if (!w) {
    /* SEED 1 LẦN DUY NHẤT, ngay trong document ví. Không field lạ,
       không patch dọn dẹp, không cờ chốt -> không còn CONVEX_ERROR. */
    const doc = {
      uid,
      coins: demoOf(uid) ? demoOf(uid).coins : 0,          // BẢN 29: acc mới = 0
      earnedTotal: demoOf(uid) ? demoOf(uid).coins : 0,
      today: demoOf(uid) ? demoOf(uid).today : 0,          // coin hôm nay = 0
      todayDate: dayVN(),
      /* VÉ / KIM CƯƠNG / CHUỖI là tài sản: không reset lúc 00:00 */
      tickets: 0, diamonds: 0,
      streak: 0, lastLoginDay: "",
      checkinStreak: 0, lastCheckinDay: "", checkinDoneDay: "", streak7Day: "",
    };
    try {
      const _id = await ctx.db.insert(WALLET, doc);
      w = await ctx.db.get(_id);
    } catch (e) {
      w = await getWallet(ctx, uid);   // race: đã có ví khác tạo cùng lúc
    }
  }
  if (!w) return null;
  /* Chỉ "Coin hôm nay" về 0 lúc sang ngày mới (00:00 VN). TỔNG giữ nguyên. */
  if (w.todayDate !== dayVN()) {
    await ctx.db.patch(w._id, { today: 0, todayDate: dayVN() });
    w = await ctx.db.get(w._id);
  }
  return w;
}
async function getState(ctx, uid, taskId, day) {
  return await firstOf(ctx, T_TASK, (q) => fUidTaskDay(q, uid, taskId, day));
}
async function ensureState(ctx, uid, taskId, day) {
  let st = await getState(ctx, uid, taskId, day);
  if (!st) {
    const _id = await ctx.db.insert(T_TASK, {
      uid, taskId, day, progress: 0, games: 0, gameElapsed: 0,
      lastReportAt: 0, lastGameAt: 0,
      shareVerified: false, spinDone: false, updatedAt: Date.now(),
      /* TIẾN TRÌNH RIÊNG CỦA RIÊNG taskId NÀY */
      currentGame: "", gameTimes: {}, doneGames: [],
    });
    st = await ctx.db.get(_id);
  }
  return st;
}
async function claimed(ctx, uid, taskId, day) {
  const rows = await rowsOf(ctx, T_CLAIMS, (q) => fUidDay(q, uid, day));
  return rows.some((r) => r.taskId === taskId);
}
async function addCoins(ctx, uid, amount, reason) {
  const w = await ensureWallet(ctx, uid);
  const base = coinsOf(w);
  const now = Date.now();
  await ctx.db.patch(w._id, {
    coins: base + amount, today: (w.today || 0) + amount,
    earnedTotal: earnedOf(w) + (amount > 0 ? amount : 0),
  });
  /* Lịch sử nằm trên SERVER -> F12 / localStorage không sửa được */
  await ctx.db.insert(T_CLAIMS, {
    uid, taskId: reason || "coin", day: dayVN(), reward: amount, claimedAt: now,
  });
  /* BẢN 8: bảng lịch sử RIÊNG cho trang Admin. Không đụng T_CLAIMS nên
     "Coin hôm nay" / todayStats trên web chính vẫn reset đúng 00:00 mỗi ngày. */
  await ctx.db.insert(T_HISTORY, {
    uid, taskId: reason || "coin",
    label: TASK_NAME[reason] || "Nhận thưởng",
    reward: amount, at: now, day: dayVN(), kind: "task",
  });
  return { coins: base + amount, today: (w.today || 0) + amount };
}
async function addDiamonds(ctx, uid, amount) {
  const w = await ensureWallet(ctx, uid);
  await ctx.db.patch(w._id, { diamonds: (w.diamonds || 0) + amount });
  return (w.diamonds || 0) + amount;
}

/* Validator: khai báo hết mọi p_* mà index.html có thể gửi.
Convex từ chối args lạ nên không được bỏ sót. */
const A = {
  p_uid: v.optional(v.string()),
  p_type: v.optional(v.string()),
  p_day: v.optional(v.string()),
  p_limit: v.optional(v.number()),
  p_reward: v.optional(v.number()),
  p_task: v.optional(v.string()),
  p_progress: v.optional(v.number()),
  p_ready: v.optional(v.boolean()),
  p_games: v.optional(v.number()),
  p_game_elapsed: v.optional(v.number()),
  p_game_done: v.optional(v.boolean()),
  p_game_id: v.optional(v.string()),   // MỚI: tên game đang mở
  p_share: v.optional(v.boolean()),
  p_kind: v.optional(v.string()),
  p_multiplier: v.optional(v.number()),
  p_points: v.optional(v.number()),     // đổi coin -> kim cương (server tự tính)
  p_amount: v.optional(v.number()),
  p_reason: v.optional(v.string()),
  /* BẢN 7 · đổi thẻ cào */
  p_op: v.optional(v.string()),
  p_op_name: v.optional(v.string()),
  p_denom: v.optional(v.number()),
  p_card_code: v.optional(v.string()),
  p_serial: v.optional(v.string()),
  p_redeem_id: v.optional(v.string()),
  p_admin_key: v.optional(v.string()),
  p_note: v.optional(v.string()),
  /* BẢN 8 · Admin tổng / biệt danh / nhịp tim / thông báo */
  p_nick: v.optional(v.string()),
  p_google_name: v.optional(v.string()),
  p_target_uid: v.optional(v.string()),
  p_search: v.optional(v.string()),
  p_delta: v.optional(v.number()),
  /* BAN 9 · khoá acc có thời hạn / mở khóa ngay / lịch sử đổi thẻ */
  p_days: v.optional(v.number()),
  p_until: v.optional(v.string()),
  p_action: v.optional(v.string()),
  /* BẢN 12 · đăng ký tay: lưu username -> Gmail + seed ví 0 coin */
  p_email: v.optional(v.string()),
  p_phone: v.optional(v.string()),
  /* BAN 24 · OTP 6 so */
  p_otp: v.optional(v.string()),
};

/* ============ 1. ĐĂNG NHẬP (chuỗi đăng nhập, KHÔNG phải chuỗi vé) ==== */
export const pingLogin = mutation({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false, msg: "Chưa đăng nhập" };
    const w = await ensureWallet(ctx, uid);
    const d = dayVN();
    let streak = w.streak || 0;
    if (w.lastLoginDay !== d) {
      streak = w.lastLoginDay === yesterdayVN() ? streak + 1 : 1;
      await ctx.db.patch(w._id, { lastLoginDay: d, streak });
    }
    return { ok: true, streak, coins: coinsOf(w) };
  },
});

/* ============ 2. SỐ DƯ: TỔNG / HÔM NAY / KIM CƯƠNG TÍM ============ */
export const coinState = query({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false, coins: 0, today: 0, diamonds: 0 };
    const w = await getWallet(ctx, uid);
    const coins = await displayCoins(ctx, uid, w);   // TỔNG (đã gộp 4.774 cũ)
    /* Chưa kịp tạo ví: vẫn trả 4.774 / 260 -> không nháy về 0 ... */
    if (!w) return { ok: true, coins, today: 0, diamonds: 0, tickets: 0 };
    return {
      ok: true,
      coins,                                           // Thu nhập của tôi (giữ mãi)
      today: w.todayDate === dayVN() ? w.today : 0,    // Coin hôm nay (reset 00:00)
      diamonds: w.diamonds || 0,                       // Kim cương tím (giữ mãi)
      tickets: w.tickets || 0,
    };
  },
});
export const coinTaskClaimsToday = query({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: true, tasks: [] };
    const rows = await rowsOf(ctx, T_CLAIMS, (q) => fUidDay(q, uid, dayVN()));
    return { ok: true, tasks: rows.map((r) => r.taskId) };
  },
});

/* ============ 3. THỐNG KÊ + LỊCH SỬ (đọc 100% từ Server) ============ */
export const todayStats = query({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: true, today: 0, coins: 0, diamonds: 0, history: [] };
    const d = dayVN();
    const rows = await rowsOf(ctx, T_CLAIMS, (q) => fUidDay(q, uid, d));
    const w = await getWallet(ctx, uid);
    const history = rows
      .filter((r) => (r.reward || 0) > 0)
      .sort((a, b) => (b.claimedAt || 0) - (a.claimedAt || 0))
      .slice(0, 30)
      .map((r) => {
        const dt = new Date((r.claimedAt || Date.now()) + 7 * 3600000);
        return {
          time: String(dt.getUTCHours()).padStart(2, "0") + ":" +
                String(dt.getUTCMinutes()).padStart(2, "0"),
          points: r.reward,
          label: TASK_NAME[r.taskId] || "Nhận thưởng",
        };
      });
    const coins = await displayCoins(ctx, uid, w);
    return {
      ok: true,
      today: w && w.todayDate === d ? w.today : 0,  // BẢN 29: ví chưa có = 0
      coins,                                          // TỔNG thu nhập (giữ mãi)
      diamonds: w ? (w.diamonds || 0) : 0,
      history,
    };
  },
});

/* ============ 4. THƯỞNG VÉ HÀNG TUẦN · 3 TASK ĐỘC LẬP ============
 +3 vé : bấm Nhận là có. KHÔNG đụng vào chuỗi.
 +1 vé : PHẢI bấm "Làm" (doCheckin) -> server ghi log -> mới mở "Nhận".
         Bấm Làm rồi chưa điểm danh / F12 sửa biến -> vẫn khoá.
 +5 vé : CHỈ mở khi điểm danh đủ 7 ngày LIÊN TỤC. 6/7 = "Chưa đủ".
 Vé đã nhận KHÔNG mất lúc 00:00, chỉ trừ trong spinWheel.            */
export const ticketState = query({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: true, tickets: 0, login_ready: true, checkin_ready: true,
                       checkin_done: false, streak_ready: false, streak: 0 };
    const w = await getWallet(ctx, uid);
    const d = dayVN();
    const rows = await rowsOf(ctx, T_TICKETS, (q) => fUidDay(q, uid, d));
    const has = (k) => rows.some((r) => r.kind === k);
    /* streakt = CHUỖI ĐIỂM DANH, không phải chuỗi đăng nhập */
    const s = w ? (w.checkinStreak || 0) : 0;
    const doneToday = w ? w.checkinDoneDay === d : false;
    return {
      ok: true,
      tickets: w ? (w.tickets || 0) : 0,
      login_ready: !has("login3"),
      /* checkin_ready = "chưa nhận vé hôm nay" (giữ đúng ý frontend).
         checkin_done = "đã bấm Làm/điểm danh" -> mới mở nút Nhận. */
      checkin_ready: !has("checkin1"),
      checkin_done: doneToday,
      streak: s,
      /* Nhận xong checkinStreak về 0 -> phải điểm danh lại 7 ngày mới mở,
         không bị khoá vĩnh viễn bởi 1 cờ cũ. */
      streak_ready: s >= 7 && !has("streak7"),
    };
  },
});

/* Bấm "Làm" của nhiệm vụ Điểm danh mỗi ngày: 1 LẦN / NGÀY, reset 00:00 */
export const doCheckin = mutation({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false, msg: "Chưa đăng nhập" };
    const _ban = await banGuard(ctx, uid); if (_ban) return _ban;
    const w = await ensureWallet(ctx, uid);
    const d = dayVN();
    if (w.checkinDoneDay === d) return { ok: false, msg: "Hôm nay bạn đã điểm danh rồi!" };
    const s = w.lastCheckinDay === yesterdayVN() ? (w.checkinStreak || 0) + 1 : 1;
    await ctx.db.patch(w._id, {
      checkinDoneDay: d, lastCheckinDay: d, checkinStreak: s,
    });
    return { ok: true, streak: s, msg: "Đã điểm danh · bấm Nhận để lấy 1 vé" };
  },
});

export const claimTicket = mutation({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false, msg: "Chưa đăng nhập" };
    const _ban = await banGuard(ctx, uid); if (_ban) return _ban;
    const kind = String(args.p_kind || "");
    const amount = kind === "login3" ? 3 : kind === "checkin1" ? 1 : kind === "streak7" ? 5 : 0;
    if (!amount) return { ok: false, msg: "Loại vé không hợp lệ" };
    const d = dayVN();
    const rows = await rowsOf(ctx, T_TICKETS, (q) => fUidDay(q, uid, d));
    if (rows.some((r) => r.kind === kind)) return { ok: false, msg: "Đã nhận vé này hôm nay rồi" };

    const w = await ensureWallet(ctx, uid);
    if (kind === "login3") {
      /* CỐ TÌNH KHÔNG đụng checkinStreak ở đây */
    } else if (kind === "checkin1") {
      if (w.checkinDoneDay !== d) return { ok: false, msg: "Bạn chưa điểm danh hôm nay!" };
    } else if (kind === "streak7") {
      const s = w.checkinStreak || 0;
      if (s < 7) return { ok: false, msg: `Chuỗi ${s}/7 ngày · chưa đủ, chưa mở Nhận!` };
      await ctx.db.patch(w._id, { streak7Day: d, checkinStreak: 0 }); // bắt chu kỳ 7 ngày MỚI
    }

    await ctx.db.insert(T_TICKETS, { uid, kind, day: d, amount, claimedAt: Date.now() });
    await ctx.db.patch(w._id, { tickets: (w.tickets || 0) + amount });
    const w2 = await getWallet(ctx, uid);
    return { ok: true, tickets: w2.tickets, amount };
  },
});

/* ============ 5. VÒNG QUAY: chỉ bấm GO mới tính, vé chỉ trừ ở đây ==== */
export const spinWheel = mutation({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false, msg: "Chưa đăng nhập" };
    const _ban = await banGuard(ctx, uid); if (_ban) return _ban;
    const mult = Math.max(1, Math.min(5, parseInt(args.p_multiplier, 10) || 1));
    const w = await ensureWallet(ctx, uid);
    if ((w.tickets || 0) < mult) return { ok: false, msg: "Hiện tại không đủ vé" };
    await ctx.db.patch(w._id, { tickets: w.tickets - mult });   // TRỪ ĐÚNG, KHÔNG RESET
    /* TỈ LỆ CHỐT Ở SERVER (khớp mảng PRIZES trong index.html):
       slot 0 = 10 coin  90% | slot 2 = 25 coin 6% | slot 4 = 50 coin 4%
       slot 1/3/5 (3 hộp quà), slot 6 (100), slot 7 (10000) = 0%
       -> KHÔNG BAO GIỜ dừng vào mấy ô đó. Vì trả đúng slot nên chữ
       "Kim đã dừng ở ô ..." và số coin cộng LUÔN KHỚP NHAU
       (hết lỗi "ô 10 mà +100 Coin" / "trúng 10 mà +0 Coin").          */
    const WHEEL = [
      { slot: 0, coin: 10, w: 90 },
      { slot: 2, coin: 25, w: 6 },
      { slot: 4, coin: 50, w: 4 },
    ];
    const pickPrize = () => {
      const r = Math.random() * 100;
      let acc = 0;
      for (const p of WHEEL) { acc += p.w; if (r < acc) return p; }
      return WHEEL[0];
    };
    const slots = [];
    let gain = 0;
    for (let i = 0; i < mult; i++) {
      const p = pickPrize();
      slots.push(p.slot);
      gain += p.coin;
    }
    if (gain > 0) await addCoins(ctx, uid, gain, "wheel_gain");
    /* Bấm GO xong mới mở khoá nhiệm vụ +5 coin. Bấm "Làm" rồi thoát KHÔNG tính. */
    const st = await ensureState(ctx, uid, "spin", dayVN());
    await ctx.db.patch(st._id, { spinDone: true, updatedAt: Date.now() });
    const w2 = await getWallet(ctx, uid);
    /* Trả ĐÚNG 2 số như coinState: coins = TỔNG (đã seed 4.774),
       today = coin kiếm hôm nay. Frontend không phải tự += nữa. */
    return {
      ok: true, slots, coin_gain: gain, tickets: w2.tickets,
      coins: await displayCoins(ctx, uid, w2),
      today: w2.todayDate === dayVN() ? w2.today : 0,
    };
  },
});

/* ============ 6. BÁO TIẾN TRÌNH GAME (KHÔNG cộng coin) ============
LUẬT MỚI ĐÚNG Ý BẠN:
• MỖI taskId có 1 task_state RIÊNG -> chơi cho "Chơi 5 game" không
  bao giờ làm tăng tiến độ "Chơi 30 game". Chỉ p_task được cập nhật.
• MỖI game có số phút RIÊNG (gameTimes[gameId]), lưu trên SERVER.
  Game 2 chơi 5p rồi tắt web / F5 / đổi game -> vẫn còn 5p đó,
  vào lại chơi tiếp game 2 được cộng dồn (không mất trắng).
• Đạt đủ sec -> gameId vào doneGames (chống đếm trùng), games++.
  Phải là game KHÁC NHAU mới tính game tiếp theo.
• gap > 20s: KHÔNG cộng thêm giây (chống treo tab / fake), nhưng
  TUYỆT ĐỐI không xoá số phút đã lưu.
• p_game_done / p_games / p_progress / p_game_elapsed / p_ready từ
  client chỉ là tín hiệu, server tự chốt lại bằng đồng hồ của mình.   */
export const taskReport = mutation({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    const id = String(args.p_task || "");
    const rule = RULES[id];
    if (!uid || !rule) return { ok: false };
    const _ban = await banGuard(ctx, uid); if (_ban) return _ban;
    const d = taskDay(id);            // PERSIST: không reset 00:00
    const st = await ensureState(ctx, uid, id, d);   // <-- RIÊNG theo taskId
    const now = Date.now();
    const patch = { updatedAt: now, lastReportAt: now };
    if (args.p_share === true) patch.shareVerified = true;

    if (rule.mode === "time") {
      const times = st.gameTimes || {};
      const done = st.doneGames || [];
      const gid = String(args.p_game_id || "").trim() || "__game__";
      let elapsed = st.gameElapsed || 0;

      /* Đổi game: cất phút của game cũ, nạp phút đã lưu của game mới */
      if ((st.currentGame || "") && st.currentGame !== gid) {
        times[st.currentGame] = elapsed;
        elapsed = times[gid] || 0;
      } else if (!st.currentGame && (times[gid] || 0) > 0) {
        elapsed = times[gid];   // F5 / tắt web mở lại -> KHÔI PHỤC 5p đó
      }
      patch.currentGame = gid;

      const last = st.lastReportAt || 0;
      const gap = last ? now - last : 0;
      if (last && gap <= MAX_GAP_MS) elapsed += gap / 1000;   // đồng hồ SERVER
      /* gap > 20s: bỏ qua khoảng offline, GIỮ elapsed đã có */

      if (elapsed >= rule.sec && done.indexOf(gid) < 0 && done.length < rule.games) {
        done.push(gid);
        patch.doneGames = done;
        patch.games = done.length;
        patch.lastGameAt = now;
        elapsed = 0;                       // sang game KHÁC
      } else if (done.indexOf(gid) >= 0) {
        elapsed = 0;                       // game này đã tính rồi, không đếm lại
      }
      times[gid] = elapsed;
      patch.gameTimes = times;
      patch.gameElapsed = elapsed;
      const games = patch.games !== undefined ? patch.games : (st.games || 0);
      patch.progress = games * rule.sec + elapsed;
    } else {
      patch.progress = Math.max(0, parseInt(args.p_progress, 10) || 0);
    }

    await ctx.db.patch(st._id, patch);
    const cur = await ctx.db.get(st._id);
    const target = rule.games || 1;
    return {
      ok: true,
      games: cur.games || 0,
      target,
      gameElapsed: Math.round(cur.gameElapsed || 0),
      progress: Math.round(cur.progress || 0),
      ready: rule.mode === "share" ? !!cur.shareVerified
           : rule.mode === "wheel" ? !!cur.spinDone
           : rule.mode === "free"  ? true
           : (cur.games || 0) >= target,
    };
  },
});

/* ============ 7. NHẬN COIN (chỉ khi user bấm "Nhận") ============
Ghi claim TRƯỚC rồi mới cộng coin -> không thể nhận 2 lần dù F5 / gọi lại API. */
export const claimTask = mutation({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    const id = String(args.p_type || "");
    const rule = RULES[id];
    if (!uid) return { ok: false, msg: "Chưa đăng nhập" };
    if (!rule) return { ok: false, msg: "Nhiệm vụ không tồn tại" };
    const _ban = await banGuard(ctx, uid); if (_ban) return _ban;
    const d = dayVN();              // bỏ qua p_day
    const sd = taskDay(id);
    /* p_reward / p_limit / p_ready / p_day / p_games: BỎ QUA HẾT */
    /* PERSIST: không chặn bởi claim hôm nay; chỉ cần tiến trình đạt target.
       Nhận xong -> XOÁ state => tiến trình về 0, làm lại được ngay. */
    if (!PERSIST_TASKS[id] && await claimed(ctx, uid, id, d))
      return { ok: false, msg: "Đã nhận thưởng này hôm nay rồi" };
    const st = await getState(ctx, uid, id, sd);   // CHỈ đọc state của RIÊNG task này
    let ready = false;
    if (rule.mode === "free") ready = true;
    else if (rule.mode === "wheel") ready = !!st?.spinDone;
    else if (rule.mode === "share") ready = !!st?.shareVerified;
    else ready = (st?.games || 0) >= (rule.games || 1);
    if (!ready) return { ok: false, msg: "Bạn chưa hoàn thành nhiệm vụ này!" };
    await addCoins(ctx, uid, rule.reward, id);
    if (PERSIST_TASKS[id] && st) await ctx.db.delete(st._id);   // reset DUY NHẤT ở đây
    const w = await getWallet(ctx, uid);
    return { ok: true, coins: await displayCoins(ctx, uid, w), today: w.today, reward: rule.reward };
  },
});

/* ============ 8. KIM CƯƠNG TÍM: MỌI THAO TÁC QUA SERVER ============
addPurpleDiamond là INTERNAL: web / Postman KHÔNG gọi được để tự cộng kim cương.
Chỉ Convex Dashboard (Run function) hoặc cron nội bộ mới cấp phát được.      */
export const addPurpleDiamond = internalMutation({
  args: { p_uid: v.optional(v.string()), p_amount: v.optional(v.number()),
          p_reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false, msg: "Chưa đăng nhập" };
    const n = Math.max(0, Math.floor(Number(args.p_amount) || 0));
    if (!n) return { ok: false, msg: "Số lượng không hợp lệ" };
    const diamonds = await addDiamonds(ctx, uid, n);
    return { ok: true, diamonds };
  },
});

/* Đổi điểm <-> kim cương: SERVER tự trừ coin, tự tính và cộng kim cương.
Client CHỈ gửi số coin muốn đổi (p_points). F12 gửi p_amount / p_reward /
sửa userDiamonds đều vô dụng vì số dư thật nằm trong td_wallet.        */
export const exchangeDiamonds = mutation({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false, msg: "Chưa đăng nhập" };
    const _ban = await banGuard(ctx, uid); if (_ban) return _ban;
    const RATE = 1000;
    const pts = Math.max(0, Math.floor(Number(args.p_points) || 0));
    const n = Math.floor(pts / RATE);
    if (n < 1) return { ok: false, msg: "Tối thiểu " + RATE + " coin để đổi!" };
    const used = n * RATE;
    const w = await ensureWallet(ctx, uid);
    const balance = coinsOf(w);
    if (balance < used) return { ok: false, msg: "Không đủ coin để đổi!" };
    const diamonds = (w.diamonds || 0) + n;
    /* Coin hôm nay (w.today) KHÔNG đổi: đó là coin KIẾM được, không phải coin tiêu */
    await ctx.db.patch(w._id, { coins: balance - used, diamonds });
    await ctx.db.insert(T_DIA, {
      uid, day: dayVN(), amount: n, points: used,
      reason: "Đổi coin lấy kim cương", at: Date.now(),
    });
    const w2 = await getWallet(ctx, uid);
    return { ok: true, coins: coinsOf(w2), diamonds, amount: n, used };
  },
});

/* ============ 9. DỌN RECORD CŨ (cron 00:00 VN) ============
CHỈ xoá log quá 7 ngày. KHÔNG patch coins / today / tickets / diamonds /
checkinStreak. Reset "hôm nay" tự xảy ra nhờ so sánh day ở ensureWallet. */
export const resetDailyTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const keepFrom = dayVN(Date.now() - 7 * 86400000);
    let n = 0;
    for (const table of [T_TASK, T_CLAIMS, T_TICKETS]) {
      const old = await rowsOf(ctx, table, null);
      for (const r of old) {
        if (String(r.day) < keepFrom) { await ctx.db.delete(r._id); n++; }
      }
    }
    /* BẢN 8: lịch sử Admin CHỈ giữ 2 ngày (hôm nay + hôm qua).
       Quá 00:00 VN, yesterdayVN() dịch đi 1 ngày -> ngày cũ nhất tự rụng.
       Web chính không bị ảnh hưởng (todayStats vẫn đọc T_CLAIMS theo ngày). */
    const keep2 = yesterdayVN();
    for (const r of await rowsOf(ctx, T_HISTORY, null)) {
      if (String(r.day) < keep2) { await ctx.db.delete(r._id); n++; }
    }
    /* Thông báo cũ quá 7 ngày cũng dọn (bảng nhỏ, không đụng ví) */
    const keepNotice = dayVN(Date.now() - 7 * 86400000);
    for (const r of await rowsOf(ctx, T_NOTICES, null)) {
      if (String(r.day) < keepNotice || !noticeAlive(r)) { await ctx.db.delete(r._id); n++; }
    }
    return { ok: true, deleted: n, day: dayVN(), keepHistoryFrom: keep2 };
  },
});


/* ================================================================
   BẢN 7 · ĐỔI THẺ CÀO: USER GỬI ĐƠN -> ADMIN GỬI MÃ/SERI -> USER XEM LỊCH SỬ
   Bảng MỚI "td_redeems" (schemaless, không khai báo trong schema.ts)
   -> KHÔNG đụng 5 bảng cũ, KHÔNG sửa schema.ts, KHÔNG xoá bảng,
      KHÔNG dính lỗi "extra field ... not in the validator".
   Trừ coin chỉ patch td_wallet.coins (TỔNG). "Coin hôm nay" giữ nguyên.
   Admin key đổi ở 2 chỗ: ADMIN_KEY ở dưới + ADMIN_KEY trong index.html.
   ================================================================ */
const T_REDEEMS = "td_redeems";
const ADMIN_KEY = "td2026admin";
/* GIÁ DO SERVER CHỐT · client gửi p_denom, KHÔNG bao giờ gửi giá coin */
/* BẢN 10 · TỶ LỆ MỚI (server chốt, client KHÔNG gửi giá coin) */
const CARD_COST = {
  10000: 9000, 20000: 16000, 50000: 28000,
  100000: 35000, 200000: 50000, 500000: 100000,
};
const OP_LABEL = {
  viettel: "Viettel", vinaphone: "VinaPhone",
  mobifone: "MobiFone", garena: "Garena",
};
function fmtVN(ms) {
  const d = new Date((Number(ms) || Date.now()) + 7 * 3600000);
  const p = (n) => String(n).padStart(2, "0");
  return p(d.getUTCDate()) + "/" + p(d.getUTCMonth() + 1) + "/" +
    d.getUTCFullYear() + " " + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes());
}
function adminOK(args) { return String(args.p_admin_key || "") === ADMIN_KEY; }
function shortUid(u) { return String(u).length > 14
  ? String(u).slice(0, 6) + "…" + String(u).slice(-4) : String(u); }

/* BẢN 9 · Thông báo chỉ tồn tại đúng 7 ngày. Dùng cho MỌI chỗ đọc thông báo,
   kể cả lúc cron chưa kịp chạy -> quá 7 ngày là KHÔNG user nào thấy nữa. */
const NOTICE_TTL_MS = 7 * 86400000;
function noticeAlive(n) {
  if (!n) return false;
  return (Number(n.createdAt) || 0) + NOTICE_TTL_MS > Date.now();
}
/* BẢN 9 · gói thông tin khoá acc để trả về cho user / admin */
function banBrief(u) {
  const on = !!(u && u.banned) && !(u.unlockAt && Date.now() >= Number(u.unlockAt));
  const at = on ? Number(u.bannedAt || 0) : 0;
  const until = on ? Number(u.unlockAt || 0) : 0;
  return {
    banned: on, bannedAt: at, unlockAt: until,
    bannedLabel: on ? String(u.bannedLabel || (at ? fmtVN(at) : "")) : "",
    unlockLabel: on ? String(u.unlockLabel || (until ? fmtVN(until) : "Không thời hạn")) : "",
    reason: on ? String(u.banReason || "Hệ thống ghi nhận tài khoản bạn có hành vi gian lận") : "",
  };
}
/* BẢN 10 · Admin gõ: "17/11/2026 lúc 16h37 mở khoá 19/11/2026 lúc 10h20"
   hoặc "17/11/2026 - 20/11/2026" -> hệ thống tự hiểu ngày khoá + ngày mở.
   Giờ VN (UTC+7) -> Date.UTC(..., hh-7, mm). */
function pad2(n) { return String(n).padStart(2, "0"); }
function parseBanWindow(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return { days: Number(s) };
  const re = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*(?:lúc|,)?\s*(\d{1,2})\s*h\s*(\d{1,2})?|\s*(?:lúc|,)?\s*(\d{1,2}):(\d{1,2}))?/gi;
  const hits = [];
  let m;
  while ((m = re.exec(s))) {
    const hh = Number(m[4] || m[6] || 0);
    const mm = Number(m[5] || m[7] || 0);
    const dateTxt = pad2(m[1]) + "/" + pad2(m[2]) + "/" + m[3];
    hits.push({
      ms: Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), hh - 7, mm, 0),
      label: (m[4] || m[6]) ? (dateTxt + " lúc " + pad2(hh) + "h" + pad2(mm)) : dateTxt,
    });
  }
  if (!hits.length) return null;
  return { lock: hits[0], unlock: hits[1] || null, raw: s };
}

/* ---- 1. USER bấm "Đổi thưởng ngay" ------------------------------- */
export const redeemCard = mutation({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false, msg: "Chưa đăng nhập" };
    const _ban = await banGuard(ctx, uid); if (_ban) return _ban;
    const denom = Number(args.p_denom || 0);
    const cost = CARD_COST[denom];
    if (!cost) return { ok: false, msg: "Mệnh giá không hợp lệ" };
    const w = await ensureWallet(ctx, uid);
    if (!w) return { ok: false, msg: "Chưa có ví, thử lại" };
    const base = coinsOf(w);
    if (base < cost) {
      return { ok: false, msg: "Cần " + cost.toLocaleString("vi-VN") +
        " coin, bạn có " + base.toLocaleString("vi-VN") + " coin" };
    }
    const op = String(args.p_op || "viettel");
    /* Trừ TỔNG. Không đụng today / vé / kim cương -> số không nháy. */
    await ctx.db.patch(w._id, { coins: base - cost });
    const _id = await ctx.db.insert(T_REDEEMS, {
      uid, uidShort: shortUid(uid),
      op, opName: OP_LABEL[op] || op,
      denom, cost,
      status: "pending",          // pending -> completed / rejected
      cardCode: "", cardSerial: "",
      day: dayVN(), createdAt: Date.now(), decidedAt: 0,
      note: "", time: fmtVN(Date.now()),
    });
    return { ok: true, id: _id, coins: base - cost, cost, msg: "Đã gửi yêu cầu đổi thẻ" };
  },
});

/* ---- 2. USER xem lịch sử (Convex query = realtime, không cần F5) ---- */
export const getMyRedemptions = query({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: true, rows: [] };
    const raw = await rowsOf(ctx, T_REDEEMS, (q) => fUid(q, uid));
    raw.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return {
      ok: true,
      rows: raw.slice(0, 50).map((r) => ({
        id: String(r._id),
        opName: r.opName || "Thẻ cào", denom: Number(r.denom) || 0,
        cost: Number(r.cost) || 0, status: String(r.status || "pending"),
        /* Mã/seri CHỈ trả khi admin đã gửi */
        cardCode: r.status === "completed" ? String(r.cardCode || "") : "",
        cardSerial: r.status === "completed" ? String(r.cardSerial || "") : "",
        createdAt: r.createdAt || 0, time: r.time || fmtVN(r.createdAt),
        note: String(r.note || ""),
      })),
    };
  },
});

/* ---- 3. ADMIN xem đơn chờ ---------------------------------------- */
export const listPendingRedemptions = query({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin", rows: [] };
    const all = await rowsOf(ctx, T_REDEEMS, null);
    const rows = all
      .filter((r) => String(r.status || "pending") === "pending")
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .slice(0, Math.max(1, Math.min(200, Number(args.p_limit) || 100)))
      .map((r) => ({
        id: String(r._id), uidShort: r.uidShort || shortUid(r.uid),
        opName: r.opName || "Thẻ cào", denom: Number(r.denom) || 0,
        cost: Number(r.cost) || 0, createdAt: r.createdAt || 0,
        time: r.time || fmtVN(r.createdAt),
      }));
    return { ok: true, rows };
  },
});

/* ---- 4. ADMIN gửi Mã thẻ + Seri ---------------------------------- */
export const approveRedemption = mutation({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin" };
    const id = String(args.p_redeem_id || "");
    const code = String(args.p_card_code || "").trim();
    const seri = String(args.p_serial || "").trim();
    if (!id || !code || !seri) return { ok: false, msg: "Thiếu mã thẻ hoặc số seri" };
    let doc = null;
    try { doc = await ctx.db.get(id); } catch (e) { doc = null; }
    if (!doc) return { ok: false, msg: "Không tìm thấy đơn" };
    if (String(doc.status) !== "pending") return { ok: false, msg: "Đơn này đã xử lý rồi" };
    await ctx.db.patch(doc._id, {
      status: "completed", cardCode: code, cardSerial: seri,
      decidedAt: Date.now(), note: "Đổi thẻ thành công",
    });
    return { ok: true, msg: "Đã gửi mã cho user" };
  },
});

/* ---- 5. ADMIN từ chối -> hoàn coin -------------------------------- */
export const rejectRedemption = mutation({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin" };
    const id = String(args.p_redeem_id || "");
    let doc = null;
    try { doc = await ctx.db.get(id); } catch (e) { doc = null; }
    if (!doc) return { ok: false, msg: "Không tìm thấy đơn" };
    if (String(doc.status) !== "pending") return { ok: false, msg: "Đơn này đã xử lý rồi" };
    const cost = Number(doc.cost) || 0;
    await ctx.db.patch(doc._id, {
      status: "rejected", decidedAt: Date.now(),
      note: String(args.p_note || "Admin từ chối"),
    });
    const w = await getWallet(ctx, doc.uid);
    if (w && cost > 0) await ctx.db.patch(w._id, { coins: coinsOf(w) + cost });
    return { ok: true, coins: w ? coinsOf(w) + cost : null, msg: "Đã hoàn coin" };
  },
});

/* ================================================================
   BẢN 8 · ADMIN TỔNG (cùng link ?admin=td2026admin)
   1) Nhịp tim 10s -> chỉ user ĐANG MỞ WEB mới hiện trong danh sách.
   2) Biệt danh: Google lần đầu = tên Google; đăng ký tay = ô Biệt danh;
      user tự đổi -> nickManual = true -> KHÔNG BAO GIỜ ghi đè nữa.
   3) Thanh tìm kiếm UID: ra cả user online LẪN offline.
   4) Lịch sử kiếm coin RIÊNG, giữ 2 ngày (hôm nay + hôm qua), quá 00:00 VN
      tự rụng ngày cũ nhất. Web chính vẫn reset "Coin hôm nay" mỗi 00:00.
   5) Admin cộng / thu hồi coin (chỉ patch TỔNG, không đụng today).
   6) Admin khoá / mở khoá acc gian lận (chặn ở mọi mutation kiếm/rút coin).
   7) Admin soạn thông báo -> TẤT CẢ user thấy chung 1 popup.
   Tất cả dùng bảng schemaless mới -> KHÔNG sửa schema.ts, KHÔNG xoá bảng.
   ================================================================ */
const ONLINE_MS = 20000;   // heartbeat 10s + 10s dung sai mạng VN
/* NOTICE_TTL_MS / noticeAlive / banBrief đã khai báo ở trên (ngay sau fmtVN) */

async function userDoc(ctx, uid) {
  return await firstOf(ctx, T_USERS, (q) => fUid(q, uid));
}
async function ensureUser(ctx, uid, seedGoogle) {
  let u = await userDoc(ctx, uid);
  if (!u) {
    const seed = String(seedGoogle || "").trim();
    const doc = {
      uid,
      nickname: seed,                 // lần đầu Google: lấy ngay tên Google
      googleName: seed,
      nickSource: seed ? "google" : "",
      nickManual: false,              // user tự đổi -> bật lên true, khoá vĩnh viễn
      lastSeenAt: Date.now(), createdAt: Date.now(),
      banned: false, bannedAt: 0,
    };
    try {
      const _id = await ctx.db.insert(T_USERS, doc);
      u = await ctx.db.get(_id);
    } catch (e) { u = await userDoc(ctx, uid); }   // race 2 tab cùng mở
  }
  return u;
}
function userBrief(u, w, now) {
  const last = (u && u.lastSeenAt) || 0;
  return {
    uid: String(u ? u.uid : ""),
    nickname: String((u && u.nickname) || "Chưa có biệt danh"),
    coins: coinsOf(w), earned: earnedOf(w),
    banned: banBrief(u).banned,
    lastSeenAt: last,
    online: now - last <= ONLINE_MS,
  };
}

/* ---- 1. GOOGLE: chỉ seed lần đầu, KHÔNG ghi đè biệt danh user tự đổi ---- */
export const syncGoogleName = mutation({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false };
    const g = String(args.p_google_name || "").trim();
    if (!g) return { ok: true };
    const u = await ensureUser(ctx, uid, "");
    if (!u) return { ok: false };
    if (u.nickManual) return { ok: true, nickname: String(u.nickname || "") };
    if (!u.nickname || u.nickSource === "google") {
      await ctx.db.patch(u._id, {
        nickname: g, googleName: g, nickSource: "google", lastSeenAt: Date.now(),
      });
      return { ok: true, nickname: g };
    }
    return { ok: true, nickname: String(u.nickname || "") };
  },
});

/* ---- 2. ĐĂNG KÝ TAY / USER ĐỔI BIỆT DANH -> ưu tiên TUYỆT ĐỐI ------- */
export const setNickname = mutation({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false, msg: "Chưa đăng nhập" };
    const nick = String(args.p_nick || "").trim().slice(0, 60);
    if (!nick) return { ok: false, msg: "Biệt danh trống" };
    const u = await ensureUser(ctx, uid, "");
    if (!u) return { ok: false, msg: "Không tạo được hồ sơ" };
    await ctx.db.patch(u._id, {
      nickname: nick, nickManual: true, nickSource: "manual", lastSeenAt: Date.now(),
    });
    return { ok: true, nickname: nick };
  },
});

/* ---- 3. NHỊP TIM: user gọi mỗi 10s. Trả luôn cờ khoá + thông báo mới -- */
export const updatePresence = mutation({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false };
    const g = String(args.p_google_name || "").trim();
    const u = await ensureUser(ctx, uid, g);   // tạo lần đầu -> seed tên Google
    if (!u) return { ok: false };
    const patch = { lastSeenAt: Date.now() };
    if (!u.nickManual && g && !u.nickname) {
      patch.nickname = g; patch.googleName = g; patch.nickSource = "google";
    }
    /* BẢN 9 · quá ngày mở khoá -> tự mở lại, không cần admin bấm */
    if (u.banned && u.unlockAt && Date.now() >= Number(u.unlockAt)) {
      patch.banned = false; patch.bannedAt = 0; patch.unlockAt = 0; patch.unlockLabel = "";
    }
    await ctx.db.patch(u._id, patch);
    const cur = await ctx.db.get(u._id);
    const notes = (await rowsOf(ctx, T_NOTICES, null)).filter(noticeAlive);
    notes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const n = notes[0] || null;
    const b = banBrief(cur);
    return {
      ok: true,
      banned: b.banned, bannedAt: b.bannedAt, unlockAt: b.unlockAt,
      bannedLabel: b.bannedLabel, unlockLabel: b.unlockLabel, reason: b.reason,
      nickname: String((cur && cur.nickname) || ""),
      notice: n ? {
        id: String(n._id), text: String(n.text || ""), createdAt: n.createdAt || 0,
      } : null,
    };
  },
});

/* ---- 4. ADMIN: danh sách CHỈ user đang hoạt động --------------------- */
export const listOnlineUsers = query({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin", rows: [] };
    const now = Date.now();
    const all = await rowsOf(ctx, T_USERS, null);
    const rows = [];
    for (const u of all) {
      if (now - ((u.lastSeenAt || 0)) > ONLINE_MS) continue;   // offline -> ẨN
      const w = await getWallet(ctx, u.uid);
      rows.push(userBrief(u, w, now));
    }
    rows.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    return { ok: true, rows: rows.slice(0, 100), onlineMs: ONLINE_MS };
  },
});

/* ---- 5. ADMIN: thanh tìm kiếm UID (ra CẢ online + offline) ----------- */
export const adminFindUser = query({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin", rows: [] };
    const s = String(args.p_search || "").trim().toLowerCase();
    if (!s) return { ok: true, rows: [] };
    const now = Date.now();
    const byUid = {};
    for (const u of await rowsOf(ctx, T_USERS, null)) byUid[String(u.uid)] = u;
    /* User từng có ví nhưng chưa từng heartbeat vẫn tìm được */
    for (const w of await rowsOf(ctx, WALLET, null)) {
      const k = String(w.uid);
      if (!byUid[k]) byUid[k] = {
        uid: k, nickname: "", nickManual: false, banned: false, lastSeenAt: 0,
      };
    }
    const rows = [];
    for (const k of Object.keys(byUid)) {
      const u = byUid[k];
      if (k.toLowerCase().indexOf(s) < 0 &&
          String(u.nickname || "").toLowerCase().indexOf(s) < 0 &&
          String(u.username || "").toLowerCase().indexOf(s) < 0 &&
          String(u.email || "").toLowerCase().indexOf(s) < 0) continue;
      rows.push(userBrief(u, await getWallet(ctx, k), now));
    }
    rows.sort((a, b) => (b.online - a.online) || (b.lastSeenAt - a.lastSeenAt));
    return { ok: true, rows: rows.slice(0, 20) };
  },
});

/* ---- 6. ADMIN: chi tiết 1 user (biệt danh + coin + lịch sử 2 ngày) --- */
export const adminUserDetail = query({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin" };
    const target = String(args.p_target_uid || "");
    if (!target) return { ok: false, msg: "Thiếu UID" };
    const u = await userDoc(ctx, target);
    const w = await getWallet(ctx, target);
    const keep = yesterdayVN();      // hôm nay + hôm qua = đúng 2 ngày
    const hist = (await rowsOf(ctx, T_HISTORY, (q) => fUid(q, target)))
      .filter((r) => String(r.day) >= keep)
      .sort((a, b) => (b.at || 0) - (a.at || 0))
      .slice(0, 100)
      .map((r) => ({
        time: fmtVN(r.at), label: String(r.label || "Nhiệm vụ"),
        reward: Number(r.reward) || 0, kind: String(r.kind || "task"),
      }));
    const now = Date.now();
    return {
      ok: true, uid: target,
      nickname: String((u && u.nickname) || "Chưa có biệt danh"),
      coins: coinsOf(w), earned: earnedOf(w),
      today: w && w.todayDate === dayVN() ? (w.today || 0) : 0,
      banned: banBrief(u).banned,
      bannedLabel: banBrief(u).bannedLabel, unlockLabel: banBrief(u).unlockLabel,
      online: !!u && now - (u.lastSeenAt || 0) <= ONLINE_MS,
      lastSeenAt: (u && u.lastSeenAt) || 0,
      keepFrom: keep, history: hist,
    };
  },
});

/* ---- 7. ADMIN: dọn lịch sử quá 2 ngày (query không được xoá -> mutation) */
export const adminGcHistory = mutation({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin" };
    const keep = yesterdayVN();
    let n = 0;
    for (const r of await rowsOf(ctx, T_HISTORY, null)) {
      if (String(r.day) < keep) { await ctx.db.delete(r._id); n++; }
    }
    return { ok: true, deleted: n, keepFrom: keep };
  },
});

/* ---- 8. ADMIN: cộng / thu hồi coin (chỉ TỔNG, KHÔNG đụng Coin hôm nay) */
export const adminAdjustCoins = mutation({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin" };
    const target = String(args.p_target_uid || "");
    const d = Math.trunc(Number(args.p_delta) || 0);
    if (!target || !d) return { ok: false, msg: "Nhập số coin cần cộng / thu hồi" };
    if (Math.abs(d) > 1000000) return { ok: false, msg: "Số quá lớn (tối đa 1.000.000)" };
    const w = await ensureWallet(ctx, target);
    if (!w) return { ok: false, msg: "Không có ví" };
    const next = Math.max(0, coinsOf(w) + d);
    await ctx.db.patch(w._id, { coins: next });
    await ctx.db.insert(T_HISTORY, {
      uid: target, taskId: "admin_adjust",
      label: d > 0 ? "Admin cộng coin" : "Admin thu hồi coin",
      reward: d, at: Date.now(), day: dayVN(), kind: "admin",
    });
    return { ok: true, coins: next, delta: d };
  },
});

/* ---- 9. ADMIN: khoá / mở khoá acc gian lận -------------------------- */
export const adminToggleBan = mutation({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin" };
    const target = String(args.p_target_uid || "");
    if (!target) return { ok: false, msg: "Thiếu UID" };
    const u = await ensureUser(ctx, target, "");
    if (!u) return { ok: false, msg: "Không tạo được hồ sơ" };
    const next = !u.banned;
    await ctx.db.patch(u._id, { banned: next, bannedAt: next ? Date.now() : 0 });
    return { ok: true, banned: next };
  },
});

/* ---- 10. ADMIN: gửi thông báo quan trọng cho TẤT CẢ user ------------ */
export const sendNotice = mutation({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin" };
    const text = String(args.p_note || "").trim().slice(0, 500);
    if (!text) return { ok: false, msg: "Chưa nhập nội dung thông báo" };
    const _id = await ctx.db.insert(T_NOTICES, {
      text, createdAt: Date.now(), day: dayVN(), by: "admin",
    });
    return { ok: true, id: String(_id), text };
  },
});
export const latestNotice = query({
  args: A,
  handler: async (ctx, args) => {
    const notes = (await rowsOf(ctx, T_NOTICES, null)).filter(noticeAlive);
    notes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const n = notes[0] || null;
    return {
      ok: true,
      notice: n ? {
        id: String(n._id), text: String(n.text || ""), createdAt: n.createdAt || 0,
      } : null,
    };
  },
});


/* ================================================================
   BẢN 9 · 3 HÀM MỚI
   11) banInfo     : user (kể cả đã bị out ra màn đăng nhập) hỏi trạng thái khoá
   12) adminSetBan : khoá CÓ THỜI HẠN (số ngày / ngày cụ thể) + MỞ KHOÁ NGAY
   13) adminRedeemHistory : lịch sử đơn đổi thẻ (Đã gửi / Đã từ chối)
   Vẫn dùng bảng schemaless cũ -> KHÔNG sửa schema.ts, KHÔNG xoá bảng.
   ================================================================ */

/* ---- 11. USER: trạng thái khoá acc --------------------------------- */
export const banInfo = query({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: true, banned: false };
    const u = await userDoc(ctx, uid);
    return Object.assign({ ok: true, uid }, banBrief(u));
  },
});

/* ---- 12. ADMIN: khoá có thời hạn / mở khoá ngay --------------------- */
export const adminSetBan = mutation({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin" };
    const target = String(args.p_target_uid || "");
    if (!target) return { ok: false, msg: "Thiếu UID" };
    const u = await ensureUser(ctx, target, "");
    if (!u) return { ok: false, msg: "Không tạo được hồ sơ" };
    const action = String(args.p_action || "ban");
    if (action === "unban") {
      /* Bấm phát mở lại ngay, KHÔNG cần biết đã band bao lâu */
      await ctx.db.patch(u._id, { banned: false, bannedAt: 0, unlockAt: 0,
        unlockLabel: "", bannedLabel: "", banReason: "" });
      return { ok: true, banned: false, msg: "Đã mở khóa acc" };
    }
    const rawDate = String(args.p_until || "").trim();
    const days = Math.trunc(Number(args.p_days) || 0);
    const win = parseBanWindow(rawDate || (days > 0 ? String(days) : ""));
    let until = 0, label = "Không thời hạn", lockLabel = "";
    if (win && win.unlock) { until = win.unlock.ms; label = win.unlock.label; }
    else if (win && win.lock) { until = win.lock.ms; label = win.lock.label; }
    else if (days > 0) { until = Date.now() + days * 86400000; label = fmtVN(until); }
    if (win && win.lock && win.unlock) lockLabel = win.lock.label;
    const reason = String(args.p_reason || "").trim().slice(0, 300) ||
      "Hệ thống ghi nhận tài khoản bạn có hành vi gian lận";
    await ctx.db.patch(u._id, {
      banned: true, bannedAt: Date.now(), unlockAt: until, unlockLabel: label,
      bannedLabel: lockLabel || fmtVN(Date.now()), banReason: reason,
    });
    const cur = await ctx.db.get(u._id);
    return Object.assign({ ok: true, msg: "Đã khóa acc" }, banBrief(cur));
  },
});

/* ---- 12b. ADMIN: danh sách acc ĐANG bị khoá (hiện biệt danh) -------- */
export const adminBannedList = query({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin", rows: [] };
    const all = await rowsOf(ctx, T_USERS, null);
    const rows = all
      .filter((u) => banBrief(u).banned)
      .sort((a, b) => (b.bannedAt || 0) - (a.bannedAt || 0))
      .map((u) => {
        const b = banBrief(u);
        return {
          uid: String(u.uid),
          nickname: String(u.nickname || "Chưa có biệt danh"),
          bannedLabel: b.bannedLabel, unlockLabel: b.unlockLabel,
          reason: b.reason, bannedAt: b.bannedAt,
        };
      });
    return { ok: true, rows };
  },
});

/* ---- 13. ADMIN: lịch sử đơn đổi thẻ cào ----------------------------- */
export const adminRedeemHistory = query({
  args: A,
  handler: async (ctx, args) => {
    if (!adminOK(args)) return { ok: false, msg: "Sai khóa admin", rows: [] };
    const all = await rowsOf(ctx, T_REDEEMS, null);
    const rows = all
      .filter((r) => String(r.status || "pending") !== "pending")
      .sort((a, b) => (b.decidedAt || b.createdAt || 0) - (a.decidedAt || a.createdAt || 0))
      .slice(0, Math.max(1, Math.min(300, Number(args.p_limit) || 200)))
      .map((r) => ({
        id: String(r._id),
        card: "Thẻ " + String(r.opName || "Thẻ cào") + " " +
          (Number(r.denom) / 1000).toLocaleString("vi-VN") + "k",
        uid: String(r.uidShort || shortUid(r.uid)),
        uidFull: String(r.uid || ""),
        status: String(r.status),
        statusText: r.status === "completed" ? "Đã gửi" : "Đã từ chối",
        code: String(r.cardCode || ""), serial: String(r.cardSerial || ""),
        cost: Number(r.cost) || 0,
        time: r.time || fmtVN(r.createdAt),
        decidedTime: fmtVN(r.decidedAt || r.createdAt),
      }));
    return { ok: true, rows };
  },
});

/* ================================================================
   BẢN 12 · ĐĂNG NHẬP BẰNG GMAIL HOẶC TÊN ĐĂNG NHẬP
   Firebase Auth chỉ biết Email + Mật khẩu. Ta lưu ánh xạ
   username (lowercase) -> email trong bảng schemaless td_users.
   Khi user gõ không có dấu @ -> frontend gọi resolveLogin để lấy
   email thật, rồi signInWithEmailAndPassword(email, mật khẩu) như cũ.
   Mật khẩu vẫn 100% do Firebase giữ -> đúng mật khẩu lúc đăng ký.
   Không đụng schema.ts, không cần auth.config.js, không đổi key admin.
   ================================================================ */
/* BẢN 23 · Kiểm tra Tên đăng nhập / Biệt danh đã có người dùng chưa.
   So sánh lowercase, bỏ khoảng trắng -> "Quan12" và " quan12 " vẫn trùng.
   Bảng td_users schemaless nên không cần sửa schema.ts. */
export const checkName = query({
  args: A,
  handler: async (ctx, args) => {
    const u = String(args.p_search || "").trim().toLowerCase();
    const n = String(args.p_nick || "").trim().toLowerCase();
    const all = await rowsOf(ctx, T_USERS, null);
    return {
      ok: true,
      usernameTaken: !!u && all.some((x) => String(x.username || "").trim().toLowerCase() === u),
      nicknameTaken: !!n && all.some((x) => String(x.nickname || "").trim().toLowerCase() === n),
    };
  },
});

export const resolveLogin = query({
  args: A,
  handler: async (ctx, args) => {
    const raw = String(args.p_search || "").trim();
    if (!raw) return { ok: false, email: "" };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      return { ok: true, email: raw.toLowerCase(), by: "email" };
    }
    const key = raw.toLowerCase();
    const rows = await rowsOf(ctx, T_USERS, null);
    const u = rows.find((x) => String(x.username || "").toLowerCase() === key);
    if (u && u.email) {
      return { ok: true, email: String(u.email).toLowerCase(), by: "username" };
    }
    return { ok: false, email: "", msg: "Không tìm thấy tài khoản với tên đăng nhập này" };
  },
});

export const myProfile = query({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false };
    const u = await userDoc(ctx, uid);
    return {
      ok: true,
      username: String((u && u.username) || ""),
      email: String((u && u.email) || ""),
      nickname: String((u && u.nickname) || ""),
      phone: String((u && u.phone) || ""),
    };
  },
});

export const registerProfile = mutation({
  args: A,
  handler: async (ctx, args) => {
    const uid = await uidOf(ctx, args);
    if (!uid) return { ok: false, msg: "Chưa đăng nhập" };
    const username = String(args.p_search || "").trim().toLowerCase();
    const email = String(args.p_email || "").trim().toLowerCase();
    const nick = String(args.p_nick || "").trim().slice(0, 60);
    const phone = String(args.p_phone || "").trim();
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return { ok: false, msg: "Tên đăng nhập 3-32 ký tự (chữ, số, . _ -)" };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, msg: "Gmail không hợp lệ" };
    }
    /* Tên đăng nhập VÀ Gmail đều phải duy nhất giữa các UID */
    const all = await rowsOf(ctx, T_USERS, null);
    const clashName = all.find((x) =>
      String(x.username || "").toLowerCase() === username && String(x.uid) !== uid);
    if (clashName) return { ok: false, msg: "Tên đăng nhập đã được dùng" };
    const clashMail = all.find((x) =>
      String(x.email || "").toLowerCase() === email && String(x.uid) !== uid);
    if (clashMail) return { ok: false, msg: "Gmail này đã thuộc tài khoản khác" };
    /* BẢN 23 · Biệt danh cũng phải duy nhất (chặn cả phía server, chống F12) */
    const clashNick = nick ? all.find((x) =>
      String(x.nickname || "").trim().toLowerCase() === nick.toLowerCase() &&
      String(x.uid) !== uid) : null;
    if (clashNick) return { ok: false, msg: "Biệt danh đã được sử dụng rồi" };

    const u = await ensureUser(ctx, uid, "");
    if (!u) return { ok: false, msg: "Không tạo được hồ sơ" };
    const patch = {
      username, email, phone, loginMethod: "password", lastSeenAt: Date.now(),
    };
    if (nick) {
      patch.nickname = nick;
      patch.nickManual = true;
      patch.nickSource = "manual";
    }
    await ctx.db.patch(u._id, patch);

    /* ACC MỚI = 0 COIN. Tạo ví ngay tại đây -> ensureWallet() thấy ví đã có
       và KHÔNG seed 4.774 nữa (BẢN 29). Acc cũ có ví rồi -> giữ nguyên. */
    const w = await getWallet(ctx, uid);
    if (!w) {
      try {
        await ctx.db.insert(WALLET, {
          uid,
          coins: 0, earnedTotal: 0, today: 0, todayDate: dayVN(),
          tickets: 0, diamonds: 0,
          streak: 0, lastLoginDay: "",
          checkinStreak: 0, lastCheckinDay: "", checkinDoneDay: "", streak7Day: "",
          isNewAccount: true,
        });
      } catch (e) { /* race: ví vừa được tạo ở luồng khác -> bỏ qua */ }
    }
    return {
      ok: true, username, email,
      nickname: nick || String(u.nickname || ""),
      coins: w ? coinsOf(w) : 0,
    };
  },
});

/* ================================================================
   BẢN 24 · OTP 6 SỐ CHẠY TRÊN CHÍNH DEPLOYMENT NÀY
   ----------------------------------------------------------------
   Web chỉ cần 1 link: https://tough-canary-511.convex.cloud
   Frontend gọi POST /api/mutation { path: 'tasks:requestOtp' }
   và { path: 'tasks:verifyOtp' } (xem TD_RPC_MAP trong index.html).

   Bảng td_otp là schemaless -> KHÔNG sửa schema.ts, KHÔNG lỗi validator.
   Mỗi lần "Gửi mã" sinh mã mới và XOÁ mã cũ của email đó (chống dùng lại).
   Hết hạn 5 phút · tối đa 5 lần đoán · verify đúng thì đánh dấu verified.

   BẢN 27 · ĐÃ XOÁ CHẾ ĐỘ TEST: Convex KHÔNG sinh mã, KHÔNG trả mã test.
   Mã do otp-server trên Render sinh + gửi qua Brevo HTTPS API (cổng 443).
   requestOtp trả ok:false để bản web cũ (còn cache) không lộ mã nữa.
   verifyOtp giữ nguyên để tương thích, bảng td_otp luôn rỗng.
   ================================================================ */
const T_OTP = "td_otp";
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_TRIES = 5;

function otpEmail(args) {
  return String((args && args.p_email) || '').trim().toLowerCase();
}
async function otpRows(ctx, email) {
  return await rowsOf(ctx, T_OTP, (q) => q.eq(q.field("email"), email));
}

export const requestOtp = mutation({
  args: A,
  handler: async (ctx, args) => {
    const email = otpEmail(args);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, msg: 'Email không hợp lệ' };
    }
    /* Dọn sạch mã cũ sót lại từ bản test -> không ai dùng lại được. */
    const olds = await otpRows(ctx, email);
    for (const r of olds) { try { await ctx.db.delete(r._id); } catch (e) {} }
    return {
      ok: false,
      mailSent: false,
      msg: 'Server gửi mail (Render + Brevo) phụ trách OTP. Bấm Gửi mã lại nhé.',
    };
  },
});

export const verifyOtp = mutation({
  args: A,
  handler: async (ctx, args) => {
    const email = otpEmail(args);
    const code = String((args && args.p_otp) || '').trim();
    if (!/^\d{6}$/.test(code)) return { ok: false, msg: 'Mã phải đúng 6 chữ số' };
    const rows = await otpRows(ctx, email);
    if (!rows.length) return { ok: false, msg: 'Chưa có mã, bấm "Gửi mã OTP" trước nhé' };
    rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const r = rows[0];
    const now = Date.now();
    if (r.verified) return { ok: true, msg: 'Đã xác thực' };
    if (now > Number(r.expiresAt || 0)) {
      try { await ctx.db.delete(r._id); } catch (e) {}
      return { ok: false, msg: 'Mã đã hết hạn (5 phút), bấm Gửi mã lại nhé' };
    }
    if (Number(r.tries || 0) >= OTP_MAX_TRIES) {
      try { await ctx.db.delete(r._id); } catch (e) {}
      return { ok: false, msg: 'Nhập sai quá 5 lần, bấm Gửi mã lại nhé' };
    }
    if (String(r.code) !== code) {
      await ctx.db.patch(r._id, { tries: Number(r.tries || 0) + 1 });
      return { ok: false, msg: 'Mã OTP không đúng' };
    }
    await ctx.db.patch(r._id, { verified: true, verifiedAt: now });
    return { ok: true, msg: 'Xác thực thành công' };
  },
});
