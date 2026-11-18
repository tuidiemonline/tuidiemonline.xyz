const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const otpStore = new Map();

// KHÔNG hardcode nữa: Render / local đều cấp qua biến môi trường
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// UptimeRobot ping vào đây để giữ service không ngủ
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/', (req, res) => {
  res.send(`
    <h2>Nhập Email để nhận OTP</h2>
    <form action="/request-otp" method="POST">
      <input type="email" name="email" placeholder="Nhập email" required>
      <button type="submit">Gửi OTP</button>
    </form>
  `);
});

app.post('/request-otp', async (req, res) => {
  const email = req.body.email;
  if (!email) return res.status(400).send('Thiếu email');

  const otp = crypto.randomInt(100000, 999999).toString();
  otpStore.set(email, { code: otp, expires: Date.now() + 5 * 60 * 1000 });

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Mã xác thực Túi Điểm Online',
      text: `Mã xác thực của bạn là: ${otp}\nMã có hiệu lực 5 phút.`
    });
    res.send(`
      <h2>Đã gửi OTP thành công!</h2>
      <p>Vui lòng kiểm tra email (kể cả thư rác).</p>
      <a href="/verify?email=${encodeURIComponent(email)}">Nhập mã OTP</a>
    `);
  } catch (err) {
    res.status(500).send('Lỗi gửi mail: ' + err.message);
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
  res.send('Xác thực thành công!');
});

// Render tự cấp PORT, local fallback 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server chạy tại port ${PORT}`));
