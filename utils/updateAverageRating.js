const Product = require("../models/ProductModel");

// Function to calculate and update the average rating for a product
const updateAverageRating = async (prodId) => {
  const product = await Product.findById(prodId);

  if (!product) {
    throw new Error("Product not found");
  }

  // Calculate the total number of ratings
  const totalRatings = product.ratings.length;

  // Calculate the sum of all ratings
  const ratingSum = product.ratings
    .map((item) => item.star)
    .reduce((prev, curr) => prev + curr, 0);

  // Calculate the actual average rating (rounded to nearest integer)
  const averageRating = Math.round((ratingSum * 10) / totalRatings) / 10;

  // Update the product's average rating
  await Product.findByIdAndUpdate(prodId, { averagerating: averageRating });
};

module.exports = { updateAverageRating };
