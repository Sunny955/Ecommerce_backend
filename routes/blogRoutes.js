const express = require("express");
const router = express.Router();
const {
  createBlog,
  updateBlog,
  getBlog,
  getAllBlogs,
  deleteBlog,
  likeBlog,
  dislikeBlog,
} = require("../controller/BlogController");
const { advancedFiltering } = require("../middlewares/advanceFiltering");
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");
const Blog = require("../models/BlogModel");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");

router.post("/create-blog", authMiddleware, isAdmin, createBlog);
router.put("/update-blog/:id", authMiddleware, isAdmin, updateBlog);
router.get(
  "/get-blog/:id",
  authMiddleware,
  isAdmin,
  cacheMiddleware(3600),
  getBlog
);
router.get(
  "/all-blogs",
  authMiddleware,
  isAdmin,
  advancedFiltering(Blog),
  cacheMiddleware(3600),
  getAllBlogs
);
router.delete("/delete-blog/:id", authMiddleware, isAdmin, deleteBlog);
router.put("/like-blog", authMiddleware, likeBlog);
router.put("/dislike-blog", authMiddleware, dislikeBlog);

module.exports = router;
