const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/images/"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ".jpeg");
  },
});

// Multer filter to allow only images
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb({ message: "Unsupported file format" }, false);
  }
};

// Multer upload configuration
const uploadPhoto = multer({
  storage: storage,
  fileFilter: multerFilter,
  limits: { fileSize: 1000000 }, // 1MB limit
});

/**
 * Middleware to resize product images
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const productImgResize = async (req, res, next) => {
  if (!req.files) return next();

  await Promise.all(
    req.files.map(async (file) => {
      const destination = `public/images/products/${file.filename}`;
      await sharp(file.path)
        .resize(300, 300)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(destination);

      fs.unlink(file.path, (err) => {
        if (err) {
          console.error(`Error removing file: ${file.path}`);
        }
      });
      file.path = destination;
    })
  );
  next();
};

/**
 * Middleware to resize blog images
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const blogImgResize = async (req, res, next) => {
  if (!req.files) return next();

  await Promise.all(
    req.files.map(async (file) => {
      const destination = `public/images/blogs/${file.filename}`;
      await sharp(file.path)
        .resize(300, 300)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(destination);

      fs.unlink(file.path, (err) => {
        if (err) {
          console.error(`Error removing file: ${file.path}`);
        }
      });
      file.path = destination;
    })
  );
  next();
};

const userImgResize = async (req, res, next) => {
  if (!req.files) return next();

  await Promise.all(
    req.files.map(async (file) => {
      const destination = `public/images/users/${file.filename}`;
      await sharp(file.path)
        .resize(50, 50)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(destination);

      fs.unlink(file.path, (err) => {
        if (err) {
          console.error(`Error removing file: ${file.path}`);
        }
      });
      file.path = destination;
    })
  );
  next();
};

module.exports = {
  uploadPhoto,
  productImgResize,
  blogImgResize,
  userImgResize,
};
