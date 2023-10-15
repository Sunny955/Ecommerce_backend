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

  module.exports = {createBlog,updateBlog,getBlog,getAllBlogs};