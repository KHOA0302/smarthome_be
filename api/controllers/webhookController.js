const db = require("../models");
const {
  Product,
  ProductVariant,
  Option,
  OptionValue,
  VariantOptionSelection,
  Service,
  ServicePackage,
  PackageServiceItem,
  Brand,
  Category,
  ProductImage,
  AttributeGroup,
  ProductAttribute,
  ProductSpecification,
  OrderItem,
  Order,
  Sequelize,
  sequelize,
} = db;
const { Op } = db.Sequelize;

// ========================= Cấu hình & Alias =========================
// ĐỔI 2 alias này nếu models của bạn khai báo khác:
// Product.belongsTo(Brand,         { as: "brand",    foreignKey: "brand_id" })
// Product.hasMany(ProductVariant,  { as: "variants", foreignKey: "product_id" })
const BRAND_AS = "brand";
const VARIANT_AS = "variants";

// số dòng hiển thị cho Top
const MAX_ROWS = 3;

// ========================= Helpers =========================
const money = (n) => Number(n || 0).toLocaleString("vi-VN") + "₫";
const formatSold = (n) => {
  if (n == null) return "-";
  const x = Number(n);
  if (x >= 1_000_000)
    return (x / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  if (x >= 1_000) return (x / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return x.toString();
};
const dfText = (t) => ({ text: { text: [String(t)] } });
const dfPayload = (payload) => ({ payload });
const send = (res, messages, outputContexts) =>
  res.json(
    outputContexts
      ? { fulfillmentMessages: messages, outputContexts }
      : { fulfillmentMessages: messages }
  );

const param = (q, name, def = "") => {
  const v = q?.parameters?.[name];
  if (v === null || v === undefined) return def;
  return typeof v === "string" ? v.trim() : v;
};

const buildCtx = (session, name, lifespan, parameters) => ({
  name: `${session}/contexts/${name}`,
  lifespanCount: lifespan,
  parameters,
});

// Gom điều kiện lọc sản phẩm/biến thể (đơn giản theo tên & variant_name)
const buildSearchWhere = ({ product_name, capacity, color }) => {
  const whereProduct = { is_active: 1 };
  const whereVariant = { item_status: { [Op.ne]: "inactive" } };

  if (product_name)
    whereProduct.product_name = { [Op.like]: `%${product_name}%` };
  if (capacity) whereVariant.variant_name = { [Op.like]: `%${capacity}%` };
  if (color) {
    whereVariant[Op.and] = [
      ...(whereVariant.variant_name
        ? [{ variant_name: whereVariant.variant_name }]
        : []),
      { variant_name: { [Op.like]: `%${color}%` } },
    ];
    delete whereVariant.variant_name;
  }
  return { whereProduct, whereVariant };
};

// ========================= Intent Handlers =========================

// ---- SearchProduct: trả Top 3 (text + payload) ----
async function handleSearchProduct(q, res) {
  const session =
    q.session || q.outputContexts?.[0]?.name?.split("/contexts/")[0];
  const product_name = param(q, "product_name");
  const brand = param(q, "brand");
  const capacity = param(q, "capacity");
  const color = param(q, "color");

  const { whereProduct, whereVariant } = buildSearchWhere({
    product_name,
    capacity,
    color,
  });

  const include = [
    {
      model: Brand,
      as: BRAND_AS,
      attributes: ["brand_name"],
      required: !!brand,
      ...(brand ? { where: { brand_name: { [Op.like]: `%${brand}%` } } } : {}),
    },
    {
      model: ProductVariant,
      as: VARIANT_AS,
      attributes: [
        "variant_id",
        "variant_name",
        "price",
        "stock_quantity",
        "image_url",
        "variant_sku",
        "item_status",
      ],
      // CHÌA KHÓA: không loại cả product nếu variant không khớp điều kiện
      required: false,
      where: whereVariant,
      // Lấy 1 biến thể rẻ nhất cho mỗi product
      separate: true,
      limit: 1,
      order: [["price", "ASC"]],
    },
  ];

  // Lấy rộng rồi cắt Top 3 – sắp xếp theo bán chạy trước
  const products = await Product.findAll({
    where: whereProduct,
    include,
    order: [["sale_volume", "DESC"]],
    limit: 10,
  });

  if (!products.length) {
    return send(res, [
      dfText("Chưa tìm thấy sản phẩm phù hợp. Bạn mô tả rõ hơn giúp mình nhé?"),
    ]);
  }

  // map → chỉ lấy những product có ít nhất 1 variant (rẻ nhất ở index 0 nhờ include.separate)
  const rows = products
    .map((p) => {
      const v = p[VARIANT_AS]?.[0];
      if (!v) return null;
      return {
        name: p.product_name,
        url: `/san-pham/${p.product_id}?variant=${v.variant_id}`,
        price: money(v.price),
        sold: formatSold(p.sale_volume),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_ROWS);

  if (!rows.length) {
    return send(res, [
      dfText("Hiện chưa có biến thể khả dụng cho các sản phẩm tìm thấy."),
    ]);
  }

  const topN = rows.length;
  const summary = rows
    .map((r, i) => `${i + 1}. ${r.name} — ${r.price} — đã bán ${r.sold}`)
    .join("\n");

  return send(
    res,
    [
      // ✅ Chuỗi text để demo trực tiếp trong Dialogflow Console
      dfText(
        `Chúng tôi có một số mẫu để Anh/Chị tham khảo (Top ${topN}):\n${summary}`
      ),
      // Payload để webchat của bạn có thể render bảng/link đẹp
      dfPayload({
        type: "product_table",
        title: "Chúng tôi có một số mẫu để Anh/Chị tham khảo:",
        columns: ["Tên sản phẩm", "Giá (VNĐ)", "Đã bán"],
        rows, // [{ name, url, price, sold }]
      }),
    ],
    session
      ? [
          buildCtx(session, "ctx_product", 5, {
            product_name,
            brand,
            capacity,
            color,
          }),
        ]
      : undefined
  );
}

// ---- ProductPrice: cũng trả Top 3 theo giá tăng dần ----
async function handleProductPrice(q, res) {
  const session =
    q.session || q.outputContexts?.[0]?.name?.split("/contexts/")[0];
  const product_name = param(q, "product_name");
  const brand = param(q, "brand");
  const capacity = param(q, "capacity");
  const color = param(q, "color");

  const { whereProduct, whereVariant } = buildSearchWhere({
    product_name,
    capacity,
    color,
  });

  const include = [
    {
      model: Brand,
      as: BRAND_AS,
      attributes: ["brand_name"],
      required: !!brand,
      ...(brand ? { where: { brand_name: { [Op.like]: `%${brand}%` } } } : {}),
    },
    {
      model: ProductVariant,
      as: VARIANT_AS,
      attributes: [
        "variant_id",
        "variant_name",
        "price",
        "stock_quantity",
        "image_url",
        "variant_sku",
        "item_status",
      ],
      required: false,
      where: whereVariant,
      separate: true,
      limit: 1,
      order: [["price", "ASC"]],
    },
  ];

  const products = await Product.findAll({
    where: whereProduct,
    include,
    order: [["sale_volume", "DESC"]],
    limit: 10,
  });

  if (!products.length) {
    return send(res, [
      dfText(
        "Chưa thấy mức giá phù hợp. Bạn mô tả rõ hơn (model/brand/dung lượng/màu) giúp mình nhé?"
      ),
    ]);
  }

  // Tạo danh sách rồi sort theo giá rẻ (vì đã lấy biến thể rẻ nhất ở include)
  const all = products
    .map((p) => {
      const v = p[VARIANT_AS]?.[0];
      if (!v) return null;
      return {
        name: p.product_name,
        url: `/san-pham/${p.product_id}?variant=${v.variant_id}`,
        priceNum: Number(v.price || 0),
        price: money(v.price),
        sold: formatSold(p.sale_volume),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.priceNum - b.priceNum);

  const rows = all.slice(0, MAX_ROWS).map(({ priceNum, ...r }) => r);
  if (!rows.length) {
    return send(res, [
      dfText("Hiện chưa có biến thể định giá cho các sản phẩm này."),
    ]);
  }

  const topN = rows.length;
  const summary = rows
    .map((r, i) => `${i + 1}. ${r.name} — ${r.price} — đã bán ${r.sold}`)
    .join("\n");

  return send(
    res,
    [
      dfText(`Giá tham khảo (Top ${topN}):\n${summary}`),
      dfPayload({
        type: "product_table",
        title: "Giá tham khảo:",
        columns: ["Tên sản phẩm", "Giá (VNĐ)", "Đã bán"],
        rows,
      }),
    ],
    session
      ? [
          buildCtx(session, "ctx_product", 5, {
            product_name,
            brand,
            capacity,
            color,
          }),
        ]
      : undefined
  );
}

// ---- ProductStock: Top 3 theo tồn kho biến thể (mỗi product lấy biến thể tồn cao nhất) ----
async function handleProductStock(q, res) {
  const product_name = param(q, "product_name");
  const brand = param(q, "brand");
  const capacity = param(q, "capacity");
  const color = param(q, "color");

  const { whereProduct, whereVariant } = buildSearchWhere({
    product_name,
    capacity,
    color,
  });

  const include = [
    {
      model: Brand,
      as: BRAND_AS,
      attributes: ["brand_name"],
      required: !!brand,
      ...(brand ? { where: { brand_name: { [Op.like]: `%${brand}%` } } } : {}),
    },
    {
      model: ProductVariant,
      as: VARIANT_AS,
      attributes: [
        "variant_id",
        "variant_name",
        "price",
        "stock_quantity",
        "image_url",
        "variant_sku",
        "item_status",
      ],
      required: false,
      where: whereVariant,
      separate: true,
      limit: 1,
      order: [["stock_quantity", "DESC"]], // lấy biến thể tồn cao nhất
    },
  ];

  const products = await Product.findAll({
    where: whereProduct,
    include,
    order: [["sale_volume", "DESC"]],
    limit: 10,
  });

  if (!products.length) {
    return send(res, [
      dfText(
        "Mình chưa thấy tồn kho cho yêu cầu này. Bạn cho mình model chính xác hơn nhé?"
      ),
    ]);
  }

  const rows = products
    .map((p) => {
      const v = p[VARIANT_AS]?.[0];
      if (!v) return null;
      return {
        name: p.product_name + (v.variant_name ? ` (${v.variant_name})` : ""),
        url: `/san-pham/${p.product_id}?variant=${v.variant_id}`,
        price: money(v.price),
        stock: Number(v.stock_quantity || 0),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_ROWS);

  if (!rows.length) {
    return send(res, [
      dfText("Hiện chưa có biến thể còn hàng cho các sản phẩm này."),
    ]);
  }

  const topN = rows.length;
  const summary = rows
    .map((r, i) => `${i + 1}. ${r.name} — ${r.price} — tồn ${r.stock}`)
    .join("\n");

  return send(res, [
    dfText(`Các lựa chọn còn hàng (Top ${topN}):\n${summary}`),
    dfPayload({
      type: "product_list",
      title: "Các lựa chọn còn hàng:",
      items: rows,
    }),
  ]);
}

// ---- OrderStatus: tra theo order_id số (nhận #3001, DH-2024-7788, 3001, ...) ----
async function handleOrderStatus(q, res) {
  const raw = String(param(q, "order_code") || "").trim();
  const id = parseInt(raw.replace(/[^\d]/g, ""), 10);
  if (!id) return send(res, [dfText("Bạn nhập giúp mình mã đơn (số) nhé?")]);

  const [orderRow] = await sequelize.query(
    `
    SELECT o.order_id, o.order_status, o.payment_status, o.order_total, o.created_at
    FROM orders o
    WHERE o.order_id = :id
    LIMIT 1
    `,
    { replacements: { id }, type: Sequelize.QueryTypes.SELECT }
  );

  if (!orderRow)
    return send(res, [
      dfText(`Chưa thấy đơn #${id}. Bạn kiểm tra lại giúp mình nhé!`),
    ]);

  const [items] = await sequelize.query(
    `
    SELECT oi.order_item_id, oi.quantity, oi.price,
           pv.variant_id, pv.variant_name, pv.image_url,
           p.product_name
    FROM orderitems oi
    JOIN productvariants pv ON pv.variant_id = oi.variant_id
    JOIN products p        ON p.product_id = pv.product_id
    WHERE oi.order_id = :id
    ORDER BY oi.order_item_id ASC
    `,
    { replacements: { id }, type: Sequelize.QueryTypes.SELECT }
  );

  const text = `Đơn #${orderRow.order_id} đang ở trạng thái *${
    orderRow.order_status
  }*, thanh toán: ${orderRow.payment_status}, tổng ${money(
    orderRow.order_total
  )}. Tạo lúc ${new Date(orderRow.created_at).toLocaleString("vi-VN")}.`;

  return send(res, [
    dfText(text),
    dfPayload({
      type: "order_status",
      order: {
        code: `#${orderRow.order_id}`,
        status: orderRow.order_status,
        payment_status: orderRow.payment_status,
        total: money(orderRow.order_total),
        created_at: orderRow.created_at,
        items: items.map((it) => ({
          name: it.product_name,
          variant: it.variant_name,
          qty: it.quantity,
          price: money(it.price),
          image: it.image_url,
        })),
      },
    }),
  ]);
}

// ---- HandoverToAgent ----
async function handleHandover(_q, res) {
  return send(res, [
    dfText("Mình sẽ kết nối bạn với nhân viên trong giây lát."),
    dfPayload({ type: "handover", reason: "user_requested" }),
  ]);
}

// ========================= Entry point =========================
const handleWebhook = async (req, res) => {
  try {
    const q = req.body?.queryResult;
    const session = req.body?.session;
    const intent = q?.intent?.displayName || "";

    switch (intent) {
      case "SearchProduct":
        return await handleSearchProduct({ ...q, session }, res);
      case "ProductPrice":
        return await handleProductPrice({ ...q, session }, res);
      case "ProductStock":
        return await handleProductStock({ ...q, session }, res);
      case "OrderStatus":
        return await handleOrderStatus({ ...q, session }, res);
      case "HandoverToAgent":
        return await handleHandover(q, res);
      default:
        return send(res, [dfText("Bạn mô tả rõ hơn giúp mình với ạ?")]);
    }
  } catch (err) {
    console.error(err);
    return send(res, [dfText("Có lỗi kỹ thuật, bạn thử lại giúp mình nhé.")]);
  }
};

module.exports = { handleWebhook };
