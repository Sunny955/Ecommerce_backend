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
  deleteImage,
  blogLoggedIn,
} = require("../controller/BlogController");
const { advancedFiltering } = require("../middlewares/advanceFiltering");
const { authMiddleware, isAdmin } = require("../middlewares/authMiddleware");
const Blog = require("../models/BlogModel");
const { cacheMiddleware } = require("../middlewares/cacheMiddleware");
const { timeoutMiddleware } = require("../middlewares/timeoutMiddleware");
const { uploadPhoto, blogImgResize } = require("../middlewares/uploadImage");

router.post("/create-blog", authMiddleware, createBlog);
router.put("/update-blog/:id", authMiddleware, updateBlog);
router.get(
  "/get-blog/:id",
  timeoutMiddleware(10000),
  authMiddleware,
  cacheMiddleware(3600),
  getBlog
);
router.get(
  "/get-blogs/user",
  timeoutMiddleware(10000),
  authMiddleware,
  blogLoggedIn
);
router.get(
  "/all-blogs",
  authMiddleware,
  isAdmin,
  advancedFiltering(Blog),
  cacheMiddleware(3600),
  getAllBlogs
);
router.delete("/delete-blog/:id", authMiddleware, deleteBlog);
router.put("/like-blog", authMiddleware, likeBlog);
router.put("/dislike-blog", authMiddleware, dislikeBlog);
router.put(
  "/upload-image/:id",
  timeoutMiddleware(25000),
  authMiddleware,
  uploadPhoto.array("images", 2),
  blogImgResize,
  uploadImages
);
router.put(
  "/delete-image/:id",
  timeoutMiddleware(15000),
  authMiddleware,
  deleteImage
);

module.exports = router;
