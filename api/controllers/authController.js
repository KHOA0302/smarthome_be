const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

let users = [
  {
    id: 1,
    username: "customer",
    email: "customer1@example.com",
    password_hash: "",
    role_id: 1,
    role_name: "customer",
  },
  {
    id: 2,
    username: "dataentry",
    email: "dataentry1@example.com",
    password_hash: "",
    role_id: 2,
    role_name: "data_entry",
  },
  {
    id: 3,
    username: "admin",
    email: "admin1@example.com",
    password_hash: "",
    role_id: 3,
    role_name: "admin",
  },
];

async function initializeDemoUsers() {
  for (let user of users) {
    if (!user.password_hash) {
      // Chỉ mã hóa nếu chưa có hash (tránh mã hóa lại nhiều lần)
      const salt = await bcrypt.genSalt(10); // Tạo salt
      user.password_hash = await bcrypt.hash("123", salt); // Mã hóa
      console.log(`Password for ${user.username} hashed.`);
    }
  }
}
// Gọi hàm khởi tạo ngay khi controller được load
initializeDemoUsers();

const handleLoginAttemp = async (req, res) => {
  const { password, username } = req.body;

  console.log("Login request received!");
  console.log("username: ", username);
  console.log("password: ", password);

  const user = users.find((u) => u.username === username);

  if (!user) {
    return res.status(400).json({ message: "Tên đăng nhập không tồn tại." });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    return res.status(400).json({ message: "Mật khẩu không đúng." });
  }

  // 3. Tạo JWT nếu đăng nhập thành công
  // Payload JWT nên chứa các thông tin cần thiết để xác định người dùng
  // và vai trò của họ, KHÔNG nên chứa thông tin nhạy cảm.
  const payload = {
    user_id: user.id,
    username: user.username,
    role_id: user.role_id,
    role_name: user.role_name, // Thêm role_name vào payload để tiện sử dụng ở frontend
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

  // 4. Gửi JWT và thông tin người dùng về cho phía frontend
  res.status(200).json({
    message: "Đăng nhập thành công!",
    token: token, // Gửi JWT về cho client
    user: {
      // Gửi kèm thông tin người dùng (không bao gồm password_hash)
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
    },
  });
};

module.exports = { handleLoginAttemp };
