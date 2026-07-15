const multer = require('multer');
const { ALLOWED_PHOTO_MIME_TYPES, MAX_PHOTO_SIZE_BYTES, MAX_AVATAR_SIZE_BYTES } = require('../utils/constants');
const ApiError = require('../utils/ApiError');

/**
 * Multer upload middleware — memory storage with MIME type validation.
 *
 * Files are held in memory (Buffer) rather than written to disk.
 * The services stream the buffer to Cloudinary directly,
 * making this deployment-friendly for stateless containers on Render.
 *
 * Accepted types: image/jpeg, image/png, image/webp
 */
function fileFilter(req, file, cb) {
  if (ALLOWED_PHOTO_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPEG, PNG, and WebP images are accepted'), false);
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_PHOTO_SIZE_BYTES }, // 5 MB
});

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_AVATAR_SIZE_BYTES }, // 2 MB
});

module.exports = {
  upload,
  uploadAvatar,
};
