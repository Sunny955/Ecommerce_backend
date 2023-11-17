const express = require("express");
const {
  createProduct,
  getaProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  addToWishlist,
  rating,
  getAverageRating,
  uploadImages,
  deleteImage,
} = require("../controller/ProductController");
const router = express.Router();
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");
const { advancedFiltering } = require("../middlewares/advanceFiltering");
const Product = require("../models/ProductModel");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");
const { uploadPhoto, productImgResize } = require("../middlewares/uploadImage");
const { timeoutMiddleware } = require("../middlewares/timeoutMiddleware");

router.post(
  "/create-product",
  timeoutMiddleware(10000),
  authMiddleware,
  isAdmin,
  createProduct
);
router.get(
  "/get-a-product/:id",
  timeoutMiddleware(10000),
  authMiddleware,
  cacheMiddleware(3600),
  getaProduct
);
router.get(
  "/get-all-products",
  timeoutMiddleware(20000),
  authMiddleware,
  advancedFiltering(Product),
  cacheMiddleware(3600),
  getAllProducts
);
router.put(
  "/update-product/:id",
  timeoutMiddleware(15000),
  authMiddleware,
  isAdmin,
  updateProduct
);
router.delete(
  "/delete-product/:id",
  timeoutMiddleware(15000),
  authMiddleware,
  isAdmin,
  deleteProduct
);
router.put(
  "/wishlist",
  timeoutMiddleware(15000),
  authMiddleware,
  addToWishlist
);
router.put("/rating", timeoutMiddleware(15000), authMiddleware, rating);
router.get(
  "/rating/:prodId",
  timeoutMiddleware(10000),
  authMiddleware,
  cacheMiddleware(3600),
  getAverageRating
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
router.put(
  "/delete-image/:id",
  timeoutMiddleware(15000),
  authMiddleware,
  deleteImage
);

module.exports = router;
