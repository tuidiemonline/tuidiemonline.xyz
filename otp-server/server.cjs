/* ==================================================================
TÚI ĐIỂM ONLINE · OTP SERVER · BẢN 42c  (nhánh main)
------------------------------------------------------------------
Gửi mail bằng BREVO HTTPS API (cổng 443). Render chặn 25/465/587.

DANH SÁCH ROUTE (khớp 100% với index.html + otp-config.js):
  GET  /                     trang test thủ công
  GET  /health                UptimeRobot ping giữ service thức
  GET  /verify                form nhập mã thủ công
  POST /api/request-otp       { email } -> { ok, ticket }   (index.html)
  POST /api/verify-otp        { email, otp, ticket } -> { ok, resetToken }
  POST /api/reset-password    { email, resetToken | otp+ticket, newPassword }
  POST /request-otp           form HTML cũ
  POST /verify                alias
  POST /send-otp              alias tương thích bản 26

BẢN 42c · 3 LỖI ĐÃ VÁ (so với 42b):
  1) Server Render còn bản cũ trả 404 JSON {ok:false,msg:"Not found"} ->
     frontend tưởng đó là lỗi thật và hiện chữ "Not found" đỏ. Giờ 404
     trả lời rõ ràng VÀ frontend nhận diện riêng 404 / "not found".
  2) otpStore + resetTokens nằm trong RAM -> Render Free ngủ/restart là MẤT
     sạch, dù user đã có tích xanh vẫn bị chặn. Giờ dùng VÉ KÝ HMAC KHÔNG
     TRẠNG THÁI: ticket (OTP) và resetToken tự chứa email + hạn + chữ ký,
     sống sót qua restart miễn RESET_SECRET không đổi. RAM chỉ còn để chống
     dùng lại (best-effort) và phục vụ form /verify cũ.
  3) FIREBASE_PROJECT_ID dễ điền sai project -> getUserByEmail báo
     "user-not-found". Giờ mặc định đúng projectId đang dùng trong
     index.html (tui-diem-online-455e2); 2 biến kia vẫn bắt buộc.

BIẾN MÔI TRƯỜNG (Render → Environment):
  BREVO_API_KEY          BẮT BUỘC (gửi mail). Cũng làm RESET_SECRET dự phòng.
  SENDER_EMAIL           mặc định support.tuidiemonline@gmail.com
  SENDER_NAME            mặc định Tui Diem Online
  FIREBASE_PROJECT_ID    mặc định tui-diem-online-455e2 (khớp web)
  FIREBASE_CLIENT_EMAIL  BẮT BUỘC · Service Account JSON
  FIREBASE_PRIVATE_KEY   BẮT BUỘC · giữ nguyên \n
  RESET_SECRET           (tuỳ chọn) khoá ký vé; không đặt则用 BREVO_API_KEY
================================================================== */
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* CORS: web chạy trên https://tuidiemonline.xyz (GitHub Pages) */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const BREVO_API_KEY     = process.env.BREVO_API_KEY || '';
const SENDER_EMAIL      = process.env.SENDER_EMAIL || 'support.tuidiemonline@gmail.com';
const SENDER_NAME       = process.env.SENDER_NAME  || 'Tui Diem Online';
/* Khớp firebaseConfig.projectId trong index.html — tránh lệch project */
const FIREBASE_PROJECT  = process.env.FIREBASE_PROJECT_ID || 'tui-diem-online-455e2';
const RESET_SECRET      = process.env.RESET_SECRET || BREVO_API_KEY || 'td-reset-dev-secret';

const OTP_TTL       = 5 * 60 * 1000;    // 5 phút
const OTP_MAX_TRIES = 5;
const RESET_TTL     = 10 * 60 * 1000;   // 10 phút
const RESEND_LOCK   = 60 * 1000;        // 60s: không phát hành mã thứ 2 (đúng countdown web)

const otpStore    = new Map();   // email -> { code, expires, tries, verified }  (RAM, best-effort)
const usedTokens  = new Map();   // resetToken -> true                            (RAM, best-effort)
const usedTickets = new Map();   // ticket OTP -> true (chống bấm Đổi mk 2 lần)  (RAM, best-effort)

/* ---------- VÉ KÝ HMAC · KHÔNG PHỤ THUỘC RAM ---------- */
function mac(parts) {
  return crypto.createHmac('sha256', RESET_SECRET).update(parts.join('|')).digest('hex');
}
function pack(obj) { return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url'); }
function unpack(s) { return JSON.parse(Buffer.from(String(s), 'base64url').toString('utf8')); }

/* Vé OTP: không chứa mã (chỉ chữ ký ràng buộc email+mã+hạn), nên lộ vé cũng
   không lộ OTP. Mã do người dùng nhập được đưa vào lúc kiểm tra chữ ký. */
function signOtpTicket(email, code, expires) {
  const nonce = crypto.randomBytes(8).toString('hex');
  const body = { v: 1, e: email, x: expires, n: nonce };
  const sig = mac(['otp', email, String(code), expires, nonce]);
  return pack(body) + '.' + sig;
}
function checkOtpTicket(ticket, email, otp) {
  if (!ticket || typeof ticket !== 'string') return 'Thieu ve OTP (bam "Gui ma" lai nhe)';
  const p = ticket.split('.');
  if (p.length !== 2) return 'Ve OTP khong hop le. Bam "Gui ma" lai nhe';
  let b;
  try { b = unpack(p[0]); } catch (e) { return 'Ve OTP khong hop le. Bam "Gui ma" lai nhe'; }
  const want = mac(['otp', b.e, String(otp), b.x, b.n]);
  if (want !== p[1] || b.v !== 1 || b.e !== email)
    return 'Ma OTP khong dung hoac ve khong hop le. Bam "Gui ma" lai nhe';
  if (Date.now() > Number(b.x)) return 'Ma OTP da het han (5 phut). Bam "Gui ma" lai nhe';
  return '';
}

/* resetToken: tự chứa email + hạn + chữ ký. Sống qua restart Render. */
function signResetToken(email) {
  const expires = Date.now() + RESET_TTL;
  const nonce = crypto.randomBytes(12).toString('hex');
  const body = { v: 1, e: email, x: expires, n: nonce };
  const sig = mac(['reset', email, expires, nonce]);
  return pack(body) + '.' + sig;
}
function checkResetToken(token, email) {
  if (!token || typeof token !== 'string')
    return 'Chua xac thuc OTP. Bam "Gui ma" roi "Xac thuc" lai nhe';
  const p = token.split('.');
  if (p.length !== 2) return 'Phien xac thuc khong hop le. Lam lai tu dau nhe';
  let b;
  try { b = unpack(p[0]); } catch (e) { return 'Phien xac thuc khong hop le. Lam lai tu dau nhe'; }
  const want = mac(['reset', b.e, b.x, b.n]);
  if (want !== p[1] || b.v !== 1 || b.e !== email)
    return 'Phien xac thuc khong hop le. Lam lai tu dau nhe';
  if (Date.now() > Number(b.x)) return 'Phien xac thuc het han (10 phut). Bam "Gui ma" lai nhe';
  if (usedTokens.get(token)) return 'Phien nay da doi mat khau xong roi. Bam "Gui ma" lai nhe';
  return '';
}

function adminMissing() {
  const miss = [];
  if (!process.env.FIREBASE_CLIENT_EMAIL) miss.push('FIREBASE_CLIENT_EMAIL');
  if (!process.env.FIREBASE_PRIVATE_KEY)  miss.push('FIREBASE_PRIVATE_KEY');
  return miss;
}
function adminReady() { return adminMissing().length === 0; }

async function adminSetPassword(email, password) {
  let admin;
  try { admin = require('firebase-admin'); }
  catch (e) { throw new Error('Thieu goi firebase-admin (Render chua npm install xong)'); }
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n');
  let app2 = admin.apps.find(a => a && a.name === 'tdReset');
  if (!app2) {
    app2 = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    }, 'tdReset');
  }
  const user = await admin.auth(app2).getUserByEmail(email);
  await admin.auth(app2).updateUser(user.uid, { password });
}

