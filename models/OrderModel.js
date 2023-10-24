const mongoose = require("mongoose");

const productOrderSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  count: {
    type: Number,
    required: true,
    min: 1,
  },
  color: {
    type: String,
    trim: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    // An array of products in the order
    products: [productOrderSchema],

    // Payment details (might want to expand on this in the future)
    paymentIntent: {
      // id: String,
      // status: String,
      // ...
    },

    // Status of the order
    orderStatus: {
      type: String,
      default: "Not Processed",
      enum: [
        "Not Processed",
        "Cash on Delivery",
        "Processing",
        "Dispatched",
        "Cancelled",
        "Delivered",
      ],
      required: true,
    },

    // User who placed the order
    orderby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Consider adding indexes if you often query by certain fields.
// For instance, if you often fetch orders by their status, you can add:
// orderSchema.index({ orderStatus: 1 });

module.exports = mongoose.model("Order", orderSchema);
