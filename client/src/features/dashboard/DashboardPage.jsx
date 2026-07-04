import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import ProducerDashboard from './ProducerDashboard'
import ProductionManagerDashboard from './ProductionManagerDashboard'
import TechnicianDashboard from './TechnicianDashboard'
import AdminDashboard from './AdminDashboard'
import PublicityDashboard from './PublicityDashboard'
import ReceptionDashboard from './ReceptionDashboard'
import ResponsableDashboard from './ResponsableDashboard'

const dashboards = {
  PRODUCTEUR: ProducerDashboard,
  RESPONSABLE_PRODUCTION: ProductionManagerDashboard,
  TECHNICIEN_COORDINATEUR: TechnicianDashboard,
  RESPONSABLE_ADMINISTRATIF: AdminDashboard,
  RESPONSABLE_PUBLICITE: PublicityDashboard,
  RECEPTIONNISTE_POLICIER: ReceptionDashboard,
  RESPONSABLE_SECURITE: ReceptionDashboard,
  RESPONSABLE: ResponsableDashboard,
}

export default function DashboardPage() {
  const { user } = useAuth()
  const Component = dashboards[user?.role] || AdminDashboard
  return <Component />
}
