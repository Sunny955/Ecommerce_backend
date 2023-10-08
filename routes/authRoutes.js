const express = require("express");
const { createUser, loginUser, getAllUsers, getaUser } = require("../controller/UserCtrl");
const router = express.Router();

router.post('/register',createUser);
router.post('/login',loginUser);
router.get("/all-users",getAllUsers);
router.get("/:id",getaUser);

module.exports = router;