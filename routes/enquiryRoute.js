const express = require("express");
const {
  createEnquiry,
  updateEnquiry,
  deleteEnquiry,
  getEnquiry,
  getallEnquiry,
  getEnquiriesByUser,
} = require("../controller/EnquiryController");
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/:product_id", authMiddleware, createEnquiry);
router.put("/:id", authMiddleware, isAdmin, updateEnquiry);
router.delete("/:id", authMiddleware, isAdmin, deleteEnquiry);
router.get("/get-inquiry/:id", authMiddleware, getEnquiry);
router.get("/", authMiddleware, isAdmin, getallEnquiry);
router.get("/user", authMiddleware, getEnquiriesByUser);

module.exports = router;
