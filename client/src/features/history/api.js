import api from '../../api/axios'
export const getArchivedGuides = (params) => api.get('/guides', { params })
export const getEntryHistory = (params) => api.get('/entry-permissions', { params: { ...params, status: 'COMPLETED' } })
