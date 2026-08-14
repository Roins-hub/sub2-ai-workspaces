import { ChevronsLeftRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface ImageComparisonProps {
  /** Original image URL (shown on left/before) */
  beforeImage: string
  /** Upscaled image URL (shown on right/after) */
  afterImage: string
  /** Label for before image */
  beforeLabel?: string
  /** Label for after image */
  afterLabel?: string
  /** Optional className for the container */
  className?: string
}

export function ImageComparison({
  beforeImage,
  afterImage,
  beforeLabel = 'Original',
  afterLabel = '4x Upscaled',
  className = '',
}: ImageComparisonProps) {
  const [position, setPosition] = useState(50) // Slider position (0-100%)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  // Calculate position from mouse/touch coordinates
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const newPos = Math.min(Math.max((x / rect.width) * 100, 0), 100)
    setPosition(newPos)
  }, [])

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      handleMove(e.clientX)
    },
    [handleMove]
  )

  // Global mouse events (for drag outside container)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        handleMove(e.clientX)
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('mousemove', handleGlobalMouseMove)

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [handleMove])

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isDragging.current = true
      handleMove(e.touches[0].clientX)
    },
    [handleMove]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging.current) {
        handleMove(e.touches[0].clientX)
      }
    },
    [handleMove]
  )

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false
  }, [])

  // Label visibility (hide when slider is near edge)
  const showBeforeLabel = position > 15
  const showAfterLabel = position < 85

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden rounded-lg ${className}`}
      style={{ touchAction: 'none' }}
      role="slider"
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Image comparison slider"
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* After image (bottom layer - visible on right) */}
      <img
        src={afterImage}
        alt="After"
        className="w-full h-full object-contain"
        draggable={false}
      />

      {/* Before image (top layer - clipped to show left portion) */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img
          src={beforeImage}
          alt="Before"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        {/* Handle circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center cursor-ew-resize">
          <ChevronsLeftRight className="w-5 h-5 text-zinc-700" />
        </div>
      </div>

      {/* Before label */}
      <div
        className={`absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium transition-opacity duration-200 ${
          showBeforeLabel ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {beforeLabel}
      </div>

      {/* After label */}
      <div
        className={`absolute top-4 right-4 px-3 py-1.5 rounded-full bg-orange-500/80 backdrop-blur-sm text-white text-xs font-medium transition-opacity duration-200 ${
          showAfterLabel ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {afterLabel}
      </div>
    </div>
  )
}

export default ImageComparison
