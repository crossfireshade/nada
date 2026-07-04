const { errorResponse } = require('../utils/helpers');

/**
 * Role-Based Access Control middleware factory.
 * @param {string[]} allowedRoles - Array of roles permitted to access the route.
 */
const rbac = (allowedRoles = []) => (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Authentication required', 401);
  }
  if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
    return errorResponse(res, 'Forbidden: insufficient permissions', 403);
  }
  next();
};

module.exports = rbac;
