const Product = require("../models/ProductModel");
const asyncHandler = require("express-async-handler");
const slugify = require("slugify");
const {validateMongoDbId} = require("../utils/reqValidations");

/**
 * @route POST /products
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
    res.status(201).json({ data: newProduct, message: "Product created successfully" });
});

/**
 * @route GET /products/:id
 * @description Fetch a product by its ID from the database. Ensure the provided ID is valid.
 *              Return a 404 status code if the product is not found.
 * @returns {Object} JSON response with the product's data or an error message.
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

    res.status(200).json(product);
});

/**
 * @route GET /products
 * @description Retrieve all products from the database.
 * @returns {Object} JSON response with an array of products or an error message.
 */
const getAllProducts = asyncHandler(async (req, res) => {
    const products = await Product.find();
    
    if (!products || products.length === 0) {
        return res.status(404).json({ message: "No products available!" });
    }

    res.status(200).json({ data: products, message: "Products retrieved successfully" });
});



module.exports = {createProduct,getaProduct,getAllProducts};