const { validationResult } = require('express-validator');
const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/helpers');

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 422);
    }
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await authService.login(email, password);
    return successResponse(res, { accessToken, refreshToken, user });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return errorResponse(res, 'Refresh token required', 400);
    const { accessToken } = await authService.refresh(refreshToken);
    return successResponse(res, { accessToken });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user._id);
    return successResponse(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout };
