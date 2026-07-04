const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');

const SALT_ROUNDS = 12;

const generateAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, email: user.email, name: user.name }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRE,
  });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRE,
  });

const login = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.active) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  return { accessToken, refreshToken, user };
};

const refresh = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
  }

  const user = await User.findOne({ _id: decoded.id, refreshToken: token });
  if (!user || !user.active) {
    throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
  }

  const accessToken = generateAccessToken(user);
  return { accessToken };
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

module.exports = { login, refresh, logout, hashPassword, generateAccessToken };
