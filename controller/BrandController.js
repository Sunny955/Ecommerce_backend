const Brand = require("../models/BrandModel");
const asyncHandler = require("express-async-handler");
const { validateMongoDbId } = require("../utils/reqValidations");

// for every route put v1 after api like: api/v1/brand/...

/**
 * @route POST api/v1/brand/create-brand
 * @description Create a new brand in the database using the data provided in the request body.
 * @param {Object} req - Express request object. Expected to have the brand details in the body.
 * @param {Object} res - Express response object. Will return the newly created brand's details or an appropriate error message.
 * @throws {Error} Possible errors include brand validation errors or server/database errors.
 * @returns {Object} JSON response with the new brand's details or an error message.
 */
const createBrand = asyncHandler(async (req, res) => {
  // Validate request body data
  if (!req.body.title) {
    return res.status(400).json({ message: "brand title is required" });
  }

  try {
    // Create a new brand using the request body
    const newBrand = await Brand.create(req.body);

    // Send the newly created brand as the response
    res.status(201).json({ success: true, data: newBrand });
  } catch (error) {
    // Check for duplicate key error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.title) {
      return res.status(400).json({ message: "Brand title already exists!" });
    }
    // Handle other errors
    error.message = "Error creating brand";
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route PUT api/v1/brand/update-brand/:id
 * @description Update the details of a specific brand based on the provided brand ID.
 * @param {Object} req - Express request object. Expected to have the brand ID in params and any updated fields in the body.
 * @param {Object} res - Express response object. Will return the updated brand details or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, brand not found, and other server/database errors.
 * @returns {Object} JSON response with the updated brand's details or an error message.
 */
const updateBrand = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate MongoDB ID
  if (!validateMongoDbId(id)) {
    return res.status(400).json({ message: "Invalid brand ID" });
  }

  try {
    const updatedBrand = await Brand.findByIdAndUpdate(id, req.body, {
      new: true,
    }).select("-__v");
    // Check if brand was found and updated

    if (!updatedBrand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.status(200).json({ success: true, data: updatedBrand });
  } catch (error) {
    // General error handling
    res.status(500).json({ success: false, message: "Error updating brand" });
  }
});

/**
 * @route DELETE api/v1/brand/delete-brand/:id
 * @description Delete a specific brand based on the provided brand ID.
 * @param {Object} req - Express request object. Expected to have the brand ID in params.
 * @param {Object} res - Express response object. Will return a success message or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, brand not found, and server/database errors.
 * @returns {Object} JSON response with a success message or an error message.
 */
const deleteBrand = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate MongoDB ID
  if (!validateMongoDbId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid brand ID" });
  }

  try {
    const deletedBrand = await Brand.findByIdAndDelete(id);

    // Check if brand was found and deleted
    if (!deletedBrand) {
      return res
        .status(404)
        .json({ success: false, message: "Brand not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Brand deleted successfully" });
  } catch (error) {
    // Handle unexpected errors
    res.status(500).json({
      success: false,
      message: "Error deleting brand",
      error: error.message,
    });
  }
});

/**
 * @route GET api/v1/brand/get-brand/:id
 * @description Retrieve the details of a specific brand based on the provided brand ID.
 * @param {Object} req - Express request object. Expected to have the brand ID in params.
 * @param {Object} res - Express response object. Will return the brand details or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, brand not found, and server/database errors.
 * @returns {Object} JSON response with the brand's details or an error message.
 */
const getBrand = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate MongoDB ID
  if (!validateMongoDbId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid brand ID" });
  }

  try {
    const brand = await Brand.findById(id).select("-__v");

    // Check if brand was found
    if (!brand) {
      return res
        .status(404)
        .json({ success: false, message: "Brand not found" });
    }

    res.status(200).json({ success: true, data: brand });
  } catch (error) {
    // Handle unexpected errors
    res.status(500).json({
      success: false,
      message: "Error retrieving brand",
      error: error.message,
    });
  }
});

/**
 * @route GET api/v1/brand/get-all
 * @description Retrieve all categories from the database.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object. Will return a list of all categories or an appropriate error message.
 * @throws {Error} Possible errors include server/database errors.
 * @returns {Object} JSON response with a list of all categories or an error message.
 */
const getAllBrands = asyncHandler(async (req, res) => {
  try {
    const brands = await Brand.find().select("-__v");

    // Return the list of categories
    res.status(200).json({ success: true, data: brands });
  } catch (error) {
    // Handle unexpected errors
    res.status(500).json({
      success: false,
      message: "Error retrieving categories",
      error: error.message,
    });
  }
});

module.exports = {
  createBrand,
  updateBrand,
  deleteBrand,
  getBrand,
  getAllBrands,
};