function emailOk(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function normEmail(v) { return String(v || '').trim().toLowerCase(); }
function strongPw(p) { return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/.test(p); }

function sweep() {
  for (const [k, v] of otpStore) if (Date.now() > v.expires) otpStore.delete(k);
}
/* 42c: 60s đầu giữ NGUYÊN mã -> frontend retry / bấm lại không phát hành
   mã thứ 2 (trước đây gây 2 email, user nhập mã cũ là bị "sai mã"). */
function makeOtp(email) {
  const old = otpStore.get(email);
  if (old && Date.now() < old.expires - (OTP_TTL - RESEND_LOCK) && !old.verified) {
    return { code: old.code, expires: old.expires, reused: true };
  }
  const code = crypto.randomInt(100000, 1000000).toString();
  const expires = Date.now() + OTP_TTL;
  otpStore.set(email, { code, expires, tries: 0 });
  return { code, expires, reused: false };
}

async function sendOtpMail(email, code) {
  if (!BREVO_API_KEY) throw new Error('Chua dat BREVO_API_KEY tren Render');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email }],
        subject: 'Mã OTP xác thực - Túi Điểm Online',
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto">
            <h2 style="color:#0f766e">Mã xác thực của bạn</h2>
            <p>Xin chào, đây là mã OTP để tiếp tục trên Túi Điểm Online:</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:6px;
                        background:#f3f3f3;padding:12px 20px;border-radius:8px;
                        text-align:center;margin:16px 0">${code}</div>
            <p>Mã có hiệu lực trong <b>5 phút</b>. Không chia sẻ mã này với ai.</p>
            <hr style="border:none;border-top:1px solid #eee"/>
            <small>Túi Điểm Online · ${SENDER_EMAIL}</small>
          </div>`
      }),
      signal: ctl.signal
    });
    const txt = await r.text();
    let d = {};
    try { d = txt ? JSON.parse(txt) : {}; } catch (e) {}
    if (!r.ok) throw new Error((d && (d.message || d.code)) || ('Brevo HTTP ' + r.status));
  } finally {
    clearTimeout(timer);
  }
}

/* Ưu tiên vé HMAC (sống qua restart), RAM chỉ là đường dự phòng cho form cũ */
function verifyCode(email, otp, ticket, keepVerified) {
  const ticketBad = ticket ? checkOtpTicket(ticket, email, otp) : 'no-ticket';
  sweep();
  const data = otpStore.get(email);
  const ramOk = data && Date.now() <= data.expires && String(data.code) === String(otp);
  if (ticketBad && ticketBad !== 'no-ticket') {
    if (!ramOk) return { ok: false, msg: ticketBad };
  }
  if (ticketBad === 'no-ticket' && !ramOk)
    return { ok: false, msg: data ? 'Ma OTP khong dung' : 'Chua co ma OTP, bam "Gui ma" truoc nhe' };
  if (data && keepVerified) {
    data.verified = true;
    data.expires = Math.max(data.expires, Date.now() + RESET_TTL);
    return { ok: true, msg: 'Xac thuc thanh cong' };
  }
  if (data) otpStore.delete(email);   // đúng 1 lần rồi xoá (chống dùng lại)
  return { ok: true, msg: 'Xac thuc thanh cong' };
}

/* ---------------- HEALTH ---------------- */
app.get('/health', (req, res) =>
  res.json({
    status: 'ok',
    version: 'BAN 42c',
    reset: 'stateless-otp-ticket',
    brevo: BREVO_API_KEY ? 'ready' : 'missing key',
    project: FIREBASE_PROJECT,
    admin: adminReady() ? 'ready' : ('missing ' + adminMissing().join(', ')),
    otpInRam: otpStore.size
  }));

/* ---------------- JSON API CHO index.html ---------------- */
app.post('/api/request-otp', async (req, res) => {
  const email = normEmail(req.body && req.body.email);
  if (!emailOk(email)) return res.json({ ok: false, msg: 'Thieu hoac sai email' });
  sweep();
  const made = makeOtp(email);
  const ticket = signOtpTicket(email, made.code, made.expires);
  try {
    if (!made.reused) await sendOtpMail(email, made.code);
    res.json({ ok: true, ticket,
               msg: made.reused ? 'Ma OTP van con hien luc, kiem tra Gmail nhe' : 'Da gui ma OTP 6 so qua Brevo' });
  } catch (err) {
    otpStore.delete(email);
    res.json({ ok: false, msg: 'Loi gui mail: ' + (err && err.message ? err.message : err) });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const email = normEmail(req.body && req.body.email);
  const otp = String((req.body && (req.body.otp || req.body.code)) || '').trim();
  const ticket = String((req.body && req.body.ticket) || '');
  const out = verifyCode(email, otp, ticket, true);
  if (String(req.headers.accept || '').includes('text/html'))
    return res.send(out.ok ? 'Xac thuc thanh cong' : out.msg);
  if (out.ok) {
    out.resetToken = signResetToken(email);
    if (ticket) out.ticket = ticket;      // giữ vé để bước đổi mk dùng lại
  }
  res.json(out);
});

/* BAN 42c · ĐẶT LẠI MẬT KHẨU SAU OTP (không link, không oobCode) */
app.post('/api/reset-password', async (req, res) => {
  const email    = normEmail(req.body && req.body.email);
  const token    = String((req.body && req.body.resetToken) || '');
  const otp      = String((req.body && req.body.otp) || '').trim();
  const ticket   = String((req.body && req.body.ticket) || '');
  const password = String((req.body && req.body.newPassword) || '');
  if (!emailOk(email)) return res.json({ ok: false, msg: 'Email khong hop le' });
  if (!strongPw(password))
    return res.json({ ok: false, msg: 'Mat khau can >=8 ky tu: chu HOA, thuong, so, ky tu dac biet' });
  /* 42c: chặn dùng lại TRƯỚC khi xét vé dự phòng. Nếu không, vé OTP còn hạn
     5 phút sẽ cho bấm "Đổi mật khẩu" lần 2 dù resetToken đã tiêu. */
  if (token && usedTokens.get(token))
    return res.json({ ok: false, msg: 'Phien nay da doi mat khau xong roi. Bam "Gui ma" lai nhe' });
  if (ticket && usedTickets.get(ticket))
    return res.json({ ok: false, msg: 'Ma OTP nay da duoc dung de doi mat khau. Bam "Gui ma" lai nhe' });

  let bad = checkResetToken(token, email);
  if (bad && (ticket || otp)) {
    const tBad = ticket ? checkOtpTicket(ticket, email, otp) : 'no-ticket';
    const rec = otpStore.get(email);
    const ramOk = rec && rec.verified && String(rec.code) === otp && Date.now() <= rec.expires;
    if (!tBad || (tBad === 'no-ticket' && ramOk)) bad = '';
    else bad = tBad === 'no-ticket'
      ? 'Phien OTP da het han (server Render co the vua khoi dong lai). Bam "Gui ma" lai nhe'
      : tBad;
  }
  if (bad) return res.json({ ok: false, msg: bad });
  if (!adminReady())
    return res.json({ ok: false, msg: 'Thieu ' + adminMissing().join(' / ') +
      ' tren Render (Firebase Console -> Service accounts -> Generate new private key)' });
  try {
    await adminSetPassword(email, password);
    if (token) usedTokens.set(token, true);
    if (ticket) usedTickets.set(ticket, true);
    otpStore.delete(email);
    res.json({ ok: true, msg: 'Da doi mat khau' });
  } catch (err) {
    const m = String(err && err.message ? err.message : err);
    let hint = m;
    if (/user-not-found|USER_NOT_FOUND|no user/i.test(m))
      hint = 'Khong tim thay tai khoan Firebase voi email nay (kiem tra FIREBASE_PROJECT_ID = ' + FIREBASE_PROJECT + ')';
    else if (/permission|403|credential|invalid_grant|JWT|decode/i.test(m))
      hint = 'Service Account sai hoac thieu quyen: ' + m;
    res.json({ ok: false, msg: 'Khong doi duoc mat khau: ' + hint });
  }
});

/* ---------------- ALIAS TƯƠNG THÍCH CÁC BẢN TRƯỚC ---------------- */
app.post('/request-otp', async (req, res) => {
  const email = normEmail(req.body && req.body.email);
  if (!emailOk(email)) return res.status(400).send('Thieu hoac sai email');
  const made = makeOtp(email);
  try {
    if (!made.reused) await sendOtpMail(email, made.code);
    res.send(`
      <h2>Da gui OTP thanh cong!</h2>
      <p>Kiem tra Gmail (ca muc Thu rac / Spam).</p>
      <a href="/verify?email=${encodeURIComponent(email)}">Nhap ma OTP</a>`);
  } catch (err) {
    otpStore.delete(email);
    res.status(500).send('Loi gui mail: ' + (err && err.message ? err.message : err));
  }
});

app.post('/verify', (req, res) => {
  const email = normEmail(req.body && req.body.email);
  const otp = String((req.body && (req.body.otp || req.body.code)) || '').trim();
  const ticket = String((req.body && req.body.ticket) || '');
  res.json(verifyCode(email, otp, ticket, false));
});

/* Bản 26 gửi kèm sẵn otp -> lưu lại rồi gửi, vẫn khớp /api/verify-otp */
app.post('/send-otp', async (req, res) => {
  const email = normEmail(req.body && req.body.email);
  const code = String((req.body && (req.body.otp || req.body.code)) || '').trim();
  if (!emailOk(email)) return res.status(400).json({ ok: false, msg: 'Thieu hoac sai email' });
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ ok: false, msg: 'Ma OTP phai 6 so' });
  const expires = Date.now() + OTP_TTL;
  otpStore.set(email, { code, expires, tries: 0 });
  try {
    await sendOtpMail(email, code);
    res.json({ ok: true, ticket: signOtpTicket(email, code, expires) });
  } catch (err) {
    otpStore.delete(email);
    res.status(500).json({ ok: false, msg: 'Loi gui mail: ' + (err && err.message ? err.message : err) });
  }
});

/* ---------------- GIAO DIỆN TEST THỦ CÔNG ---------------- */
app.get('/', (req, res) => {
  res.send(`<!doctype html><html lang="vi"><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>OTP Server · Túi Điểm Online · BẢN 42c</title>
    <body style="font-family:Arial;padding:24px;background:#121212;color:#eee">
    <h2>Nhập Email để nhận OTP</h2>
    <form action="/request-otp" method="POST">
      <input type="email" name="email" placeholder="Nhập email" required
             style="padding:10px;border-radius:8px;border:1px solid #555">
      <button style="padding:10px 16px;border-radius:8px">Gửi OTP</button>
    </form>
    <p><a style="color:#5eead4" href="/health">/health</a></p>
    </body></html>`);
});

app.get('/verify', (req, res) => {
  const email = normEmail(req.query.email);
  res.send(`<!doctype html><html lang="vi"><meta charset="utf-8">
    <body style="font-family:Arial;padding:24px;background:#121212;color:#eee">
    <h2>Nhập mã OTP</h2>
    <form action="/api/verify-otp" method="POST">
      <input type="hidden" name="email" value="${email}">
      <input name="otp" placeholder="Nhập mã 6 số" required maxlength="6"
             style="padding:10px;border-radius:8px;border:1px solid #555">
      <button style="padding:10px 16px;border-radius:8px">Xác thực</button>
    </form></body></html>`);
});

/* 42c: 404 nói rõ nguyên nhân thay vì chữ "Not found" mơ hồ.
   (Server bản cũ vẫn trả "Not found" -> frontend đã nhận diện riêng.) */
app.use((req, res) => res.status(404).json({
  ok: false,
  msg: 'Route ' + req.path + ' khong ton tai. Server OTP chua len BAN 42c -> vao Render bam Manual Deploy (branch main)',
  version: 'BAN 42c'
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('OTP server BAN 42c on ' + PORT));
