const mongoose = require('mongoose');// Erase if already required
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema({
    firstname:{
        type:String,
        required:true,
        match: [/^[a-zA-Z\s]*$/,
                'Firstname should only consists of alphabets']
    },
    lastname:{
        type:String,
        required:true,
        match: [/^[a-zA-Z\s]*$/,
                'Lastname should only consists of alphabets']
    },
    email:{
        type:String,
        required:true,
        unique:true,
        match: /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/
    },
    mobile:{
        type:String,
        required:true,
        unique:true,
        match: /^\d{10}$/
    },
    password:{
        type:String,
        required:true,
        match: [
            /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,15}$/,
            'Password should be 8-15 characters and should have numbers (0-9) and small and capital alphabets.'
        ]
    },
    role: {
        type: String,
        default:"user"
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    cart: {
        type : Array,
        default: []
    },
    address : [{type : mongoose.Schema.Types.ObjectId, ref : "Address"}],
    wishlist : [{type : mongoose.Schema.Types.ObjectId, ref : "Product"}],
    refreshToken : {
        type: String,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date 
},{
    timestamps:true,
});

  userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) {
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
module.exports = mongoose.model('User', userSchema);