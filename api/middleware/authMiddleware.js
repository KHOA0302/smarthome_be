const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const db = require("../models");
const { User, Role } = db;

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findByPk(decoded.user_id, {
        attributes: { exclude: ["password"] },
        include: {
          model: Role,
          as: "role",
          attributes: ["role_name"],
        },
      });

      if (!req.user) {
        res.status(401);
        throw new Error("Không được ủy quyền, người dùng không tồn tại.");
      }

      next();
    } catch (err) {
      console.error("Lỗi xác thực token:", err.message);
      if (err.name === "TokenExpiredError") {
        res
          .status(401)
          .json({ message: "Token đã hết hạn. Vui lòng đăng nhập lại." });
      } else if (err.name === "JsonWebTokenError") {
        res
          .status(401)
          .json({ message: "Token không hợp lệ. Vui lòng đăng nhập lại." });
      } else {
        res.status(401).json({ message: "Không được ủy quyền, token lỗi." });
      }
    }
  }

  if (!token) {
    res.status(401).json({ message: "Không được ủy quyền, không có token." });
  }
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role || !req.user.role.role_name) {
      return res.status(403).json({
        message:
          "Bạn không có quyền truy cập tài nguyên này. (Thiếu thông tin vai trò)",
      });
    }

    if (!roles.includes(req.user.role.role_name)) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền truy cập tài nguyên này." });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize,
};
