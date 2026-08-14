import type { ImageDetails } from '@z-image/shared'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Eye, EyeOff, ImageIcon, Info, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getHistoryById, HISTORY_TTL_MS } from '@/lib/historyStore'

interface ImageResultCardProps {
  imageDetails: ImageDetails | null
  loading: boolean
  elapsed: number
  showInfo: boolean
  isBlurred: boolean
  setShowInfo: (v: boolean) => void
  setIsBlurred: (v: boolean) => void
  handleDownload: () => void
  handleDelete: () => void
  onRegenerate?: () => void
  historyId?: string | null
  generatedAt?: number | null
}

export function ImageResultCard({
  imageDetails,
  loading,
  elapsed,
  showInfo,
  isBlurred,
  setShowInfo,
  setIsBlurred,
  handleDownload,
  handleDelete,
  onRegenerate,
  historyId,
  generatedAt,
}: ImageResultCardProps) {
  const { t } = useTranslation()
  const [imageLoadError, setImageLoadError] = useState(false)

  // Fullscreen preview
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  const currentImageUrl = imageDetails?.url

  useEffect(() => {
    void currentImageUrl
    setImageLoadError(false)
  }, [currentImageUrl])

  const isExpired = (() => {
    if (historyId) {
      const item = getHistoryById(historyId)
      if (item) return Date.now() > item.expiresAt
    }
    if (typeof generatedAt === 'number') {
      return Date.now() > generatedAt + HISTORY_TTL_MS
    }
    return false
  })()

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false)
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleZoomIn = useCallback(() => setScale((s) => Math.min(s * 1.5, 8)), [])
  const handleZoomOut = useCallback(() => setScale((s) => Math.max(s / 1.5, 1)), [])
  const handleResetZoom = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    if (scale === 1) setPosition({ x: 0, y: 0 })
  }, [scale])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale((s) => Math.min(Math.max(s * delta, 1), 8))
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return
      e.preventDefault()
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y }
    },
    [scale, position]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || scale <= 1) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      setPosition({ x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy })
    },
    [isDragging, scale]
  )

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    if (!isFullscreen) return
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeFullscreen()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case '0':
          handleResetZoom()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isFullscreen, closeFullscreen, handleZoomIn, handleZoomOut, handleResetZoom])

  return (
    <>
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-500 text-sm font-normal">{t('result.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 group">
            {imageDetails ? (
              <>
                <img
                  src={currentImageUrl || ''}
                  alt="Generated"
                  className={`w-full transition-all duration-300 cursor-pointer ${isBlurred ? 'blur-xl' : ''}`}
                  onDoubleClick={() => currentImageUrl && setIsFullscreen(true)}
                  title={t('result.doubleClickFullscreen')}
                  onError={() => setImageLoadError(true)}
                  onLoad={() => setImageLoadError(false)}
                />

                {imageLoadError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="text-center space-y-3 px-6">
                      <div className="text-sm text-zinc-200">
                        {isExpired ? t('history.urlExpired') : t('history.loadFailed')}
                      </div>
                      {onRegenerate && (
                        <button
                          type="button"
                          onClick={onRegenerate}
                          className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm transition-colors"
                        >
                          {t('history.regenerate')}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Floating toolbar */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
                  <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl transition-opacity duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setShowInfo(!showInfo)}
                      title={t('result.details')}
                      className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                        showInfo
                          ? 'bg-orange-600 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Info className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBlurred(!isBlurred)}
                      title={t('result.toggleBlur')}
                      className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                        isBlurred
                          ? 'text-orange-400 bg-white/10'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {isBlurred ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      title={t('common.download')}
                      className="flex items-center justify-center w-10 h-10 rounded-xl transition-all text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      title={t('common.delete')}
                      className="flex items-center justify-center w-10 h-10 rounded-xl transition-all text-white/70 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Info panel */}
                {showInfo && (
                  <div className="absolute top-3 left-3 right-3 p-3 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-xs text-zinc-300 space-y-1">
                    <div>
                      <span className="text-zinc-500">{t('result.provider')}</span>{' '}
                      {imageDetails.provider}
                    </div>
                    <div>
                      <span className="text-zinc-500">{t('result.model')}</span>{' '}
                      {imageDetails.model}
                    </div>
                    <div>
                      <span className="text-zinc-500">{t('result.dimensions')}</span>{' '}
                      {imageDetails.dimensions}
                    </div>
                    <div>
                      <span className="text-zinc-500">{t('result.duration')}</span>{' '}
                      {imageDetails.duration}
                    </div>
                    <div>
                      <span className="text-zinc-500">{t('result.seed')}</span> {imageDetails.seed}
                    </div>
                    <div>
                      <span className="text-zinc-500">{t('result.steps')}</span>{' '}
                      {imageDetails.steps}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square flex flex-col items-center justify-center text-zinc-600">
                {loading ? (
                  <>
                    <div className="w-12 h-12 border-4 border-zinc-800 border-t-orange-500 rounded-full animate-spin mb-3" />
                    <span className="text-zinc-400 font-mono text-lg">{elapsed.toFixed(1)}s</span>
                    <span className="text-zinc-600 text-sm mt-1">{t('result.creating')}</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 text-zinc-700 mb-2" />
                    <span className="text-zinc-600 text-sm">{t('result.placeholder')}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {isFullscreen && currentImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center overflow-hidden"
            onClick={closeFullscreen}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <button
              type="button"
              onClick={closeFullscreen}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            >
              <X size={24} />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`${scale > 1 ? 'cursor-grab' : 'cursor-default'} ${isDragging ? 'cursor-grabbing' : ''}`}
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              }}
              onClick={(e) => e.stopPropagation()}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
            >
              <img
                src={currentImageUrl}
                alt="Preview"
                className={`max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl transition-[filter] duration-300 select-none ${
                  isBlurred ? 'blur-xl' : ''
                }`}
                draggable={false}
              />
            </motion.div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
              <div
                className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="toolbar"
                tabIndex={-1}
              >
                <button
                  type="button"
                  onClick={() => setShowInfo(!showInfo)}
                  title={t('result.details')}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                    showInfo
                      ? 'bg-orange-600 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Info className="w-5 h-5" />
                </button>
                <div className="w-px h-5 bg-white/10" />
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={scale <= 1}
                  title={t('result.zoomOut')}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title={t('result.resetZoom')}
                  className="flex items-center justify-center px-2 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-xs font-medium min-w-[3rem]"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={scale >= 8}
                  title={t('result.zoomIn')}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <div className="w-px h-5 bg-white/10" />
                <button
                  type="button"
                  onClick={() => setIsBlurred(!isBlurred)}
                  title={t('result.toggleBlur')}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                    isBlurred
                      ? 'text-orange-400 bg-white/10'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isBlurred ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <div className="w-px h-5 bg-white/10" />
                <button
                  type="button"
                  onClick={handleDownload}
                  title={t('common.download')}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showInfo && imageDetails && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute top-20 left-4 p-4 rounded-xl bg-zinc-900/90 border border-zinc-700 text-sm text-zinc-300 space-y-2 max-w-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t('result.providerLabel')}</span>
                  <span>{imageDetails.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t('result.modelLabel')}</span>
                  <span>{imageDetails.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t('result.sizeLabel')}</span>
                  <span>{imageDetails.dimensions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t('result.durationLabel')}</span>
                  <span>{imageDetails.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t('result.seedLabel')}</span>
                  <span className="font-mono">{imageDetails.seed}</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
