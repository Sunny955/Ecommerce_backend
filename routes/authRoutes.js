const express = require("express");
const { createUser, loginUser, getAllUsers, getaUser, deleteUser, updateUser } = require("../controller/UserCtrl");
const router = express.Router();
const {authMiddleware,isAdmin} = require("../middlewares/authMiddleware")

router.post('/register',createUser);
router.post('/login',loginUser);
router.get("/all-users",getAllUsers);
router.get("/:id",authMiddleware,isAdmin,getaUser);
router.delete("/:id",authMiddleware,deleteUser);
router.put("/:id",authMiddleware,updateUser);

module.exports = router;