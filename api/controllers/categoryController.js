const db = require("../models");
const { Category, Product, Service, AttributeGroup } = db;

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [
        ["display_order", "ASC"],
        ["category_name", "ASC"],
      ],
    });

    if (!categories || categories.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy danh mục nào." });
    }

    res.status(200).json({
      message: "Lấy danh sách danh mục thành công.",
      data: categories,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách danh mục:", error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi lấy danh sách danh mục.",
      error: error.message,
    });
  }
};

const createCategory = async (req, res) => {
  const { name, slogan, banner, icon, displayOrder } = req.body;

  try {
    const existingCategory = await Category.findOne({
      where: { category_name: name },
    });

    if (existingCategory) {
      return res.status(409).json({ message: "Tên danh mục đã tồn tại." });
    }

    const newCategory = await Category.create({
      category_name: name,
      slogan: slogan,
      banner: banner,
      icon_url: icon,
      display_order: displayOrder,
    });

    res.status(201).json({
      message: "Tạo danh mục mới thành công.",
      data: {
        newCategory: newCategory,
        allCategories: await Category.findAll(),
      },
    });
  } catch (error) {
    console.error("Lỗi khi tạo danh mục mới:", error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi tạo danh mục.",
      error: error.message,
    });
  }
};

const editCategory = async (req, res) => {
  const { newCategory } = req.body;

  if (!newCategory || !newCategory.category_id) {
    return res.status(400).json({
      message: "Dữ liệu danh mục mới và ID danh mục là bắt buộc để cập nhật.",
    });
  }

  try {
    const categoryId = newCategory.category_id;

    if (newCategory.isRemove === false) {
      const dataToUpdate = {
        category_name: newCategory.category_name,
        display_order: newCategory.display_order,
        banner: newCategory.banner,
        icon_url: newCategory.icon_url,
        slogan: newCategory.slogan,
        showable: newCategory.showable,
      };

      const [rowsAffected] = await Category.update(dataToUpdate, {
        where: { category_id: categoryId },
      });

      if (rowsAffected === 0) {
        return res.status(404).json({
          message:
            "Không tìm thấy danh mục để cập nhật hoặc không có thay đổi nào được thực hiện.",
        });
      }

      const updatedCategory = await Category.findByPk(categoryId);

      return res.status(200).json({
        message: "Danh mục đã được cập nhật thành công!",
        category: updatedCategory,
      });
    } else {
      const categoryExists = await Category.findByPk(categoryId);
      if (!categoryExists) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy danh mục để xóa." });
      }

      const productCount = await Product.count({
        where: { category_id: categoryId },
      });
      const serviceCount = await Service.count({
        where: { category_id: categoryId },
      });
      const attributeGroupCount = await AttributeGroup.count({
        where: { category_id: categoryId },
      });

      if (productCount > 0) {
        return res.status(409).json({
          message: `Không thể xóa danh mục vì có ${productCount} sản phẩm đang liên kết.`,
        });
      }

      if (serviceCount > 0) {
        return res.status(409).json({
          message: `Không thể xóa danh mục vì có ${serviceCount} dịch vụ đang liên kết.`,
        });
      }

      if (attributeGroupCount > 0) {
        return res.status(409).json({
          message: `Không thể xóa danh mục vì có ${attributeGroupCount} nhóm thuộc tính đang liên kết.`,
        });
      }

      const deletedRows = await Category.destroy({
        where: { category_id: categoryId },
      });

      if (deletedRows === 0) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy danh mục để xóa." });
      }

      return res.status(200).json({
        message: "Danh mục đã được xóa thành công!",
      });
    }
  } catch (error) {
    console.error("Lỗi khi xử lý danh mục:", error);
    return res.status(500).json({
      message: "Đã xảy ra lỗi khi xử lý danh mục.",
      error: error.message,
    });
  }
};
module.exports = {
  getAllCategories,
  createCategory,
  editCategory,
};
