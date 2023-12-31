const dotenv = require("dotenv").config();
const express = require("express");
const dbConnect = require("./config/dbConnect");
const app = express();
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const xss = require("xss-clean");
const logResponseTime = require("./middlewares/logResponseTime");
const rootMessage = require("./utils/rootMessage");
// require("newrelic");

const authRouter = require("./routes/authRoutes");
const productRouter = require("./routes/productRoute");
const blogRouter = require("./routes/blogRoutes");
const blogCatRouter = require("./routes/blogCatRoute");
const productCatRouter = require("./routes/prodCatRoute");
const brandRouter = require("./routes/brandRoute");
const couponRouter = require("./routes/couponRoute");
const enquiryRouter = require("./routes/enquiryRoute");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const bodyParser = require("body-parser");

const PORT = process.env.PORT || 3000;
dbConnect();

app.use(morgan("dev"));
app.use(logResponseTime); // log the routes which are taking more than 5 secs
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(helmet());
app.use(xss());

app.use("/", rootMessage);

app.use("/api/v1/user", authRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/blog", blogRouter);
app.use("/api/v1/blog-cat", blogCatRouter);
app.use("/api/v1/product-cat", productCatRouter);
app.use("/api/v1/brand", brandRouter);
app.use("/api/v1/coupon", couponRouter);
app.use("/api/v1/enquiry", enquiryRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});
