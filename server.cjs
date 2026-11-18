const express = require('express');
const crypto = require('crypto');
const app = express();

// CORS: cho tuidiemonline.xyz gọi trực tiếp, không cần thêm thư viện
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⚠️ Key chỉ nằm trên Render (Environment). TUYỆT ĐỐI không dán vào file này.
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SENDER = process.env.SENDER_EMAIL || 'support.tuidiemonline@gmail.com';
const otpStore = new Map();

function saveOtp(email, otp) {
  otpStore.set(email, { code: otp, expires: Date.now() + 5 * 60 * 1000 });
}
function newOtp(email) {
  const otp = crypto.randomInt(100000, 999999).toString();
  saveOtp(email, otp);
  return otp;
}

// Gửi qua HTTPS API của Brevo (cổng 443) -> không bị Render chặn SMTP
async function sendMailBrevo(email, otp) {
  if (!BREVO_API_KEY) throw new Error('Thiếu BREVO_API_KEY trên Render');
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Tui Diem Online', email: SENDER },
      to: [{ email }],
      subject: 'Mã xác thực Tuidiemonline',
      textContent: `Mã xác thực của bạn là: ${otp}\nMã có hiệu lực 5 phút.`,
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:420px"><h2>Mã xác thực</h2><p style="font-size:30px;font-weight:bold;letter-spacing:5px;background:#f3f3f3;padding:12px 20px;border-radius:8px;text-align:center">${otp}</p><p>Mã có hiệu lực 5 phút. Không chia sẻ với ai.</p></div>`
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || ('Brevo HTTP ' + r.status));
  return data;
}

app.get('/health', (req, res) =>
  res.json({ status: 'ok', brevo: BREVO_API_KEY ? 'ready' : 'missing key' })
);

app.get('/', (req, res) => {
  res.send(`
<h2>Nhập Email để nhận OTP</h2>
<form action="/request-otp" method="POST">
<input type="email" name="email" placeholder="Nhập email" required>
<button type="submit">Gửi OTP</button>
</form>
`);
});

// Giữ nguyên route cũ (form test trên Render)
app.post('/request-otp', async (req, res) => {
  const email = req.body.email;
  if (!email) return res.status(400).send('Thiếu email');
  const otp = newOtp(email);
  try {
    await sendMailBrevo(email, otp);
    res.send(`
<h2>Đã gửi OTP thành công!</h2>
<p>Vui lòng kiểm tra email (kể cả thư rác).</p>
<a href="/verify?email=${encodeURIComponent(email)}">Nhập mã OTP</a>
`);
  } catch (err) {
    res.status(500).send('Lỗi gửi mail: ' + err.message);
  }
});

// Route JSON cho web chính (nếu frontend gọi /send-otp)
app.post('/send-otp', async (req, res) => {
  const email = req.body.email;
  if (!email) return res.status(400).json({ ok: false, msg: 'Thiếu email' });
  const otp = req.body.otp ? String(req.body.otp) : newOtp(email);
  saveOtp(email, otp);
  try {
    await sendMailBrevo(email, otp);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

app.get('/verify', (req, res) => {
  const email = req.query.email || '';
  res.send(`
<h2>Nhập mã OTP</h2>
<form action="/api/verify-otp" method="POST">
<input type="hidden" name="email" value="${email}">
<input type="text" name="otp" placeholder="Nhập mã 6 số" required>
<button type="submit">Xác thực</button>
</form>
`);
});

// Giữ nguyên chữ, KHÔNG có icon tích xanh
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const data = otpStore.get(email);
  if (!data) return res.send('Mã OTP không tồn tại hoặc đã hết hạn.');
  if (Date.now() > data.expires) {
    otpStore.delete(email);
    return res.send('Mã OTP đã hết hạn.');
  }
  if (data.code !== otp) return res.send('Mã OTP không đúng.');
  otpStore.delete(email);
  res.send('Xác thực thành công');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server chạy tại port ${PORT}`));
