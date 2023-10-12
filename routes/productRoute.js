const express = require("express");
const { createProduct, getaProduct, getAllProducts, updateProduct, deleteProduct } = require("../controller/ProductController");
const router = express.Router();
const {authMiddleware,isAdmin} = require("../middlewares/authMiddleware");
const { advancedFiltering } = require("../middlewares/advanceFiltering");
const Product = require("../models/ProductModel");

router.post("/create-product",authMiddleware,isAdmin,createProduct);
router.get("/get-a-product/:id",authMiddleware,isAdmin,getaProduct);
router.get("/get-all-products",authMiddleware,isAdmin,advancedFiltering(Product),getAllProducts);
router.put("/update-product/:id",authMiddleware,isAdmin,updateProduct);
router.delete("/delete-product/:id",authMiddleware,isAdmin,deleteProduct);

module.exports = router;