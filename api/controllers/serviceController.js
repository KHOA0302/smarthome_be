// controllers/service.controller.js

const db = require("../models"); // Đảm bảo đường dẫn đến models là chính xác
const Service = db.Service;
const Sequelize = db.Sequelize; // Cần thiết cho các toán tử như Op.like
const Op = Sequelize.Op; // Import Op từ Sequelize

// Hàm để lấy tất cả các dịch vụ (có thể có bộ lọc theo categoryId)
const getAllServices = async (req, res) => {
  // Lấy categoryId từ query parameter nếu có (ví dụ: /api/services?categoryId=1)
  const { categoryId } = req.query;
  let whereClause = {};

  if (categoryId) {
    whereClause.category_id = categoryId;
  }

  try {
    const services = await Service.findAll({
      where: whereClause,
      include: [
        {
          model: db.Category, // Bao gồm thông tin Category liên quan
          as: "category",
          attributes: ["category_id", "category_name"], // Chỉ lấy các trường cần thiết
        },
      ],
      order: [["service_name", "ASC"]], // Sắp xếp các dịch vụ theo tên
    });

    if (!services || services.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ nào." });
    }

    res.status(200).json({
      message: "Lấy danh sách dịch vụ thành công.",
      data: services,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách dịch vụ:", error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi lấy danh sách dịch vụ.",
      error: error.message,
    });
  }
};

// Hàm để lấy một dịch vụ theo ID
const getServiceById = async (req, res) => {
  const { id } = req.params; // Lấy service_id từ URL params

  try {
    const service = await Service.findByPk(id, {
      include: [
        {
          model: db.Category,
          as: "category",
          attributes: ["category_id", "category_name"],
        },
      ],
    });

    if (!service) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy dịch vụ với ID: ${id}.` });
    }

    res.status(200).json({
      message: `Lấy thông tin dịch vụ với ID ${id} thành công.`,
      data: service,
    });
  } catch (error) {
    console.error(`Lỗi khi lấy dịch vụ với ID ${id}:`, error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi lấy thông tin dịch vụ.",
      error: error.message,
    });
  }
};

const createService = async (req, res) => {
  const { categoryId, serviceName } = req.body;

  try {
    if (categoryId) {
      const categoryExists = await db.Category.findByPk(categoryId);
      if (!categoryExists) {
        return res
          .status(400)
          .json({ message: `Category với ID: ${categoryId} không tồn tại.` });
      }
    }

    const newService = await Service.create({
      service_name: serviceName,
      category_id: categoryId || null, // Lưu null nếu không có category_id
    });

    res.status(201).json({
      message: "Tạo dịch vụ mới thành công.",
      data: newService,
    });
  } catch (error) {
    console.error("Lỗi khi tạo dịch vụ mới:", error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi tạo dịch vụ.",
      error: error.message,
    });
  }
};

const updateService = async (req, res) => {};

// Hàm để xóa một dịch vụ
const deleteService = async (req, res) => {
  const { id } = req.params;

  try {
    const service = await Service.findByPk(id);

    if (!service) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy dịch vụ với ID: ${id}.` });
    }

    // Cân nhắc xử lý các PackageServiceItem liên quan trước khi xóa Service
    // Ví dụ: Bạn có thể muốn xóa cascading các PackageServiceItem,
    // hoặc ngăn không cho xóa nếu có PackageServiceItem liên quan
    // Tùy thuộc vào business logic của bạn.

    await service.destroy();

    res.status(200).json({
      message: `Xóa dịch vụ với ID ${id} thành công.`,
    });
  } catch (error) {
    console.error(`Lỗi khi xóa dịch vụ với ID ${id}:`, error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi xóa dịch vụ.",
      error: error.message,
    });
  }
};

// Hàm controller để lọc các dịch vụ (sử dụng POST)
const filterServices = async (req, res) => {
  const { category_id } = req.body; // Lấy các tiêu chí lọc từ request body

  let whereClause = {};

  if (category_id !== undefined) {
    // Cho phép lọc cả null category_id
    whereClause[Op.or] = [{ category_id: category_id }, { category_id: null }];
  }
  //   if (service_name_keyword) {
  //     whereClause.service_name = {
  //       [Sequelize.Op.like]: `%${service_name_keyword}%`,
  //     };
  //   }

  try {
    const services = await Service.findAll({
      where: whereClause,
      include: [
        {
          model: db.Category,
          as: "category",
          attributes: ["category_id", "category_name"],
        },
      ],
      order: [["service_name", "ASC"]],
    });

    if (!services || services.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy dịch vụ nào phù hợp với tiêu chí lọc.",
      });
    }

    res.status(200).json({
      message: "Lấy danh sách dịch vụ theo bộ lọc thành công.",
      data: services,
    });
  } catch (error) {
    console.error("Lỗi khi lọc dịch vụ:", error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi lọc dịch vụ.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  filterServices,
};
