const express = require("express");
const { createProduct, getaProduct, getAllProducts, updateProduct, deleteProduct } = require("../controller/ProductController");
const router = express.Router();

router.post("/create-product",createProduct);
router.get("/get-a-product/:id",getaProduct);
router.get("/get-all-products",getAllProducts);
router.put("/update-product/:id",updateProduct);
router.delete("/delete-product/:id",deleteProduct);

module.exports = router;