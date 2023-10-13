const Product = require("../models/ProductModel");
const asyncHandler = require("express-async-handler");
const slugify = require("slugify");
const {validateMongoDbId} = require("../utils/reqValidations");

/**
 * @route POST /api/product/create-product
 * @description Create a new product in the database. The product's title is used to generate a slug.
 *              Ensure the title exists before attempting to create a product.
 *              Return a 201 status code upon successful creation.
 *              The response contains the newly created product's data.
 * @returns {Object} JSON response with created product data and a success message.
 */
const createProduct = asyncHandler(async (req, res) => {
    // Validation - Ensuring title exists and is not an empty string
    const { title } = req.body;
    if (!title || title.trim() === "") {
        return res.status(400).json({ message: "Product title is required" });
    }

    // Create slug from title
    req.body.slug = slugify(title);

    // Create the product
    const newProduct = await Product.create(req.body);

    // Return the newly created product
    res.status(201).json({ success: true,data: newProduct, message: "Product created successfully" });
});

/**
 * @route GET /api/product/get-a-product/:id
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
        return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(id);

    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({success: true,data: product});
});

/**
 * @route GET /api/product/get-all-products
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
        return res.status(404).json({ message: "No products available!" });
    }

    res.status(200).json({success:true,pagination: req.advancedFilter.pagination,count : products.length ,data: products ,message : "All products retrived successfully" });
});

/**
 * @route PUT api/product/update-product/:id
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
      return res.status(400).json({ error: 'Invalid MongoDB ID format.' });
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
      const updatedProduct = await Product.findOneAndUpdate({ _id: id }, updates, {
        new: true,
        runValidators: true,  // Ensure updated data adheres to schema validations
      });
  
      // Check if the product exists
      if (!updatedProduct) {
        return res.status(404).json({ error: 'Product not found.' });
      }
  
      res.status(200).json({success: true, data : updatedProduct, message: "Updated successfully"});
    } catch (error) {
      console.error(`Error updating product with ID: ${id}. Error: ${error.message}`);
      if (error.name === 'ValidationError') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Server error. Please try again later.' });
      }
    }
  });

  /**
 * @route DELETE api/product/delete-product/:id
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
      return res.status(400).json({ error: 'Invalid MongoDB ID format.' });
    }
  
    try {
      // Delete the product from the database
      const deletedProduct = await Product.findOneAndDelete({ _id: id });
  
      // Check if the product was actually deleted
      if (!deletedProduct) {
        return res.status(404).json({ error: 'Product not found and thus not deleted.' });
      }
  
      res.status(200).json({ success: true, data: deletedProduct , message : "Deleted successfully"});
    } catch (error) {
      console.error(`Error deleting product with ID: ${id}. Error: ${error.message}`);
      res.status(500).json({ error: 'Server error. Please try again later.' });
    }
  });
  


module.exports = {createProduct,getaProduct,getAllProducts,updateProduct,deleteProduct};