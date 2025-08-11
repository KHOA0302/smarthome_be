const db = require("../models");
const Option = db.Option;
const Sequelize = db.Sequelize;
const getAllOptions = async (req, res) => {
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
  const { id } = req.params;

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
  const { categoryId, optionName, isFilterable } = req.body;

  console.log(categoryId, optionName, isFilterable);

  try {
    const categoryExists = await db.Category.findByPk(categoryId);
    if (!categoryExists) {
      return res
        .status(400)
        .json({ message: `Category với ID: ${categoryId} không tồn tại.` });
    }

    const newOption = await Option.create({
      option_name: optionName,
      is_filterable: isFilterable,
      category_id: categoryId,
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

    if (
      option_name &&
      (option_name !== option.option_name ||
        (category_id && category_id !== option.category_id))
    ) {
      const existingOption = await Option.findOne({
        where: {
          option_name: option_name,
          category_id: category_id || option.category_id,
          option_id: { [Sequelize.Op.ne]: id },
        },
      });
      if (existingOption) {
        return res.status(409).json({
          message: "Tên tùy chọn này đã tồn tại trong danh mục đã chọn.",
        });
      }
    }

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
