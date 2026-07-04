const auditLogService = require('../services/auditLog.service');
const { paginatedResponse } = require('../utils/helpers');

const getAuditLogs = async (req, res, next) => {
  try {
    const { data, total, page, limit } = await auditLogService.getLogs(req.query);
    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    next(err);
  }
};

module.exports = { getAuditLogs };
