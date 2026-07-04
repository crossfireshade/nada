import api from '../../api/axios'
export const loginApi = (credentials) => api.post('/auth/login', credentials)
export const refreshApi = (refreshToken) => api.post('/auth/refresh', { refreshToken })
export const logoutApi = () => api.post('/auth/logout')
