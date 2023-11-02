const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  res.status(200).json({
    success: true,
    data: `
    Welcome to the E-Commerce Backend API!

    This API powers our E-Commerce platform, providing a robust and secure backend infrastructure to support online shopping, product management, user authentication, and much more. Whether you're a shopper, a vendor, or an admin, this backend is the engine behind your online shopping experience.

    Our mission is to deliver a seamless and enjoyable shopping experience for customers, efficient management tools for vendors, and comprehensive control for administrators. With a range of features, from product listings and inventory management to secure user authentication, we're here to ensure that your e-commerce venture is a success.

    Explore our API endpoints to access and manage products, user accounts, shopping carts, and more. We're constantly working to enhance your experience, so stay tuned for updates and new features.

    Thank you for choosing us as your e-commerce solution. Happy shopping!
  `,
  });
});

module.exports = router;
