const db = require("../models");
const Option = db.Option;
const Sequelize = db.Sequelize; // Cần thiết cho các toán tử như Op.like


const getAllOptions = async (req, res) => {
  // Lấy categoryId từ query parameter nếu có (ví dụ: /api/options?categoryId=1)
  const { categoryId } = req.query;
  let whereClause = {};

  if (categoryId) {
    whereClause.category_id = categoryId;
  }

  try {
    const options = await Option.findAll({
      where: whereClause,
      include: [
        {
          model: db.Category, // Bao gồm thông tin Category liên quan
          as: "category",
          attributes: ["category_id", "category_name"], // Chỉ lấy các trường cần thiết
        },
        {
          model: db.OptionValue, // Bao gồm các OptionValue liên quan đến mỗi Option
          as: "optionValues",
          attributes: ["option_value_id", "option_value_name"],
          order: [["option_value_name", "ASC"]], // Sắp xếp option values
        },
      ],
      order: [["option_name", "ASC"]], // Sắp xếp các option
    });

    if (!options || options.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy tùy chọn nào." });
    }

    res.status(200).json({
      message: "Lấy danh sách tùy chọn thành công.",
      data: options,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách tùy chọn:", error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi lấy danh sách tùy chọn.",
      error: error.message,
    });
  }
};


const getOptionById = async (req, res) => {
  const { id } = req.params; // Lấy option_id từ URL params

  try {
    const option = await Option.findByPk(id, {
      include: [
        {
          model: db.Category,
          as: "category",
          attributes: ["category_id", "category_name"],
        },
        {
          model: db.OptionValue,
          as: "optionValues",
          attributes: ["option_value_id", "option_value_name"],
          order: [["option_value_name", "ASC"]],
        },
      ],
    });

    if (!option) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy tùy chọn với ID: ${id}.` });
    }

    res.status(200).json({
      message: `Lấy thông tin tùy chọn với ID ${id} thành công.`,
      data: option,
    });
  } catch (error) {
    console.error(`Lỗi khi lấy tùy chọn với ID ${id}:`, error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi lấy thông tin tùy chọn.",
      error: error.message,
    });
  }
};


const createOption = async (req, res) => {
  const { option_name, is_filterable, category_id } = req.body;

  try {
    // Kiểm tra xem tên tùy chọn đã tồn tại trong cùng một danh mục chưa (tùy chọn)
    const existingOption = await Option.findOne({
      where: {
        option_name: option_name,
        category_id: category_id,
      },
    });
    if (existingOption) {
      return res
        .status(409)
        .json({ message: "Tên tùy chọn này đã tồn tại trong danh mục này." });
    }

    // Kiểm tra category_id có tồn tại không
    const categoryExists = await db.Category.findByPk(category_id);
    if (!categoryExists) {
      return res
        .status(400)
        .json({ message: `Category với ID: ${category_id} không tồn tại.` });
    }

    const newOption = await Option.create({
      option_name,
      is_filterable: is_filterable !== undefined ? is_filterable : false, // Đảm bảo có giá trị mặc định
      category_id,
    });

    res.status(201).json({
      message: "Tạo tùy chọn mới thành công.",
      data: newOption,
    });
  } catch (error) {
    console.error("Lỗi khi tạo tùy chọn mới:", error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi tạo tùy chọn.",
      error: error.message,
    });
  }
};


const updateOption = async (req, res) => {
  const { id } = req.params;
  const { option_name, is_filterable, category_id } = req.body;

  try {
    const option = await Option.findByPk(id);

    if (!option) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy tùy chọn với ID: ${id}.` });
    }

    // Kiểm tra tính duy nhất của tên tùy chọn trong cùng danh mục nếu tên hoặc category_id thay đổi
    if (
      option_name &&
      (option_name !== option.option_name ||
        (category_id && category_id !== option.category_id))
    ) {
      const existingOption = await Option.findOne({
        where: {
          option_name: option_name,
          category_id: category_id || option.category_id, // Sử dụng category_id mới hoặc cũ
          option_id: { [Sequelize.Op.ne]: id }, // Loại trừ chính nó
        },
      });
      if (existingOption) {
        return res.status(409).json({
          message: "Tên tùy chọn này đã tồn tại trong danh mục đã chọn.",
        });
      }
    }

    // Kiểm tra category_id mới có tồn tại không nếu được cung cấp
    if (category_id && category_id !== option.category_id) {
      const categoryExists = await db.Category.findByPk(category_id);
      if (!categoryExists) {
        return res
          .status(400)
          .json({ message: `Category với ID: ${category_id} không tồn tại.` });
      }
    }

    option.option_name = option_name || option.option_name;
    option.is_filterable =
      is_filterable !== undefined ? is_filterable : option.is_filterable;
    option.category_id = category_id || option.category_id;

    await option.save();

    res.status(200).json({
      message: `Cập nhật tùy chọn với ID ${id} thành công.`,
      data: option,
    });
  } catch (error) {
    console.error(`Lỗi khi cập nhật tùy chọn với ID ${id}:`, error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi cập nhật tùy chọn.",
      error: error.message,
    });
  }
};


const deleteOption = async (req, res) => {
  const { id } = req.params;

  try {
    const option = await Option.findByPk(id);

    if (!option) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy tùy chọn với ID: ${id}.` });
    }

    // Cân nhắc xử lý các OptionValue liên quan trước khi xóa Option
    // Ví dụ: Bạn có thể muốn xóa cascading các option values,
    // hoặc ngăn không cho xóa nếu có option values liên quan
    // hoặc đặt option_id của option values về null (nếu cho phép)

    await option.destroy();

    res.status(200).json({
      message: `Xóa tùy chọn với ID ${id} thành công.`,
    });
  } catch (error) {
    console.error(`Lỗi khi xóa tùy chọn với ID ${id}:`, error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi xóa tùy chọn.",
      error: error.message,
    });
  }
};


const filterOptions = async (req, res) => {
  const { category_id, is_filterable } = req.body; 

  let whereClause = {};

  if (category_id) {
    whereClause.category_id = category_id;
  }

  if (is_filterable !== undefined) {
    whereClause.is_filterable = is_filterable;
  }

  try {
    const options = await Option.findAll({
      where: whereClause,
      include: [
        {
          model: db.Category,
          as: "category",
          attributes: ["category_id", "category_name"],
        },
        {
          model: db.OptionValue,
          as: "optionValues",
          attributes: ["option_value_id", "option_value_name"],
          order: [["option_value_name", "ASC"]],
        },
      ],
      order: [["option_name", "ASC"]],
    });

    if (!options || options.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy tùy chọn nào phù hợp với tiêu chí lọc.",
      });
    }

    res.status(200).json({
      message: "Lấy danh sách tùy chọn theo bộ lọc thành công.",
      data: options,
    });
  } catch (error) {
    console.error("Lỗi khi lọc tùy chọn:", error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi lọc tùy chọn.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllOptions,
  getOptionById,
  createOption,
  updateOption,
  deleteOption,
  filterOptions, 
};
