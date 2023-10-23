const express = require("express");
const {
  createProduct,
  getaProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  addToWishlist,
  rating,
  updateAverageRating,
  uploadImages,
} = require("../controller/ProductController");
const router = express.Router();
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");
const { advancedFiltering } = require("../middlewares/advanceFiltering");
const Product = require("../models/ProductModel");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");
const { uploadPhoto, productImgResize } = require("../middlewares/uploadImage");
const { timeoutMiddleware } = require("../middlewares/timeoutMiddleware");

router.post("/create-product", authMiddleware, isAdmin, createProduct);
router.get(
  "/get-a-product/:id",
  authMiddleware,
  isAdmin,
  cacheMiddleware(3600),
  getaProduct
);
router.get(
  "/get-all-products",
  authMiddleware,
  isAdmin,
  advancedFiltering(Product),
  cacheMiddleware(3600),
  getAllProducts
);
router.put("/update-product/:id", authMiddleware, isAdmin, updateProduct);
router.delete("/delete-product/:id", authMiddleware, isAdmin, deleteProduct);
router.put("/wishlist", authMiddleware, addToWishlist);
router.put("/rating", authMiddleware, rating);
router.get(
  "/rating/:prodId",
  authMiddleware,
  cacheMiddleware(3600),
  updateAverageRating
);
router.put(
  "/upload-image/:id",
  timeoutMiddleware(25000),
  authMiddleware,
  isAdmin,
  uploadPhoto.array("images", 10),
  productImgResize,
  uploadImages
);

module.exports = router;
