const express = require("express");
const router = express.Router();
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");
const {
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
  getCoupon,
} = require("../controller/CouponController");

router.post("/create-coupon", authMiddleware, isAdmin, createCoupon);
router.get("/get-all", authMiddleware, isAdmin, getAllCoupons);
router.put("/update-coupon/:id", authMiddleware, isAdmin, updateCoupon);
router.delete("/delete-coupon/:id", authMiddleware, isAdmin, deleteCoupon);
router.get("/get-coupon/:id", authMiddleware, isAdmin, getCoupon);

module.exports = router;
