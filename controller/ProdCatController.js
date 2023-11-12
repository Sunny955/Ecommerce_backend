const Category = require("../models/ProductCategoryModel");
const asyncHandler = require("express-async-handler");
const { validateMongoDbId } = require("../utils/reqValidations");

// for every route put v1 after api like: api/v1/product-cat/...

/**
 * @route POST api/v1/product-cat/create-cat
 * @description Create a new category in the database using the data provided in the request body.
 * @param {Object} req - Express request object. Expected to have the category details in the body.
 * @param {Object} res - Express response object. Will return the newly created category's details or an appropriate error message.
 * @throws {Error} Possible errors include category validation errors or server/database errors.
 * @returns {Object} JSON response with the new category's details or an error message.
 */
const createCategory = asyncHandler(async (req, res) => {
  // Validate request body data
  if (!req.body.title) {
    return res
      .status(400)
      .json({ success: false, message: "Category title is required" });
  }

  try {
    // Create a new category using the request body
    const newCategory = await Category.create(req.body);

    // Send the newly created category as the response
    res.status(201).json({ success: true, data: newCategory });
  } catch (error) {
    // Check for duplicate key error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.title) {
      return res
        .status(400)
        .json({ success: false, message: "Category title already exists!" });
    }
    // Handle other errors
    error.message = "Error creating category";
    console.log("error occurred", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * @route PUT api/v1/product-cat/update-cat/:id
 * @description Update the details of a specific category based on the provided category ID.
 * @param {Object} req - Express request object. Expected to have the category ID in params and any updated fields in the body.
 * @param {Object} res - Express response object. Will return the updated category details or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, category not found, and other server/database errors.
 * @returns {Object} JSON response with the updated category's details or an error message.
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate MongoDB ID
  if (!validateMongoDbId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid category ID" });
  }

  try {
    const updatedCategory = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
    }).select("-__v");
    // Check if category was found and updated

    if (!updatedCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({ success: true, data: updatedCategory });
  } catch (error) {
    // General error handling
    console.log("error occured", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * @route DELETE api/v1/product-cat/delete-cat/:id
 * @description Delete a specific category based on the provided category ID.
 * @param {Object} req - Express request object. Expected to have the category ID in params.
 * @param {Object} res - Express response object. Will return a success message or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, category not found, and server/database errors.
 * @returns {Object} JSON response with a success message or an error message.
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate MongoDB ID
  if (!validateMongoDbId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid category ID" });
  }

  try {
    const deletedCategory = await Category.findByIdAndDelete(id);

    // Check if category was found and deleted
    if (!deletedCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    // Handle unexpected errors
    res
      .status(500)
      .json({ success: false, message: "Error deleting category" });
  }
});

/**
 * @route GET api/v1/product-cat/get-cat/:id
 * @description Retrieve the details of a specific category based on the provided category ID.
 * @param {Object} req - Express request object. Expected to have the category ID in params.
 * @param {Object} res - Express response object. Will return the category details or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, category not found, and server/database errors.
 * @returns {Object} JSON response with the category's details or an error message.
 */
const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate MongoDB ID
  if (!validateMongoDbId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid category ID" });
  }

  try {
    const category = await Category.findById(id).select("-__v");

    // Check if category was found
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    // Handle unexpected errors
    console.log("erorr occurred", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * @route GET api/v1/product-cat/get-all
 * @description Retrieve all categories from the database.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object. Will return a list of all categories or an appropriate error message.
 * @throws {Error} Possible errors include server/database errors.
 * @returns {Object} JSON response with a list of all categories or an error message.
 */
const getAllCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await Category.find().select("-__v");

    // Return the list of categories
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    // Handle unexpected errors
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategory,
  getAllCategories,
};
