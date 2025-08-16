const express = require("express");
const router = express.Router();
const {searchProductByName} = require("../controllers/webhookController");

router.post("/", async (req, res) => {
  try {
    const intent = req.body.queryResult.intent.displayName;

    if (intent === "SearchProduct") {
      const productName = req.body.queryResult.parameters.product_name;

      const product = await searchProductByName(productName);

      if (!product) {
        return res.json({
          fulfillmentText: `Xin lỗi, hiện không tìm thấy sản phẩm "${productName}".`
        });
      }

      const price =
        product.variants && product.variants.length > 0
          ? product.variants[0].price
          : "chưa có giá";

      // 👉 Gửi event SHOW_PRICE kèm parameters về lại Dialogflow
      return res.json({
        followupEventInput: {
          name: "SHOW_PRICE",
          languageCode: "vi",
          parameters: {
            product_name: product.product_name,
            price: price
          }
        }
      });
    }

    // fallback cho intent khác
    return res.json({
      fulfillmentText: "Xin lỗi, mình chưa hiểu yêu cầu."
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.json({
      fulfillmentText: "Hệ thống gặp sự cố khi tìm sản phẩm."
    });
  }
});




module.exports = router