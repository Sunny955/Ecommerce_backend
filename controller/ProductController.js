const Product = require("../models/ProductModel");
const User = require("../models/UserModel");
const ProductCat = require("../models/ProductCategoryModel");
const Brand = require("../models/BrandModel");
const asyncHandler = require("express-async-handler");
const slugify = require("slugify");
const { validateMongoDbId } = require("../utils/reqValidations");
const keyGetAllProducts = "/api/v1/product/get-all-products";
const { cache } = require("../middlewares/cacheMiddleware");
const {
  cloudinaryUploadImg,
  cloudinaryDeleteImg,
} = require("../utils/cloudinary");
const fs = require("fs");

// for every route put v1 after api like: api/v1/product/...

/**
 * @route POST api/v1/product/create
 * @description Create a new product in the database. The title of the product is mandatory and
 * it must be non-empty. The function also generates a slug for the product based on its title.
 * @param {Object} req - Express request object. Expected to have the product details in the body.
 * @param {Object} res - Express response object. Will return the details of the newly created
 * product or an appropriate error message.
 * @throws {Error} Possible errors include validation failures (like missing title) or
 * server/database errors.
 * @returns {Object} JSON response with the newly created product's details or an error message.
 */
const createProduct = asyncHandler(async (req, res) => {
  // Validation - Ensuring title exists and is not an empty string
  const { title } = req.body;
  if (!title || title.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Product title is required" });
  }

  // Create slug from title
  req.body.slug = slugify(title);

  try {
    // Check if category exists
    const category = req.body.category.toLowerCase();
    const brand = req.body.brand.toLowerCase();

    const categoryExists = await ProductCat.findOne({ title: category });
    if (!categoryExists) {
      return res
        .status(400)
        .json({ success: false, message: "Given category does not exist" });
    }

    // Check if brand exists
    const brandExists = await Brand.findOne({ title: brand });
    if (!brandExists) {
      return res
        .status(400)
        .json({ success: false, message: "Given brand does not exist" });
    }

    // Create the product
    const newProduct = await Product.create(req.body);

    if (newProduct) {
      // Invalidate cache after creating a new product
      cache.del(keyGetAllProducts);

      // Return the newly created product
      return res.status(201).json({
        success: true,
        data: newProduct,
        message: "Product created successfully",
      });
    }
    res.status(500).json({
      success: false,
      message: "Unable to add the product, please try again later",
    });
  } catch (err) {
    // Handle any errors that occur during database queries
    console.error("Error occured", err.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * @route GET /api/v1/product/get-a-product/:id
 * @description Retrieves a specific product from the system based on the provided product ID in the route parameters.
 * It will validate the MongoDB ID format, and if it's incorrect, an error message will be returned. If the product does not exist,
 * an appropriate "not found" message will be sent back to the client.
 * @param {Object} req - Express request object. Expected to contain the product ID in the route parameters.
 * @param {Object} res - Express response object. Returns the product's details if found or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, product not found, or other internal issues.
 * @returns {Object} JSON response with the product's details or an error message.
 */
const getaProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validateMongoDbId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid product ID format" });
  }

  const product = await Product.findById(id)
    .select("-quantity")
    .populate(
      "ratings.postedby enquiries",
      "-__v -refreshToken -passwordResetExpires -passwordResetToken -password -cart -wishlist -createdAt -updatedAt -product"
    );

  if (!product) {
    return res
      .status(404)
      .json({ success: false, message: "Product not found" });
  }

  res.status(200).json({ success: true, data: product });
});

/**
 * @route GET /api/v1/product/get-all-products
 * @description Retrieves all products from the system. If no products are available, it will return a message indicating so.
 * The function does not require any specific input from the request body, and will return a list of all available products.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object. Returns a list of all available products or an appropriate error message.
 * @throws {Error} Possible errors include no products available or other internal issues.
 * @returns {Object} JSON response with a list of products and a success message, or an error message.
 */
const getAllProducts = asyncHandler(async (req, res) => {
  const products = await req.advancedFilter;

  if (!products || products.length === 0) {
    return res
      .status(404)
      .json({ success: false, message: "No products available!" });
  }

  res.status(200).json({
    success: true,
    pagination: req.advancedFilter.pagination,
    count: products.length,
    data: products,
    message: "All products retrived successfully",
  });
});

/**
 * @route PUT api/v1/product/update-product/:id
 * @description Administator can update a specific product's details in the database based on the provided product ID. If the request body contains a title, the function also generates and updates the product's slug.
 * @param {Object} req - Express request object. Expected to have the product ID in the params and any updated fields in the body.
 * @param {Object} res - Express response object. Will return the updated product details or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format, product validation errors, or server/database errors.
 * @returns {Object} JSON response with the updated product's details or an error message.
 */
const updateProduct = asyncHandler(async (req, res) => {
  // Destructure id from request params
  const { id } = req.params;

  // Validate MongoDB id format
  if (!validateMongoDbId(id)) {
    return res.status(400).json({ error: "Invalid MongoDB ID format." });
  }

  try {
    // Destructure title from request body and generate slug if present
    const { title, ...otherFields } = req.body;
    let updates = { ...otherFields };

    if (title) {
      updates.title = title;
      updates.slug = slugify(title);
    }

    // Update product in the database
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id },
      updates,
      {
        new: true,
        runValidators: true, // Ensure updated data adheres to schema validations
      }
    );

    // Check if the product exists
    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    // Invalidate cache after updating a product
    cache.del(keyGetAllProducts);
    cache.del(`/api/v1/product/get-a-product/${id}`);

    res.status(200).json({
      success: true,
      data: updatedProduct,
      message: "Updated successfully",
    });
  } catch (error) {
    console.error(
      `Error updating product with ID: ${id}. Error: ${error.message}`
    );
    if (error.name === "ValidationError") {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
});

/**
 * @route DELETE api/v1/product/delete-product/:id
 * @description Administrator can delete a specific product from the database based on the provided product ID.
 * @param {Object} req - Express request object. Expected to have the product ID in the params.
 * @param {Object} res - Express response object. Will return the details of the deleted product or an appropriate error message.
 * @throws {Error} Possible errors include invalid MongoDB ID format or server/database errors.
 * @returns {Object} JSON response with the details of the deleted product or an error message.
 */
const deleteProduct = asyncHandler(async (req, res) => {
  // Destructure id from request params
  const { id } = req.params;

  // Validate MongoDB id format
  if (!validateMongoDbId(id)) {
    return res.status(400).json({ error: "Invalid MongoDB ID format." });
  }

  try {
    // Delete the product from the database
    const deletedProduct = await Product.findOneAndDelete({ _id: id });

    // Check if the product was actually deleted
    if (!deletedProduct) {
      return res
        .status(404)
        .json({ error: "Product not found and thus not deleted." });
    }

    // Invalidate cache after deleting a product
    cache.del(keyGetAllProducts);
    cache.del(`/api/v1/product/get-a-product/${id}`);

    res.status(200).json({
      success: true,
      data: deletedProduct,
      message: "Deleted successfully",
    });
  } catch (error) {
    console.error(
      `Error deleting product with ID: ${id}. Error: ${error.message}`
    );
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

/**
 * @route PUT api/v1/product/wishlist
 * @description Add or remove a product to/from a user's wishlist based on its presence in the list.
 * If present, the product will be removed, otherwise, it will be added.
 * @param {Object} req - Express request object. Expected to have the user ID from the authentication process
 * and the product ID in the body.
 * @param {Object} res - Express response object. Will return the updated wishlist details or an appropriate error message.
 * @throws {Error} Possible errors include invalid user or product IDs, or server/database errors.
 * @returns {Object} JSON response with the updated user's wishlist or an error message.
 */
const addToWishlist = asyncHandler(async (req, res) => {
  // Destructure user ID and product ID from the request
  const { _id } = req.user;
  const { prodId } = req.body;

  // Validate if the given prodId exists in the Product collection
  const productExists = await Product.findById(prodId);

  if (!productExists) {
    return res
      .status(400)
      .json({ message: "Invalid product ID or product does not exist." });
  }

  try {
    // Find the user by their ID
    const user = await User.findById(_id);

    // Check if product is already in the user's wishlist
    const alreadyAdded = user.wishlist.find((id) => id.toString() === prodId);

    let updateAction, message;

    // If product is already in wishlist, remove it. Otherwise, add it.
    if (alreadyAdded) {
      updateAction = { $pull: { wishlist: prodId } };
      message = "Product removed from wishlist";
    } else {
      updateAction = { $push: { wishlist: prodId } };
      message = "Product added to wishlist";
    }

    // Update user's wishlist and return the updated user
    const updatedUser = await User.findByIdAndUpdate(_id, updateAction, {
      new: true,
    });

    // Invalidate cache after updating a product
    cache.del(keyGetAllProducts);
    cache.del(`/api/v1/product/get-a-product/${prodId}`);

    // Return a success response with the updated user and message
    res.json({
      user: updatedUser,
      message,
    });
  } catch (error) {
    // Log the error for debugging purposes (optional)
    console.error(`Error in adding product to wishlist: ${error.message}`);

    // Send a generic error response
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
});

/**
 * @route PUT api/v1/product/rating
 * @description Rate a product or update an existing rating for a product.
 * If the user has already rated the product, their rating will be updated;
 * otherwise, a new rating will be added to the product.
 * @param {Object} req - Express request object. Expected to have the user ID from authentication,
 * star rating, product ID, and optional comment in the body.
 * @param {Object} res - Express response object. Will return the details of the updated product
 * or an appropriate error message.
 * @throws {Error} Possible errors include invalid product ID, or server/database errors.
 * @returns {Object} JSON response with the updated product's details or an error message.
 */
const rating = asyncHandler(async (req, res) => {
  // Destructure user ID, star rating, product ID, and comment from request body
  const { _id } = req.user;
  const { star, prodId, comment } = req.body;

  // Validation for star
  if (star < 1 || star > 5) {
    return res
      .status(400)
      .json({ message: "Star rating should be between 1 and 5" });
  }

  // Validation for comment
  let commentWords = "";

  if (comment) {
    commentWords = comment.split(/\s+/); // Split the comment by whitespace to count words
  }

  if (commentWords.length > 5000) {
    return res
      .status(400)
      .json({ message: "Comment should be less than 5000 words" });
  }

  try {
    const product = await Product.findById(prodId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if the user has already rated the product
    let alreadyRated = product.ratings.find(
      (rating) => rating.postedby.toString() === _id.toString()
    );

    if (alreadyRated) {
      // Update the existing rating
      await Product.updateOne(
        {
          ratings: { $elemMatch: alreadyRated },
        },
        {
          $set: { "ratings.$.star": star, "ratings.$.comment": comment },
        }
      );
    } else {
      // Add a new rating to the product
      await Product.findByIdAndUpdate(prodId, {
        $push: {
          ratings: {
            star,
            comment,
            postedby: _id,
          },
        },
      });
    }
    // Invalidate cache after updating a product
    cache.del(keyGetAllProducts);
    cache.del(`/api/v1/product/get-a-product/${prodId}`);

    // Return a success response
    res.status(200).json({
      success: true,
      message: alreadyRated
        ? "Rating updated successfully"
        : "Rating added successfully",
    });
  } catch (error) {
    // Handle the error
    console.error(`Error in rating product: ${error.message}`);
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
});

/**
 * @route PUT api/v1/product/rating/:prodId
 * @description Calculate and update the average rating for a given product.
 * The average rating is determined based on all ratings for the product.
 * @param {Object} req - Express request object. Expected to have the product ID in the params.
 * @param {Object} res - Express response object. Will return the product with the updated
 * average rating or an appropriate error message.
 * @throws {Error} Possible errors include invalid product ID, or server/database errors.
 * @returns {Object} JSON response with the product's updated details or an error message.
 */
const updateAverageRating = asyncHandler(async (req, res) => {
  const { prodId } = req.params;

  try {
    // Retrieve the product and its ratings
    const product = await Product.findById(prodId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Calculate the total number of ratings
    const totalRatings = product.ratings.length;

    // Calculate the sum of all ratings
    const ratingSum = product.ratings
      .map((item) => item.star)
      .reduce((prev, curr) => prev + curr, 0);

    // Calculate the actual average rating (rounded to nearest integer)
    // const averageRating = Math.round(ratingSum / totalRatings);
    const averageRating = Math.round((ratingSum * 10) / totalRatings) / 10;

    // Update the product's average rating
    const updatedProduct = await Product.findByIdAndUpdate(
      prodId,
      { averagerating: averageRating },
      { new: true }
    );

    // Invalidate cache after updating a product
    cache.del(keyGetAllProducts);
    cache.del(`/api/v1/product/get-a-product/${prodId}`);

    // Return the updated product
    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error(`Error in updating average rating: ${error.message}`);
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
});

/**
 * @route PUT api/upload-image/:id
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
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $push: { images: { $each: images } } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Invalidate cache after updating a product
    cache.del(keyGetAllProducts);
    cache.del(`/api/v1/product/get-a-product/${id}`);

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Error in uploading images:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload images" });
  }
});

/**
 * @route PUT api/v1/product/delete-image/:id
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

  const product = await Product.findById(id).select("images");

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const exists = product?.images.some((image) => image.public_id === public_id);

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
      await Product.findByIdAndUpdate(id, {
        $pull: { images: { public_id: public_id } },
      });

      // Invalidate cache after updating a product
      cache.del(keyGetAllProducts);
      cache.del(`/api/v1/product/get-a-product/${id}`);

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
  createProduct,
  getaProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  addToWishlist,
  rating,
  updateAverageRating,
  uploadImages,
  deleteImage,
};
