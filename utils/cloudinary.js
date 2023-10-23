const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Return "https" URLs by setting secure: true
cloudinary.config({
  secure: true,
});

const cloudinaryUploadImg = async (filePath) => {
  try {
    // Upload the image
    const result = await cloudinary.uploader.upload(filePath);
    console.log("Result-->", result);
    return result;
  } catch (error) {
    console.error(error);
  }
};

const cloudinaryDeleteImg = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error(`Failed to delete image. Error: ${error.message}`);
  }
};

module.exports = { cloudinaryUploadImg, cloudinaryDeleteImg };
