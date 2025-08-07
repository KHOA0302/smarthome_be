const db = require("../models");
const {
  Cart,
  CartItem,
  ProductVariant,
  CartItemService,
  Option,
  OptionValue,
  Service,
} = db;

const getCartItem = async (req, res) => {
  try {
    let cartIdentifier = {};
    const userId = req.isGuest ? null : req.user.id;
    const sessionId = req.isGuest ? req.sessionId : null;

    if (userId) {
      cartIdentifier = { user_id: userId };
    } else if (sessionId) {
      cartIdentifier = { session_id: sessionId };
    } else {
      return res
        .status(400)
        .json({ message: "Không tìm thấy thông tin giỏ hàng." });
    }

    const cart = await Cart.findOne({
      where: cartIdentifier,
      include: [
        {
          model: CartItem,
          as: "cartItems",
          include: [
            {
              model: ProductVariant,
              as: "productVariant",
              include: [
                {
                  model: OptionValue,
                  as: "selectedOptionValues",
                  include: [
                    {
                      model: Option,
                      as: "option",
                    },
                  ],
                },
              ],
            },
            {
              model: CartItemService,
              as: "cartItemServices",
              include: [
                {
                  model: db.PackageServiceItem,
                  as: "packageServiceItem",
                  include: [
                    {
                      model: Service,
                      as: "serviceDefinition",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!cart) {
      return res
        .status(200)
        .json({ message: "Giỏ hàng trống.", cartItems: [] });
    }

    // 2. Định dạng lại payload
    const cartItemsPayload = cart.cartItems.map((cartItem) => {
      const productVariant = cartItem.productVariant;

      // Xử lý options
      const optionsMap = new Map();
      if (
        productVariant.selectedOptionValues &&
        productVariant.selectedOptionValues.length > 0
      ) {
        productVariant.selectedOptionValues.forEach((optionValue) => {
          const option = optionsMap.get(optionValue.option.option_id);
          if (!option) {
            optionsMap.set(optionValue.option.option_id, {
              optionId: optionValue.option.option_id,
              optionName: optionValue.option.option_name,
              optionValue: {
                valueId: optionValue.option_value_id,
                valueName: optionValue.option_value_name,
              },
            });
          }
        });
      }
      const optionsPayload = [...optionsMap.values()];

      // Xử lý services
      const servicesPayload = cartItem.cartItemServices.map(
        (cartItemService) => {
          const packageServiceItem = cartItemService.packageServiceItem;
          return {
            serviceId: packageServiceItem.serviceDefinition.service_id,
            serviceName: packageServiceItem.serviceDefinition.service_name,
            price: cartItemService.price,
            // Có thể thêm các trường khác nếu cần
          };
        }
      );

      // Tạo object cuối cùng
      return {
        cartItemId: cartItem.cart_item_id,
        variant: {
          productId: productVariant.product_id,
          variantId: productVariant.variant_id,
          variantName: productVariant.variant_name,
          price: productVariant.price,
          imageUrl: productVariant.image_url,
          // ... thêm các thông tin variant khác nếu cần
        },
        options: optionsPayload,
        quantity: cartItem.quantity,
        price: cartItem.price,
        services: servicesPayload,
      };
    });

    res.status(200).json({
      cartId: cart.cart_id,
      cartItems: cartItemsPayload,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin giỏ hàng:", error);
    res
      .status(500)
      .json({ message: "Lỗi máy chủ nội bộ.", error: error.message });
  }
};

const createCartItem = async (req, res) => {
  const { variant, servicePackage } = req.body;
  const t = await db.sequelize.transaction();

  try {
    let cartIdentifier = {};
    let userId = null;
    let sessionId = null;

    if (!req.isGuest) {
      userId = req.user.id;
      cartIdentifier = { user_id: userId };
    } else {
      sessionId = req.sessionId;
      cartIdentifier = { session_id: sessionId };
    }

    // 1. Tìm hoặc tạo Cart
    const [cart] = await db.Cart.findOrCreate({
      where: cartIdentifier,
      defaults: cartIdentifier,
      transaction: t,
    });

    // 2. Tìm ProductVariant để kiểm tra stockQuantity
    const productVariant = await db.ProductVariant.findByPk(variant.variantId, {
      transaction: t,
    });

    if (!productVariant) {
      await t.rollback();
      return res.status(404).json({ message: "Product variant not found." });
    }

    // --- LOGIC KIỂM TRA TỒN KHO CẢI TIẾN ---
    // Lấy TỔNG số lượng hiện có của variant này trong giỏ hàng
    const existingVariantItemsInCart = await db.CartItem.findAll({
      where: {
        cart_id: cart.cart_id,
        variant_id: variant.variantId,
      },
      attributes: ["quantity"],
      transaction: t,
    });

    let totalCurrentQuantityInCart = 0;
    for (const item of existingVariantItemsInCart) {
      totalCurrentQuantityInCart += item.quantity;
    }

    const quantityToAdd = 1;

    if (
      productVariant.stock_quantity <
      totalCurrentQuantityInCart + quantityToAdd
    ) {
      await t.rollback();
      return res.status(400).json({
        message:
          `Không đủ số lượng tồn kho cho sản phẩm "${productVariant.variant_name}". ` +
          `Bạn đã có ${totalCurrentQuantityInCart} sản phẩm này trong giỏ. ` +
          `Chỉ còn ${
            productVariant.stock_quantity - totalCurrentQuantityInCart
          } sản phẩm có thể thêm.`,
      });
    }
    // --- KẾT THÚC LOGIC KIỂM TRA TỒN KHO CẢI TIẾN ---

    // 3. Tính toán tổng giá cho CartItem (bao gồm giá variant và giá service items)
    let cartItemPrice = parseFloat(variant.price);
    const selectedServiceItems =
      servicePackage && servicePackage.items
        ? servicePackage.items.filter((item) => item.selected)
        : [];

    const selectedPackageServiceItemIds = selectedServiceItems
      .map((item) => item.itemId)
      .sort();
    const serviceItemsHash = JSON.stringify(selectedPackageServiceItemIds);

    for (const item of selectedServiceItems) {
      cartItemPrice += parseFloat(item.itemPriceImpact);
    }

    // 4. Kiểm tra và Tạo/Cập nhật CartItem
    let existingCartItem = null;

    const cartItemsInCurrentCart = await db.CartItem.findAll({
      where: { cart_id: cart.cart_id },
      include: [
        {
          model: db.CartItemService,
          as: "cartItemServices",
          attributes: ["package_service_item_id"],
        },
      ],
      transaction: t,
    });

    for (const item of cartItemsInCurrentCart) {
      const existingServiceItemIds = item.cartItemServices
        .map((cis) => cis.package_service_item_id)
        .sort();
      const existingServiceItemsHash = JSON.stringify(existingServiceItemIds);

      if (
        item.variant_id === variant.variantId &&
        existingServiceItemsHash === serviceItemsHash
      ) {
        existingCartItem = item;
        break;
      }
    }

    let createdOrUpdatedCartItem;

    if (existingCartItem) {
      // Nếu CartItem đã tồn tại và khớp với điều kiện duy nhất
      // Tăng số lượng.
      const newQuantity = existingCartItem.quantity + quantityToAdd; // Tăng thêm 1

      // **LƯU Ý:** Kiểm tra tồn kho tổng đã được thực hiện ở trên.
      // Do đó, ở đây chỉ cần cập nhật số lượng.
      createdOrUpdatedCartItem = await existingCartItem.update(
        {
          quantity: newQuantity,
          price: cartItemPrice,
        },
        { transaction: t }
      );
      console.log("Updated CartItem:", createdOrUpdatedCartItem.toJSON());
    } else {
      // Nếu không tìm thấy hoặc là CartItem mới
      createdOrUpdatedCartItem = await db.CartItem.create(
        {
          cart_id: cart.cart_id,
          variant_id: variant.variantId,
          quantity: quantityToAdd, // Mặc định là 1 khi tạo mới
          price: cartItemPrice,
        },
        { transaction: t }
      );
      console.log("Created new CartItem:", createdOrUpdatedCartItem.toJSON());

      // 5. Lưu CartItemService nếu có các service items được chọn
      if (selectedServiceItems.length > 0) {
        const cartItemServicesToCreate = selectedServiceItems.map((item) => ({
          cart_item_id: createdOrUpdatedCartItem.cart_item_id,
          package_service_item_id: item.itemId,
          price: item.itemPriceImpact,
        }));

        await db.CartItemService.bulkCreate(cartItemServicesToCreate, {
          transaction: t,
        });
        console.log(
          "Created CartItemService entries for new CartItem:",
          cartItemServicesToCreate
        );
      }
    }

    await t.commit();
    return res.status(200).json({
      message: "Cart item processed successfully",
      cartItem: createdOrUpdatedCartItem,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error processing cart item:", error);
    return res.status(500).json({
      message: "Error processing cart item",
      error: error.message,
    });
  }
};

const decreaseItem = async (req, res) => {
  const { cartItemId } = req.body;

  try {
    const cartItem = await db.CartItem.findByPk(cartItemId);

    if (!cartItem) {
      return res.status(404).send({ message: "Không tìm thấy CartItem!" });
    }

    cartItem.quantity -= 1;
    await cartItem.save();
    return res.status(200).send(cartItem);
  } catch (error) {
    return res.status(500).send({
      message: "Đã xảy ra lỗi khi giảm số lượng CartItem.",
      error: error.message,
    });
  }
};

const increaseItem = async (req, res) => {
  const { cartItemId } = req.body;
  let cartIdentifier;

  if (req.isGuest) {
    cartIdentifier = { session_id: req.sessionId };
  } else {
    cartIdentifier = { user_id: req.user.id };
  }

  try {
    const cartItemToUpdate = await db.CartItem.findByPk(cartItemId, {
      include: [
        {
          model: db.Cart,
          as: "cart",
          where: cartIdentifier,
        },
        {
          model: db.ProductVariant,
          as: "productVariant",
          attributes: ["stock_quantity"],
        },
      ],
    });

    if (!cartItemToUpdate) {
      return res.status(404).send({
        message: "Không tìm thấy CartItem hoặc không thuộc giỏ hàng của bạn.",
      });
    }

    const { variant_id, productVariant } = cartItemToUpdate;
    const stockQuantity = productVariant.stock_quantity;
    const totalQuantity = await db.CartItem.sum("quantity", {
      where: {
        cart_id: cartItemToUpdate.cart_id,
        variant_id: variant_id,
      },
    });

    console.log(totalQuantity, ">", stockQuantity);

    if (totalQuantity + 1 > stockQuantity) {
      console.log("vẫn lỗi");
      return res.status(400).send({
        message: `Số lượng sản phẩm vượt quá tồn kho. Tồn kho hiện tại: ${stockQuantity}`,
      });
    }

    cartItemToUpdate.quantity += 1;
    await cartItemToUpdate.save();

    return res.status(200).send(cartItemToUpdate);
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: "Đã xảy ra lỗi khi tăng số lượng CartItem.",
      error: error.message,
    });
  }
};

const deleteItem = async (req, res) => {
  const { cartItemId } = req.body;
  console.log(cartItemId);

  if (!cartItemId) {
    return res.status(400).send({ message: "cartItemId is required." });
  }

  try {
    await db.CartItemService.destroy({
      where: { cart_item_id: cartItemId },
    });

    const result = await db.CartItem.destroy({
      where: { cart_item_id: cartItemId },
    });

    if (result === 0) {
      return res.status(404).send({ message: "CartItem not found." });
    }

    return res.status(200).send({
      message: "successfully.",
    });
  } catch (error) {
    console.error("Error deleting cart item:", error);
    return res.status(500).send({ message: "Internal server error." });
  }
};

module.exports = {
  createCartItem,
  getCartItem,
  decreaseItem,
  increaseItem,
  deleteItem,
};
