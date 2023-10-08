const express = require("express");
const { createUser, loginUser } = require("../controller/UserCtrl");
const router = express.Router();

router.post('/register',createUser);
router.post('/login',loginUser);

module.exports = router;