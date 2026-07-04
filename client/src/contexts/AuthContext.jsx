import React, { createContext, useState, useEffect, useCallback } from 'react'

export const AuthContext = createContext(null)

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      const payload = parseJwt(token)
      if (payload && payload.exp * 1000 > Date.now()) {
        setUser({
          id: payload.id || payload.sub,
          email: payload.email,
          role: payload.role,
          name: payload.name || payload.email,
        })
      } else {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback((accessToken, refreshToken, userData) => {
    localStorage.setItem('accessToken', accessToken)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    const payload = parseJwt(accessToken)
    setUser(
      userData || {
        id: payload?.id || payload?.sub,
        email: payload?.email,
        role: payload?.role,
        name: payload?.name || payload?.email,
      }
    )
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
