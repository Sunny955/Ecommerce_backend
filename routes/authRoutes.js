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
} = require("../controller/UserController");
const router = express.Router();
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");
const { advancedFiltering } = require("../middlewares/advanceFiltering");
const User = require("../models/UserModel");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");
const { timeoutMiddleware } = require("../middlewares/timeoutMiddleware");

router.post("/register", createUser);
router.post("/forgot-password-token", forgotPasswordToken);
router.put("/reset-password/:token", resetPassword);
router.put("/update-password", authMiddleware, updatePassword);
router.post("/login", timeoutMiddleware(10000), loginUser);
router.post("/admin-login", timeoutMiddleware(10000), loginAdmin);
router.post("/add-cart", timeoutMiddleware(15000), authMiddleware, userCart);
router.get("/get-cart", authMiddleware, getUserCart);
router.get(
  "/all-users",
  timeoutMiddleware(20000),
  authMiddleware,
  advancedFiltering(User),
  cacheMiddleware(3600),
  getAllUsers
);
router.get("/refresh", handleRefreshToken);
router.get("/logout", logoutUser);
router.get("/get-wishlist", authMiddleware, getWishlist);
router.put("/save-address", authMiddleware, saveAddress);
router.get(
  "/:id",
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

module.exports = router;
