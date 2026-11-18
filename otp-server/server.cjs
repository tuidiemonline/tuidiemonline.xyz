/* ==================================================================
TÚI ĐIỂM ONLINE · OTP SERVER · BẢN 29
------------------------------------------------------------------
Gửi mail bằng BREVO HTTPS API (cổng 443) thay vì Gmail SMTP.
Render / Railway / Vercel chặn cổng 25/465/587 -> Nodemailer bị
"Connection timeout". Brevo gọi qua HTTPS nên không bị chặn.

GIỮ NGUYÊN TOÀN BỘ ROUTE CỦA BẢN CŨ:
  GET  /                     trang test thủ công
  GET  /health                UptimeRobot ping giữ service thức
  GET  /verify                form nhập mã thủ công
  POST /api/request-otp       index.html gọi (JSON { email })
  POST /api/verify-otp        index.html gọi (JSON { email, otp })
  POST /request-otp           form HTML cũ
  POST /verify                alias
  POST /send-otp              alias tương thích bản 26 ({ email, otp })

BIẾN MÔI TRƯỜNG (Render → Environment):
  BREVO_API_KEY   = <key lấy trên Brevo>   (BẮT BUỘC, không hardcode vào code)
  SENDER_EMAIL    = support.tuidiemonline@gmail.com  (đã verify trên Brevo)
  SENDER_NAME     = Tui Diem Online

⚠️ otpStore nằm trong RAM. Render Free restart / ngủ đông sẽ MẤT mã
   đang chờ. Nhớ ping /health mỗi 5-10 phút (UptimeRobot FREE, xem PING.md).
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

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SENDER_EMAIL  = process.env.SENDER_EMAIL || 'support.tuidiemonline@gmail.com';
const SENDER_NAME   = process.env.SENDER_NAME  || 'Tui Diem Online';

const otpStore = new Map();          // email -> { code, expires, tries }
const OTP_TTL = 5 * 60 * 1000;      // 5 phút
const OTP_MAX_TRIES = 5;

function emailOk(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function normEmail(v) { return String(v || '').trim().toLowerCase(); }

function sweep() {
  for (const [k, v] of otpStore) if (Date.now() > v.expires) otpStore.delete(k);
}
function makeOtp(email) {
  const code = crypto.randomInt(100000, 1000000).toString();
  otpStore.set(email, { code, expires: Date.now() + OTP_TTL, tries: 0 });
  return code;
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

function verifyCode(email, otp) {
  sweep();
  const data = otpStore.get(email);
  if (!data) return { ok: false, msg: 'Chua co ma OTP, bam "Gui ma" truoc nhe' };
  if (Date.now() > data.expires) {
    otpStore.delete(email);
    return { ok: false, msg: 'Ma OTP da het han (5 phut), bam Gui ma lai nhe' };
  }
  if (String(data.code) !== String(otp)) {
    data.tries = (data.tries || 0) + 1;
    if (data.tries >= OTP_MAX_TRIES) otpStore.delete(email);
    return { ok: false, msg: 'Ma OTP khong dung' };
  }
  otpStore.delete(email);          // đúng 1 lần rồi xoá, chống dùng lại
  return { ok: true, msg: 'Xac thuc thanh cong' };
}

/* ---------------- HEALTH (giữ đúng dạng đã test) ---------------- */
app.get('/health', (req, res) =>
  res.json({ status: 'ok', brevo: BREVO_API_KEY ? 'ready' : 'missing key' }));

/* ---------------- JSON API CHO index.html ---------------- */
app.post('/api/request-otp', async (req, res) => {
  const email = normEmail(req.body && req.body.email);
  if (!emailOk(email)) return res.json({ ok: false, msg: 'Thieu hoac sai email' });
  sweep();
  const code = makeOtp(email);
  try {
    await sendOtpMail(email, code);
    res.json({ ok: true, msg: 'Da gui ma OTP 6 so qua Brevo' });
  } catch (err) {
    otpStore.delete(email);
    res.json({ ok: false, msg: 'Loi gui mail: ' + (err && err.message ? err.message : err) });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const email = normEmail(req.body && req.body.email);
  const otp = String((req.body && (req.body.otp || req.body.code)) || '').trim();
  const out = verifyCode(email, otp);
  if (String(req.headers.accept || '').includes('text/html'))
    return res.send(out.ok ? 'Xac thuc thanh cong' : out.msg);
  res.json(out);
});

/* ---------------- ALIAS TƯƠNG THÍCH CÁC BẢN TRƯỚC ---------------- */
app.post('/request-otp', async (req, res) => {
  const email = normEmail(req.body && req.body.email);
  if (!emailOk(email)) return res.status(400).send('Thieu hoac sai email');
  const code = makeOtp(email);
  try {
    await sendOtpMail(email, code);
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
  res.json(verifyCode(email, otp));
});

/* Bản 26 gửi kèm sẵn otp -> lưu lại rồi gửi, vẫn khớp /api/verify-otp */
app.post('/send-otp', async (req, res) => {
  const email = normEmail(req.body && req.body.email);
  const code = String((req.body && (req.body.otp || req.body.code)) || '').trim();
  if (!emailOk(email)) return res.status(400).json({ ok: false, msg: 'Thieu hoac sai email' });
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ ok: false, msg: 'Ma OTP phai 6 so' });
  otpStore.set(email, { code, expires: Date.now() + OTP_TTL, tries: 0 });
  try {
    await sendOtpMail(email, code);
    res.json({ ok: true });
  } catch (err) {
    otpStore.delete(email);
    res.status(500).json({ ok: false, msg: 'Loi gui mail: ' + (err && err.message ? err.message : err) });
  }
});

/* ---------------- GIAO DIỆN TEST THỦ CÔNG ---------------- */
app.get('/', (req, res) => {
  res.send(`<!doctype html><html lang="vi"><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>OTP Server · Túi Điểm Online</title>
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

app.use((req, res) => res.status(404).json({ ok: false, msg: 'Not found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('OTP server (Brevo) on ' + PORT));
