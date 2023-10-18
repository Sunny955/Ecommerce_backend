const express = require("express");
const router = express.Router();
const {createCategory, updateCategory, deleteCategory, getCategory, getAllCategories} = require("../controller/ProdCatController");
const {advancedFiltering} = require("../middlewares/advanceFiltering");
const {authMiddleware,isAdmin} = require("../middlewares/authMiddleware");

router.post('/create-cat',authMiddleware,isAdmin,createCategory);
router.get('/get-cat/:id',authMiddleware,isAdmin,getCategory);
router.get('/get-all',authMiddleware,isAdmin,getAllCategories);
router.put('/update-cat/:id',authMiddleware,isAdmin,updateCategory);
router.delete('/delete-cat/:id',authMiddleware,isAdmin,deleteCategory);

module.exports = router;