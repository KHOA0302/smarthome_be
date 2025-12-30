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
const { Op } = db.Sequelize;

const handleLoginAttemp = async (req, res) => {
  const { password, username } = req.body;
  const t = await db.sequelize.transaction();

  try {
    const { sessionId } = req;

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

        const allVariantIds = [...combinedQuantity.keys()];
        const productVariants = await ProductVariant.findAll({
          where: { variant_id: allVariantIds },
          transaction: t,
        });
        const productVariantMap = new Map(
          productVariants.map((pv) => [pv.variant_id, pv])
        );

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

        if (!userCart) {
          await guestCart.update(
            { user_id: user.user_id, session_id: null },
            { transaction: t }
          );
        } else {
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

          if (guestCart.cartItems.length > 0) {
            await CartItem.destroy({
              where: { cart_id: guestCart.cart_id },
              transaction: t,
            });
          }

          await guestCart.destroy({ transaction: t });
        }
      }
    }
    const payload = {
      user_id: user.user_id,
      username: user.email,
      role_id: user.role_id,
      role_name: user.role ? user.role.role_name : null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    await t.commit();

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

    const googleUserId = payload["sub"];
    const email = payload["email"];
    const fullName = payload["name"];
    const avatar = payload["picture"];
    const isEmailVerifiedByGoogle = payload["email_verified"];

    let user = await User.findOne({ where: { google_sub_id: googleUserId } });

    if (user) {
      console.log(`User ${email} login by Google.`);

      user.full_name = fullName;
      await user.save();
    } else {
      const existingTraditionalUser = await User.findOne({
        where: { email: email },
      });

      if (existingTraditionalUser) {
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
      include: [{ model: db.Role, as: "role" }],
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

const editUserInfo = async (req, res) => {
  const { userEdited } = req.body;
  const userId = userEdited.id;
  const googleId = userEdited.google_sub_id;

  try {
    const isProfileComplete =
      userEdited.name &&
      userEdited.phoneNumber &&
      userEdited.province &&
      userEdited.district &&
      userEdited.houseNumber
        ? 1
        : 0;
    const userUpdateData = {
      full_name: userEdited.name,
      phone_number: userEdited.phoneNumber,
      province: userEdited.province,
      district: userEdited.district,
      house_number: userEdited.houseNumber,
      is_profile_complete: isProfileComplete,
    };

    const updateConditions = [];

    if (userId) {
      updateConditions.push({ user_id: userId });
    }

    if (googleId) {
      updateConditions.push({ google_sub_id: googleId });
    }

    const [rowsUpdated] = await User.update(userUpdateData, {
      where: {
        [Op.or]: updateConditions,
      },
    });

    if (rowsUpdated > 0) {
      res.status(200).send({
        message: "Thông tin người dùng đã được cập nhật thành công.",
      });
    } else {
      res.status(404).send({
        message: `Không tìm thấy người dùng.`,
      });
    }
  } catch (error) {
    res.status(500).send({
      message: "Lỗi khi cập nhật thông tin người dùng.",
      error: error.message,
    });
  }
};

module.exports = {
  handleLoginAttemp,
  handleRegister,
  handleGoogle,
  getUserInfo,
  editUserInfo,
};
