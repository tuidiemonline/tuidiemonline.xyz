const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* BAN 13 · CORS: web chay tren https://tuidiemonline.xyz (GitHub Pages)
   moi goi duoc /api/* tu trinh duyet. Khong co doan nay se bi chan boi CORS. */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const otpStore = new Map();
const OTP_TTL = 5 * 60 * 1000;

// KHONG hardcode: Render / local deu cap qua bien moi truong
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// UptimeRobot ping vao day de giu service khong ngu
app.get('/health', (req, res) =>
  res.json({ status: 'ok', otp_pending: otpStore.size }));

function makeOtp(email) {
  const otp = crypto.randomInt(100000, 999999).toString();
  otpStore.set(email, { code: otp, expires: Date.now() + OTP_TTL });
  return otp;
}

async function sendOtpMail(email, otp) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    throw new Error('Chua dat GMAIL_USER / GMAIL_PASS');
  }
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Ma xac thuc Tui Diem Online',
    text: `Ma xac thuc cua ban la: ${otp}\nMa co hieu luc 5 phut.`
  });
}

/* ---- JSON API cho index.html (tdOtpRequest / tdOtpVerify) ---- */
app.post('/api/request-otp', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.json({ ok: false, msg: 'Thieu hoac sai email' });
  const otp = makeOtp(email);
  try {
    await sendOtpMail(email, otp);
    res.json({ ok: true, msg: 'Da gui OTP' });
  } catch (err) {
    otpStore.delete(email);
    res.json({ ok: false, msg: 'Loi gui mail: ' + err.message });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();
  const data = otpStore.get(email);
  if (!data) return res.json({ ok: false, msg: 'Ma OTP khong ton tai hoac da dung' });
  if (Date.now() > data.expires) {
    otpStore.delete(email);
    return res.json({ ok: false, msg: 'Ma OTP da het han' });
  }
  if (data.code !== otp) return res.json({ ok: false, msg: 'Ma OTP khong dung' });
  otpStore.delete(email);
  /* Form /verify (test thu cong) van nhan HTML, con web nhan JSON */
  if (String(req.headers.accept || '').includes('text/html'))
    return res.send('Xac thuc thanh cong!');
  res.json({ ok: true, msg: 'Xac thuc thanh cong' });
});

/* ---- Giao dien test thu cong, giu nguyen nhu ban cu ---- */
app.get('/', (req, res) => {
  res.send(`
    <h2>Nhap Email de nhan OTP</h2>
    <form action="/request-otp" method="POST">
      <input type="email" name="email" placeholder="Nhap email" required>
      <button type="submit">Gui OTP</button>
    </form>
  `);
});

app.post('/request-otp', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).send('Thieu email');
  const otp = makeOtp(email);
  try {
    await sendOtpMail(email, otp);
    res.send(`
      <h2>Da gui OTP thanh cong!</h2>
      <p>Vui long kiem tra email (ke ca thu rac).</p>
      <a href="/verify?email=${encodeURIComponent(email)}">Nhap ma OTP</a>
    `);
  } catch (err) {
    otpStore.delete(email);
    res.status(500).send('Loi gui mail: ' + err.message);
  }
});

app.get('/verify', (req, res) => {
  const email = req.query.email || '';
  res.send(`
    <h2>Nhap ma OTP</h2>
    <form action="/api/verify-otp" method="POST">
      <input type="hidden" name="email" value="${email}">
      <input type="text" name="otp" placeholder="Nhap ma 6 so" required>
      <button type="submit">Xac thuc</button>
    </form>
  `);
});

// Render tu cap PORT, local fallback 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server chay tai port ${PORT}`));

/* LUU Y: otpStore nam trong RAM. Render free restart se mat ma dang cho.
   Neu can ben vung, thay Map bang Convex / Redis. */
