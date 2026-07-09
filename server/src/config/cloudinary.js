const { v2: cloudinary } = require('cloudinary');

/**
 * Cloudinary client — configured once at startup.
 *
 * Used in upload middleware to stream photo uploads directly
 * from Multer memory storage to Cloudinary (no disk writes).
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
