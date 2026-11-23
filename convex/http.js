/* ==================================================================
   convex/http.js · BAN 43c · POSTBACK CLIXWALL
   ------------------------------------------------------------------
   Endpoint: https://<deployment>.convex.site/clixwallPostback
   ClixWall gọi S2S, có thể là GET (khi URL có sẵn query) HOẶC
   form-encoded POST (mặc định). Handler nhận CẢ HAI.

   KHÔNG đưa Secret vào index.html. Secret lấy từ process.env:
     npx convex env set CLIXWALL_SECRET '<secret trong dashboard>'
     npx convex env set CLIXWALL_COIN_RATE 1000

   Tham số đọc được (macro ClixWall + tên mặc định):
     user_id | u                     -> UID mình truyền lúc nhúng iframe
     txn | transaction_id            -> mã duy nhất, dùng chống cộng trùng
     reward | user_payout | c        -> user credit (USD nếu chưa set currency)
     status | s                     -> Completed / Reversed ...
     secret | pwd                   -> đối chiếu CLIXWALL_SECRET
     offer_name | cname, offer_id | cid
   ================================================================== */
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

function env(name, fallback) {
  try {
    if (typeof process !== "undefined" && process.env && process.env[name] !== undefined)
      return String(process.env[name]);
  } catch (e) {}
  return fallback;
}

async function postback(ctx, req) {
  let q;
  try {
    q = new Map();
    new URL(req.url).searchParams.forEach((v, k) => { if (!q.has(k)) q.set(k, v); });
    if (req.method === "POST") {
      const body = await req.text();
      new URLSearchParams(body).forEach((v, k) => { if (!q.has(k)) q.set(k, v); });
    }
  } catch (e) {
    return new Response("BAD_REQUEST", { status: 400 });
  }
  const get = function () {
    for (let i = 0; i < arguments.length; i++) {
      const v = q.get(arguments[i]);
      if (v !== undefined && v !== null && String(v) !== "") return String(v);
    }
    return "";
  };

  /* 1. Bảo mật: sai secret -> KHÔNG cộng, không retry vô tận */
  const expected = env("CLIXWALL_SECRET", "");
  if (!expected) {
    return new Response("CLIXWALL_SECRET chua duoc dat tren Convex", { status: 500 });
  }
  if (get("secret", "pwd", "sig", "signature") !== expected) {
    return new Response("INVALID_SECRET", { status: 401 });
  }

  const uid      = get("user_id", "u", "uid", "userid").trim();
  const txn      = get("txn", "transaction_id", "trans_id", "tid").trim();
  const reward   = get("reward", "user_payout", "c", "amount", "payout_user");
  const status   = get("status", "s", "st").trim();
  const offer    = get("offer_name", "cname", "offer", "name").trim();
  const offerId  = get("offer_id", "cid", "id").trim();

  if (!uid || !txn) return new Response("MISSING_UID_OR_TXN", { status: 400 });

  const st = status.toLowerCase();
  const isReversal = /^(reversed|reverse|reversal|refund|refunded|chargeback|charge_back|cancelled|canceled|cancel|deduct|2)$/.test(st);
  const isCredit   = /^(completed|complete|credited|credit|approved|approve|success|successful|paid|ok|1|)$/.test(st);
  if (!isCredit && !isReversal) {
    return new Response("IGNORED_STATUS:" + status, { status: 200 });
  }

  const raw = Number(String(reward).replace(",", "."));
  if (!Number.isFinite(raw) || raw === 0) {
    return new Response("IGNORED_ZERO_REWARD", { status: 200 });
  }
  /* user_payout mặc định là USD. 1000 coin / 1 USD là mặc định an toàn.
     Đặt CLIXWALL_COIN_RATE=1 nếu dashboard ClixWall đã set currency value. */
  let rate = Number(env("CLIXWALL_COIN_RATE", "1000"));
  if (!Number.isFinite(rate) || rate <= 0) rate = 1000;
  let coins = Math.round(Math.abs(raw) * rate);
  if (coins < 1) coins = 1;
  const delta = isReversal ? -coins : coins;

  /* 2. Ghi ví + inbox trong 1 mutation (atomic, có dedupe) */
  const res = await ctx.runMutation(internal.clixwall.apply, {
    uid, txn, coins: delta, status, offer, offerId,
    kind: isReversal ? "reversal" : "credit",
  });

  /* BAN 43c: trả chuỗi có UID + txn + số coin để curl / ClixWall test đọc được
     ngay, không còn một chữ "OK" / "DUPLICATE" trống trơn gây tưởng là không có gì.
     DUPLICATE vẫn là 200 (ClixWall sẽ không retry), nhưng KHÔNG cộng lần 2. */
  const body = (res && res.duplicate)
    ? "DUPLICATE txn=" + txn + " uid=" + uid + " (da cong truoc do, bo qua)"
    : "OK uid=" + uid + " coins=" + (delta > 0 ? "+" : "") + delta + " txn=" + txn;
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/* BAN 43c · Đường dẫn chẩn đoán: gõ trên trình duyệt để biết deployment NÀY
   đã có http.js chưa và Secret đã được set chưa. KHÔNG lộ giá trị Secret,
   KHÔNG cộng coin. Dùng để phân biệt dev / prod khi lỡ chạy `npx convex dev`. */
http.route({
  path: "/clixwallPing",
  method: "GET",
  handler: httpAction(async () => {
    const has = !!env("CLIXWALL_SECRET", "");
    return new Response(
      "CLIXWALL_OK http_actions=on secret=" + (has ? "set" : "MISSING") +
      " rate=" + env("CLIXWALL_COIN_RATE", "1000"),
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }),
});

http.route({ path: "/clixwallPostback", method: "GET",  handler: httpAction(postback) });
http.route({ path: "/clixwallPostback", method: "POST", handler: httpAction(postback) });

export default http;
