import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n'
import './styles/index.css'
import LoadingSpinner from './components/common/LoadingSpinner'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <React.Suspense fallback={<LoadingSpinner size="lg" className="min-h-screen" />}>
      <App />
    </React.Suspense>
  </React.StrictMode>
)
