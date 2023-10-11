const express = require("express");
const { createUser, loginUser, getAllUsers, getaUser, deleteUser, updateUser, blockUser, unblockUser, handleRefreshToken, logoutUser } = require("../controller/UserCtrl");
const router = express.Router();
const {authMiddleware,isAdmin} = require("../middlewares/authMiddleware")

router.post('/register',createUser);
router.post('/login',loginUser);
router.get("/all-users",getAllUsers);
router.get("/refresh",handleRefreshToken);
router.get("/logout",logoutUser);
router.get("/:id",authMiddleware,isAdmin,getaUser);
router.delete("/delete-user",authMiddleware,deleteUser);
router.put("/edit-user",authMiddleware,updateUser);
router.put("/block-user/:id",authMiddleware,isAdmin,blockUser);
router.put("/unblock-user/:id",authMiddleware,isAdmin, unblockUser);

module.exports = router;