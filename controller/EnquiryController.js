const Enquiry = require("../models/EnquiryModel");
const Product = require("../models/ProductModel");
const User = require("../models/UserModel");
const Order = require("../models/OrderModel");
const asyncHandler = require("express-async-handler");
const { validateMongoDbId } = require("../utils/reqValidations");
const { cache } = require("../middlewares/cacheMiddleware");
const keyGetAllProducts = "/api/v1/product/get-all-products";
const allUsersKey = "/api/v1/user/all-users";
/**
 * @route POST /api/enquiry/:product_id
 * @description Create a new enquiry in the database using the data provided in the request body.
 * @param {Object} req - Express request object. Expected to have the enquiry details in the body.
 * @param {Object} res - Express response object. Will return the newly created enquiry's details or an appropriate error message.
 * @throws {Error} Possible errors include enquiry validation errors or server/database errors.
 * @returns {Object} JSON response with the new enquiry's details or an error message.
 */
const createEnquiry = asyncHandler(async (req, res) => {
  const { product_id } = req?.params;
  const { _id, firstname, lastname, email, mobile } = req?.user;
  const { comment } = req.body;

  try {
    // Validation checks
    if (!product_id || !validateMongoDbId(product_id)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid product id",
      });
    }

    if (!comment || comment.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Comment is required" });
    }

    const findProduct = await Product.findById(product_id);
    if (!findProduct) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid product id" });
    }

    // Check if the user has ordered the specified product
    const hasOrderedProduct = await Order.exists({
      orderby: _id,
      "products.product": product_id,
      orderStatus: { $in: ["Delivered"] },
    });

    if (!hasOrderedProduct) {
      return res.status(400).json({
        success: false,
        message:
          "You can only raise an enquiry for products you have ordered and get delivered",
      });
    }

    // Create a new enquiry
    let name = `${firstname} ${lastname}`;
    const newEnquiry = new Enquiry({
      name,
      email,
      mobile,
      user: _id,
      product: product_id,
      comment,
    });

    // Validate the new enquiry
    await newEnquiry.validate();

    // Save the enquiry
    await newEnquiry.save();

    // Update User and Product models with the new enquiry's reference
    const [updatedUser, updatedProduct] = await Promise.all([
      User.findByIdAndUpdate(
        _id,
        { $push: { enquiries: newEnquiry._id } },
        { new: true }
      ),
      Product.findByIdAndUpdate(
        product_id,
        { $push: { enquiries: newEnquiry._id } },
        { new: true }
      ),
    ]);

    // Invalidate cache for the specific user
    const userKey = `/api/v1/user/${_id}`;
    cache.del(userKey);
    cache.del(allUsersKey);

    // Invalidate cache after updating a product
    cache.del(keyGetAllProducts);
    cache.del(`/api/v1/product/get-a-product/${product_id}`);

    return res.status(201).json({
      success: true,
      data: newEnquiry,
      message: "New enquiry for the product is created",
    });
  } catch (error) {
    console.error("error occurred", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * @route PUT /api/enquiry/:id
 * @description Update an existing enquiry by ID using the data provided in the request body.
 * @param {Object} req - Express request object. Expected to have the updated enquiry details in the body.
 * @param {Object} res - Express response object. Will return the updated enquiry's details or an appropriate error message.
 * @throws {Error} Possible errors include enquiry validation errors, not found error, or server/database errors.
 * @returns {Object} JSON response with the updated enquiry's details or an error message.
 */
const updateEnquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req?.body;

  if (!validateMongoDbId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid MongoDB ID" });
  }

  if (!status) {
    return res
      .status(400)
      .json({ success: false, message: "Enter status to update the " });
  }
  try {
    const updatedEnquiry = await Enquiry.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedEnquiry) {
      return res
        .status(404)
        .json({ success: false, message: "Enquiry not found" });
    }
    const userId = updatedEnquiry.user.toString();
    const product_id = updatedEnquiry.product.toString();

    // Invalidate the cache for the specific user
    const userKey = `/api/v1/user/${userId}`;
    cache.del(userKey);
    cache.del(allUsersKey);

    // Invalidate cache after updating a product
    cache.del(keyGetAllProducts);
    cache.del(`/api/v1/product/get-a-product/${product_id}`);

    res.status(200).json({ success: true, data: updatedEnquiry });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * @route DELETE /api/enquiry/:id
 * @description Delete an existing enquiry by ID.
 * @param {Object} req - Express request object. Expected to have the enquiry ID in the request parameters.
 * @param {Object} res - Express response object. Will return the deleted enquiry's details or an appropriate error message.
 * @throws {Error} Possible errors include not found error or server/database errors.
 * @returns {Object} JSON response with the deleted enquiry's details or an error message.
 */
const deleteEnquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validateMongoDbId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid MongoDB ID" });
  }

  try {
    const deletedEnquiry = await Enquiry.findByIdAndDelete(id);

    if (!deletedEnquiry) {
      return res
        .status(404)
        .json({ success: false, message: "Enquiry not found" });
    }

    // Delete the reference from the User model
    const updated_user = await User.findByIdAndUpdate(
      deletedEnquiry.user,
      { $pull: { enquiries: id } },
      { new: true }
    );

    // Delete the reference from the Product model
    const updated_product = await Product.findByIdAndUpdate(
      deletedEnquiry.product,
      { $pull: { enquiries: id } },
      { new: true }
    );

    const _id = updated_user._id;
    const product_id = updated_product._id;

    // Invalidate the cache for the specific user
    const userKey = `/api/v1/user/${_id}`;
    cache.del(userKey);
    cache.del(allUsersKey);

    // Invalidate cache after updating a product
    cache.del(keyGetAllProducts);
    cache.del(`/api/v1/product/get-a-product/${product_id}`);

    res.status(200).json({ success: true, data: deletedEnquiry });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * @route GET /api/enquiry/get-inquiry/:id
 * @description Get an enquiry by ID.
 * @param {Object} req - Express request object. Expected to have the enquiry ID in the request parameters.
 * @param {Object} res - Express response object. Will return the found enquiry's details or an appropriate error message.
 * @throws {Error} Possible errors include not found error or server/database errors.
 * @returns {Object} JSON response with the found enquiry's details or an error message.
 */
const getEnquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validateMongoDbId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid MongoDB ID" });
  }

  try {
    const foundEnquiry = await Enquiry.findById(id).select("-user");
    if (!foundEnquiry) {
      return res
        .status(404)
        .json({ success: false, message: "Enquiry not found" });
    }
    res.status(200).json(foundEnquiry);
  } catch (error) {
    console.error("error occured", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * @route GET /api/enquiry
 * @description Get a list of all enquiries.
 * @param {Object} req - Express request object. No additional parameters required.
 * @param {Object} res - Express response object. Will return a list of all enquiries or an appropriate error message.
 * @throws {Error} Possible errors include server/database errors.
 * @returns {Object} JSON response with a list of all enquiries or an error message.
 */
const getallEnquiry = asyncHandler(async (req, res) => {
  try {
    const allEnquiries = await Enquiry.find();
    res.status(200).json({ success: true, data: allEnquiries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * @route GET /api/enquiry/user
 * @description Get all enquiries raised by the logged-in user.
 * @param {Object} req - Express request object. The user's information should be stored in req.user.
 * @param {Object} res - Express response object. Will return a list of user's enquiries or an appropriate error message.
 * @throws {Error} Possible errors include server/database errors.
 * @returns {Object} JSON response with a list of user's enquiries or an error message.
 */
const getEnquiriesByUser = asyncHandler(async (req, res) => {
  const { _id } = req?.user;

  try {
    const userEnquiries = await Enquiry.find({ user: _id });

    if (!userEnquiries || userEnquiries.length === 0) {
      // No enquiries found for the user
      return res.status(404).json({
        success: false,
        message: "No enquiries raised by the user",
      });
    }
    res.status(200).json({ success: true, data: userEnquiries });
  } catch (error) {
    console.error("error occurred", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = {
  createEnquiry,
  updateEnquiry,
  deleteEnquiry,
  getEnquiry,
  getallEnquiry,
  getEnquiriesByUser,
};
