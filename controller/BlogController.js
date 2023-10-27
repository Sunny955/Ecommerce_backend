const Blog = require("../models/BlogModel");
const User = require("../models/UserModel");
const { validateMongoDbId } = require("../utils/reqValidations");
const asyncHandler = require("express-async-handler");
const { cache } = require("../middlewares/cacheMiddleware");
const BLOGS_KEY = "/api/blog/all-blogs";
const blogKey = (id) => `/api/blog/get-blog/${id}`;
const {
  cloudinaryUploadImg,
  cloudinaryDeleteImg,
} = require("../utils/cloudinary");
const fs = require("fs");

/**
 * @route POST /api/blogs/create-blog
 * @description Creates a new blog entry. Expects title, description, and other relevant fields in the request body.
 * @access Private/Protected - Access limited to authenticated users with proper roles (if role-based).
 *
 * @param {Object} req - Express request object. Requires blog data in the body.
 * @param {Object} res - Express response object. Returns the newly created blog on successful creation or an appropriate error message.
 * @param {Function} next - Express next middleware function.
 *
 * @throws {Error} Possible errors can include validation errors from the mongoose model or database errors.
 * @returns {Object} JSON response with the newly created blog or an appropriate error message.
 */
const createBlog = asyncHandler(async (req, res) => {
  try {
    const newBlog = await Blog.create(req.body);

    // Invalidate all blogs cache
    cache.del(BLOGS_KEY);

    res.status(201).json({
      success: true,
      data: newBlog,
    });
  } catch (error) {
    throw new Error(error);
  }
});

/**
 * @route PUT /api/blogs/update-blog/:id
 * @description Updates an existing blog entry. Expects title, description, and other relevant fields in the request body.
 * @access Private/Protected - Access limited to authenticated users with proper roles (if role-based).
 *
 * @param {Object} req - Express request object. Requires blog ID in the params and updated data in the body.
 * @param {Object} res - Express response object. Returns the updated blog on successful update or an appropriate error message.
 * @param {Function} next - Express next middleware function.
 *
 * @throws {Error} Possible errors can include invalid MongoDB ID, validation errors from the mongoose model, or database errors.
 * @returns {Object} JSON response with the updated blog or an appropriate error message.
 */

const updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate the MongoDB ID
  if (!validateMongoDbId(id)) {
    return res.status(400).json({ message: "Invalid blog ID provided." });
  }

  // Check if request body is empty
  if (!Object.keys(req.body).length) {
    return res.status(400).json({ message: "Update data cannot be empty." });
  }

  try {
    // Attempt to find and update the blog entry
    const updatedBlog = await Blog.findByIdAndUpdate(id, req.body, {
      new: true, // Return the updated object
      runValidators: true, // Ensure updated fields meet the model's validation requirements
    });

    // Check if the blog was found and updated
    if (!updatedBlog) {
      return res.status(404).json({ message: "Blog not found." });
    }

    // Invalidate specific blog cache and all blogs cache
    cache.del(blogKey(id));
    cache.del(BLOGS_KEY);

    // Return the updated blog entry
    res.status(200).json({ success: true, data: updatedBlog });
  } catch (error) {
    console.error("Error updating the blog:", error);

    // If there are validation errors, send them to the client
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Send a generic server error for other types of errors
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * @route GET /api/blogs/get-blog/:id
 * @description Retrieves a specific blog entry by ID and increments its view count. Also populates likes and dislikes.
 * @access Public/Private (depending on how it's configured in the route, but for this example, we assume it's public)
 *
 * @param {Object} req - Express request object. Requires blog ID in the params.
 * @param {Object} res - Express response object. Returns the specified blog on successful retrieval or an appropriate error message.
 *
 * @throws {Error} Possible errors can include invalid MongoDB ID, database errors, or a blog not being found.
 * @returns {Object} JSON response with the specified blog entry (with likes and dislikes populated) or an appropriate error message.
 */
const getBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate the MongoDB ID
  if (!validateMongoDbId(id)) {
    return res.status(400).json({ message: "Invalid blog ID provided." });
  }

  try {
    // Increment view count and retrieve the blog with likes and dislikes populated
    const blog = await Blog.findByIdAndUpdate(
      id,
      {
        $inc: { numViews: 1 },
      },
      {
        new: true, // Return the updated object
      }
    )
      .select("-__v")
      .populate(
        "likes",
        "-__v -refreshToken -passwordResetExpires -passwordResetToken -password -wishlist -cart -createdAt -updatedAt"
      )
      .populate(
        "dislikes",
        "-__v -refreshToken -passwordResetExpires -passwordResetToken -password -wishlist -cart -createdAt -updatedAt"
      );

    // Check if the blog was found
    if (!blog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found." });
    }
    // Return the retrieved blog entry
    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    console.error("Error retrieving the blog:", error);

    // If there are validation errors, send them to the client
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Send a generic server error for other types of errors
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @route GET /api/blogs/all-blogs
 * @description Retrieves all blog entries. Optionally supports pagination and limiting the number of results.
 * @access Public/Private (depending on how it's configured in the route, but for this example, we assume it's public)
 *
 * @param {Object} req - Express request object. Optionally accepts 'limit' and 'page' query parameters for pagination.
 * @param {Object} res - Express response object. Returns a list of blogs on successful retrieval or an appropriate error message.
 *
 * @throws {Error} Possible errors can include database errors.
 * @returns {Object} JSON response with a list of blog entries or an appropriate error message.
 */
const getAllBlogs = asyncHandler(async (req, res) => {
  try {
    const blogs = await req.advancedFilter;

    res.status(200).json({
      success: true,
      pagination: req.advancedFilter.pagination,
      count: blogs.length,
      data: blogs,
    });
  } catch (error) {
    res.status(500); // Internal Server Error
    throw new Error("Error retrieving users: " + error.message);
  }
});

/**
 * @route DELETE /api/blogs/delete-blog/:id
 * @description Deletes a specific blog entry by ID.
 * @access Private/Protected - Access limited to authenticated users with proper roles (such as admins or the author of the blog).
 *
 * @param {Object} req - Express request object. Requires blog ID in the params.
 * @param {Object} res - Express response object. Returns the deleted blog on successful deletion or an appropriate error message.
 *
 * @throws {Error} Possible errors can include invalid MongoDB ID, database errors, or a blog not being found.
 * @returns {Object} JSON response with the deleted blog entry or an appropriate error message.
 */
const deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate the MongoDB ID
  if (!validateMongoDbId(id)) {
    return res.status(400).json({ message: "Invalid blog ID provided." });
  }

  try {
    // Attempt to find and delete the blog
    const deletedBlog = await Blog.findByIdAndDelete(id);

    // Check if the blog was found and deleted
    if (!deletedBlog) {
      return res.status(404).json({ message: "Blog not found." });
    }

    // Invalidate specific blog cache and all blogs cache
    cache.del(blogKey(id));
    cache.del(BLOGS_KEY);

    // Return the deleted blog entry
    res.status(200).json({
      success: true,
      data: deletedBlog,
      message: "Deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting the blog:", error);

    // Send a generic server error for database errors
    res.status(500).json({ message: "Server error while deleting the blog." });
  }
});

/**
 * @route POST /api/blogs/like
 * @description Allows a user to like a blog. If the user has previously disliked the blog, the dislike is removed. If the user has already liked the blog, the like is removed (unlike).
 * @access Private - Access limited to authenticated users.
 *
 * @param {Object} req - Express request object. Requires 'blogId' in the request body and user details (assuming populated in 'user' from previous middleware).
 * @param {Object} res - Express response object. Returns the updated blog on successful like/unlike or an appropriate error message.
 *
 * @throws {Error} Possible errors can include invalid MongoDB ID, database errors, or a blog not being found.
 * @returns {Object} JSON response with the updated blog entry (liked/unliked) or an appropriate error message.
 */
const likeBlog = asyncHandler(async (req, res) => {
  const { blogId } = req.body;

  // Validate the MongoDB ID
  if (!validateMongoDbId(blogId)) {
    return res.status(400).json({ message: "Invalid blog ID provided." });
  }

  // Extract logged-in user's ID
  const loginUserId = req?.user?._id;
  if (!loginUserId) {
    return res.status(400).json({ message: "User not logged in." });
  }

  try {
    // Fetch the blog to check existing like/dislike status
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found." });
    }

    // Check if the user has already liked or disliked the blog
    const hasLiked = blog.likes.includes(loginUserId);
    const hasDisliked = blog.dislikes.includes(loginUserId);

    let update = {};

    // Update logic based on the like/dislike status
    if (hasDisliked) {
      update = {
        $pull: { dislikes: loginUserId },
        isDisliked: false,
        $push: hasLiked ? {} : { likes: loginUserId },
        isLiked: true,
      };
    } else if (hasLiked) {
      update = {
        $pull: { likes: loginUserId },
        isLiked: false,
      };
    } else {
      update = {
        $push: { likes: loginUserId },
        isLiked: true,
      };
    }

    // Apply the update
    const updatedBlog = await Blog.findByIdAndUpdate(blogId, update, {
      new: true,
    });

    // Invalidate specific blog cache
    cache.del(blogKey(blogId));
    cache.del(BLOGS_KEY);

    res.status(200).json({ success: true, data: updatedBlog });
  } catch (error) {
    console.error("Error while liking the blog:", error);

    // Send a generic server error for database errors
    res.status(500).json({ message: "Server error while liking the blog." });
  }
});

