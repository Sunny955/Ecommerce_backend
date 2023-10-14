const express = require("express");
const router = express.Router();
const {createBlog} = require("../controller/BlogController");
const {advancedFiltering} = require("../middlewares/advanceFiltering");
const {authMiddleware,isAdmin} = require("../middlewares/authMiddleware");


router.post('/create-blog',authMiddleware,isAdmin,createBlog);

module.exports = router;