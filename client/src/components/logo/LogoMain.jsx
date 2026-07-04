import React from 'react'
import { useDarkMode } from '../../hooks/useDarkMode'

const LogoMain = ({ className = '', width = 200, height = 'auto' }) => {
  const [dark] = useDarkMode()

  return (
    <img
      src={dark ? '/assets/logo-main-dark.png' : '/assets/logo-main.png'}
      alt="إذاعة المنستير - Radio Monastir"
      className={className}
      style={{ width, height }}
    />
  )
}

export default LogoMain
