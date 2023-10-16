const express = require("express");
const router = express.Router();
const {createBlog, updateBlog, getBlog, getAllBlogs, deleteBlog, likeBlog} = require("../controller/BlogController");
const {advancedFiltering} = require("../middlewares/advanceFiltering");
const {authMiddleware,isAdmin} = require("../middlewares/authMiddleware");
const Blog = require("../models/BlogModel");


router.post('/create-blog',authMiddleware,isAdmin,createBlog);
router.put('/update-blog/:id',authMiddleware,isAdmin,updateBlog);
router.get('/get-blog/:id',authMiddleware,isAdmin,getBlog);
router.get('/all-blogs',authMiddleware,isAdmin,advancedFiltering(Blog),getAllBlogs);
router.delete('/delete-blog/:id',authMiddleware,isAdmin,deleteBlog);
router.put('/like-blog',authMiddleware,likeBlog);

module.exports = router;