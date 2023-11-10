const mongoose = require("mongoose");

// Declare the Schema of the Mongo model
const enqSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
  },
  mobile: {
    type: String,
    required: [true, "Mobile is required"],
  },
  comment: {
    type: String,
    minLength: [5, "Minimum 5 words required"],
    maxLength: [2000, "Cannot exceeds length of 2000 words"],
    required: [true, "Comment is required"],
  },
  postedDate: {
    type: String,
    default: () => {
      const currentDate = new Date();
      const dd = String(currentDate.getDate()).padStart(2, "0");
      const mm = String(currentDate.getMonth() + 1).padStart(2, "0"); // January is 0!
      const yyyy = String(currentDate.getFullYear()).slice(-2);
      const hh = String(currentDate.getHours()).padStart(2, "0");
      const min = String(currentDate.getMinutes()).padStart(2, "0");
      const sec = String(currentDate.getSeconds()).padStart(2, "0");
      return `${dd}-${mm}-${yyyy} ${hh}:${min}:${sec}`;
    },
  },
  status: {
    type: String,
    default: "Submitted",
    enum: ["Submitted", "Contacted", "In Progress", "Resolved"],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
});

//Export the model
module.exports = mongoose.model("Enquiry", enqSchema);
