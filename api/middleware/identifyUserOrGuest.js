// middleware/identifyUserOrGuest.js
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const identifyUserOrGuest = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = { id: decoded.user_id, role_id: decoded.role_id };
      req.isGuest = false;
      return next();
    } catch (err) {
      console.error(
        "Lỗi xác thực token trong identifyUserOrGuest:",
        err.message
      );
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Token đã hết hạn. Vui lòng đăng nhập lại." });
      } else if (err.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({ message: "Token không hợp lệ. Vui lòng đăng nhập lại." });
      } else {
        return res.status(401).json({ message: "Xác thực token thất bại." });
      }
    }
  }

  let sessionId = req.headers["x-session-id"];
  if (!sessionId) {
    sessionId = require("uuid").v4();
    res.setHeader("X-New-Session-ID", sessionId);
  }
  req.sessionId = sessionId;
  req.isGuest = true;

  next();
});

module.exports = {
  identifyUserOrGuest,
};
