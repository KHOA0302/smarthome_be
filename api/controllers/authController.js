const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const JWT_SECRET = process.env.JWT_SECRET;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const db = require("../models");
const User = db.User;
const Cart = db.Cart;
const CartItem = db.CartItem;
const CartItemService = db.CartItemService;
const ProductVariant = db.ProductVariant;

const handleLoginAttemp = async (req, res) => {
  const { password, username } = req.body;
  const t = await db.sequelize.transaction();

  try {
    const { sessionId } = req;
    console.log({ username, password, sessionId });

    const user = await User.findOne({
      where: { email: username },
      include: [
        {
          model: db.Role,
          as: "role",
          attributes: ["role_name"],
        },
      ],
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res.status(400).json({ message: "Tên đăng nhập không tồn tại." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      await t.rollback();
      return res.status(400).json({ message: "Mật khẩu không đúng." });
    }

    // --- LOGIC GỘP GIỎ HÀNG VÀ KIỂM TRA TỒN KHO PHỨC TẠP ---
    if (sessionId) {
      const guestCart = await Cart.findOne({
        where: { session_id: sessionId },
        include: [
          {
            model: CartItem,
            as: "cartItems",
            include: [{ model: CartItemService, as: "cartItemServices" }],
          },
        ],
        transaction: t,
      });

      if (guestCart) {
        const userCart = await Cart.findOne({
          where: { user_id: user.user_id },
          include: [
            {
              model: CartItem,
              as: "cartItems",
              include: [{ model: CartItemService, as: "cartItemServices" }],
            },
          ],
          transaction: t,
        });

        // 1. Tính tổng số lượng của từng variant_id từ cả hai giỏ hàng
        const combinedQuantity = new Map();
        const processItems = (items) => {
          if (items && items.length > 0) {
            items.forEach((item) => {
              const currentQuantity =
                combinedQuantity.get(item.variant_id) || 0;
              combinedQuantity.set(
                item.variant_id,
                currentQuantity + item.quantity
              );
            });
          }
        };

        processItems(userCart ? userCart.cartItems : []);
        processItems(guestCart.cartItems);

        // 2. Lấy tất cả ProductVariant để kiểm tra tồn kho
        const allVariantIds = [...combinedQuantity.keys()];
        const productVariants = await ProductVariant.findAll({
          where: { variant_id: allVariantIds },
          transaction: t,
        });
        const productVariantMap = new Map(
          productVariants.map((pv) => [pv.variant_id, pv])
        );

        // 3. Kiểm tra tồn kho trước khi gộp
        for (const [variantId, totalQuantity] of combinedQuantity.entries()) {
          const variant = productVariantMap.get(variantId);

          if (!variant) {
            await t.rollback();
            return res.status(404).json({
              message: `Không tìm thấy một sản phẩm trong giỏ hàng. Vui lòng kiểm tra lại.`,
            });
          }

          if (totalQuantity > variant.stock_quantity) {
            await t.rollback();
            return res.status(400).json({
              message: `Không đủ số lượng tồn kho cho sản phẩm "${variant.variant_name}" sau khi gộp giỏ hàng.`,
            });
          }
        }

        // 4. Nếu tồn kho đủ, thực hiện gộp giỏ hàng
        if (!userCart) {
          // Trường hợp 1: User chưa có giỏ hàng. Chuyển giỏ hàng của khách.
          await guestCart.update(
            { user_id: user.user_id, session_id: null },
            { transaction: t }
          );
        } else {
          // Trường hợp 2: User đã có giỏ hàng. Gộp giỏ hàng của khách vào của user.
          for (const guestItem of guestCart.cartItems) {
            const guestServiceItemsHash = guestItem.cartItemServices
              .map((s) => s.package_service_item_id)
              .sort()
              .join(",");

            let existingUserItem = null;
            if (userCart.cartItems) {
              for (const userItem of userCart.cartItems) {
                if (userItem.variant_id === guestItem.variant_id) {
                  const userServiceItemsHash = userItem.cartItemServices
                    .map((s) => s.package_service_item_id)
                    .sort()
                    .join(",");
                  if (userServiceItemsHash === guestServiceItemsHash) {
                    existingUserItem = userItem;
                    break;
                  }
                }
              }
            }

            if (existingUserItem) {
              await existingUserItem.update(
                { quantity: existingUserItem.quantity + guestItem.quantity },
                { transaction: t }
              );
            } else {
              await guestItem.update(
                { cart_id: userCart.cart_id },
                { transaction: t }
              );
            }
          }

          // Bổ sung: Xóa thủ công tất cả cartItems của giỏ hàng khách
          // trước khi xóa giỏ hàng đó
          if (guestCart.cartItems.length > 0) {
            await CartItem.destroy({
              where: { cart_id: guestCart.cart_id },
              transaction: t,
            });
          }

          // Sau khi gộp và xóa items xong, xóa giỏ hàng cũ của khách
          await guestCart.destroy({ transaction: t });
        }
      }
    }
    // --- KẾT THÚC LOGIC GỘP GIỎ HÀNG ---

    const payload = {
      user_id: user.user_id,
      username: user.email,
      role_id: user.role_id,
      role_name: user.role ? user.role.role_name : null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    // Commit transaction chỉ khi tất cả các bước trên thành công
    await t.commit();

    // Gửi phản hồi thành công cuối cùng
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
    // Luôn luôn rollback nếu có lỗi xảy ra
    await t.rollback();
    console.error("Lỗi đăng nhập:", err);
    res
      .status(500)
      .json({ message: "Lỗi máy chủ nội bộ.", error: err.message });
  }
};

const handleRegister = async (req, res) => {
  const { email, password, full_name } = req.body;
  try {
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
    const googleUserId = payload["sub"];
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
        return;
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

const getUserInfo = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { user_id: req.user.id },
      attributes: [
        "full_name",
        "phone_number",
        "province",
        "district",
        "house_number",
        "is_profile_complete",
      ],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi lấy được thông tin người dùng.",
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
};

module.exports = {
  handleLoginAttemp,
  handleRegister,
  handleGoogle,
  getUserInfo,
};
