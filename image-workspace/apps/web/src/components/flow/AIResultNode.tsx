import { Handle, type NodeProps, Position } from '@xyflow/react'
import { Download, Eye, EyeOff, GitBranch, Sparkles, Trash2 } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { buildImageTokenWithPrefix, getFullImageModelId } from '@/lib/api'
import { loadSettings, type ProviderType } from '@/lib/constants'
import { loadAllTokens } from '@/lib/crypto'
import type { GeneratedImage } from '@/lib/flow-storage'

export type AIResultNodeData = {
  prompt: string
  width: number
  height: number
  aspectRatio: string
  model: string
  seed?: number
  imageUrl?: string // Pre-loaded image URL (for restored nodes)
  duration?: string // Generation time string (for restored nodes)
  onImageGenerated?: (nodeId: string, image: GeneratedImage) => void
  onDelete?: (id: string) => void
}

import type { ImageDetails, OpenAIErrorResponse, OpenAIImageResponse } from '@z-image/shared'

async function generateImageApi(
  prompt: string,
  width: number,
  height: number,
  provider: ProviderType,
  token: string,
  model: string,
  seed?: number
): Promise<ImageDetails> {
  const baseUrl = import.meta.env.VITE_API_URL || ''
  const { PROVIDER_CONFIGS, getModelsByProvider } = await import('@/lib/constants')
  const providerConfig = PROVIDER_CONFIGS[provider]
  const start = Date.now()
  const finalSeed = typeof seed === 'number' ? seed : Math.floor(Math.random() * 2147483647)

  const res = await fetch(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${buildImageTokenWithPrefix(provider, token)}` }),
    },
    body: JSON.stringify({
      prompt,
      model: getFullImageModelId(provider, model),
      size: `${width}x${height}`,
      steps: 9,
      seed: finalSeed,
      n: 1,
      response_format: 'url',
    }),
  })

  const json = (await res.json().catch(() => null)) as
    | OpenAIImageResponse
    | OpenAIErrorResponse
    | null
  if (!res.ok) {
    const msg = (json as OpenAIErrorResponse | null)?.error?.message || 'Failed to generate'
    throw new Error(msg)
  }

  const url = (json as OpenAIImageResponse | null)?.data?.[0]?.url
  if (!url) throw new Error('No image returned')

  const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`
  const modelName = getModelsByProvider(provider).find((m) => m.id === model)?.name || model

  return {
    url,
    provider: providerConfig.name,
    model: modelName,
    dimensions: `${width} x ${height}`,
    duration,
    seed: finalSeed,
    steps: 9,
    prompt,
    negativePrompt: '',
  }
}

function AIResultNode({ id, data, selected }: NodeProps) {
  const {
    prompt,
    width,
    height,
    aspectRatio,
    model,
    seed,
    imageUrl: preloadedUrl,
    duration: preloadedDuration,
    onImageGenerated,
    onDelete,
  } = data as AIResultNodeData
  const [imageUrl, setImageUrl] = useState<string | null>(preloadedUrl || null)
  const [imageProvider, setImageProvider] = useState<string | null>(null)
  const [loading, setLoading] = useState(!preloadedUrl)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [durationStr, setDurationStr] = useState<string | null>(preloadedDuration || null)
  const [isBlurred, setIsBlurred] = useState(false)
  const startTimeRef = useRef(0)
  const generatingRef = useRef(false)

  // Timer for elapsed time during generation
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000)
    }, 100)
    return () => clearInterval(interval)
  }, [loading])

  // biome-ignore lint/correctness/useExhaustiveDependencies: preloadedUrl is intentionally excluded - we only want to generate once on mount
  useEffect(() => {
    // Skip generation if image is already loaded (restored node)
    if (preloadedUrl) return

    // Prevent double execution from React StrictMode
    if (generatingRef.current) return
    generatingRef.current = true
    ;(async () => {
      startTimeRef.current = Date.now()
      const settings = loadSettings()
      const provider = (settings.provider as ProviderType) ?? 'huggingface'

      // Validate model is valid for the provider, otherwise use default
      const { getModelsByProvider, getDefaultModel } = await import('@/lib/constants')
      const validModels = getModelsByProvider(provider)
      const savedModel = settings.model || 'z-image-turbo'
      const selectedModel = validModels.some((m) => m.id === savedModel)
        ? savedModel
        : getDefaultModel(provider)

      const tokens = await loadAllTokens()
      const token = tokens[provider]

      const { PROVIDER_CONFIGS } = await import('@/lib/constants')
      if (PROVIDER_CONFIGS[provider].requiresAuth && !token) {
        setError('No API Token')
        setLoading(false)
        return
      }

      try {
        const imageDetails = await generateImageApi(
          prompt,
          width,
          height,
          provider,
          token,
          selectedModel,
          seed
        )
        setImageUrl(imageDetails.url)
        setImageProvider(imageDetails.provider)
        setDurationStr(imageDetails.duration)
        setLoading(false)
        onImageGenerated?.(id, {
          id,
          url: imageDetails.url,
          provider: imageDetails.provider,
          model: imageDetails.model,
          dimensions: imageDetails.dimensions,
          duration: imageDetails.duration,
          seed: imageDetails.seed,
          steps: imageDetails.steps,
          prompt: imageDetails.prompt,
          negativePrompt: imageDetails.negativePrompt,
          timestamp: Date.now(),
          isBlurred: false,
          isUpscaled: false,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate')
        setLoading(false)
      }
    })()
  }, [prompt, width, height, aspectRatio, model, seed, id, onImageGenerated])

  const handleDownload = async () => {
    if (!imageUrl) return
    const { downloadImage } = await import('@/lib/utils')
    await downloadImage(imageUrl, `zenith-${Date.now()}.png`, imageProvider || undefined)
  }

  return (
    <div
      className={`
        relative backdrop-blur-md border rounded-xl p-4 min-w-[280px] shadow-2xl
        transition-all duration-300 ease-out
        ${
          selected
            ? 'bg-zinc-900/80 border-orange-500/50 ring-2 ring-orange-500/40 shadow-[0_0_30px_rgba(249,115,22,0.2)]'
            : 'bg-zinc-900/60 border-zinc-700 hover:border-zinc-600'
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`!w-3 !h-3 !border-2 transition-colors ${
          selected ? '!bg-orange-500 !border-orange-400' : '!bg-orange-500 !border-orange-400'
        }`}
      />

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow-lg z-10">
          <GitBranch size={10} className="text-white" />
        </div>
      )}

      <div className="relative w-[256px] h-[256px] rounded-lg overflow-hidden bg-zinc-800 mb-3 group">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-zinc-700 border-t-orange-500 rounded-full animate-spin mb-3" />
            <span className="text-zinc-400 font-mono text-lg">{elapsed.toFixed(1)}s</span>
            <span className="text-zinc-600 text-sm mt-1">Creating your image...</span>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <span className="text-red-400 text-sm text-center">{error}</span>
          </div>
        ) : (
          <>
            <img
              src={imageUrl!}
              alt="Generated"
              className={`w-full h-full object-cover transition-all duration-300 ${isBlurred ? 'blur-xl' : ''}`}
            />
            {/* Floating Toolbar */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setIsBlurred(!isBlurred)}
                  title="Toggle Blur"
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                    isBlurred
                      ? 'text-orange-400 bg-white/10'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isBlurred ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <div className="w-px h-4 bg-white/10" />
                <button
                  type="button"
                  onClick={handleDownload}
                  title="Download"
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-all text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/10" />
                <button
                  type="button"
                  onClick={() => onDelete?.(id)}
                  title="Delete"
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-all text-white/70 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Sparkles size={12} className="text-yellow-500" />
        <span>{model}</span>
        {!loading && !error && durationStr && (
          <span className="text-zinc-600">• {durationStr}</span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={`!w-3 !h-3 !border-2 transition-colors ${
          selected ? '!bg-orange-500 !border-orange-400' : '!bg-zinc-600 !border-zinc-500'
        }`}
      />
    </div>
  )
}

export default memo(AIResultNode)
