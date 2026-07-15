const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../utils/constants');

/**
 * Uploads a file buffer to Cloudinary using a writable stream.
 *
 * @param {Buffer} buffer - The file buffer from req.file.buffer
 * @returns {Promise<string>} Cloudinary secure_url
 */
async function uploadAvatarToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'society-maintenance/avatars', resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

/**
 * Lists all users with optional query filters.
 *
 * @param {object} params
 * @param {string} [params.search]
 * @returns {Promise<object[]>}
 */
async function listUsers({ search }) {
  const where = {};

  if (search) {
    const cleanSearch = search.trim();
    where.OR = [
      { name: { contains: cleanSearch, mode: 'insensitive' } },
      { email: { contains: cleanSearch, mode: 'insensitive' } },
      { flatNumber: { contains: cleanSearch, mode: 'insensitive' } },
    ];
  }

  return prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      flatNumber: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
}

/**
 * Promotes or demotes a user's role.
 *
 * @param {string} targetUserId
 * @param {string} newRole
 * @param {string} currentUserId
 * @returns {Promise<object>}
 */
async function updateUserRole(targetUserId, newRole, currentUserId) {
  if (targetUserId === currentUserId) {
    throw new ApiError(400, 'You cannot promote or demote yourself.');
  }

  if (!Object.values(ROLES).includes(newRole)) {
    throw new ApiError(400, 'Invalid role assignment.');
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw new ApiError(404, 'User not found.');
  }

  // Prevent demotion if they're already resident or promotion if they're already admin
  if (targetUser.role === newRole) {
    throw new ApiError(400, `User is already a ${newRole.toLowerCase()}.`);
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      flatNumber: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
}

/**
 * Updates the user's profile details and upload optional avatar.
 *
 * @param {string} userId
 * @param {object} updates
 * @param {string} [updates.name]
 * @param {string} [updates.phone]
 * @param {string} [updates.flatNumber]
 * @param {Buffer} [avatarBuffer]
 * @returns {Promise<object>}
 */
async function updateUserProfile(userId, { name, phone, flatNumber }, avatarBuffer) {
  const data = {};

  if (name !== undefined) {
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      throw new ApiError(400, 'Name must be at least 2 characters.');
    }
    data.name = cleanName;
  }

  if (phone !== undefined) {
    data.phone = phone ? phone.trim() : null;
  }

  if (flatNumber !== undefined) {
    const cleanFlat = flatNumber.trim();
    if (cleanFlat.length === 0) {
      throw new ApiError(400, 'Flat number is required.');
    }
    data.flatNumber = cleanFlat;
  }

  if (avatarBuffer) {
    try {
      data.avatarUrl = await uploadAvatarToCloudinary(avatarBuffer);
    } catch (err) {
      throw new ApiError(502, `Failed to upload profile picture: ${err.message}`);
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      flatNumber: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  return updated;
}

module.exports = {
  listUsers,
  updateUserRole,
  updateUserProfile,
};
