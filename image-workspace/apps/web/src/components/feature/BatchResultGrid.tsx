import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock3,
  Download,
  ImageIcon,
  Loader2,
  RotateCcw,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type BatchGenerationTask,
  type BatchTaskStatus,
  getBatchTaskDuration,
} from '@/lib/batchQueue'

interface BatchResultGridProps {
  tasks: BatchGenerationTask[]
  loading: boolean
  downloading: boolean
  onCancel: () => void
  onRetry: (id: string) => void
  onDownload: (id: string) => void
  onDownloadAll: () => void
  onClear: () => void
}

const statusIcons: Record<BatchTaskStatus, typeof Clock3> = {
  queued: Clock3,
  running: Loader2,
  success: CheckCircle2,
  error: AlertCircle,
  cancelled: Square,
}

const statusClasses: Record<BatchTaskStatus, string> = {
  queued: 'text-zinc-500',
  running: 'text-sky-400',
  success: 'text-emerald-400',
  error: 'text-red-400',
  cancelled: 'text-zinc-600',
}

export function BatchResultGrid({
  tasks,
  loading,
  downloading,
  onCancel,
  onRetry,
  onDownload,
  onDownloadAll,
  onClear,
}: BatchResultGridProps) {
  const { t } = useTranslation()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const completed = tasks.filter((task) =>
    ['success', 'error', 'cancelled'].includes(task.status)
  ).length
  const successes = tasks.filter((task) => task.status === 'success').length
  const queued = tasks.some((task) => task.status === 'queued')
  const hasRunningTask = tasks.some((task) => task.status === 'running')
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0

  useEffect(() => {
    if (!hasRunningTask) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [hasRunningTask])

  return (
    <>
      <Card className="rounded-2xl border-zinc-800 bg-zinc-900/50">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-normal text-zinc-300">
                {t('batch.results')}
              </CardTitle>
              <p className="mt-1 font-mono text-[11px] text-zinc-500">
                {tasks.length > 0
                  ? t('batch.progress', { completed, total: tasks.length })
                  : t('batch.empty')}
              </p>
            </div>
            {tasks.length > 0 && (
              <div className="flex items-center gap-1">
                {loading && queued && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-400 transition-colors hover:border-red-500/60 hover:text-red-300"
                  >
                    <Square className="h-3 w-3 fill-current" /> {t('batch.cancelRemaining')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onDownloadAll}
                  disabled={successes === 0 || downloading}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-300 transition-colors hover:border-sky-500/60 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {downloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Archive className="h-3.5 w-3.5" />
                  )}
                  {t('batch.downloadAll')}
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  disabled={loading}
                  className="flex size-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                  title={t('batch.clearResults')}
                  aria-label={t('batch.clearResults')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          {tasks.length > 0 && (
            <div
              role="progressbar"
              aria-label={`${progress}%`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
            >
              <motion.div
                className="h-full bg-sky-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          )}
        </CardHeader>

        <CardContent>
          {tasks.length === 0 ? (
            <div className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 text-zinc-600">
              <LayersPlaceholder />
              <span className="mt-3 max-w-48 text-center text-sm">{t('batch.empty')}</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <AnimatePresence initial={false}>
                {tasks.map((task) => {
                  const StatusIcon = statusIcons[task.status]
                  const duration = getBatchTaskDuration(task, now)
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
                    >
                      <div className="relative aspect-square overflow-hidden bg-zinc-900">
                        {task.status === 'success' && task.details ? (
                          <button
                            type="button"
                            onClick={() => setPreviewUrl(task.details?.url || null)}
                            className="h-full w-full cursor-zoom-in"
                            title={task.prompt}
                          >
                            <img
                              src={task.details.url}
                              alt={`Batch result ${task.index + 1}`}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                          </button>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center px-3 text-center">
                            <StatusIcon
                              className={`h-6 w-6 ${statusClasses[task.status]} ${task.status === 'running' ? 'animate-spin' : ''}`}
                            />
                            <span className={`mt-2 text-xs ${statusClasses[task.status]}`}>
                              {t(`batch.${task.status}`)}
                            </span>
                            {task.status === 'running' && duration && (
                              <span className="mt-1.5 font-mono text-sm text-zinc-300">
                                {duration}
                              </span>
                            )}
                            {task.error && (
                              <p
                                className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-red-300/80"
                                title={task.error}
                              >
                                {task.error}
                              </p>
                            )}
                            {(task.status === 'error' || task.status === 'cancelled') && (
                              <button
                                type="button"
                                onClick={() => onRetry(task.id)}
                                disabled={loading}
                                className="mt-3 flex h-7 items-center gap-1 rounded-lg border border-zinc-700 px-2 text-[11px] text-zinc-300 transition-colors hover:border-sky-500 hover:text-sky-300 disabled:opacity-40"
                              >
                                <RotateCcw className="h-3 w-3" /> {t('batch.retry')}
                              </button>
                            )}
                          </div>
                        )}

                        {task.status === 'success' && (
                          <button
                            type="button"
                            onClick={() => onDownload(task.id)}
                            className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-lg bg-black/70 text-white/80 opacity-100 backdrop-blur-sm transition hover:text-white md:opacity-0 md:group-hover:opacity-100"
                            title={t('common.download')}
                            aria-label={`${t('common.download')} ${task.index + 1}`}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1 border-t border-zinc-800 px-2 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-zinc-600">
                            #{String(task.index + 1).padStart(2, '0')}
                          </span>
                          <div className="flex min-w-0 items-center gap-2">
                            {duration && (
                              <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                                <Clock3 className="h-3 w-3" />
                                {t('batch.duration', { duration })}
                              </span>
                            )}
                            <span
                              className={`flex items-center gap-1 text-[10px] ${statusClasses[task.status]}`}
                            >
                              <StatusIcon className="h-3 w-3" /> {t(`batch.${task.status}`)}
                            </span>
                          </div>
                        </div>
                        <p
                          className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-zinc-400"
                          title={task.prompt}
                        >
                          {task.prompt}
                        </p>
                        {task.status === 'success' && task.savedLocally === false && (
                          <p className="text-[10px] text-amber-400">{t('batch.notSaved')}</p>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setPreviewUrl(null)}
          >
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.img
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              src={previewUrl}
              alt="Batch preview"
              className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function LayersPlaceholder() {
  return (
    <div className="relative h-12 w-12">
      <ImageIcon className="absolute left-0 top-2 h-9 w-9 text-zinc-700" />
      <ImageIcon className="absolute bottom-2 right-0 h-9 w-9 text-zinc-800" />
    </div>
  )
}
