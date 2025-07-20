const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const db = require("../models");
const Brand = db.Brand;

// Hàm để lấy tất cả các thương hiệu
const getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.findAll({
      // attributes: ['brand_id', 'brand_name', 'logo_url'], // Chỉ lấy các trường cần thiết
      order: [["brand_name", "ASC"]], // Sắp xếp theo tên thương hiệu tăng dần
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

// Hàm để lấy một thương hiệu theo ID
const getBrandById = async (req, res) => {
  const { id } = req.params; // Lấy brand_id từ URL params

  try {
    const brand = await Brand.findByPk(id); // Sử dụng findByPk để tìm theo khóa chính

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

// Hàm để tạo một thương hiệu mới (ví dụ, chỉ dành cho Admin)
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

// Hàm để cập nhật thông tin thương hiệu (ví dụ, chỉ dành cho Admin)
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

    // Kiểm tra xem tên thương hiệu mới có trùng với tên thương hiệu khác không (nếu tên thay đổi)
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

    await brand.save(); // Lưu các thay đổi vào database

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

// Hàm để xóa một thương hiệu (ví dụ, chỉ dành cho Admin)
const deleteBrand = async (req, res) => {
  const { id } = req.params;

  try {
    const brand = await Brand.findByPk(id);

    if (!brand) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy thương hiệu với ID: ${id}.` });
    }

    await brand.destroy(); // Xóa bản ghi khỏi database

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

module.exports = {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
};
