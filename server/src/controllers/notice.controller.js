const {
  createNotice,
  listNotices,
  updateNotice,
  togglePin,
  deleteNotice,
} = require('../services/notice.service');

/**
 * Notice Controller
 *
 * Exposes routes to manage the announcement bulletin board.
 */

async function list(req, res, next) {
  try {
    const result = await listNotices(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const notice = await createNotice(req.body, req.user.id);
    res.status(201).json({ message: 'Notice published successfully', notice });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const notice = await updateNotice(req.params.id, req.body);
    res.status(200).json({ message: 'Notice updated successfully', notice });
  } catch (err) {
    next(err);
  }
}

async function pin(req, res, next) {
  try {
    const notice = await togglePin(req.params.id);
    const action = notice.isPinned ? 'pinned' : 'unpinned';
    res.status(200).json({ message: `Notice ${action}`, notice });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await deleteNotice(req.params.id);
    res.status(200).json({ message: 'Notice deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, pin, remove };
