const mongoose = require("mongoose"); // Erase if already required

// Declare the Schema of the Mongo model
var blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      minLength: 1,
      maxLength: 100,
      required: true,
    },
    description: {
      type: String,
      minLength: 5,
      maxLength: 2000,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    numViews: {
      type: Number,
      default: 0,
    },
    isLiked: {
      type: Boolean,
      default: false,
    },
    isDisliked: {
      type: Boolean,
      default: false,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    author: {
      type: String,
      default: "Admin",
    },
    image: {
      type: String,
      default:
        "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.dreamstime.com%2Fphotos-images%2Fblog.html&psig=AOvVaw0L4P1E8GPXmVpwqO1A0j7Y&ust=1697378777710000&source=images&cd=vfe&ved=0CBEQjRxqFwoTCKjYlura9YEDFQAAAAAdAAAAABAZ",
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
      validate: [arrayLimit, "Exceeds the limit of 7 images."],
    },
  },
  {
    id: false,
    toJSON: {
      virtuals: true,
      getters: true,
    },
    toObject: {
      virtuals: true,
    },
    timestamps: true,
  }
);
function arrayLimit(val) {
  return val.length <= 7;
}

//Export the model
module.exports = mongoose.model("Blog", blogSchema);