/**
 * @route POST /api/blogs/dislike-blog
 * @description Allows a user to dislike a blog. If the user has previously liked the blog, the like is removed. If the user has already disliked the blog, the dislike is removed (undislike).
 * @access Private - Access limited to authenticated users.
 *
 * @param {Object} req - Express request object. Requires 'blogId' in the request body and user details (assuming populated in 'user' from previous middleware).
 * @param {Object} res - Express response object. Returns the updated blog on successful dislike/undislike or an appropriate error message.
 *
 * @throws {Error} Possible errors can include invalid MongoDB ID, database errors, or a blog not being found.
 * @returns {Object} JSON response with the updated blog entry (disliked/undisliked) or an appropriate error message.
 */
const dislikeBlog = asyncHandler(async (req, res) => {
  // Extracting blog ID from request body
  const { blogId } = req.body;

  // Validate MongoDB ID
  if (!validateMongoDbId(blogId)) {
    return res.status(400).send({ message: "Invalid blog ID provided." });
  }

  // Get the logged-in user's ID
  const loginUserId = req?.user?._id;
  if (!loginUserId) {
    return res.status(401).send({ message: "User not logged in." });
  }

  try {
    // Fetch the targeted blog
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).send({ message: "Blog not found." });
    }

    // Check if the user has already liked the blog
    const hasLiked = blog.likes.includes(loginUserId.toString());

    // Check if the user has already disliked the blog
    const hasDisliked = blog.dislikes.includes(loginUserId.toString());

    // Initialize update object
    let update = {};

    if (hasLiked) {
      // If the user has previously liked, remove the like
      update = {
        $pull: { likes: loginUserId },
        isLiked: false,
        $push: hasDisliked ? {} : { dislikes: loginUserId },
        isDisliked: hasDisliked ? false : true,
      };
    } else if (hasDisliked) {
      // If the user has previously disliked, remove the dislike
      update = {
        $pull: { dislikes: loginUserId },
        isDisliked: false,
      };
    } else {
      // If the user hasn't previously liked or disliked, add a dislike
      update = {
        $push: { dislikes: loginUserId },
        isDisliked: true,
      };
    }

    // Apply the update to the blog
    const updatedBlog = await Blog.findByIdAndUpdate(blogId, update, {
      new: true,
    });

    // Invalidate specific blog cache
    cache.del(blogKey(blogId));
    cache.del(BLOGS_KEY);

    // Return the updated blog data
    res.status(200).json({ success: true, data: updatedBlog });
  } catch (error) {
    console.error("Error while disliking the blog:", error);

    // Send a generic server error for database errors
    res.status(500).json({ message: "Server error while disliking the blog." });
  }
});

