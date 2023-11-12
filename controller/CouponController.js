const Coupon = require("../models/CouponModel");
const asyncHandler = require("express-async-handler");
const { validateMongoDbId } = require("../utils/reqValidations");

// // for every route put v1 after api like: api/v1/coupon/...

/**
 * @route POST api/v1/coupon/create
 * @description Create a new coupon in the database. The function expects the 'name', 'discount', and 'expiry' fields in the request body. The 'name' is transformed to uppercase, and several validations are enforced by the Coupon schema in the database.
 * @param {Object} req - Express request object. Expected to contain 'name', 'discount', and 'expiry' fields in the body.
 * @param {Object} res - Express response object. Returns the newly created coupon details or an appropriate error message.
 * @throws {Error} Possible errors include missing fields in the request body, Mongoose validation errors, or other server/database errors.
 * @returns {Object} JSON response with the created coupon details or an error message.
 */
const createCoupon = asyncHandler(async (req, res) => {
  // Destructure necessary fields from request body.
  const { name, discount, expiry } = req.body;

  // Validate input data
  if (!name || !discount || !expiry) {
    return res
      .status(400)
      .json({ message: "Name, discount, and expiry are required fields." });
  }

  try {
    // Create a new coupon in the database
    const newCoupon = await Coupon.create({
      name: name.toUpperCase(),
      discount,
      expiry: new Date(expiry),
    });

    // Send a success response with the created coupon data
    res.status(201).json({
      success: true,
      data: newCoupon,
      message: "Coupon successfully created.",
    });
  } catch (error) {
    console.error(`Failed to create coupon: ${error.message}`);

    // Check for a validation error (from Mongoose) and respond with that if available
    const errorMessage =
      error.errors && error.errors[Object.keys(error.errors)[0]].message
        ? error.errors[Object.keys(error.errors)[0]].message
        : "Internal server error. Failed to create coupon.";

    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});

/**
 * @route GET api/v1/coupon/get-all
 * @description Retrieve all coupons from the database.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object. Returns a list of all coupons or an appropriate error message.
 * @throws {Error} Possible errors include server/database errors.
 * @returns {Object} JSON response with a list of all coupons or an error message.
 */
const getAllCoupons = asyncHandler(async (req, res) => {
  try {
    const coupons = await Coupon.find();

    if (!coupons) {
      return res.status(404).json({ message: "No coupons found." });
    }

    res.status(200).json(coupons);
  } catch (error) {
    console.error(`Error fetching coupons: ${error.message}`);
    res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * @route PUT api/v1/coupon/update-coupon/:id
 * @description Update a specific coupon's details in the database.
 * @param {Object} req - Express request object. Contains the ID of the coupon in route parameters and the updated data in the body.
 * @param {Object} res - Express response object. Returns the updated coupon details or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, coupon not found, server/database errors.
 * @returns {Object} JSON response with the updated coupon details or an error message.
 */
const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if the provided ID is a valid MongoDB ObjectID.
  if (!validateMongoDbId(id)) {
    return res.status(400).json({
      success: false,
      message: "Provided ID is not a valid MongoDB ID.",
    });
  }

  try {
    const updatedCoupon = await Coupon.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    // Check if coupon was found and updated
    if (!updatedCoupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found." });
    }

    res.status(200).json(updatedCoupon);
  } catch (error) {
    console.error(`Error updating coupon: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route DELETE api/v1/coupon/delete-coupon/:id
 * @description Delete a specific coupon from the database.
 * @param {Object} req - Express request object. Contains the ID of the coupon in route parameters.
 * @param {Object} res - Express response object. Returns a success message or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, coupon not found, and server/database errors.
 * @returns {Object} JSON response with a success message or an error message.
 */
const deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if the provided ID is a valid MongoDB ObjectID.
  if (!validateMongoDbId(id)) {
    return res.status(400).json({
      success: false,
      message: "Provided ID is not a valid MongoDB ID.",
    });
  }

  try {
    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    // Check if coupon was found and deleted
    if (!deletedCoupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found." });
    }

    res.status(200).json({
      success: true,
      data: deletedCoupon,
      message: "Coupon successfully deleted.",
    });
  } catch (error) {
    console.error(`Error deleting coupon: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET api/v1/coupon/get-coupon/:id
 * @description Retrieve a specific coupon from the database based on its ID.
 * @param {Object} req - Express request object. Contains the ID of the coupon in route parameters.
 * @param {Object} res - Express response object. Returns the requested coupon or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, coupon not found, and server/database errors.
 * @returns {Object} JSON response with the requested coupon or an error message.
 */
const getCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate if the provided ID is a valid MongoDB ObjectID.
  if (!validateMongoDbId(id)) {
    return res.status(400).json({
      success: false,
      message: "Provided ID is not a valid MongoDB ID.",
    });
  }

  try {
    const fetchedCoupon = await Coupon.findById(id);

    // Check if the coupon was found.
    if (!fetchedCoupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found." });
    }

    res.status(200).json({ success: true, data: fetchedCoupon });
  } catch (error) {
    console.error(`Error retrieving coupon: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = {
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
  getCoupon,
};
