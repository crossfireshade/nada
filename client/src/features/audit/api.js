import api from '../../api/axios'
export const getAuditLogs = (params) => api.get('/audit-logs', { params })
