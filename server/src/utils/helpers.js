/**
 * General utility helpers
 */

/**
 * Build a standard pagination object from query params
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build a sort object from query params
 */
const getSort = (query, allowedFields = []) => {
  const sortField = query.sort || 'createdAt';
  const sortOrder = query.order === 'asc' ? 1 : -1;
  if (allowedFields.length && !allowedFields.includes(sortField)) {
    return { createdAt: -1 };
  }
  return { [sortField]: sortOrder };
};

/**
 * Wrap async route handlers to forward errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Build a paginated response envelope
 */
const paginatedResponse = (data, total, page, limit) => ({
  success: true,
  data,
  pagination: {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  },
});

/**
 * Standardise success response
 */
const successResponse = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

/**
 * Standardise error response
 */
const errorResponse = (res, message, statusCode = 400) =>
  res.status(statusCode).json({ success: false, message });

module.exports = {
  getPagination,
  getSort,
  asyncHandler,
  paginatedResponse,
  successResponse,
  errorResponse,
};