/**
 * @route PUT api/blogs/upload-image/:id
 * @description Upload multiple images for a product and save URLs to the database.
 * @param {Object} req - Express request object, expects product ID in params and images in files.
 * @param {Object} res - Express response object. Returns updated product or an error message.
 * @throws {Error} Possible errors include validation, database, or image upload errors.
 * @returns {Object} JSON response with updated product or an error message.
 */
const uploadImages = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No files uploaded" });
  }

  try {
    const images = [];
    for (const file of req.files) {
      if (fs.existsSync(file.path)) {
        const uploadResult = await cloudinaryUploadImg(file.path);
        images.push({
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        });
        fs.unlinkSync(file.path);
      } else {
        console.log("Path doesn't exists!");
        return res.status(400).json({
          success: false,
          message: "Unable to find the path of the image",
        });
      }
    }

    // Update the specific product with the new image URLs
    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      { $push: { images: { $each: images } } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedBlog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }

    // Invalidate specific blog cache
    cache.del(blogKey(id));
    cache.del(BLOGS_KEY);

    res.json({ success: true, data: updatedBlog });
  } catch (error) {
    console.error("Error in uploading images:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload images" });
  }
});

/**
 * @route PUT api/blogs/delete-image/:id
 * @description Delete a specific image associated with a product from Cloudinary and update the product's image array in the database. Requires the public_id of the image to be passed in the request body.
 * @param {Object} req - Express request object, expects product ID in params and the image's public_id in the body.
 * @param {Object} res - Express response object. Returns a message indicating success or failure of the deletion process.
 * @throws {Error} Possible errors include invalid MongoDB ID, public_id not present in the product's images array, failure to delete the image from Cloudinary, or database errors.
 * @returns {Object} JSON response with a success or error message.
 */
const deleteImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { public_id } = req.body;

  if (!validateMongoDbId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid MongoDB ID" });
  }

  if (!public_id) {
    return res.status(400).json({
      success: false,
      message: "public key is required to delete an image",
    });
  }

  const blog = await Blog.findById(id).select("images");

  if (!blog) {
    return res.status(404).json({ success: false, message: "Blog not found" });
  }

  const exists = blog?.images.some((image) => image.public_id === public_id);

  if (!exists) {
    return res.status(400).json({
      success: false,
      message: "The provided public_id does not exist in the images array.",
    });
  }

  try {
    const deleted = await cloudinaryDeleteImg(public_id);
    if (deleted && deleted.result === "ok") {
      // Remove the image entry from the product's images array
      await Blog.findByIdAndUpdate(id, {
        $pull: { images: { public_id: public_id } },
      });

      // Invalidate specific blog cache
      cache.del(blogKey(id));
      cache.del(BLOGS_KEY);

      res.json({
        success: true,
        message: `Image with public_id ${public_id} is deleted successfully`,
      });
    } else {
      // Handle the scenario where Cloudinary deletion was not successful
      res.status(500).json({
        success: false,
        message: "Failed to delete image from Cloudinary",
      });
    }
  } catch (error) {
    console.log("Error occurred", error.message);

    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = {
  createBlog,
  updateBlog,
  getBlog,
  getAllBlogs,
  deleteBlog,
  likeBlog,
  dislikeBlog,
  uploadImages,
  deleteImage,
};
