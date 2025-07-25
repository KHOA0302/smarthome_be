// api/controllers/attributeController.js

const db = require("../models");
const AttributeGroup = db.AttributeGroup;
const ProductAttribute = db.ProductAttribute;
const Category = db.Category; // Giữ lại nếu bạn vẫn muốn include Category cho AttributeGroup

const getAttributesByCategory = async (req, res) => {
  const { categoryId } = req.body;

  if (!categoryId) {
    return res.status(400).json({
      message: "Vui lòng cung cấp categoryId trong body của request.",
    });
  }

  console.log("=================================================");
  console.log(
    `Đang thực hiện truy vấn thủ công cho Category ID: ${categoryId}`
  );

  try {
    // 1. Lấy tất cả các AttributeGroup dựa trên categoryId
    const attributeGroups = await AttributeGroup.findAll({
      where: {
        category_id: categoryId,
      },
      include: [
        // GIỮ LẠI INCLUDE CATEGORY NẾU BẠN MUỐN
        {
          model: Category,
          as: "category",
          attributes: ["category_name"],
        },
      ],
      attributes: ["group_id", "group_name", "display_order", "category_id"],
      order: [["display_order", "ASC"]],
      raw: true, // Lấy dữ liệu thuần túy để dễ xử lý
      nest: true, // Lồng ghép dữ liệu của Category vào
    });

    if (attributeGroups.length === 0) {
      return res.status(200).json({
        message: `Không tìm thấy nhóm thuộc tính nào cho danh mục ID ${categoryId}.`,
        data: [],
      });
    }

    // 2. Lấy tất cả group_id từ kết quả trên
    const groupIds = attributeGroups.map((group) => group.group_id);

    // 3. Lấy tất cả ProductAttribute có group_id tương ứng
    const productAttributes = await ProductAttribute.findAll({
      where: {
        group_id: groupIds, // Sử dụng toán tử IN cho nhiều group_id
      },
      attributes: [
        "attribute_id",
        "attribute_name",
        "display_order",
        "is_filterable",
        "group_id",
        "unit",
      ],
      order: [
        ["group_id", "ASC"], // Sắp xếp theo group_id để dễ nhóm
        ["display_order", "ASC"],
      ],
      raw: true, // Lấy dữ liệu thuần túy
    });

    // 4. Ghép nối ProductAttribute vào AttributeGroup tương ứng
    const result = attributeGroups.map((group) => {
      // Lấy tên category nếu có
      const categoryName = group.category ? group.category.category_name : null;

      return {
        group_id: group.group_id,
        group_name: group.group_name,
        display_order: group.display_order,
        category_id: group.category_id,
        category_name: categoryName, // Thêm category_name vào đây
        attributes: productAttributes.filter(
          (attr) => attr.group_id === group.group_id
        ),
      };
    });

    res.status(200).json({
      message: `Đã lấy thành công nhóm thuộc tính và thuộc tính sản phẩm cho danh mục ID ${categoryId}. (Thủ công)`,
      data: result,
    });
  } catch (error) {
    console.error(
      `Lỗi khi thực hiện truy vấn thủ công cho danh mục ID ${categoryId}:`,
      error
    );
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi lấy thông tin thuộc tính (thủ công).",
      error: error.message,
    });
  }
};

module.exports = { getAttributesByCategory };
