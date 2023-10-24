const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var couponSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true,
  },
  expiry: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        // Calculate date 1 year from now
        let oneYearFromNow = new Date();

        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        return value <= oneYearFromNow;
      },
      message: "Expiry date must not exceed 1 year from now",
    },
  },
  discount: {
    type: Number,
    required: true,
    min: [1, "Discount cannot be less than 1%"],
    max: [99, "Discount cannot exceed 99%"],
  },
});

//Export the model
module.exports = mongoose.model("Coupon", couponSchema);
