const express = require("express");
const {
  createUser,
  loginUser,
  getAllUsers,
  getaUser,
  deleteUser,
  updateUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logoutUser,
  updatePassword,
  forgotPasswordToken,
  resetPassword,
  loginAdmin,
  getWishlist,
  saveAddress,
  userCart,
  getUserCart,
  emptyCart,
  applyCoupon,
  createOrder,
  getOrders,
  getAllOrders,
  getOrderByUserId,
  updateOrderStatus,
  uploadPic,
  deletePic,
  updateUserCart,
  getLoggedinUser,
} = require("../controller/UserController");
const router = express.Router();
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");
const { advancedFiltering } = require("../middlewares/advanceFiltering");
const User = require("../models/UserModel");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");
const { timeoutMiddleware } = require("../middlewares/timeoutMiddleware");
const { uploadPhoto, userImgResize } = require("../middlewares/uploadImage");

router.post("/register", createUser);
router.post("/forgot-password-token", forgotPasswordToken);
router.put("/reset-password/:token", resetPassword);
router.put("/update-password", authMiddleware, updatePassword);
router.post("/login", timeoutMiddleware(10000), loginUser);
router.post("/admin-login", timeoutMiddleware(10000), loginAdmin);
router.post("/add-cart", timeoutMiddleware(15000), authMiddleware, userCart);
router.post(
  "/cart/apply-coupon",
  timeoutMiddleware(20000),
  authMiddleware,
  applyCoupon
);
router.post("/cart/cash-order", authMiddleware, createOrder);
router.post(
  "/upload/user-pic",
  timeoutMiddleware(15000),
  authMiddleware,
  uploadPhoto.array("images", 1),
  userImgResize,
  uploadPic
);
router.post(
  "/delete/user-pic",
  timeoutMiddleware(15000),
  authMiddleware,
  deletePic
);
router.put(
  "/order/update-order-status/:id",
  authMiddleware,
  isAdmin,
  updateOrderStatus
);
router.put(
  "/cart/update-cart",
  timeoutMiddleware(5000),
  authMiddleware,
  updateUserCart
);
router.get("/get-cart", timeoutMiddleware(10000), authMiddleware, getUserCart);
router.get(
  "/all-users",
  timeoutMiddleware(20000),
  authMiddleware,
  isAdmin,
  advancedFiltering(User),
  cacheMiddleware(3600),
  getAllUsers
);
router.get("/refresh", handleRefreshToken);
router.get("/logout", authMiddleware, logoutUser);
router.get("/get-wishlist", authMiddleware, cacheMiddleware(3600), getWishlist);
router.put("/save-address", authMiddleware, saveAddress);
router.get("/order/get-orders", authMiddleware, getOrders);
router.get("/order/get-all-orders", authMiddleware, isAdmin, getAllOrders);
router.get(
  "/order/get-orderby-user/:id",
  authMiddleware,
  isAdmin,
  getOrderByUserId
);
router.get(
  "/get-info",
  timeoutMiddleware(5000),
  authMiddleware,
  getLoggedinUser
);
router.get(
  "/get-user/:id",
  timeoutMiddleware(10000),
  authMiddleware,
  isAdmin,
  cacheMiddleware(3600),
  getaUser
);
router.delete("/delete-user", authMiddleware, deleteUser);
router.put("/edit-user", authMiddleware, updateUser);
router.put("/block-user/:id", authMiddleware, isAdmin, blockUser);
router.put("/unblock-user/:id", authMiddleware, isAdmin, unblockUser);
router.delete("/empty-cart", authMiddleware, emptyCart);

module.exports = router;
