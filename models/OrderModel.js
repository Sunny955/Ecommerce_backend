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

    // Payment details
    paymentIntent: {},

    // Status of the order
    orderStatus: {
      type: String,
      default: "Not Processed",
      enum: [
        "Not Processed",
        "In Transit",
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

    orderDate: {
      type: Date,
      default: Date.now,
      get: (date) => {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
      },
    },
  },
  {
    id: false,
    timestamps: true,
    toJSON: {
      getters: true,
    },
  }
);

// Consider adding indexes if you often query by certain fields.
// For instance, if you often fetch orders by their status, you can add:
// orderSchema.index({ orderStatus: 1 });

module.exports = mongoose.model("Order", orderSchema);
