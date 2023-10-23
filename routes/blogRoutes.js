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
  uploadImages,
} = require("../controller/BlogController");
const { advancedFiltering } = require("../middlewares/advanceFiltering");
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");
const Blog = require("../models/BlogModel");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");
const { timeoutMiddleware } = require("../middlewares/timeoutMiddleware");
const { uploadPhoto, blogImgResize } = require("../middlewares/uploadImage");

router.post("/create-blog", authMiddleware, isAdmin, createBlog);
router.put("/update-blog/:id", authMiddleware, isAdmin, updateBlog);
router.get(
  "/get-blog/:id",
  timeoutMiddleware(10000),
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
router.put(
  "/upload-image/:id",
  timeoutMiddleware(25000),
  authMiddleware,
  isAdmin,
  uploadPhoto.array("images", 2),
  blogImgResize,
  uploadImages
);

module.exports = router;
