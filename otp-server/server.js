import express from 'express';
import nodemailer from 'nodemailer';
import 'dotenv/config';
import crypto from 'node:crypto';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Bộ nhớ tạm để lưu OTP (trong thực tế nên dùng Redis hoặc Database)
const otpStore = new Map();

// Cấu hình Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

// Trang chủ (Giao diện nhập Email)
app.get('/', (req, res) => {
    res.send(`
        <h2>Nhập Email để nhận OTP</h2>
        <form action="/request-otp" method="POST">
            <input type="email" name="email" placeholder="Nhập email của bạn" required>
            <button type="submit">Gửi OTP</button>
        </form>
    `);
});

// API Gửi OTP
app.post('/request-otp', async (req, res) => {
    const email = req.body.email;
    if (!email) return res.status(400).send('Vui lòng nhập email');

    // Tạo mã OTP 6 số an toàn
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Lưu OTP vào bộ nhớ (có hiệu lực 5 phút)
    otpStore.set(email, { code: otp, expires: Date.now() + 5 * 60 * 1000 });

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Mã xác thực Tuidiemonline',
        text: `Mã xác thực của bạn là: ${otp}. Mã có hiệu lực 5 phút.`
    };

    try {
        await transporter.sendMail(mailOptions);
        // Hiển thị form nhập OTP
        res.send(`
            <h2>Đã gửi OTP tới ${email}</h2>
            <p>Vui lòng check Gmail (kể cả thư rác).</p>
            <form action="/verify-otp" method="POST">
                <input type="hidden" name="email" value="${email}">
                <input type="text" name="otp" placeholder="Nhập mã 6 số" required>
                <button type="submit">Xác thực</button>
            </form>
        `);
    } catch (error) {
        res.status(500).send('Lỗi gửi mail: ' + error.message);
    }
});

// API Xác thực OTP
app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const data = otpStore.get(email);

    if (!data) return res.send('Mã OTP không tồn tại hoặc đã hết hạn. <a href="/">Thử lại</a>');
    
    if (Date.now() > data.expires) {
        otpStore.delete(email);
        return res.send('Mã OTP đã hết hạn. <a href="/">Gửi lại</a>');
    }

    if (data.code !== otp) return res.send('Mã OTP không đúng. Vui lòng thử lại.');

    // Xác thực thành công
    otpStore.delete(email);
    res.send('<h2 style="color:green;">Xác thực thành công!</h2><p>Chào mừng bạn.</p>');
});

// Giữ lại API curl cũ để test
app.post('/api/request-otp', async (req, res) => {
    const { email } = req.body;
    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore.set(email, { code: otp, expires: Date.now() + 5 * 60 * 1000 });
    
    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Mã xác thực Tuidiemonline',
        text: `Mã xác thực của bạn là: ${otp}`
    });
    res.json({ message: 'Đã gửi OTP thành công!' });
});

app.listen(3000, () => console.log('Server chạy tại http://localhost:3000'));

