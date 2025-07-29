const db = require("../models");

const { Op } = require("sequelize");

const Sequelize = db.Sequelize;

/**
 
 * @param {number} year 
 * @returns {Promise<Array<Object>>} 
 
 */

const getOrdersByStatus = async (orderStatus) => {
  const validStatuses = [
    "pending",
    "approved",
    "cancel",
    "shipping",
    "delivered",
  ];
  if (!orderStatus || !validStatuses.includes(orderStatus.toLowerCase())) {
    throw new Error("Invalid order status provided.");
  }

  try {
    const orders = await db.Order.findAll({
      where: {
        order_status: orderStatus.toLowerCase(),
      },
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["user_id", "full_name", "email"],
        },
        {
          model: db.OrderItem,
          as: "orderItems",
          include: [
            {
              model: db.ProductVariant,
              as: "productVariant",
              attributes: ["variant_name", "price"],
            },
            {
              model: db.OrderItemService,
              as: "orderItemServices",
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return orders;
  } catch (error) {
    console.error("Error fetching orders by status:", error);
    throw new Error("Failed to fetch orders by status.");
  }
};

const getQuarterlyCategorySales = (orders, quarters) => {
  const quarterlyCategorySales = {}; // Stores category sales per quarter
  const totalQuantitySoldPerQuarter = {}; // Stores total quantity sold for each quarter

  orders.forEach((order) => {
    const orderDate = new Date(order.created_at);
    const year = orderDate.getFullYear();
    const month = orderDate.getMonth() + 1;

    let quarterName = "";
    for (const q of quarters) {
      if (month >= q.startMonth && month <= q.endMonth) {
        quarterName = q.name;
        break;
      }
    }

    if (!quarterName) return;

    if (!quarterlyCategorySales[year]) {
      quarterlyCategorySales[year] = {};
      totalQuantitySoldPerQuarter[year] = {};
    }
    if (!quarterlyCategorySales[year][quarterName]) {
      quarterlyCategorySales[year][quarterName] = {};
      totalQuantitySoldPerQuarter[year][quarterName] = 0;
    }

    order.orderItems.forEach((item) => {
      const categoryName =
        item.productVariant?.product?.category?.category_name;
      const quantity = item.quantity;

      if (categoryName && quantity) {
        if (!quarterlyCategorySales[year][quarterName][categoryName]) {
          quarterlyCategorySales[year][quarterName][categoryName] = 0;
        }
        quarterlyCategorySales[year][quarterName][categoryName] += quantity;
        totalQuantitySoldPerQuarter[year][quarterName] += quantity;
      }
    });
  });

  return { quarterlyCategorySales, totalQuantitySoldPerQuarter };
};

/**
 * Calculates the quarterly revenue, grouped by year, and includes comparison to the previous quarter.
 * Also includes top categories sold per quarter and comparison of total product quantity.
 * Only considers orders with 'completed' status and 'paid' payment status.
 * Can filter by a specific year range if startYear and endYear are provided.
 * @param {number} [startYear] - Optional. The starting year for revenue calculation.
 * @param {number} [endYear] - Optional. The ending year for revenue calculation.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of objects,
 * each representing a year with its quarterly revenue, comparison data, and category sales.
 */
const getRevenueByYearAndQuarter = async (startYear, endYear) => {
  try {
    const quarters = [
      { name: "Quý 1", startMonth: 1, endMonth: 3 },
      { name: "Quý 2", startMonth: 4, endMonth: 6 },
      { name: "Quý 3", startMonth: 7, endMonth: 9 },
      { name: "Quý 4", startMonth: 10, endMonth: 12 },
    ];

    const whereClause = {
      order_status: "completed",
      payment_status: "paid",
    };

    if (startYear && endYear) {
      const startDate = new Date(startYear, 0, 1);
      const endDate = new Date(endYear, 11, 31, 23, 59, 59, 999);
      whereClause.created_at = {
        [Op.between]: [startDate, endDate],
      };
    }

    const orders = await db.Order.findAll({
      attributes: ["created_at", "order_total"],
      where: whereClause,
      include: [
        {
          model: db.OrderItem,
          as: "orderItems",
          attributes: ["quantity"],
          include: [
            {
              model: db.ProductVariant,
              as: "productVariant",
              attributes: ["variant_id", "variant_name"],
              include: [
                {
                  model: db.Product,
                  as: "product",
                  attributes: ["product_name"],
                  include: [
                    {
                      model: db.Category,
                      as: "category",
                      attributes: ["category_name"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const revenueByYear = {};
    const { quarterlyCategorySales, totalQuantitySoldPerQuarter } =
      getQuarterlyCategorySales(orders, quarters);

    orders.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const year = orderDate.getFullYear();
      const month = orderDate.getMonth() + 1;

      let quarterName = "";
      for (const q of quarters) {
        if (month >= q.startMonth && month <= q.endMonth) {
          quarterName = q.name;
          break;
        }
      }

      if (!revenueByYear[year]) {
        revenueByYear[year] = {
          "Quý 1": 0,
          "Quý 2": 0,
          "Quý 3": 0,
          "Quý 4": 0,
        };
      }
      revenueByYear[year][quarterName] += parseFloat(order.order_total || 0);
    });

    const formattedRevenue = [];
    const sortedYears = Object.keys(revenueByYear).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );

    let previousQuarterRevenue = null;
    let previousQuarterTotalQuantity = null; // New variable to track total quantity of previous quarter

    const currentFullDate = new Date();
    const currentYear = currentFullDate.getFullYear();
    const currentMonth = currentFullDate.getMonth() + 1;

    for (const year of sortedYears) {
      const yearData = { year: parseInt(year, 10), quarters: [] };
      for (let i = 0; i < quarters.length; i++) {
        const quarter = quarters[i];
        const quarterName = quarter.name;

        if (
          parseInt(year) === currentYear &&
          quarter.startMonth > currentMonth
        ) {
          continue;
        }

        const currentQuarterRevenue = revenueByYear[year][quarterName] || 0;
        let diffPercentRevenueStatus = null;
        let diffPercentRevenue = null;

        // --- Revenue Comparison Logic ---
        if (previousQuarterRevenue !== null) {
          const diff = currentQuarterRevenue - previousQuarterRevenue;

          if (previousQuarterRevenue === 0) {
            if (currentQuarterRevenue > 0) {
              diffPercentRevenueStatus = "increase";
              diffPercentRevenue = 100; // Representing a significant increase from zero
            } else {
              diffPercentRevenueStatus = "stable";
              diffPercentRevenue = 0;
            }
          } else {
            const percentageChange = (diff / previousQuarterRevenue) * 100;
            if (diff > 0) {
              diffPercentRevenueStatus = "increase";
            } else if (diff < 0) {
              diffPercentRevenueStatus = "decrease";
            } else {
              diffPercentRevenueStatus = "stable";
            }
            diffPercentRevenue = parseFloat(
              Math.abs(percentageChange).toFixed(2)
            );
          }
        } else {
          diffPercentRevenueStatus = null;
          diffPercentRevenue = null;
        }
        // --- End Revenue Comparison Logic ---

        const categoriesInQuarter = [];
        const quarterCategories =
          quarterlyCategorySales[year]?.[quarterName] || {};
        const totalSoldInQuarter =
          totalQuantitySoldPerQuarter[year]?.[quarterName] || 0;

        for (const categoryName in quarterCategories) {
          const soldQuantity = quarterCategories[categoryName];
          const rate =
            totalSoldInQuarter > 0
              ? parseFloat(
                  ((soldQuantity / totalSoldInQuarter) * 100).toFixed(2)
                )
              : 0;
          categoriesInQuarter.push({
            name: categoryName,
            sold_quantity: soldQuantity,
            rate: rate,
          });
        }

        categoriesInQuarter.sort((a, b) => b.sold_quantity - a.sold_quantity);

        // --- Product Quantity Comparison Logic (New) ---
        let diffPercentProductStatus = null;
        let diffPercentProduct = null;

        if (previousQuarterTotalQuantity !== null) {
          const diffQuantity =
            totalSoldInQuarter - previousQuarterTotalQuantity;

          if (previousQuarterTotalQuantity === 0) {
            if (totalSoldInQuarter > 0) {
              diffPercentProductStatus = "increase";
              diffPercentProduct = 100; // Representing a significant increase from zero
            } else {
              diffPercentProductStatus = "stable";
              diffPercentProduct = 0;
            }
          } else {
            const percentageChangeQuantity =
              (diffQuantity / previousQuarterTotalQuantity) * 100;
            if (diffQuantity > 0) {
              diffPercentProductStatus = "increase";
            } else if (diffQuantity < 0) {
              diffPercentProductStatus = "decrease";
            } else {
              diffPercentProductStatus = "stable";
            }
            diffPercentProduct = parseFloat(
              Math.abs(percentageChangeQuantity).toFixed(2)
            );
          }
        } else {
          diffPercentProductStatus = null;
          diffPercentProduct = null;
        }
        // --- End Product Quantity Comparison Logic ---

        yearData.quarters.push({
          name: quarterName,
          revenue: currentQuarterRevenue,
          diffPercentRevenueStatus: diffPercentRevenueStatus,
          diffPercentRevenue: diffPercentRevenue,
          products: categoriesInQuarter,
          diffPercentProductStatus: diffPercentProductStatus, // New field
          diffPercentProduct: diffPercentProduct, // New field
        });

        previousQuarterRevenue = currentQuarterRevenue;
        previousQuarterTotalQuantity = totalSoldInQuarter; // Update for next iteration
      }
      if (yearData.quarters.length > 0) {
        formattedRevenue.push(yearData);
      }
    }

    return formattedRevenue;
  } catch (error) {
    console.error("Error in getRevenueByYearAndQuarter service:", error);
    throw new Error("Could not retrieve revenue data by year and quarter.");
  }
};

module.exports = {
  getOrdersByStatus,
  getRevenueByYearAndQuarter,
};
