const mongoose = require("mongoose");

// Individual product in the cart
const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  count: {
    type: Number,
    required: true,
    min: [1, "Number of product should be at least 1"],
  },
  color: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Price should be at least 0"],
  },
});

const cartSchema = new mongoose.Schema(
  {
    products: [cartItemSchema], // Array of products in the cart

    cartTotal: {
      type: Number,
      default: 0,
    },

    totalAfterDiscount: {
      type: Number,
    },

    orderby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    id: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// cartSchema.virtual("computedTotalAfterDiscount").get(function () {
//   // Replace this with your discount logic
//   return this.computedCartTotal; // No discount applied in this example
// });

cartSchema.pre("save", function (next) {
  if (!this.totalAfterDiscount) {
    this.totalAfterDiscount = this.cartTotal;
  }
  next();
});
module.exports = mongoose.model("Cart", cartSchema);
