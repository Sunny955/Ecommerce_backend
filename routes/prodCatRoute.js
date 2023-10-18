const express = require("express");
const router = express.Router();
const {createCategory} = require("../controller/ProdCatController");
const {advancedFiltering} = require("../middlewares/advanceFiltering");
const {authMiddleware,isAdmin} = require("../middlewares/authMiddleware");

router.post('/create-cat',authMiddleware,isAdmin,createCategory);

module.exports = router;