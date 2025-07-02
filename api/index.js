require("dotenv").config();

const express = require("express");
const app = express();

const helloRouter = require("./routes/hello");
const authRouter = require("./routes/auth");

const cors = require("cors");

app.use(express.json());

app.use(cors());

app.use("/", helloRouter);

app.use("/auth", authRouter);

// Thêm một route test để kiểm tra token sau này (optional)
const jwt = require("jsonwebtoken"); // Cần import jwt ở đây nếu chưa có
const JWT_SECRET = process.env.JWT_SECRET; // Lấy secret từ env

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Lấy token từ 'Bearer TOKEN'

  if (!token)
    return res
      .status(401)
      .json({ message: "Access Denied: No Token Provided!" });

  try {
    const verifiedUser = jwt.verify(token, JWT_SECRET);
    req.user = verifiedUser; // Gắn thông tin người dùng đã xác thực vào req
    next();
  } catch (err) {
    res.status(403).json({ message: "Access Denied: Invalid Token!" });
  }
};

app.get("/api/protected-route", authenticateToken, (req, res) => {
  res.json({
    message: `Chào mừng, ${req.user.username}! Bạn đã truy cập thành công dữ liệu bảo mật.`,
    your_role: req.user.role_name,
    your_id: req.user.user_id,
  });
});

module.exports = app;
