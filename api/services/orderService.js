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
      raw: true,
    });

    const revenueByYear = {};

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
    for (const year of sortedYears) {
      const yearData = { year: parseInt(year, 10), quarters: [] };
      for (const quarterName of ["Quý 1", "Quý 2", "Quý 3", "Quý 4"]) {
        const currentQuarterRevenue = revenueByYear[year][quarterName] || 0;
        let compareToPre = null;
        let compareToPreValue = null;

        if (previousQuarterRevenue !== null) {
          const diff = currentQuarterRevenue - previousQuarterRevenue;

          if (previousQuarterRevenue === 0) {
            if (currentQuarterRevenue > 0) {
              compareToPre = "increase";
              compareToPreValue = "N/A";
            } else {
              compareToPre = "stable";
              compareToPreValue = 0;
            }
          } else {
            const percentageChange = (diff / previousQuarterRevenue) * 100;
            if (diff > 0) {
              compareToPre = "increase";
            } else if (diff < 0) {
              compareToPre = "decrease";
            } else {
              compareToPre = "stable";
            }
            compareToPreValue = parseFloat(
              Math.abs(percentageChange).toFixed(2)
            );
          }
        } else {
          compareToPre = null;
          compareToPreValue = null;
        }

        yearData.quarters.push({
          name: quarterName,
          revenue: currentQuarterRevenue,
          compareToPre: compareToPre,
          compareToPreValue: compareToPreValue,
        });

        previousQuarterRevenue = currentQuarterRevenue;
      }
      formattedRevenue.push(yearData);
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
