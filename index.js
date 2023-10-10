const dotenv = require('dotenv').config();
const express = require("express");
const dbConnect = require("./config/dbConnect");
const app = express();
const cookieParser = require("cookie-parser");

const authRouter = require("./routes/authRoutes");
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const bodyParser = require('body-parser');

const PORT = process.env.PORT || 3000;
dbConnect();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));
app.use(cookieParser());


app.use("/api/user",authRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT,() => {
    console.log(`Server is running at port ${PORT}`);
})
