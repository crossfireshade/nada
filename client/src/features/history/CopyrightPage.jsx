import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import DatePickerInput from '../../components/common/DatePickerInput'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { getValidatedSongs, updateSongGenre, getSongGenreStats, classifySongByApi } from '../guides/api'
import { format } from 'date-fns'
import {
  MusicalNoteIcon,
  MicrophoneIcon,
  ClockIcon,
  CalendarDaysIcon,
  FunnelIcon,
  SparklesIcon,
  ChartPieIcon,
  XMarkIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline'

/* ─── Genre config ────────────────────────────────────────────────────────── */
const GENRES = [
  { value: '',           labelKey: 'songs.genreOptions.NONE',        color: '#94A3B8', bg: 'bg-slate-100 dark:bg-slate-700',   text: 'text-slate-500 dark:text-slate-400'    },
  { value: 'TUNISIEN',   labelKey: 'songs.genreOptions.TUNISIEN',    color: '#EF4444', bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-600 dark:text-red-400'        },
  { value: 'ORIENTAL',   labelKey: 'songs.genreOptions.ORIENTAL',    color: '#F59E0B', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400'    },
  { value: 'OCCIDENTAL', labelKey: 'songs.genreOptions.OCCIDENTAL',  color: '#3B82F6', bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-600 dark:text-blue-400'      },
  { value: 'AUTRE',      labelKey: 'songs.genreOptions.AUTRE',       color: '#8B5CF6', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400' },
]

function getGenreMeta(value) {
  return GENRES.find(g => g.value === value) ?? GENRES[0]
}

/* ─── Fallback heuristic (used only when server API call fails entirely) ──── */
const TUNISIAN_KEYWORDS = ['malouf', 'mezoued', 'stambali', 'zajal']
const TUNISIAN_ARTISTS = [
  'saber rebai', 'lotfi bouchnak', 'lofti bouchnak', 'hedi jouini',
  'nabiha', 'wissem', 'latifa', 'dhikra', 'dhafer youssef',
  'hamada ben amor', 'el general', 'emel mathlouthi',
]

function detectGenreFallback(title = '', artist = '') {
  const text = `${title} ${artist}`.toLowerCase().trim()

  // Explicit Tunisian indicators
  if (TUNISIAN_KEYWORDS.some(k => text.includes(k))) return 'TUNISIEN'
  if (TUNISIAN_ARTISTS.some(k => text.includes(k))) return 'TUNISIEN'

  // Arabic script present → likely ORIENTAL (could be Tunisian but safer default)
  const arabicScript = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/
  if (arabicScript.test(text)) return 'ORIENTAL'

  // Latin text with no other clues → OCCIDENTAL
  return 'OCCIDENTAL'
}

/* ─── SVG Donut chart ─────────────────────────────────────────────────────── */
function DonutChart({ segments, size = 180, strokeWidth = 34 }) {
  const r = (size - strokeWidth) / 2
  const C = 2 * Math.PI * r
  const cx = size / 2
  const cy = size / 2
  const total = segments.reduce((s, d) => s + d.count, 0)

  if (total === 0) {
    return (
      <div style={{ width: size, height: size }} className="flex items-center justify-center">
        <span className="text-slate-400 text-sm">—</span>
      </div>
    )
  }

  let cumulativeCount = 0
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {segments.map((seg, i) => {
        const fraction = seg.count / total
        const dashArray = `${fraction * C} ${C}`
        const dashOffset = -(cumulativeCount / total) * C
        cumulativeCount += seg.count
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
          />
        )
      })}
    </svg>
  )
}

/* ─── Stats Modal ─────────────────────────────────────────────────────────── */
function StatsModal({ stats, total, loading, onClose, t }) {
  const segments = GENRES.filter(g => g.value !== '').map(g => {
    const found = stats?.find(s => s._id === g.value)
    return { label: t(g.labelKey), color: g.color, count: found?.count ?? 0 }
  })
  const unclassified = stats?.find(s => !s._id || s._id === '')
  if (unclassified?.count) {
    segments.push({ label: t('songs.genreOptions.NONE'), color: '#94A3B8', count: unclassified.count })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <ChartPieIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">{t('songs.statsTitle')}</h3>
                <p className="text-white/70 text-xs mt-0.5">{t('songs.statsSubtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              {/* Total badge */}
              <div className="px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-bold">
                {total ?? 0} {t('songs.title').toLowerCase()}
              </div>

              {/* Donut */}
              <div className="relative">
                <DonutChart segments={segments.filter(s => s.count > 0)} size={180} strokeWidth={34} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-slate-800 dark:text-white">{total ?? 0}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t('songs.total')}</span>
                </div>
              </div>

              {/* Legend */}
              <div className="w-full space-y-2.5">
                {segments.map(seg => {
                  const pct = (total ?? 0) > 0 ? Math.round((seg.count / (total ?? 1)) * 100) : 0
                  return (
                    <div key={seg.label} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 font-medium">{seg.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-gray-700 overflow-hidden" style={{ width: 80 }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: seg.color }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400 w-10 text-end">{pct}%</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 w-6 text-end">{seg.count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function CopyrightPage() {
  const { t } = useTranslation()
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [classifying, setClassifying] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 10
  const [showStats, setShowStats] = useState(false)
  const [stats, setStats] = useState(null)
  const [statsTotal, setStatsTotal] = useState(0)
  const [statsLoading, setStatsLoading] = useState(false)

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

  const handleGenreChange = async (songId, genre) => {
    setSavingId(songId)
    setSongs(prev => prev.map(s => (s._id || s.id) === songId ? { ...s, genre } : s))
    try {
      await updateSongGenre(songId, genre)
    } catch { /* silent */ } finally {
      setSavingId(null)
    }
  }

  const handleAutoClassify = async (forceAll = false) => {
    setClassifying(true)
    const toClassify = forceAll ? songs : songs.filter(s => !s.genre)
    for (const s of toClassify) {
      const sId = s._id || s.id
      setSavingId(sId)
      try {
        const res = await classifySongByApi(sId)
        const result = res.data?.data
        if (result?.song) {
          setSongs(prev => prev.map(x =>
            (x._id || x.id) === sId
              ? { ...x, genre: result.song.genre, artistCountry: result.song.artistCountry }
              : x
          ))
        }
      } catch {
        // Fallback to local heuristic if API fails
        const genre = detectGenreFallback(s.title, s.artist)
        setSongs(prev => prev.map(x => (x._id || x.id) === sId ? { ...x, genre } : x))
        try { await updateSongGenre(sId, genre) } catch { /* silent */ }
      }
      await new Promise(r => setTimeout(r, 400))
    }
    setSavingId(null)
    setClassifying(false)
  }

  const handleShowStats = async () => {
    setShowStats(true)
    setStatsLoading(true)
    try {
      const params = {}
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      const res = await getSongGenreStats(params)
      setStats(res.data?.data?.stats ?? [])
      setStatsTotal(res.data?.data?.total ?? 0)
    } catch {
      setStats([])
      setStatsTotal(0)
    } finally {
      setStatsLoading(false)
    }
  }

  const unclassifiedCount = songs.filter(s => !s.genre).length
  const totalPages = Math.ceil(songs.length / limit)
  const paginatedSongs = songs.slice((page - 1) * limit, page * limit)

  // Stats computed from loaded songs (for print)
  const computedPrintStats = GENRES.filter(g => g.value !== '').map(g => ({
    label: t(g.labelKey),
    color: g.color,
    count: songs.filter(s => s.genre === g.value).length,
    pct: songs.length > 0 ? Math.round(songs.filter(s => s.genre === g.value).length / songs.length * 100) : 0,
  }))

  const dateRangeLabel = dateFrom && dateTo
    ? `${t('songs.dateFrom')} ${dateFrom} ${t('songs.dateTo')} ${dateTo}`
    : dateFrom ? `${t('songs.dateFrom')} ${dateFrom}`
    : dateTo ? `${t('songs.dateTo')} ${dateTo}`
    : t('songs.allDates')

  return (
    <div className="space-y-6">

      {/* ── Print-only header ── */}
      <div className="hidden print:block mb-6">
        <div className="flex items-start justify-between border-b border-gray-300 pb-4 mb-5">
          <img src="/assets/logo-main.png" alt="Radio Monastir" style={{ height: 64, width: 'auto' }} />
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('songs.copyrightTitle')}</h1>
            <p className="text-sm text-gray-500">{dateRangeLabel}</p>
            <p className="text-xs text-gray-400 mt-1">{t('songs.printedOn')} {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          <div style={{ width: 64 }} />
        </div>

        {/* Genre stats summary */}
        {songs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-bold text-gray-700 mb-3">{t('songs.statsTitle')} — {songs.length} {t('songs.title').toLowerCase()}</h2>
            <table className="w-full text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-start font-semibold">{t('songs.genre')}</th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold">{t('songs.total')}</th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold">%</th>
                </tr>
              </thead>
              <tbody>
                {computedPrintStats.map(stat => (
                  <tr key={stat.label}>
                    <td className="border border-gray-300 px-4 py-2 font-medium">{stat.label}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{stat.count}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center font-bold">{stat.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Full songs list for print */}
        {songs.length > 0 && (
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">{t('songs.passageTime')}</th>
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">{t('songs.songTitle')}</th>
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">{t('songs.artist')}</th>
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">{t('guides.programTitle')}</th>
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">{t('songs.playedAt')}</th>
                <th className="border border-gray-300 px-3 py-2 text-start font-semibold">{t('songs.genre')}</th>
              </tr>
            </thead>
            <tbody>
              {songs.map(song => {
                const genreMeta = getGenreMeta(song.genre)
                return (
                  <tr key={song._id || song.id} className="even:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-1.5 font-mono text-xs">{song.passageTime || '—'}</td>
                    <td className="border border-gray-300 px-3 py-1.5 font-semibold">{song.title}</td>
                    <td className="border border-gray-300 px-3 py-1.5">{song.artist || '—'}</td>
                    <td className="border border-gray-300 px-3 py-1.5">{song.guideId?.programTitle || '—'}</td>
                    <td className="border border-gray-300 px-3 py-1.5 font-mono text-xs">
                      {song.validatedAt ? format(new Date(song.validatedAt), 'dd/MM/yyyy HH:mm') : '—'}
                    </td>
                    <td className="border border-gray-300 px-3 py-1.5 text-xs font-semibold">
                      {song.genre ? t(GENRES.find(g => g.value === song.genre)?.labelKey || '') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 p-6 text-white shadow-lg shadow-amber-300/30 dark:shadow-amber-900/40 print:hidden">
        {/* Decorative */}
        <div className="absolute top-0 end-0 -translate-y-6 translate-x-6 opacity-[0.07]">
          <MusicalNoteIcon className="h-52 w-52" />
        </div>
        <div className="absolute bottom-0 start-0 translate-y-10 -translate-x-10 opacity-[0.05]">
          <svg viewBox="0 0 100 100" className="h-40 w-40">
            <text x="5" y="85" fontSize="90" fontWeight="bold">©</text>
          </svg>
        </div>
        {/* Glow orbs */}
        <div className="absolute top-4 end-20 w-24 h-24 bg-yellow-300/25 rounded-full blur-2xl" />
        <div className="absolute bottom-2 start-16 w-20 h-20 bg-orange-300/20 rounded-full blur-2xl" />

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-black text-white/30 select-none">©</span>
              <span className="text-sm font-medium text-white/80">Radio Monastir</span>
            </div>
            <h1 className="text-2xl font-bold">{t('songs.copyrightTitle')}</h1>
            <p className="text-sm text-white/60 mt-1">{t('songs.copyrightSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!loading && songs.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-200 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-300" />
                </span>
                <span className="text-sm font-bold">{songs.length} {t('songs.title').toLowerCase()}</span>
              </div>
            )}
            {!loading && songs.length > 0 && (
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-semibold rounded-xl border border-white/20 shadow-lg transition-all duration-200 active:scale-95"
              >
                <PrinterIcon className="h-4 w-4" />
                {t('songs.exportPdf')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter & Actions Bar ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm px-4 py-3 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
            <FunnelIcon className="h-4 w-4" />
            <span>{t('common.filter') || 'Filtrer'}</span>
          </div>

          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('common.from') || 'Du'}</span>
          <DatePickerInput
            value={dateFrom}
            onChange={(v) => { setDateFrom(v); setPage(1) }}
            variant="light-inline"
          />
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('common.to') || 'Au'}</span>
          <DatePickerInput
            value={dateTo}
            onChange={(v) => { setDateTo(v); setPage(1) }}
            variant="light-inline"
          />

          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {t('common.clear') || 'Effacer'}
            </button>
          )}

          <div className="ms-auto flex items-center gap-2 flex-wrap">
            {/* Auto-classify unclassified */}
            {unclassifiedCount > 0 && (
              <button
                onClick={() => handleAutoClassify(false)}
                disabled={classifying}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:from-violet-600 hover:to-indigo-600 transition-all shadow-sm shadow-violet-200 dark:shadow-violet-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <SparklesIcon className="h-4 w-4" />
                {classifying ? t('songs.classifying') : `${t('songs.autoClassify')} (${unclassifiedCount})`}
              </button>
            )}

            {/* Force re-classify all (fix wrong classifications) — shown only when all songs are classified */}
            {songs.length > 0 && unclassifiedCount === 0 && (
              <button
                onClick={() => handleAutoClassify(true)}
                disabled={classifying}
                title="Reclasser toutes les chansons (corrige les erreurs de classification)"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 transition-all shadow-sm shadow-rose-200 dark:shadow-rose-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <SparklesIcon className="h-4 w-4" />
                {classifying ? t('songs.classifying') : 'Reclasser tout'}
              </button>
            )}

            {/* Stats button */}
            <button
              onClick={handleShowStats}
              disabled={loading || songs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm shadow-amber-200 dark:shadow-amber-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChartPieIcon className="h-4 w-4" />
              {t('songs.showStats')}
            </button>

          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : songs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                <MusicalNoteIcon className="h-12 w-12 text-amber-300 dark:text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
          </div>
        </div>
      ) : (
        <div className="print:hidden bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">

          {/* Table header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200/50 dark:border-amber-500/20">
                <MusicalNoteIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('songs.copyrightTitle')}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('songs.copyrightSubtitle')}</p>
              </div>
              <span className="ms-auto text-sm font-bold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20">
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
                  <th className="px-6 py-3.5 text-start text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-52">
                    {t('songs.genre')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-gray-700/40">
                {paginatedSongs.map((song) => {
                  const sId = song._id || song.id
                  const isSaving = savingId === sId
                  const genreMeta = getGenreMeta(song.genre)

                  return (
                    <tr
                      key={sId}
                      className="group hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors duration-150"
                    >
                      {/* Passage time with accent bar */}
                      <td className="px-6 py-4 relative">
                        <div className="absolute start-0 top-2 bottom-2 w-[3px] rounded-full bg-transparent group-hover:bg-gradient-to-b group-hover:from-amber-400 group-hover:to-orange-500 transition-all duration-200" />
                        {song.passageTime ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/40 group-hover:border-amber-300 dark:group-hover:border-amber-600/60">
                            {song.passageTime}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Title */}
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-150">
                          {song.title}
                        </span>
                      </td>

                      {/* Artist */}
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors duration-150">
                        {song.artist || '—'}
                      </td>

                      {/* Program */}
                      <td className="px-6 py-4">
                        {song.guideId ? (
                          <div className="space-y-0.5">
                            <p className="font-medium text-xs text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                              {song.guideId.programTitle || '—'}
                            </p>
                            {song.guideId.broadcastDate && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">{song.guideId.broadcastDate}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Played at */}
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
                          {song.validatedAt ? format(new Date(song.validatedAt), 'dd/MM/yyyy HH:mm') : '—'}
                        </span>
                      </td>

                      {/* Genre selector */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                        <div className="relative">
                          <select
                            value={song.genre ?? ''}
                            onChange={e => handleGenreChange(sId, e.target.value)}
                            disabled={isSaving}
                            className={`
                              appearance-none cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150
                              focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600
                              disabled:opacity-60 disabled:cursor-wait
                              ${genreMeta.bg} ${genreMeta.text}
                              border-transparent hover:border-current/20
                              pe-6
                            `}
                            style={{ minWidth: 110 }}
                          >
                            {GENRES.map(g => (
                              <option key={g.value} value={g.value}>
                                {t(g.labelKey)}
                              </option>
                            ))}
                          </select>
                          {/* Dropdown arrow */}
                          <div className={`pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 ${genreMeta.text}`}>
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                          </div>
                          {isSaving && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-800/60 rounded-lg">
                              <div className="h-3 w-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        </div>
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
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-300/30'
                  : 'border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/10'
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

      {/* ── Stats Modal ── */}
      {showStats && (
        <StatsModal
          stats={stats}
          total={statsTotal}
          loading={statsLoading}
          onClose={() => setShowStats(false)}
          t={t}
        />
      )}
    </div>
  )
}
