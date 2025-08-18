const db = require("../models");
const { Brand, Product } = db;

const getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.findAll({
      order: [["brand_name", "ASC"]],
    });

    if (!brands || brands.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thương hiệu nào." });
    }

    res.status(200).json({
      message: "Lấy danh sách thương hiệu thành công.",
      data: brands,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách thương hiệu:", error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi lấy danh sách thương hiệu.",
      error: error.message,
    });
  }
};

const getBrandById = async (req, res) => {
  const { id } = req.params;

  try {
    const brand = await Brand.findByPk(id);

    if (!brand) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy thương hiệu với ID: ${id}.` });
    }

    res.status(200).json({
      message: `Lấy thông tin thương hiệu với ID ${id} thành công.`,
      data: brand,
    });
  } catch (error) {
    console.error(`Lỗi khi lấy thương hiệu với ID ${id}:`, error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi lấy thông tin thương hiệu.",
      error: error.message,
    });
  }
};

const createBrand = async (req, res) => {
  const { brand_name, logo_url } = req.body;

  console.log({ brand_name, logo_url });

  try {
    ////////////////////////////////////////////
    const existingBrand = await Brand.findOne({
      where: { brand_name: brand_name },
    });
    if (existingBrand) {
      return res.status(409).json({ message: "Tên thương hiệu đã tồn tại." });
    }
    ///////////////////////////////////////////
    const newBrand = await Brand.create({
      brand_name,
      logo_url,
    });

    res.status(201).json({
      message: "Tạo thương hiệu mới thành công.",
      data: {
        newBrand: newBrand,
        allBrands: await Brand.findAll(),
      },
    });
  } catch (error) {
    console.error("Lỗi khi tạo thương hiệu mới:", error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi tạo thương hiệu.",
      error: error.message,
    });
  }
};

const updateBrand = async (req, res) => {
  const { id } = req.params;
  const { brand_name, logo_url, description } = req.body;

  try {
    const brand = await Brand.findByPk(id);

    if (!brand) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy thương hiệu với ID: ${id}.` });
    }

    if (brand_name && brand_name !== brand.brand_name) {
      const existingBrand = await Brand.findOne({
        where: { brand_name: brand_name },
      });
      if (existingBrand && existingBrand.brand_id !== brand.brand_id) {
        return res.status(409).json({ message: "Tên thương hiệu đã tồn tại." });
      }
    }

    brand.brand_name = brand_name || brand.brand_name;
    brand.logo_url = logo_url || brand.logo_url;
    brand.description = description || brand.description;

    await brand.save();

    res.status(200).json({
      message: `Cập nhật thương hiệu với ID ${id} thành công.`,
      data: brand,
    });
  } catch (error) {
    console.error(`Lỗi khi cập nhật thương hiệu với ID ${id}:`, error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi cập nhật thương hiệu.",
      error: error.message,
    });
  }
};

const deleteBrand = async (req, res) => {
  const { id } = req.params;

  try {
    const brand = await Brand.findByPk(id);

    if (!brand) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy thương hiệu với ID: ${id}.` });
    }

    await brand.destroy();

    res.status(200).json({
      message: `Xóa thương hiệu với ID ${id} thành công.`,
    });
  } catch (error) {
    console.error(`Lỗi khi xóa thương hiệu với ID ${id}:`, error);
    res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi xóa thương hiệu.",
      error: error.message,
    });
  }
};

const editBrand = async (req, res) => {
  const { newBrand } = req.body;
  const brand_id = newBrand.brand_id;
  const isRemove = newBrand.isRemove;

  if (!brand_id) {
    return res.status(400).json({
      message: "Lỗi: Không tìm thấy brand_id để cập nhật/xóa.",
    });
  }

  if (isRemove) {
    try {
      const productCount = await Product.count({
        where: { brand_id: brand_id },
      });

      if (productCount > 0) {
        return res.status(409).json({
          message: `Không thể xóa thương hiệu này vì có ${productCount} sản phẩm liên quan.`,
        });
      }

      const brandDeleted = await Brand.destroy({
        where: { brand_id: brand_id },
      });

      if (brandDeleted === 0) {
        return res.status(404).json({
          message: "Không tìm thấy thương hiệu để xóa.",
        });
      }

      return res.status(200).json({
        message: "Xóa thương hiệu thành công.",
      });
    } catch (error) {
      console.error("Lỗi khi xóa thương hiệu:", error);
      return res.status(500).json({
        message: "Lỗi máy chủ nội bộ khi xóa.",
        error: error.message,
      });
    }
  }

  try {
    const [rowsAffected] = await Brand.update(newBrand, {
      where: { brand_id: brand_id },
    });

    if (rowsAffected === 0) {
      console.log(newBrand, brand_id, rowsAffected);
      return res.status(404).json({
        message: `Không tìm thấy thương hiệu hoặc không có sự thay đổi được thực thi.`,
      });
    }

    return res.status(200).json({
      message: "Cập nhật thương hiệu thành công.",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật thương hiệu:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ nội bộ khi cập nhật.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  editBrand,
};
