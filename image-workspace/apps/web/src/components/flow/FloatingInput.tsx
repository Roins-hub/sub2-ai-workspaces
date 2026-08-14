import {
  GitBranch,
  Globe,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ASPECT_RATIOS } from '@/lib/constants'
import { loadFlowInputSettings, saveFlowInputSettings } from '@/lib/flow-storage'

interface FloatingInputProps {
  onSubmit: (config: {
    prompt: string
    width: number
    height: number
    batchCount: number
    seed: number
  }) => void
  providerLabel: string
  selectedNodeId?: string | null
  onClearSelection?: () => void
  // Prompt optimization/translation
  onOptimize?: (prompt: string) => Promise<string | null>
  onTranslate?: (prompt: string) => Promise<string | null>
  isOptimizing?: boolean
  isTranslating?: boolean
}

export default function FloatingInput({
  onSubmit,
  providerLabel,
  selectedNodeId,
  onClearSelection,
  onOptimize,
  onTranslate,
  isOptimizing = false,
  isTranslating = false,
}: FloatingInputProps) {
  const isProcessing = isOptimizing || isTranslating
  const [aspectRatioIndex, setAspectRatioIndex] = useState(0)
  const [resolutionIndex, setResolutionIndex] = useState(0) // 0=1K, 1=2K - independent of aspect ratio
  const [prompt, setPrompt] = useState('')
  const [batchCount, setBatchCount] = useState(2)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000))
  const [initialized, setInitialized] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    const settings = loadFlowInputSettings()
    setAspectRatioIndex(settings.aspectRatioIndex)
    setResolutionIndex(settings.resolutionIndex)
    setPrompt(settings.prompt)
    setInitialized(true)
  }, [])

  // Save settings to localStorage when they change
  const saveSettings = useCallback(() => {
    if (!initialized) return
    saveFlowInputSettings({
      aspectRatioIndex,
      resolutionIndex,
      prompt,
    })
  }, [aspectRatioIndex, resolutionIndex, prompt, initialized])

  useEffect(() => {
    saveSettings()
  }, [saveSettings])

  const currentAspectRatio = ASPECT_RATIOS[aspectRatioIndex]
  // Use resolutionIndex directly - each aspect ratio has presets[0]=1K and presets[1]=2K
  const currentResolution = currentAspectRatio.presets[resolutionIndex]

  const handleSubmit = () => {
    if (!prompt.trim()) return
    onSubmit({
      prompt: prompt.trim(),
      width: currentResolution.w,
      height: currentResolution.h,
      batchCount,
      seed,
    })
    setPrompt('')
    // Also save cleared prompt to localStorage
    saveFlowInputSettings({
      aspectRatioIndex,
      resolutionIndex,
      prompt: '',
    })
  }

  const cycleAspectRatio = () => {
    setAspectRatioIndex((prev) => (prev + 1) % ASPECT_RATIOS.length)
    // Don't reset resolutionIndex - keep it independent
  }

  const cycleResolution = () => {
    // All aspect ratios have 2 presets: [0]=1K, [1]=2K
    setResolutionIndex((prev) => (prev + 1) % 2)
  }

  const cycleBatchCount = () => {
    setBatchCount((prev) => (prev % 4) + 1)
  }

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 100000))
  }

  const handleOptimize = async () => {
    if (!onOptimize || !prompt.trim() || isProcessing) return
    const optimized = await onOptimize(prompt)
    if (optimized) setPrompt(optimized)
  }

  const handleTranslate = async () => {
    if (!onTranslate || !prompt.trim() || isProcessing) return
    const translated = await onTranslate(prompt)
    if (translated) setPrompt(translated)
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50 flex items-end gap-3">
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 relative">
        {/* Selected Node Indicator */}
        {selectedNodeId && (
          <div className="absolute -top-10 left-4 flex items-center gap-2 px-3 py-1.5 rounded-t-xl bg-orange-500/10 border border-orange-500/30 border-b-0">
            <GitBranch size={14} className="text-orange-400" />
            <span className="text-xs text-orange-300">
              Branching from <span className="font-mono font-medium">{selectedNodeId}</span>
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              className="ml-1 p-0.5 rounded hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Row 1: Badges */}
        <div className="flex gap-2">
          <Badge
            variant="secondary"
            onClick={cycleAspectRatio}
            className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-full px-3 py-0.5 text-xs font-normal cursor-pointer"
          >
            {currentAspectRatio.label}
          </Badge>
          <Badge
            variant="secondary"
            onClick={cycleResolution}
            className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-full px-3 py-0.5 text-xs font-normal cursor-pointer"
          >
            {currentResolution.w >= 2048 || currentResolution.h >= 2048 ? '2K' : '1K'}
          </Badge>
          <Badge
            variant="secondary"
            className="bg-zinc-800 text-zinc-400 rounded-full px-3 py-0.5 text-xs font-normal cursor-pointer hover:bg-zinc-700 flex items-center gap-1"
            onClick={randomizeSeed}
          >
            Seed: {seed}
            <RefreshCw size={10} className="ml-1" />
          </Badge>
        </div>

        {/* Row 2: Input */}
        <div className="relative">
          <textarea
            placeholder="Describe your image..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            rows={3}
            className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-600 focus:outline-none text-lg py-1 resize-none pr-20"
          />
          {/* Optimize/Translate buttons */}
          {(onOptimize || onTranslate) && (
            <div className="absolute right-0 top-0 flex flex-col gap-1">
              {onTranslate && (
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={isProcessing || !prompt.trim()}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Translate to English"
                >
                  {isTranslating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Globe size={16} />
                  )}
                </button>
              )}
              {onOptimize && (
                <button
                  type="button"
                  onClick={handleOptimize}
                  disabled={isProcessing || !prompt.trim()}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Optimize prompt"
                >
                  {isOptimizing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Wand2 size={16} />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Row 3: Model & Controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 bg-zinc-800/50 rounded-full pl-2 pr-3 py-1.5 border border-zinc-700/50">
            <div className="flex items-center gap-1.5 text-xs text-zinc-300">
              <ImageIcon size={14} className="text-zinc-500" />
              <span className="text-zinc-500 font-medium">图片生成模式</span>
              <span className="h-3 w-px bg-zinc-700 mx-1" />
              <Sparkles size={14} className="text-yellow-500" />
              <span>{providerLabel}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={cycleBatchCount}
            className="flex items-center justify-center bg-zinc-800 rounded-full px-3 py-1 text-xs font-medium text-zinc-400 cursor-pointer hover:bg-zinc-700 transition-colors"
          >
            x{batchCount}
          </button>
        </div>
      </div>

      {/* Floating Go Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!prompt.trim()}
        className="h-14 w-14 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <Zap className="text-white fill-white" size={22} />
      </button>
    </div>
  )
}
