import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Info,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFlowStore } from '@/stores/flowStore'

export function Lightbox() {
  const { t } = useTranslation()
  const lightboxImageId = useFlowStore((s) => s.lightboxImageId)
  const imageNodes = useFlowStore((s) => s.imageNodes)
  const setLightboxImage = useFlowStore((s) => s.setLightboxImage)

  const currentImage = imageNodes.find((n) => n.id === lightboxImageId)
  const imagesWithUrls = imageNodes.filter((n) => n.data.imageUrl)

  const displayUrl = currentImage?.data.imageUrl || null

  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [showInfo, setShowInfo] = useState(false)
  const [isBlurred, setIsBlurred] = useState(false)

  const isDragging = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  // Reset state when image changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: we intentionally reset on lightboxImageId changes
  useEffect(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setShowInfo(false)
    setIsBlurred(false)
  }, [lightboxImageId])

  const handleClose = useCallback(() => setLightboxImage(null), [setLightboxImage])

  const handlePrev = useCallback(() => {
    if (imagesWithUrls.length <= 1) return
    const currentIdx = imagesWithUrls.findIndex((n) => n.id === lightboxImageId)
    const prevIdx = (currentIdx - 1 + imagesWithUrls.length) % imagesWithUrls.length
    setLightboxImage(imagesWithUrls[prevIdx].id)
  }, [imagesWithUrls, lightboxImageId, setLightboxImage])

  const handleNext = useCallback(() => {
    if (imagesWithUrls.length <= 1) return
    const currentIdx = imagesWithUrls.findIndex((n) => n.id === lightboxImageId)
    const nextIdx = (currentIdx + 1) % imagesWithUrls.length
    setLightboxImage(imagesWithUrls[nextIdx].id)
  }, [imagesWithUrls, lightboxImageId, setLightboxImage])

  const handleDownload = useCallback(async () => {
    if (!currentImage?.data.imageUrl) return
    const seed = currentImage.data.seed ?? 'image'
    const filename = `zenith-${seed}-${Date.now()}.png`
    try {
      const { downloadImage } = await import('@/lib/utils')
      await downloadImage(currentImage.data.imageUrl, filename)
    } catch (e) {
      console.error('Failed to download image:', e)
    }
  }, [currentImage])

  const handleZoomIn = useCallback(() => setScale((s) => Math.min(s * 1.5, 8)), [])
  const handleZoomOut = useCallback(() => setScale((s) => Math.max(s / 1.5, 1)), [])
  const handleResetZoom = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.deltaY < 0) setScale((s) => Math.min(s * 1.1, 8))
    else setScale((s) => Math.max(s / 1.1, 1))
  }, [])

  const handleImageMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return
      isDragging.current = true
      lastMousePos.current = { x: e.clientX, y: e.clientY }
    },
    [scale]
  )

  const handleImageMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || scale <= 1) return
      const dx = e.clientX - lastMousePos.current.x
      const dy = e.clientY - lastMousePos.current.y
      lastMousePos.current = { x: e.clientX, y: e.clientY }
      setPosition((p) => ({ x: p.x + dx, y: p.y + dy }))
    },
    [scale]
  )

  const handleImageMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!lightboxImageId) return
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleClose()
          break
        case 'ArrowLeft':
          handlePrev()
          break
        case 'ArrowRight':
          handleNext()
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
  }, [
    lightboxImageId,
    handleClose,
    handlePrev,
    handleNext,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
  ])

  if (!currentImage || !displayUrl) return null

  const idx = imagesWithUrls.findIndex((n) => n.id === lightboxImageId)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center overflow-hidden"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
        onMouseUp={handleImageMouseUp}
        onMouseLeave={handleImageMouseUp}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        {imagesWithUrls.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              title={t('common.prev', 'Previous')}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              title={t('common.next', 'Next')}
            >
              <ChevronRight size={24} />
            </button>
            <div className="absolute top-4 left-4 text-xs text-white/50 z-10">
              {idx + 1} / {imagesWithUrls.length}
            </div>
          </>
        )}

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`${scale > 1 ? 'cursor-grab' : 'cursor-default'} ${isDragging.current ? 'cursor-grabbing' : ''}`}
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          }}
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
          onMouseDown={handleImageMouseDown}
          onMouseMove={handleImageMouseMove}
        >
          <img
            src={displayUrl}
            alt="Preview"
            className={`max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl transition-[filter] duration-300 select-none ${
              isBlurred ? 'blur-xl' : ''
            }`}
            draggable={false}
          />
        </motion.div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                showInfo
                  ? 'bg-orange-600 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title={t('result.details')}
            >
              <Info className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-white/10" />
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('result.zoomOut')}
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="flex items-center justify-center px-2 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-xs font-medium min-w-[3rem]"
              title={t('result.resetZoom')}
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 8}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('result.zoomIn')}
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-white/10" />
            <button
              type="button"
              onClick={() => setIsBlurred(!isBlurred)}
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                isBlurred
                  ? 'text-orange-400 bg-white/10'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title={t('result.toggleBlur')}
            >
              {isBlurred ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <div className="w-px h-5 bg-white/10" />
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
              title={t('common.download')}
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showInfo && (
          <div className="absolute top-20 left-4 p-4 rounded-xl bg-zinc-900/90 border border-zinc-700 text-sm text-zinc-300 space-y-2 max-w-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">{t('result.seedLabel')}</span>
              <span className="font-mono">{String(currentImage.data.seed ?? '')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">{t('result.steps')}</span>
              <span className="font-mono">{String(currentImage.data.steps ?? '')}</span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
