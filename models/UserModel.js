const mongoose = require("mongoose"); // Erase if already required
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
      match: [/^[a-zA-Z\s]*$/, "Firstname should only consists of alphabets"],
    },
    lastname: {
      type: String,
      required: true,
      match: [/^[a-zA-Z\s]*$/, "Lastname should only consists of alphabets"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/,
      index: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{10}$/,
      index: true,
    },
    password: {
      type: String,
      required: true,
      match: [
        /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,15}$/,
        "Password should be 8-15 characters and should have numbers (0-9) and small and capital alphabets.",
      ],
    },
    role: {
      type: String,
      default: "user",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
    },
    address: {
      lane1: {
        type: String,
        required: [true, "Address lane 1 is required."],
        trim: true,
        maxlength: [255, "Address lane 1 cannot exceed 255 characters."],
      },
      lane2: {
        type: String,
        trim: true,
        maxlength: [255, "Address lane 2 cannot exceed 255 characters."],
      },
      city: {
        type: String,
        required: [true, "City is required."],
        trim: true,
        maxlength: [100, "City name cannot exceed 100 characters."],
        match: [/^[a-zA-Z\s]*$/, "City should only consist of alphabets."],
      },
      district: {
        type: String,
        required: [true, "District is required."],
        trim: true,
        maxlength: [100, "District name cannot exceed 100 characters."],
        match: [/^[a-zA-Z\s]*$/, "District should only consist of alphabets."],
      },
      pincode: {
        type: String,
        require: [true, "Pincode is required"],
        trim: true,
        match: [/^\d{6}$/, "Pincode should be a 6-digit number."],
      },
      country: {
        type: String,
        required: [true, "Country is required."],
        trim: true,
        maxlength: [100, "Country name cannot exceed 100 characters."],
        match: [/^[a-zA-Z\s]*$/, "Country should only consist of alphabets."],
        uppercase: true,
      },
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    refreshToken: {
      type: String,
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    id: false,
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSaltSync(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.isPasswordMatched = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.createPasswordResetToken = async function () {
  const resettoken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resettoken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 10 minutes
  return resettoken;
};

//Export the model
module.exports = mongoose.model("User", userSchema);
