const dotenv = require('dotenv').config();
const express = require("express");
const dbConnect = require("./config/dbConnect");
const app = express();


const PORT = process.env.PORT || 3000;
dbConnect();

app.listen(PORT,() => {
    console.log(`Server is running at port ${PORT}`);
})
