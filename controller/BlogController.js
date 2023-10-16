const Blog = require("../models/BlogModel");
const User = require("../models/UserModel");
const {validateMongoDbId} = require("../utils/reqValidations");
const asyncHandler = require("express-async-handler");

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
  const createBlog = asyncHandler(async (req, res, next) => {
    try {
        const newBlog = await Blog.create(req.body);
        res.status(201).json({
            success: true,
            data: newBlog
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
  
      // Return the updated blog entry
      res.json(updatedBlog);
    } catch (error) {
      console.error("Error updating the blog:", error);
      
      // If there are validation errors, send them to the client
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
      }
  
      // Send a generic server error for other types of errors
      res.status(500).json({ message: "Server error while updating the blog." });
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
      .populate("likes")
      .populate("dislikes");
  
      // Check if the blog was found
      if (!blog) {
        return res.status(404).json({ message: "Blog not found." });
      }
  
      // Return the retrieved blog entry
      res.status(200).json({success: true,data:blog});
    } catch (error) {
      console.error("Error retrieving the blog:", error);
      
      // If there are validation errors, send them to the client
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
      }
  
      // Send a generic server error for other types of errors
      res.status(500).json({ message: "Server error while retrieving the blog." });
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
  const getAllBlogs = asyncHandler(async(req,res) => {
    try {
        const blogs = await req.advancedFilter;
    
        res.status(200).json({
          success: true,
          pagination: req.advancedFilter.pagination,
          count: blogs.length,
          data: blogs
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
  
      // Return the deleted blog entry
      res.status(200).json({ success: true, data: deletedBlog , message : "Deleted successfully"});
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
      return res.status(400).json({ message: "User not authenticated." });
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
          isDisliked: false,  // Assuming you want to set this flag for the entire blog post, not per user
        };
      } else if (hasLiked) {
        update = {
          $pull: { likes: loginUserId },
          isLiked: false, // Similarly, assuming this flag is for the entire blog post
        };
      } else {
        update = {
          $push: { likes: loginUserId },
          isLiked: true, // And again for this flag
        };
      }
  
      // Apply the update
      const updatedBlog = await Blog.findByIdAndUpdate(blogId, update, { new: true });
      res.status(200).json({success:true, data:updatedBlog});
  
    } catch (error) {
      console.error("Error while liking/unliking the blog:", error);
      
      // Send a generic server error for database errors
      res.status(500).json({ message: "Server error while liking/unliking the blog." });
    }
  });

  module.exports = {createBlog,updateBlog,getBlog,getAllBlogs,deleteBlog,likeBlog};