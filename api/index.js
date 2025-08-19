require("dotenv").config();

const express = require("express");
const app = express();

const authRouter = require("./routes/auth");
const brandRouter = require("./routes/brand");
const categoryRouter = require("./routes/category");
const optionRouter = require("./routes/option");
const serviceRouter = require("./routes/service");
const productRouter = require("./routes/product");
const attributeRouter = require("./routes/attribute");
const cartRouter = require("./routes/cart");
const orderRouter = require("./routes/order");

const cors = require("cors");

app.use(express.json());

app.use(cors());

app.use("/auth", authRouter);
app.use("/brand", brandRouter);
app.use("/category", categoryRouter);
app.use("/option", optionRouter);
app.use("/service-package", serviceRouter);
app.use("/product", productRouter);
app.use("/attribute", attributeRouter);
app.use("/cart", cartRouter);
app.use("/order", orderRouter);

///////////////////////////////////////////////
const webhookRouter = require("./routes/webhook");
app.use("/webhook", webhookRouter);
///////////////////////////////////////////////

module.exports = app;
