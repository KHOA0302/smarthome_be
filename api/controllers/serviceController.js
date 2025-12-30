const db = require("../models");
const Service = db.Service;
const Sequelize = db.Sequelize;
const Op = Sequelize.Op;

const getAllServices = async (req, res) => {
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
          model: db.Category,
          as: "category",
          attributes: ["category_id", "category_name"],
        },
      ],
      order: [["service_name", "ASC"]],
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

const getServiceById = async (req, res) => {
  const { id } = req.params;

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
      category_id: categoryId || null,
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

const updateService = async (req, res) => {
  const { service_id, service_name } = req.body;
  try {
    const service = await Service.findByPk(service_id);

    if (!service) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ!" });
    } else {
      if (service.service_name === service_name) {
        return res.status(404).json({ message: "Tên không thay đổi!" });
      }
    }

    await Service.update(
      {
        service_name: service_name,
        updated_at: new Date(),
      },
      {
        where: { service_id: service_id },
      }
    );

    return res.status(200).json({
      message: "Cập nhật tên dịch vụ thành công!",
      data: { service_id, service_name },
    });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);

    return res.status(500).json({ message: "Lỗi hệ thống khi cập nhật." });
  }
};

const deleteService = async (req, res) => {
  const { id } = req.params;

  try {
    const service = await Service.findByPk(id);

    if (!service) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy dịch vụ với ID: ${id}.` });
    }

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

const filterServices = async (req, res) => {
  const { category_id } = req.body;

  let whereClause = {};

  if (category_id !== undefined) {
    whereClause[Op.or] = [{ category_id: category_id }, { category_id: null }];
  }

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
