const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const JWT_SECRET = process.env.JWT_SECRET;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const db = require("../models");
const User = db.User;

const handleLoginAttemp = async (req, res) => {
  const { password, username } = req.body;

  console.log({ username, password });

  try {
    const user = await User.findOne({
      where: { email: username },
      include: [
        {
          model: db.Role,
          as: "role",
          attributes: ["role_name"],
        },
      ],
    });

    if (!user) {
      return res.status(400).json({ message: "Tên đăng nhập không tồn tại." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu không đúng." });
    }

    const payload = {
      user_id: user.user_id,
      username: user.email,
      role_id: user.role_id,
      role_name: user.role ? user.role.role_name : null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    res.status(200).json({
      message: "Đăng nhập thành công!",
      token: token,
      user: {
        id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role ? user.role.role_name : null,
      },
    });
    console.log("Login success!!");
  } catch (err) {
    console.error("Lỗi đăng nhập:", error);
    res
      .status(500)
      .json({ message: "Lỗi máy chủ nội bộ.", error: error.message });
  }
};

const handleRegister = async (req, res) => {
  const { email, password, full_name } = req.body;
  try {
    // 1. Xác thực đầu vào cơ bản
    if (!email || !password || !full_name) {
      return res
        .status(400)
        .json({ message: "Vui lòng điền đầy đủ email, mật khẩu và họ tên." });
    }

    const existingUser = await User.findOne({ where: { email: email } });
    if (existingUser) {
      console.log(existingUser.email, "has been existed!!");
      return res.status(409).json({
        message:
          "Email này đã được sử dụng. Vui lòng sử dụng email khác hoặc đăng nhập.",
      });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      email: email,
      password_hash: password_hash,
      full_name: full_name,
      login_method: "traditional",
      role_id: 2,
      is_email_verified: false,
      is_profile_complete: false,
    });

    res.status(201).json({
      message: "Đăng ký thành công! Vui lòng đăng nhập.",
      user: {
        user_id: newUser.user_id,
        email: newUser.email,
        full_name: newUser.full_name,
        role_id: newUser.role_id,
        is_email_verified: newUser.is_email_verified,
        is_profile_complete: newUser.is_profile_complete,
      },
    });
    console.log(`User ${email} registered successfully.`);
  } catch (err) {
    console.error("Lỗi khi đăng ký người dùng:", err);
    res
      .status(500)
      .json({ message: "Lỗi máy chủ nội bộ.", error: err.message });
  }
};

const handleGoogle = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Thiếu Google ID Token." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log("Google Payload:", payload);
    const googleUserId = payload["sub"]; // ID duy nhất của người dùng Google
    const email = payload["email"];
    const fullName = payload["name"];
    const avatar = payload["picture"];
    const isEmailVerifiedByGoogle = payload["email_verified"];

    let user = await User.findOne({ where: { google_sub_id: googleUserId } });

    if (user) {
      console.log(`User ${email} đăng nhập bằng Google.`);

      user.full_name = fullName;
      await user.save();
    } else {
      const existingTraditionalUser = await User.findOne({
        where: { email: email },
      });

      if (existingTraditionalUser) {
        console.log(
          `Email ${email} đã có tài khoản truyền thống. Liên kết với Google.`
        );
        // Hỏi người dùng có muốn liên kết không (thường làm ở frontend),
        // nếu người dùng đồng ý, thì bạn cập nhật user_id đó:
        existingTraditionalUser.google_sub_id = googleUserId;
        existingTraditionalUser.is_email_verified = isEmailVerifiedByGoogle;
        existingTraditionalUser.full_name =
          existingTraditionalUser.full_name || fullName;
        await existingTraditionalUser.save();
        user = existingTraditionalUser;
        res.status(200).json({
          message:
            "Đăng nhập thành công! Tài khoản Google của bạn đã được liên kết.",
          token: generateAuthToken(user),
          user: {
            user_id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            role_id: user.role_id,
            is_email_verified: user.is_email_verified,
            is_profile_complete: user.is_profile_complete,
          },
        });
        return; // Kết thúc hàm ở đây nếu đã liên kết và gửi phản hồi
      } else {
        console.log(`Tạo tài khoản mới cho ${email} qua Google.`);
        user = await User.create({
          email: email,
          full_name: fullName,
          google_sub_id: googleUserId,
          login_method: "google",
          password_hash: null,
          role_id: 2,
          is_email_verified: isEmailVerifiedByGoogle,
          is_profile_complete: false,
        });
        res.status(201).json({
          message: "Đăng ký thành công bằng Google!",
          token: generateAuthToken(user),
          user: {
            user_id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            role_id: user.role_id,
            is_email_verified: user.is_email_verified,
            is_profile_complete: user.is_profile_complete,
          },
        });
        return;
      }
    }
    console.log(user);

    res.status(200).json({
      message: "Đăng nhập thành công!",
      token: generateAuthToken(user),
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id,
        is_email_verified: user.is_email_verified,
        is_profile_complete: user.is_profile_complete,
      },
    });
  } catch (error) {
    console.error("Lỗi khi xử lý đăng nhập Google:", error);
    if (
      error.code === "ERR_AUTH_INVALID_TOKEN" ||
      error.message.includes("Invalid ID Token")
    ) {
      return res
        .status(401)
        .json({ message: "ID Token không hợp lệ hoặc đã hết hạn." });
    }
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi đăng nhập Google.",
      error: error.message,
    });
  }
};

const generateAuthToken = (user) => {
  const payload = {
    user_id: user.user_id,
    email: user.email,
    role_id: user.role_id,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" }); // Token hết hạn sau 1 giờ
};

module.exports = { handleLoginAttemp, handleRegister, handleGoogle };
