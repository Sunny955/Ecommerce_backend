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

  module.exports = {createBlog};