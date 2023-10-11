const express = require("express");
const { createProduct, getaProduct, getAllProducts } = require("../controller/ProductController");
const router = express.Router();

router.post("/create-product",createProduct);
router.get("/:id",getaProduct);
router.get("/",getAllProducts);

module.exports = router;