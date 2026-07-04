const User = require('../models/User');
const authService = require('../services/auth.service');
const auditLog = require('../services/auditLog.service');
const { successResponse, errorResponse, getPagination, getSort, paginatedResponse } = require('../utils/helpers');

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const sort = getSort(req.query, ['name', 'email', 'role', 'createdAt']);
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.active !== undefined) filter.active = req.query.active === 'true';

    const [data, total] = await Promise.all([
      User.find(filter).select('-passwordHash -refreshToken').sort(sort).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash -refreshToken').lean();
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, active, password } = req.body;
    const update = {};
    if (name) update.name = name;
    if (email) update.email = email.toLowerCase();
    if (role) update.role = role;
    if (active !== undefined) update.active = active;
    if (password) update.passwordHash = await authService.hashPassword(password);

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).select('-passwordHash -refreshToken');

    if (!user) return errorResponse(res, 'User not found', 404);

    await auditLog.log({
      actorId: req.user._id,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: user._id,
      meta: { updatedFields: Object.keys(update) },
    });

    return successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, role, password } = req.body;
    if (!name || !email || !role || !password) {
      return errorResponse(res, 'All fields are required', 400);
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return errorResponse(res, 'Email already exists', 409);

    const passwordHash = await authService.hashPassword(password);
    const user = await User.create({ name, email: email.toLowerCase(), role, passwordHash });

    await auditLog.log({
      actorId: req.user._id,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user._id,
      meta: { name, email, role },
    });

    return successResponse(res, user, 201);
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return errorResponse(res, 'User not found', 404);

    await auditLog.log({
      actorId: req.user._id,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: user._id,
      meta: { name: user.name, email: user.email },
    });

    return successResponse(res, { message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserById, updateUser, createUser, deleteUser };
