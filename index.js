const dotenv = require("dotenv").config();
const express = require("express");
const dbConnect = require("./config/dbConnect");
const app = express();
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const xss = require("xss-clean");
// require("newrelic");

const authRouter = require("./routes/authRoutes");
const productRouter = require("./routes/productRoute");
const blogRouter = require("./routes/blogRoutes");
const blogCatRouter = require("./routes/blogCatRoute");
const productCatRouter = require("./routes/prodCatRoute");
const brandRouter = require("./routes/brandRoute");
const couponRouter = require("./routes/couponRoute");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const bodyParser = require("body-parser");

const PORT = process.env.PORT || 3000;
dbConnect();

app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//Set security headers
app.use(helmet());

//Prevents XSS attacks
app.use(xss());

app.use("/api/user", authRouter);
app.use("/api/product", productRouter);
app.use("/api/blog", blogRouter);
app.use("/api/blog-cat", blogCatRouter);
app.use("/api/product-cat", productCatRouter);
app.use("/api/brand", brandRouter);
app.use("/api/coupon", couponRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});
