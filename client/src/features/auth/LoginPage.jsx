import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { loginApi } from './api'
import LanguageToggle from '../../components/common/LanguageToggle'
import { ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const onSubmit = async (data) => {
    setError('')
    setLoading(true)
    try {
      const res = await loginApi(data)
      const { accessToken, refreshToken, user } = res.data.data || res.data
      login(accessToken, refreshToken, user)
      navigate(user?.role === 'RESPONSABLE' ? '/entry-permissions' : '/dashboard')
    } catch (err) {
      setError(
        err.response?.data?.message || t('auth.loginError')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-accent via-[#0c2240] to-[#0f3460] relative overflow-hidden">
      {/* Radio wave decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border border-white/5"
              style={{ transform: `scale(${i * 0.25})` }}
            />
          ))}
        </div>
      </div>

      {/* Language toggle top-right */}
      <div className="absolute top-4 end-4 z-10">
        <LanguageToggle className="bg-white/10 border-white/20 text-white hover:bg-white/20" />
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="login-card bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          {/* Logo — always light version */}
          <div className="flex flex-col items-center mb-8">
            <img src="/assets/logo-main.png" alt="إذاعة المنستير - Radio Monastir" style={{ width: 220, height: 110, objectFit: 'contain' }} />
            <p className="text-slate-500 text-sm mt-2">{t('app.tagline')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
                <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="form-label">{t('auth.email')}</label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'border-red-400 focus:ring-red-200' : ''}`}
                placeholder="email@radiomonastir.tn"
                {...register('email', {
                  required: t('errors.required'),
                  pattern: { value: /^\S+@\S+$/i, message: t('errors.invalidEmail') },
                })}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input pe-10 ${errors.password ? 'border-red-400 focus:ring-red-200' : ''}`}
                  placeholder="••••••••"
                  {...register('password', { required: t('errors.required') })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? t('common.loading') : t('auth.loginButton')}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6 text-white/50 text-xs">
        © {new Date().getFullYear()} Radio Monastir — إذاعة المنستير
      </div>
    </div>
  )
}
