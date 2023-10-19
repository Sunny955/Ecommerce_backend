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
} = require("../controller/UserController");
const router = express.Router();
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");
const { advancedFiltering } = require("../middlewares/advanceFiltering");
const User = require("../models/UserModel");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");

router.post("/register", createUser);
router.post("/forgot-password-token", forgotPasswordToken);
router.put("/reset-password/:token", resetPassword);
router.put("/update-password", authMiddleware, updatePassword);
router.post("/login", loginUser);
router.get(
  "/all-users",
  advancedFiltering(User),
  cacheMiddleware(3600),
  getAllUsers
);
router.get("/refresh", handleRefreshToken);
router.get("/logout", logoutUser);
router.get("/:id", authMiddleware, isAdmin, cacheMiddleware(3600), getaUser);
router.delete("/delete-user", authMiddleware, deleteUser);
router.put("/edit-user", authMiddleware, updateUser);
router.put("/block-user/:id", authMiddleware, isAdmin, blockUser);
router.put("/unblock-user/:id", authMiddleware, isAdmin, unblockUser);

module.exports = router;
