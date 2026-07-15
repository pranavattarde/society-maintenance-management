const userService = require('../services/user.service');
const ApiError = require('../utils/ApiError');

/**
 * Handles GET /api/users
 * Returns list of users based on search filter.
 */
async function list(req, res, next) {
  try {
    const { search } = req.query;
    const users = await userService.listUsers({ search });
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/users/:id/role
 * Promotes/demotes user roles.
 */
async function updateRole(req, res, next) {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;
    const currentUserId = req.user.id;

    if (!role) {
      throw new ApiError(400, 'role field is required.');
    }

    const updatedUser = await userService.updateUserRole(targetUserId, role, currentUserId);

    res.status(200).json({
      success: true,
      message: `User successfully ${role === 'ADMIN' ? 'promoted to admin' : 'demoted to resident'}.`,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/users/profile
 * Updates own profile (name, phone, flatNumber, avatar picture).
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, phone, flatNumber } = req.body;
    const avatarBuffer = req.file ? req.file.buffer : null;

    const updatedUser = await userService.updateUserProfile(
      userId,
      { name, phone, flatNumber },
      avatarBuffer
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  updateRole,
  updateProfile,
};
