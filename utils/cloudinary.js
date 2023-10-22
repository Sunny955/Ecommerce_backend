const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Configuring Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.SECRET_KEY,
});

console.log(cloudinary.config());

const cloudinaryUploadImg = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(filePath); // cleanup server
    return {
      url: result.secure_url,
      asset_id: result.asset_id,
      public_id: result.public_id,
    };
  } catch (error) {
    throw new Error(`Failed to upload image. Error: ${error.message}`);
  }
};

const cloudinaryDeleteImg = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "auto",
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to delete image. Error: ${error.message}`);
  }
};

module.exports = { cloudinaryUploadImg, cloudinaryDeleteImg };
