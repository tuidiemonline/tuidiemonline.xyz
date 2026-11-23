/* ==================================================================
   convex/clixwall.js · BAN 43b · CỘNG COIN TỪ POSTBACK
   ------------------------------------------------------------------
   Module RIÊNG, không sửa tasks.js -> 3 file tasks.js / convex_tasks.js /
   convex/tasks.js vẫn GIỐNG HỆT TỪNG BYTE (không làm gãy các vá 42f..42v).

   Bảng schemaless mới (không cần schema.ts, không cần index):
     td_clixwall_txn    dedupe: key = txn|credit hoặc txn|reversal
     td_clixwall_inbox  phát thưởng cho frontend (poll 15s rồi ack)
   Bảng cũ được ghi thêm (đúng field như tasks.js):
     td_wallet          coins / today / earnedTotal / todayDate
     td_claims          để "Lịch sử hôm nay" + Admin đọc được
     td_history         lịch sử Admin (giữ 2 ngày như resetDailyTasks)
   ================================================================== */
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const WALLET  = "td_wallet";
const TXN     = "td_clixwall_txn";
const INBOX   = "td_clixwall_inbox";
const CLAIMS  = "td_claims";
const HISTORY = "td_history";

function dayVN(ms) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(ms || Date.now()));
}
const fUid = (q, uid) => q.eq(q.field("uid"), uid);

async function rowsOf(ctx, table, fn) {
  try {
    const q = ctx.db.query(table);
    return await (fn ? q.filter(fn) : q).collect();
  } catch (e) { return []; }           /* bảng chưa tồn tại -> rỗng */
}
async function safeInsert(ctx, table, doc) {
  try { return await ctx.db.insert(table, doc); }
  catch (e) { return null; }
}
async function safeDelete(ctx, id) {
  try { await ctx.db.delete(id); } catch (e) {}
}
async function getWallet(ctx, uid) {
  const rows = await rowsOf(ctx, WALLET, (q) => fUid(q, uid));
  if (!rows.length) return null;
  rows.sort((a, b) => (a._creationTime || 0) - (b._creationTime || 0));
  return rows[0];
}

/* --- Gọi từ convex/http.js. Có dedupe theo transaction_id + kind --- */
export const apply = internalMutation({
  args: {
    uid:     v.string(),
    txn:     v.string(),
    coins:   v.number(),
    status:  v.string(),
    offer:   v.string(),
    offerId: v.string(),
    kind:    v.string(),
  },
  handler: async (ctx, a) => {
    const key = a.txn + "|" + a.kind;
    const dup = await rowsOf(ctx, TXN, (q) => q.eq(q.field("key"), key));
    if (dup.length) return { ok: true, duplicate: true };

    await safeInsert(ctx, TXN, {
      key, uid: a.uid, txn: a.txn, coins: a.coins, status: a.status,
      kind: a.kind, offer: a.offer, offerId: a.offerId, at: Date.now(),
    });

    let w = await getWallet(ctx, a.uid);
    if (!w) {
      /* User chưa từng mở web nhưng đã có conversion -> vẫn tạo ví để không mất tiền */
      const id = await safeInsert(ctx, WALLET, {
        uid: a.uid, coins: 0, earnedTotal: 0, today: 0, todayDate: dayVN(),
        tickets: 0, diamonds: 0, streak: 0, lastLoginDay: "",
        checkinStreak: 0, lastCheckinDay: "", checkinDoneDay: "", streak7Day: "",
      });
      if (id) w = await ctx.db.get(id);
    }
    if (w) {
      const base      = Number(w.coins) || 0;
      const todayBase = (w.todayDate === dayVN()) ? (Number(w.today) || 0) : 0;
      const earned    = Number(w.earnedTotal);
      try {
        await ctx.db.patch(w._id, {
          coins: Math.max(0, base + a.coins),
          today: Math.max(0, todayBase + a.coins),
          todayDate: dayVN(),
          earnedTotal: Math.max(0, (Number.isFinite(earned) ? earned : base) +
                                  (a.coins > 0 ? a.coins : 0)),
        });
      } catch (e) {}
    }

    const now = Date.now();
    const d   = dayVN();
    await safeInsert(ctx, CLAIMS, {
      uid: a.uid, taskId: "clixwall", day: d, reward: a.coins, claimedAt: now,
    });
    await safeInsert(ctx, HISTORY, {
      uid: a.uid, taskId: "clixwall",
      label: "ClixWall · " + (a.offer || a.offerId || "Offer"),
      reward: a.coins, at: now, day: d, kind: "task",
    });
    await safeInsert(ctx, INBOX, {
      uid: a.uid, txn: a.txn, key, coins: a.coins,
      offer: a.offer || a.offerId || "ClixWall", at: now, acked: false,
    });

    /* Dọn inbox đã ack / quá 7 ngày của chính UID này */
    const cutoff = now - 7 * 86400000;
    for (const r of await rowsOf(ctx, INBOX, (q) => fUid(q, a.uid))) {
      if (r.acked || (r.at || 0) < cutoff) await safeDelete(ctx, r._id);
    }
    return { ok: true, duplicate: false, coins: a.coins };
  },
});

/* --- Frontend poll: chỉ trả item CHƯA ack của đúng UID --- */
export const inbox = query({
  args: { p_uid: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const uid = String((args && args.p_uid) || "").trim();
    if (!uid) return { ok: true, items: [] };
    const cutoff = Date.now() - 7 * 86400000;
    const rows = await rowsOf(ctx, INBOX, (q) =>
      q.and(q.eq(q.field("uid"), uid), q.eq(q.field("acked"), false)));
    const items = rows
      .filter((r) => (r.at || 0) >= cutoff)
      .sort((a, b) => (a.at || 0) - (b.at || 0))
      .slice(0, 20)
      .map((r) => ({
        id:    String(r._id),
        txn:   String(r.txn || ""),
        coins: Number(r.coins) || 0,
        offer: String(r.offer || "ClixWall"),
      }));
    return { ok: true, items };
  },
});

/* --- Frontend báo đã cộng xong -> xoá khỏi inbox, không gửi lại --- */
export const ack = mutation({
  args: { p_uid: v.optional(v.string()), p_txns: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const uid  = String((args && args.p_uid) || "").trim();
    const list = Array.isArray(args && args.p_txns)
      ? args.p_txns.map(String) : [];
    if (!uid || !list.length) return { ok: true, n: 0 };
    let n = 0;
    for (const r of await rowsOf(ctx, INBOX, (q) => fUid(q, uid))) {
      if (list.indexOf(String(r.txn)) >= 0) { await safeDelete(ctx, r._id); n++; }
    }
    return { ok: true, n };
  },
});
