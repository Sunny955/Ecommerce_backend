const dotenv = require('dotenv').config();
const express = require("express");
const dbConnect = require("./config/dbConnect");
const app = express();
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const authRouter = require("./routes/authRoutes");
const productRouter = require("./routes/productRoute");
const blogRouter = require("./routes/blogRoutes");
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const bodyParser = require('body-parser');

const PORT = process.env.PORT || 3000;
dbConnect();

app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));
app.use(cookieParser());


app.use("/api/user",authRouter);
app.use("/api/product",productRouter);
app.use("/api/blog",blogRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT,() => {
    console.log(`Server is running at port ${PORT}`);
})
