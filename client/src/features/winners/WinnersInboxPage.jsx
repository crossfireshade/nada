import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  TrophyIcon, GiftIcon, PhoneIcon, ClockIcon,
  MagnifyingGlassIcon, FunnelIcon, DocumentArrowDownIcon, TrashIcon,
} from '@heroicons/react/24/outline'
import DatePickerInput from '../../components/common/DatePickerInput'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../api/axios'
import { deleteWinner } from '../guides/api'
import { format } from 'date-fns'

function exportAllPDF(groups, labels, isRtl) {
  const dir = isRtl ? 'rtl' : 'ltr'
  const lang = isRtl ? 'ar' : 'fr'
  const thAlign = isRtl ? 'right' : 'left'

  const groupSections = groups.map(group => {
    const rows = group.winners.map((w, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#fffbf0'}">
        <td style="padding:8px 12px;border-bottom:1px solid #f0e0c0;font-weight:700;color:#b45309">${idx + 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e0c0;font-weight:600;color:#1e293b">${w.winnerName || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e0c0">
          ${w.prize ? `<span style="background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid #fde68a">${w.prize}</span>` : '—'}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e0c0;color:#0369a1;direction:ltr">${w.phone || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0e0c0;color:#64748b;font-size:11px">
          ${w.sentToPublicityAt ? format(new Date(w.sentToPublicityAt), 'dd/MM/yyyy HH:mm') : '—'}
        </td>
      </tr>
    `).join('')
    return `
      <div class="group-section">
        <div class="group-header">
          <span class="group-title">${group.theme}</span>
          <span class="group-sep">·</span>
          <span class="group-date">${group.date}</span>
          <span class="group-count">${group.winners.length} ${labels.winnerCount}</span>
        </div>
        <table>
          <thead><tr><th>#</th><th>${labels.winnerName}</th><th>${labels.prize}</th><th>${labels.phone}</th><th>${labels.sentAt}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }).join('')

  const totalWinners = groups.reduce((sum, g) => sum + g.winners.length, 0)

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${labels.pageTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 32px; direction: ${dir}; }
    .header { display: flex; align-items: center; justify-content: center; gap: 28px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #fde68a; }
    .logo img { height: 56px; object-fit: contain; }
    .title-block { text-align: center; }
    .title-block h1 { font-size: 22px; font-weight: 800; color: #1e293b; }
    .title-block p { font-size: 13px; color: #f59e0b; font-weight: 600; margin-top: 4px; }
    .summary { margin-bottom: 24px; display: flex; gap: 20px; flex-direction: ${isRtl ? 'row-reverse' : 'row'}; }
    .summary span { font-size: 13px; color: #64748b; }
    .summary strong { color: #1e293b; }
    .group-section { margin-bottom: 28px; page-break-inside: avoid; }
    .group-header { display: flex; align-items: center; gap: 12px; padding: 9px 14px; background: linear-gradient(90deg,#fef3c7,#fff7ed); border-radius: 8px 8px 0 0; border: 1px solid #fde68a; border-bottom: none; flex-direction: ${isRtl ? 'row-reverse' : 'row'}; }
    .group-title { font-size: 13px; font-weight: 800; color: #1e293b; }
    .group-sep { color: #fbbf24; }
    .group-date { font-size: 12px; font-weight: 600; color: #d97706; }
    .group-count { font-size: 11px; font-weight: 700; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 10px; border-radius: 20px; margin-${isRtl ? 'right' : 'left'}: auto; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #fde68a; border-top: none; }
    thead tr { background: linear-gradient(90deg,#fffbeb,#fff7ed); }
    th { padding: 8px 12px; text-align: ${thAlign}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #92400e; border-bottom: 1px solid #fde68a; }
    td { text-align: ${thAlign}; }
    .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><img src="${window.location.origin}/assets/logo-main.png" alt="Radio Monastir"/></div>
    <div class="title-block"><h1>${labels.pageTitle}</h1><p>Radio Monastir — ${labels.subtitle}</p></div>
  </div>
  <div class="summary">
    <span><strong>${labels.totalPrograms} :</strong> ${groups.length}</span>
    <span><strong>${labels.total} :</strong> ${totalWinners} ${labels.winnerCount}</span>
  </div>
  ${groupSections}
  <div class="footer">${labels.printedOn} ${format(new Date(), 'dd/MM/yyyy HH:mm')} — Radio Monastir</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=960,height=750')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

function exportGroupPDF(groupTitle, groupDate, winners, labels, isRtl) {
  const dir = isRtl ? 'rtl' : 'ltr'
  const lang = isRtl ? 'ar' : 'fr'
  const thAlign = isRtl ? 'right' : 'left'

  const rows = winners.map((w, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#fff' : '#fffbf0'}">
      <td style="padding:10px 14px;border-bottom:1px solid #f0e0c0;font-weight:700;color:#b45309">${idx + 1}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0e0c0;font-weight:600;color:#1e293b">${w.winnerName || '—'}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0e0c0">
        ${w.prize ? `<span style="background:#fef3c7;color:#b45309;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;border:1px solid #fde68a">${w.prize}</span>` : '—'}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0e0c0;color:#0369a1;direction:ltr">${w.phone || '—'}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0e0c0;color:#64748b;font-size:12px">
        ${w.sentToPublicityAt ? format(new Date(w.sentToPublicityAt), 'dd/MM/yyyy HH:mm') : '—'}
      </td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <title>${labels.pageTitle} — ${groupTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 32px; direction: ${dir}; }
    .header { display: flex; align-items: center; justify-content: center; gap: 28px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #fde68a; }
    .logo img { height: 56px; object-fit: contain; }
    .title-block { text-align: center; }
    .title-block h1 { font-size: 22px; font-weight: 800; color: #1e293b; }
    .title-block p  { font-size: 13px; color: #f59e0b; font-weight: 600; margin-top: 4px; }
    .meta { margin-bottom: 20px; display: flex; gap: 24px; flex-direction: ${isRtl ? 'row-reverse' : 'row'}; }
    .meta span { font-size: 13px; color: #64748b; }
    .meta strong { color: #1e293b; }
    table { width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.08); }
    thead tr { background: linear-gradient(90deg, #fef3c7, #fff7ed); }
    th { padding: 11px 14px; text-align: ${thAlign}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #92400e; border-bottom: 2px solid #fde68a; }
    td { text-align: ${thAlign}; }
    .footer { margin-top: 28px; text-align: center; font-size: 11px; color: #94a3b8; }
    @media print { body { padding: 16px; } button { display: none !important; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><img src="${window.location.origin}/assets/logo-main.png" alt="Radio Monastir" /></div>
    <div class="title-block">
      <h1>${labels.pageTitle}</h1>
      <p>Radio Monastir — ${labels.subtitle}</p>
    </div>
  </div>
  <div class="meta">
    <span><strong>${labels.programme} :</strong> ${groupTitle}</span>
    <span><strong>${labels.date} :</strong> ${groupDate}</span>
    <span><strong>${labels.total} :</strong> ${winners.length} ${labels.winnerCount}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${labels.winnerName}</th>
        <th>${labels.prize}</th>
        <th>${labels.phone}</th>
        <th>${labels.sentAt}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">${labels.printedOn} ${format(new Date(), 'dd/MM/yyyy HH:mm')} — Radio Monastir</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

export default function WinnersInboxPage() {
  const { t } = useTranslation()
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null) // { guideId, winnerId } | { guideId, winnerIds, isGroup }
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const guidesRes = await api.get('/guides', { params: { status: 'FINAL_PUBLISHED,LIVE_IN_PROGRESS,ARCHIVED', limit: 100 } })
        const guides = guidesRes.data?.data || []
        const allWinners = []
        await Promise.all(
          guides.map(async (guide) => {
            try {
              const wRes = await api.get(`/guides/${guide._id || guide.id}/winners`)
              const ws = wRes.data?.data || []
              ws.forEach(w => allWinners.push({ ...w, guideTheme: guide.programTitle || guide.theme }))
            } catch {
              // individual guide winners fetch failure is non-critical
            }
          })
        )
        setWinners(allWinners.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchWinners()
  }, [])

  const filtered = winners.filter(w => {
    if (w.blacklisted) return false
    if (dateFrom || dateTo) {
      if (!w.sentToPublicityAt) return false
      const sent = new Date(w.sentToPublicityAt)
      if (dateFrom && sent < new Date(dateFrom + 'T00:00:00')) return false
      if (dateTo && sent > new Date(dateTo + 'T23:59:59')) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const match =
        (w.winnerName || '').toLowerCase().includes(q) ||
        (w.prize || '').toLowerCase().includes(q) ||
        (w.phone || '').includes(q) ||
        (w.guideTheme || '').toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  // Group by programme + date
  const groups = []
  const groupMap = new Map()
  filtered.forEach(w => {
    const dateStr = w.sentToPublicityAt ? format(new Date(w.sentToPublicityAt), 'dd/MM/yyyy') : '—'
    const key = `${w.guideTheme || ''}__${dateStr}`
    if (!groupMap.has(key)) {
      const g = { key, theme: w.guideTheme || '—', date: dateStr, guideId: w.guideId, winners: [] }
      groupMap.set(key, g)
      groups.push(g)
    }
    groupMap.get(key).winners.push(w)
  })

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      if (confirmDelete.isGroup) {
        await Promise.all(confirmDelete.winnerIds.map(wId => deleteWinner(confirmDelete.guideId, wId)))
        setWinners(prev => prev.filter(w => !confirmDelete.winnerIds.includes(w._id || w.id)))
      } else {
        await deleteWinner(confirmDelete.guideId, confirmDelete.winnerId)
        setWinners(prev => prev.filter(w => (w._id || w.id) !== confirmDelete.winnerId))
      }
      setConfirmDelete(null)
    } catch {
      // silent
    } finally {
      setDeleting(false)
    }
  }

  const sentCount = filtered.filter(w => w.sentToPublicityAt).length

  return (
    <div className="space-y-5">

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 shadow-lg shadow-amber-200/40 dark:shadow-amber-900/30">
        <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute top-4 left-1/2 w-20 h-20 rounded-full bg-white/5" />
        <div className="relative px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
              <TrophyIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t('nav.winners')}</h1>
              <p className="text-sm text-amber-100/80 mt-0.5">{sentCount} {t('winners.sentAt').toLowerCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 rounded-xl bg-white/15 border border-white/20 text-center">
                  <p className="text-2xl font-bold text-white leading-none">{filtered.length}</p>
                  <p className="text-[10px] text-amber-100/80 mt-0.5">{t('winners.title')}</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-white/15 border border-white/20 text-center">
                  <p className="text-2xl font-bold text-white leading-none">{groups.length}</p>
                  <p className="text-[10px] text-amber-100/80 mt-0.5">{t('common.totalPrograms') || 'Programmes'}</p>
                </div>
              </div>
            )}
            <button
              onClick={() => groups.length > 0 && exportAllPDF(groups, {
                pageTitle: t('winners.title'),
                subtitle: t('roles.RESPONSABLE_PUBLICITE'),
                totalPrograms: t('common.totalPrograms') || 'Programmes',
                total: t('common.total'),
                winnerCount: t('winners.title').toLowerCase(),
                winnerName: t('winners.winnerName'),
                prize: t('winners.prize'),
                phone: t('winners.phone'),
                sentAt: t('winners.sentAt'),
                printedOn: t('common.printedOn') || (document.documentElement.dir === 'rtl' ? 'طُبع في' : 'Imprimé le'),
              }, document.documentElement.dir === 'rtl')}
              disabled={groups.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              {t('common.exportAll') || 'Exporter tout'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
          {t('errors.serverError')}
        </div>
      )}

      {/* ── Filters bar ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm">
        <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <FunnelIcon className="h-4 w-4" />
            <span className="text-sm font-semibold">{t('common.filter') || 'Filtrer'}</span>
          </div>
          <div className="w-px h-5 bg-slate-200 dark:bg-gray-600" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{t('common.from') || 'Du'}</span>
            <DatePickerInput value={dateFrom} onChange={setDateFrom} variant="light-inline" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{t('common.to') || 'Au'}</span>
            <DatePickerInput value={dateTo} onChange={setDateTo} variant="light-inline" />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                {t('common.clear') || 'Effacer'}
              </button>
            )}
          </div>
          <div className="ms-auto">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('common.search') || 'Rechercher...'}
                className="w-52 ps-9 pe-3 py-2 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grouped winners */}
      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : groups.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center py-16 gap-4">
          <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl">
            <TrophyIcon className="h-12 w-12 text-amber-300 dark:text-amber-600" />
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.key} className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
              {/* Group header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-b border-amber-100 dark:border-amber-900/20">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <TrophyIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{group.theme}</span>
                    <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{group.date}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    {group.winners.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmDelete({ guideId: group.guideId, winnerIds: group.winners.map(w => w._id || w.id), isGroup: true, label: group.theme })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-500 hover:text-white bg-red-50 hover:bg-red-500 dark:bg-red-900/20 dark:hover:bg-red-600 border border-red-200 dark:border-red-800 transition-all duration-150"
                  title={t('common.delete')}
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => exportGroupPDF(group.theme, group.date, group.winners, {
                    pageTitle: t('winners.title'),
                    subtitle: t('roles.RESPONSABLE_PUBLICITE'),
                    programme: t('guides.programTitle'),
                    date: t('common.date'),
                    total: t('common.total'),
                    winnerCount: t('winners.title').toLowerCase(),
                    winnerName: t('winners.winnerName'),
                    prize: t('winners.prize'),
                    phone: t('winners.phone'),
                    sentAt: t('winners.sentAt'),
                    printedOn: t('common.printedOn') || (document.documentElement.dir === 'rtl' ? 'طُبع في' : 'Imprimé le'),
                  }, document.documentElement.dir === 'rtl')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-sm shadow-amber-200/40 dark:shadow-amber-900/20 transition-all duration-150"
                >
                  <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                  Exporter PDF
                </button>
                </div>
              </div>

              {/* Group table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-gray-700">
                      <th className="px-5 py-2.5 text-start text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">#</th>
                      <th className="px-5 py-2.5 text-start text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('winners.winnerName')}</th>
                      <th className="px-5 py-2.5 text-start text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('winners.prize')}</th>
                      <th className="px-5 py-2.5 text-start text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('winners.phone')}</th>
                      <th className="px-5 py-2.5 text-start text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('winners.sentAt')}</th>
                      <th className="px-3 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                    {group.winners.map((w, idx) => (
                      <tr
                        key={w._id || w.id}
                        className={`transition-colors hover:bg-amber-50/40 dark:hover:bg-amber-900/5 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-slate-50/50 dark:bg-gray-700/20'}`}
                      >
                        <td className="px-5 py-3">
                          <div className={`w-7 h-7 rounded-lg ${idx < 3 ? ['bg-gradient-to-br from-amber-400 to-yellow-500', 'bg-gradient-to-br from-slate-300 to-slate-400', 'bg-gradient-to-br from-orange-400 to-amber-600'][idx] : 'bg-slate-200 dark:bg-gray-600'} flex items-center justify-center shadow-sm`}>
                            <span className="text-white text-xs font-bold">{idx + 1}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-semibold text-slate-800 dark:text-white">{w.winnerName}</span>
                        </td>
                        <td className="px-5 py-3">
                          {w.prize ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <GiftIcon className="h-3.5 w-3.5" />
                              {w.prize}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {w.phone ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <PhoneIcon className="h-3.5 w-3.5 text-sky-500" />
                              <span dir="ltr">{w.phone}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {w.sentToPublicityAt ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <ClockIcon className="h-3.5 w-3.5" />
                              {format(new Date(w.sentToPublicityAt), 'dd/MM/yyyy HH:mm')}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setConfirmDelete({ guideId: w.guideId, winnerId: w._id || w.id })}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title={t('common.delete')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-5 border border-slate-100 dark:border-gray-700">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrashIcon className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-slate-700 dark:text-slate-200 text-center font-medium">
                {confirmDelete?.isGroup
                  ? `${t('guides.confirmDelete')} "${confirmDelete.label}" (${confirmDelete.winnerIds?.length} ${t('winners.title').toLowerCase()})`
                  : t('guides.confirmDelete')}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary px-5">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-60"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
