import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function RoleGuard({ children, roles = [] }) {
  const { user } = useAuth()
  if (!user || (roles.length > 0 && !roles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}
