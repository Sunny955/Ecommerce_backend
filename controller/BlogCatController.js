const Category = require("../models/BlogCategoryModel");
const asyncHandler = require("express-async-handler");
const {validateMongoDbId} = require("../utils/reqValidations");

/**
 * @route POST api/blog-cat/create-cat
 * @description Create a new category in the database using the data provided in the request body.
 * @param {Object} req - Express request object. Expected to have the category details in the body.
 * @param {Object} res - Express response object. Will return the newly created category's details or an appropriate error message.
 * @throws {Error} Possible errors include category validation errors or server/database errors.
 * @returns {Object} JSON response with the new category's details or an error message.
 */
const createCategory = asyncHandler(async (req, res) => {
    // Validate request body data
    if (!req.body.title) {
      return res.status(400).json({ message: "Category title is required" });
    }
  
    try {
      // Create a new category using the request body
      const newCategory = await Category.create(req.body);
  
      // Send the newly created category as the response
      res.status(201).json({ success: true, data: newCategory });
    } catch (error) {
      // Check for duplicate key error
      if (error.code === 11000 && error.keyPattern && error.keyPattern.title) {
        return res.status(400).json({ message: 'Category title already exists!' });
      }
      // Handle other errors
      error.message = "Error creating category";
      res.status(500).json({ message: error.message });
    }
});


  module.exports = {createCategory};