import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DatePickerInput from '../../components/common/DatePickerInput'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  MusicalNoteIcon, TrashIcon, XMarkIcon,
  ClockIcon, MicrophoneIcon, CalendarDaysIcon,
  FunnelIcon, DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import { getValidatedSongs, deleteHistorySong } from '../guides/api'
import { useNotifications } from '../../hooks/useNotifications'
import { format } from 'date-fns'

export default function SongHistoryPage() {
  const { t } = useTranslation()
  const { addNotification } = useNotifications()
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [page, setPage] = useState(1)
  const limit = 10

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    getValidatedSongs(params)
      .then(res => setSongs(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  const handleDelete = async (song) => {
    const sId = song._id || song.id
    setRemovingId(sId)
    try {
      await deleteHistorySong(sId)
      setTimeout(() => {
        setSongs(prev => prev.filter(s => (s._id || s.id) !== sId))
        setRemovingId(null)
        setDeletingId(null)
        addNotification({ type: 'success', message: t('common.delete') })
      }, 300)
    } catch {
      setRemovingId(null)
      setDeletingId(null)
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const hasFilter = !!(dateFrom || dateTo)
  const totalPages = Math.ceil(songs.length / limit)
  const paginatedSongs = songs.slice((page - 1) * limit, page * limit)

  const dateRangeLabel = dateFrom && dateTo
    ? `${format(new Date(dateFrom + 'T00:00:00'), 'dd/MM/yyyy')} → ${format(new Date(dateTo + 'T00:00:00'), 'dd/MM/yyyy')}`
    : dateFrom
      ? `${t('admin.dateFrom')} ${format(new Date(dateFrom + 'T00:00:00'), 'dd/MM/yyyy')}`
      : dateTo
        ? `${t('admin.dateTo')} ${format(new Date(dateTo + 'T00:00:00'), 'dd/MM/yyyy')}`
        : t('admin.allDates') || 'Toutes les dates'

  return (
    <div className="space-y-6">

      {/* ── Print-only header ── */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center justify-between border-b border-gray-300 pb-4 mb-5">
          <img src="/assets/logo-main.png" alt="Radio Monastir" style={{ height: 64, width: 'auto' }} />
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('songs.history')}</h1>
            <p className="text-sm text-gray-500">{dateRangeLabel}</p>
            <p className="text-xs text-gray-400 mt-1">{t('songs.printedOn') || 'Imprimé le'} {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          <div className="text-end" style={{ minWidth: 64 }}>
            <p className="text-sm font-bold text-gray-700">{songs.length}</p>
            <p className="text-xs text-gray-400">{t('songs.title')}</p>
          </div>
        </div>
      </div>

      {/* ── Print-only songs table ── */}
      {songs.length > 0 && (
        <table className="hidden print:table w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">Heure</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">Titre</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">Artiste</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">Programme</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">Date</th>
            </tr>
          </thead>
          <tbody>
            {songs.map(song => (
              <tr key={song._id || song.id} className="even:bg-slate-50">
                <td className="border border-slate-200 px-3 py-2 font-mono text-slate-700">{song.passageTime || '—'}</td>
                <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-800">{song.title}</td>
                <td className="border border-slate-200 px-3 py-2 text-slate-600">{song.artist || '—'}</td>
                <td className="border border-slate-200 px-3 py-2 text-slate-600">{song.guideId?.programTitle || '—'}</td>
                <td className="border border-slate-200 px-3 py-2 text-slate-500 font-mono text-xs">{song.validatedAt ? format(new Date(song.validatedAt), 'dd/MM/yyyy HH:mm') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700 p-6 text-white shadow-lg shadow-purple-300/30 dark:shadow-purple-900/40 print:hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 end-0 -translate-y-6 translate-x-6 opacity-[0.08]">
          <MusicalNoteIcon className="h-52 w-52" />
        </div>
        <div className="absolute bottom-0 start-0 translate-y-8 -translate-x-8 opacity-[0.06]">
          <MicrophoneIcon className="h-40 w-40 rotate-12" />
        </div>
        {/* Glow orbs */}
        <div className="absolute top-4 end-20 w-24 h-24 bg-pink-400/20 rounded-full blur-2xl" />
        <div className="absolute bottom-2 start-16 w-20 h-20 bg-indigo-400/20 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <MusicalNoteIcon className="h-5 w-5 text-white/80" />
            <span className="text-sm font-medium text-white/80">Radio Monastir</span>
          </div>
          <h1 className="text-2xl font-bold">{t('songs.history')}</h1>
          <p className="text-sm text-white/60 mt-1">
            {loading ? '...' : `${songs.length} ${t('songs.title').toLowerCase()}`}
          </p>
        </div>

        {/* Counter badge */}
        {!loading && songs.length > 0 && (
          <div className="absolute top-5 end-5 z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-400" />
              </span>
              <span className="text-sm font-bold">{songs.length} {t('songs.title').toLowerCase()}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Filter Bar ── */}
      <div className="print:hidden bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 font-medium">
            <FunnelIcon className="h-4 w-4" />
            <span>{t('common.filter') || 'Filtrer'}</span>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('common.from') || 'Du'}</span>
          <DatePickerInput
            value={dateFrom}
            onChange={(v) => { setDateFrom(v); setPage(1); if (dateTo && v && dateTo < v) setDateTo('') }}
            variant="light-inline"
          />
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('common.to') || 'Au'}</span>
          <DatePickerInput
            value={dateTo}
            onChange={(v) => { setDateTo(v); setPage(1) }}
            variant="light-inline"
          />
          {hasFilter && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {t('common.clear') || 'Effacer'}
            </button>
          )}
        </div>
        {!loading && songs.length > 0 && (
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-indigo-700 hover:from-fuchsia-600 hover:to-indigo-800 text-white text-sm font-semibold rounded-xl shadow-md shadow-purple-400/30 dark:shadow-purple-900/40 transition-all active:scale-95"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            {t('guides.exportPdf') || 'Exporter PDF'}
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : songs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm transition-colors">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="hidden dark:block absolute inset-0 bg-purple-500/15 rounded-2xl blur-xl" />
              <div className="relative p-5 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-700/30 dark:to-gray-700/10 rounded-2xl border border-slate-100 dark:border-gray-600/30">
                <MusicalNoteIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              </div>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
          </div>
        </div>
      ) : (
        <div className="print:hidden bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden transition-colors
          dark:shadow-xl dark:shadow-purple-950/10">

          {/* Table header bar */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-700/20 dark:to-gray-700/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="hidden dark:block absolute inset-0 bg-purple-500/20 rounded-lg blur-md" />
                <div className="relative p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-200/50 dark:border-purple-500/20">
                  <MusicalNoteIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('songs.title')}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('songs.history')}</p>
              </div>
              <span className="ms-auto text-sm font-bold px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/20">
                {songs.length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/60 dark:bg-gray-700/20 border-b border-slate-100 dark:border-gray-700">
                  <th className="px-6 py-3.5 text-start text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-28">
                    <div className="flex items-center gap-1.5">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {t('songs.passageTime')}
                    </div>
                  </th>
                  <th className="px-6 py-3.5 text-start text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <MusicalNoteIcon className="h-3.5 w-3.5" />
                      {t('songs.songTitle')}
                    </div>
                  </th>
                  <th className="px-6 py-3.5 text-start text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-40">
                    <div className="flex items-center gap-1.5">
                      <MicrophoneIcon className="h-3.5 w-3.5" />
                      {t('songs.artist')}
                    </div>
                  </th>
                  <th className="px-6 py-3.5 text-start text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t('guides.programTitle')}
                  </th>
                  <th className="px-6 py-3.5 text-start text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-44">
                    <div className="flex items-center gap-1.5">
                      <CalendarDaysIcon className="h-3.5 w-3.5" />
                      {t('songs.playedAt')}
                    </div>
                  </th>
                  <th className="px-3 py-3.5 w-10 print:hidden" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-gray-700/40">
                {paginatedSongs.map((song, idx) => {
                  const sId = song._id || song.id
                  const isConfirming = deletingId === sId
                  const isRemoving = removingId === sId

                  return (
                    <tr
                      key={sId}
                      className={`
                        group relative
                        transition-all duration-200
                        ${isRemoving ? 'opacity-0 scale-y-95' : 'opacity-100 scale-y-100'}
                        ${isConfirming
                          ? 'bg-red-50/70 dark:bg-red-950/15'
                          : 'hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
                        }
                      `}
                      style={{ transformOrigin: 'top' }}
                    >
                      {/* Accent bar on hover */}
                      <td className="px-6 py-4 relative">
                        <div className={`absolute start-0 top-2 bottom-2 w-[3px] rounded-full transition-all duration-200
                          ${isConfirming
                            ? 'bg-red-400 dark:bg-red-500'
                            : 'bg-transparent group-hover:bg-gradient-to-b group-hover:from-fuchsia-400 group-hover:to-purple-500 dark:group-hover:from-fuchsia-500 dark:group-hover:to-purple-600'
                          }
                        `} />
                        {song.passageTime ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all duration-200
                            ${isConfirming
                              ? 'bg-red-100 dark:bg-red-950/40 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800/50'
                              : 'bg-gradient-to-r from-fuchsia-50 to-purple-50 dark:from-fuchsia-950/40 dark:to-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/40 group-hover:border-purple-300 dark:group-hover:border-purple-600/60 group-hover:shadow-sm group-hover:shadow-purple-200/50 dark:group-hover:shadow-purple-900/30'
                            }`}
                          >
                            {song.passageTime}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Title */}
                      <td className="px-6 py-4">
                        <span className={`font-semibold transition-colors duration-200 ${isConfirming ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                          {song.title}
                        </span>
                      </td>

                      {/* Artist */}
                      <td className={`px-6 py-4 transition-colors duration-200 ${isConfirming ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}>
                        {song.artist || '—'}
                      </td>

                      {/* Program */}
                      <td className="px-6 py-4">
                        {song.guideId ? (
                          <div className="space-y-0.5">
                            <p className={`font-medium text-xs transition-colors duration-200 ${isConfirming ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`}>
                              {song.guideId.programTitle || '—'}
                            </p>
                            {song.guideId.producerName && (
                              <p className="text-slate-400 dark:text-slate-500 text-[11px]">{song.guideId.producerName}</p>
                            )}
                            {song.guideId.broadcastDate && (
                              <p className="text-slate-400 dark:text-slate-600 text-[11px]">{song.guideId.broadcastDate}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Played at */}
                      <td className="px-6 py-4">
                        <span className={`text-xs font-mono transition-colors duration-200 ${isConfirming ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`}>
                          {song.validatedAt ? format(new Date(song.validatedAt), 'dd/MM/yyyy HH:mm') : '—'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-4 text-end print:hidden">
                        {isConfirming ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDelete(song)}
                              disabled={isRemoving}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors duration-150 disabled:opacity-50 shadow-sm shadow-red-200 dark:shadow-red-900/30"
                            >
                              <TrashIcon className="h-3 w-3" />
                              {t('common.yes')}
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors duration-150"
                              title={t('common.cancel')}
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(sId)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-150"
                            title={t('common.delete')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2 print:hidden">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {t('common.previous')}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
            Math.max(0, page - 3), Math.min(totalPages, page + 2)
          ).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                p === page
                  ? 'bg-gradient-to-br from-fuchsia-500 to-indigo-700 text-white shadow-md shadow-purple-300/30'
                  : 'border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/10'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {t('common.next')}
          </button>
          <span className="text-xs text-slate-400 dark:text-slate-500 ms-2">
            {(page - 1) * limit + 1}–{Math.min(page * limit, songs.length)} / {songs.length}
          </span>
        </div>
      )}
    </div>
  )
}
