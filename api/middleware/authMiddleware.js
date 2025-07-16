// api/middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const db = require("../models");
const { User, Role } = db; // Lấy cả Model Role

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Cập nhật include để sử dụng alias "role"
      req.user = await User.findByPk(decoded.user_id, {
        attributes: { exclude: ["password"] },
        include: {
          model: Role,
          as: "role", // <--- ĐẶT LẠI LÀ 'role' ĐỂ KHỚP VỚI db/index.js
          attributes: ["role_name"],
        },
      });

      if (!req.user) {
        res.status(401);
        throw new Error("Không được ủy quyền, người dùng không tồn tại.");
      }

      // Có thể thêm log để kiểm tra req.user
      // console.log("User object after protect:", req.user.toJSON());
      // console.log("User role name:", req.user.role?.role_name); // Kiểm tra với 'role'

      next();
    } catch (err) {
      // Đổi error thành err
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
    // Đảm bảo req.user và req.user.role tồn tại
    if (!req.user || !req.user.role || !req.user.role.role_name) {
      // <--- TRUY CẬP VỚI 'role'
      return res.status(403).json({
        message:
          "Bạn không có quyền truy cập tài nguyên này. (Thiếu thông tin vai trò)",
      });
    }

    // Kiểm tra xem role_name của người dùng có nằm trong danh sách các vai trò được phép không
    if (!roles.includes(req.user.role.role_name)) {
      // <--- TRUY CẬP VỚI 'role'
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
