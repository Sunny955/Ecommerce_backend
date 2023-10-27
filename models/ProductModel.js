const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required."],
      trim: true,
      minlength: [3, "Ttitle should have 3 or more than 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters."],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Description is required."],
      minlength: [10, "Description should be 10 or greater than 10 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters."],
    },
    price: {
      type: Number,
      required: [true, "Price is required."],
    },
    category: {
      type: String,
      required: [true, "Category is required."],
      minlength: [1, "Category should have 1 or more than 1 character"],
      maxlength: [50, "Category cannot exceed 50 characters."],
    },
    brand: {
      type: String,
      required: [true, "Brand is required."],
      minlength: [1, "Brand should have 1 or more than 1 character"],
      maxlength: [50, "Brand cannot exceed 50 characters."],
    },
    quantity: {
      type: Number,
      default: 0,
      required: [true, "Quantity is required."],
      min: [0, "Quantity can't be less than 0."],
    },
    sold: {
      type: Number,
      default: 0,
      min: [0, "Sold can't be less than 0."],
      select: false,
    },
    images: {
      type: [
        {
          _id: false,
          public_id: { type: String, index: true },
          url: String,
          upload_date: {
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
      ],
      validate: [arrayLimit, "Exceeds the limit of 10 images."],
    },
    color: [
      {
        type: String,
        lowercase: true,
      },
    ],
    tags: String,
    ratings: [
      {
        star: { type: Number, min: 1, max: 5 },
        comment: String,
        postedby: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    averagerating: {
      type: String,
      default: 0,
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

function arrayLimit(val) {
  return val.length <= 10;
}

//Export the model
module.exports = mongoose.model("Product", productSchema);
