const db = require("../models");
const Category = db.Category;

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ["category_id", "category_name", "display_order"],
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


const getCategoryById = async (req, res) => {
  const { id } = req.params; 

  try {
    const category = await Category.findByPk(id); 

    if (!category) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy danh mục với ID: ${id}.` });
    }

    res.status(200).json({
      message: `Lấy thông tin danh mục với ID ${id} thành công.`,
      data: category,
    });
  } catch (error) {
    console.error(`Lỗi khi lấy danh mục với ID ${id}:`, error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi lấy thông tin danh mục.",
      error: error.message,
    });
  }
};


const createCategory = async (req, res) => {
  const { category_name, display_order } = req.body;

  try {
  
    const existingCategory = await Category.findOne({
      where: { category_name: category_name },
    });
    if (existingCategory) {
      return res.status(409).json({ message: "Tên danh mục đã tồn tại." });
    }

    const newCategory = await Category.create({
      category_name,
      display_order,
    });

    res.status(201).json({
      message: "Tạo danh mục mới thành công.",
      data: newCategory,
    });
  } catch (error) {
    console.error("Lỗi khi tạo danh mục mới:", error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi tạo danh mục.",
      error: error.message,
    });
  }
};


const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { category_name, display_order } = req.body;

  try {
    const category = await Category.findByPk(id);

    if (!category) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy danh mục với ID: ${id}.` });
    }

    if (category_name && category_name !== category.category_name) {
      const existingCategory = await Category.findOne({
        where: { category_name: category_name },
      });
      if (
        existingCategory &&
        existingCategory.category_id !== category.category_id
      ) {
        return res.status(409).json({ message: "Tên danh mục đã tồn tại." });
      }
    }

    category.category_name = category_name || category.category_name;
    category.display_order =
      display_order !== undefined ? display_order : category.display_order;

    await category.save(); 

    res.status(200).json({
      message: `Cập nhật danh mục với ID ${id} thành công.`,
      data: category,
    });
  } catch (error) {
    console.error(`Lỗi khi cập nhật danh mục với ID ${id}:`, error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi cập nhật danh mục.",
      error: error.message,
    });
  }
};


const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findByPk(id);

    if (!category) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy danh mục với ID: ${id}.` });
    }

    // Cân nhắc xử lý các sản phẩm thuộc danh mục này trước khi xóa
    // Ví dụ: set category_id của các sản phẩm về null hoặc xóa sản phẩm liên quan.
    // Tùy thuộc vào business logic của bạn.

    await category.destroy(); 

    res.status(200).json({
      message: `Xóa danh mục với ID ${id} thành công.`,
    });
  } catch (error) {
    console.error(`Lỗi khi xóa danh mục với ID ${id}:`, error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi xóa danh mục.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
