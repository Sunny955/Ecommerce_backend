const express = require("express");
const router = express.Router();
const {advancedFiltering} = require("../middlewares/advanceFiltering");
const {authMiddleware,isAdmin} = require("../middlewares/authMiddleware");
const { createBrand, getBrand, getAllBrands, updateBrand, deleteBrand } = require("../controller/BrandController");

router.post('/create-brand',authMiddleware,isAdmin,createBrand);
router.get('/get-brand/:id',authMiddleware,isAdmin,getBrand);
router.get('/get-all',authMiddleware,isAdmin,getAllBrands);
router.put('/update-brand/:id',authMiddleware,isAdmin,updateBrand);
router.delete('/delete-brand/:id',authMiddleware,isAdmin,deleteBrand);

module.exports = router;