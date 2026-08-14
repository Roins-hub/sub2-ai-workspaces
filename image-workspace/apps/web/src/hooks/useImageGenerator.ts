/**
 * Image Generator Hook
 *
 * Core state management and API calls for image generation
 */

import {
  DEFAULT_TRANSLATE_SYSTEM_PROMPT,
  getModelByProviderAndId,
  type ImageDetails,
  LLM_PROVIDER_CONFIGS,
} from '@z-image/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  buildChatTokenWithPrefix,
  buildImageTokenWithPrefix,
  createOpenAIClientForBaseUrl,
  getFullChatModelId,
  getFullImageModelId,
  openai,
  editWithCustomRelay,
  generateWithCustomRelay,
} from '@/lib/api'
import {
  ASPECT_RATIOS,
  DEFAULT_NEGATIVE_PROMPT,
  DEFAULT_PROMPT,
  DEFAULT_IMAGE_RELAY_SETTINGS,
  getDefaultLLMModel,
  getDefaultModel,
  getEffectiveSystemPrompt,
  getModelsByProvider,
  type LLMProviderType,
  type LLMSettings,
  type ImageRelaySettings,
  type ImageGenerationMode,
  normalizeImageRelayRoot,
  loadLLMSettings,
  loadSettings,
  PROVIDER_CONFIGS,
  type ProviderType,
  saveLLMSettings,
  saveSettings,
} from '@/lib/constants'
import { encryptAndStoreToken, loadAllTokens, loadTokensArray } from '@/lib/crypto'
import type { ImageHistoryItem } from '@/lib/historyStore'
import { getHistoryById, saveToHistory } from '@/lib/historyStore'
import { getBlob, storeBlob } from '@/lib/imageBlobStore'
import { parseTokens, runWithTokenRotation } from '@/lib/tokenRotation'

type ImageDetailsWithMeta = ImageDetails & { historyId?: string; generatedAt?: number }

export function useImageGenerator() {
  const [tokens, setTokens] = useState<Record<ProviderType, string>>({
    custom: '',
    a4f: '',
    gitee: '',
    huggingface: '',
    modelscope: '',
  })
  const [provider, setProvider] = useState<ProviderType>('custom')
  const [model, setModel] = useState(() => loadSettings().model ?? 'gpt-image-2')
  const [relaySettings, setRelaySettings] = useState<ImageRelaySettings>(() => ({
    ...DEFAULT_IMAGE_RELAY_SETTINGS,
    ...(loadSettings().relaySettings || {}),
    baseUrl: normalizeImageRelayRoot(
      loadSettings().relaySettings?.baseUrl || DEFAULT_IMAGE_RELAY_SETTINGS.baseUrl
    ),
  }))
  const [generationMode, setGenerationMode] = useState<ImageGenerationMode>('generate')
  const [referenceImages, setReferenceImages] = useState<File[]>([])
  const [prompt, setPrompt] = useState(() => loadSettings().prompt ?? DEFAULT_PROMPT)
  const [negativePrompt, setNegativePrompt] = useState(
    () => loadSettings().negativePrompt ?? DEFAULT_NEGATIVE_PROMPT
  )
  const [width, setWidth] = useState(() => loadSettings().width ?? 1024)
  const [height, setHeight] = useState(() => loadSettings().height ?? 1024)
  const [steps, setSteps] = useState(() => loadSettings().steps ?? 9)
  const [loading, setLoading] = useState(false)
  const [imageDetails, setImageDetails] = useState<ImageDetailsWithMeta | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<number | null>(null)
  const [status, setStatus] = useState('Ready.')
  const [elapsed, setElapsed] = useState(0)
  const [selectedRatio, setSelectedRatio] = useState(() => loadSettings().selectedRatio ?? '1:1')
  const [uhd, setUhd] = useState(() => loadSettings().uhd ?? false)
  const [showInfo, setShowInfo] = useState(false)
  const [isBlurred, setIsBlurred] = useState(() => localStorage.getItem('isBlurred') === 'true')
  const initialized = useRef(false)
  const objectUrlRef = useRef<string | null>(null)

  // LLM Settings for prompt optimization
  const [llmSettings, setLLMSettings] = useState<LLMSettings>(loadLLMSettings)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)

  // Get current token for selected provider
  const currentToken = tokens[provider]

  // Get models for current provider
  const availableModels = getModelsByProvider(provider)

  const selectedModelConfig = getModelByProviderAndId(provider, model)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      loadAllTokens().then(setTokens)
    }
  }, [])

  // Update model when provider changes
  useEffect(() => {
    const models = getModelsByProvider(provider)
    if (!models.find((m) => m.id === model)) {
      setModel(getDefaultModel(provider))
    }
  }, [provider, model])

  // Update steps when model changes (use model default if available).
  const lastModelKeyRef = useRef<string>('')
  useEffect(() => {
    const key = `${provider}:${model}`
    if (key === lastModelKeyRef.current) return
    lastModelKeyRef.current = key

    const stepCfg = selectedModelConfig?.features?.steps
    if (stepCfg) setSteps(stepCfg.default)
  }, [provider, model, selectedModelConfig])

  useEffect(() => {
    if (initialized.current) {
      saveSettings({
        prompt,
        negativePrompt,
        width,
        height,
        steps,
        selectedRatio,
        uhd,
        provider,
        model,
        relaySettings,
      })
    }
  }, [prompt, negativePrompt, width, height, steps, selectedRatio, uhd, provider, model, relaySettings])

  useEffect(() => {
    localStorage.setItem('isBlurred', String(isBlurred))
  }, [isBlurred])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  const showBlob = useCallback((blob: Blob): string => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(blob)
    objectUrlRef.current = url
    return url
  }, [])

  useEffect(() => {
    if (!loading) return
    setElapsed(0)
    const timer = setInterval(() => setElapsed((e) => e + 0.1), 100)
    return () => clearInterval(timer)
  }, [loading])

  const saveToken = async (p: ProviderType, token: string) => {
    setTokens((prev) => ({ ...prev, [p]: token }))
    await encryptAndStoreToken(p, token)
    if (token) toast.success(`${PROVIDER_CONFIGS[p].name} token saved`)
  }

  const addStatus = useCallback((msg: string) => {
    setStatus((prev) => `${prev}\n${msg}`)
  }, [])

  const handleRatioSelect = (ratio: (typeof ASPECT_RATIOS)[number]) => {
    setSelectedRatio(ratio.label)
    const preset = uhd ? ratio.presets[1] : ratio.presets[0]
    setWidth(preset.w)
    setHeight(preset.h)
  }

  const handleUhdToggle = (enabled: boolean) => {
    setUhd(enabled)
    const ratio = ASPECT_RATIOS.find((r) => r.label === selectedRatio)
    if (ratio) {
      const preset = enabled ? ratio.presets[1] : ratio.presets[0]
      setWidth(preset.w)
      setHeight(preset.h)
    }
  }

  const handleDownload = async () => {
    if (!imageDetails?.url) return
    const { downloadBlob, downloadImage } = await import('@/lib/utils')
    const savedItem = historyId ? getHistoryById(historyId) : null
    const blob = savedItem?.blobId ? await getBlob(savedItem.blobId) : null
    if (blob) downloadBlob(blob, `zenith-${Date.now()}.${relaySettings.outputFormat}`)
    else await downloadImage(imageDetails.url, `zenith-${Date.now()}.png`, imageDetails.provider)
  }

  const handleReferenceImages = useCallback((files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    const accepted = imageFiles.filter((file) => file.size <= 10 * 1024 * 1024).slice(0, 4)
    if (imageFiles.length !== files.length) toast.error('只能上传图片文件')
    else if (accepted.length !== imageFiles.length) toast.error('最多上传 4 张图片，单张不能超过 10MB')
    setReferenceImages(accepted)
  }, [])

  const handleDelete = () => {
    setImageDetails(null)
    setHistoryId(null)
    setGeneratedAt(null)
    setIsBlurred(false)
    setShowInfo(false)
    toast.success('Image deleted')
  }

  const handleLoadFromHistory = useCallback(async (item: ImageHistoryItem) => {
    setProvider(item.providerId)
    setModel(item.modelId)
    setPrompt(item.prompt)
    setNegativePrompt(item.negativePrompt || '')
    setWidth(item.width)
    setHeight(item.height)
    setSteps(item.steps)

    setHistoryId(item.id)
    setGeneratedAt(item.timestamp)
    setIsBlurred(false)
    setShowInfo(false)

    const blob = item.blobId ? await getBlob(item.blobId) : null
    const localUrl = blob ? showBlob(blob) : item.url
    if (!localUrl) {
      toast.error('本地图片数据不存在')
      return
    }
    setImageDetails({
      url: localUrl,
      provider: item.providerName,
      model: item.modelName,
      dimensions: `${item.width} x ${item.height}`,
      duration: item.duration || '',
      seed: item.seed,
      steps: item.steps,
      prompt: item.prompt,
      negativePrompt: item.negativePrompt || '',
      historyId: item.id,
      generatedAt: item.timestamp,
    })
    toast.success('已从本地历史加载')
  }, [showBlob])

  const handleGenerate = async () => {
    const providerConfig = PROVIDER_CONFIGS[provider]
    const providerTokens = parseTokens(currentToken)

    if (providerConfig.requiresAuth && providerTokens.length === 0) {
      toast.error(`Please configure your ${providerConfig.name} token first`)
      return
    }

    setLoading(true)
    setImageDetails(null)
    setHistoryId(null)
    setGeneratedAt(null)
    setIsBlurred(false)
    setShowInfo(false)
    setStatus('Initializing...')

    try {
      addStatus(`Sending request to ${providerConfig.name}...`)
      const start = Date.now()
      const seed = Math.floor(Math.random() * 2147483647)

      const supportsNegative = selectedModelConfig?.features?.negativePrompt ?? true
      const effectiveNegativePrompt = supportsNegative ? negativePrompt : ''

      const request = provider === 'custom'
        ? {
            model,
            prompt,
            size: width === height ? '1024x1024' : width > height ? '1536x1024' : '1024x1536',
            quality: relaySettings.quality,
            background: relaySettings.background,
            output_format: relaySettings.outputFormat,
            n: 1,
          }
        : {
            model: getFullImageModelId(provider, model),
            prompt,
            ...(effectiveNegativePrompt ? { negative_prompt: effectiveNegativePrompt } : {}),
            size: `${width}x${height}`,
            steps,
            seed,
            n: 1,
            response_format: 'url' as const,
          }

      if (generationMode === 'edit' && provider !== 'custom') {
        throw new Error('图生图目前仅支持自定义中转站')
      }
      if (generationMode === 'edit' && referenceImages.length === 0) {
        throw new Error('请先上传至少一张参考图')
      }

      const rotated = await runWithTokenRotation(provider, providerTokens, (t) => {
        if (provider === 'custom') {
          if (generationMode === 'edit') {
            return editWithCustomRelay({
              baseUrl: relaySettings.baseUrl,
              apiKey: t || '',
              model,
              prompt,
              images: referenceImages,
              size: request.size,
              quality: relaySettings.quality,
              background: relaySettings.background,
              outputFormat: relaySettings.outputFormat,
            })
          }
          return generateWithCustomRelay({ baseUrl: relaySettings.baseUrl, apiKey: t || '', payload: request })
        }
        return openai.generateImage(request, t ? buildImageTokenWithPrefix(provider, t) : undefined)
      }, { allowAnonymous: !providerConfig.requiresAuth })

      if (!rotated.success) throw new Error(rotated.error)

      const image = rotated.data.data?.[0]
      if (!image?.url && !image?.b64_json) throw new Error('中转站没有返回图片')
      const blob = image.b64_json
        ? await (await fetch(`data:image/${relaySettings.outputFormat};base64,${image.b64_json}`)).blob()
        : await (await fetch(image.url as string)).blob()
      const blobId = crypto.randomUUID()
      const stored = await storeBlob(blobId, blob)
      if (!stored) throw new Error('图片无法保存到浏览器本地存储')
      const url = showBlob(blob)

      const durationMs = Date.now() - start
      const duration = `${(durationMs / 1000).toFixed(1)}s`

      const modelName = model
      const details: ImageDetails = {
        url,
        provider: providerConfig.name,
        model: modelName,
        dimensions: `${width} x ${height}`,
        duration,
        seed,
        steps,
        prompt,
        negativePrompt: negativePrompt || '',
      }

      addStatus(`Image generated in ${duration}!`)

      const now = Date.now()
      const newHistoryId = saveToHistory({
        url: '',
        blobId,
        prompt: details.prompt,
        negativePrompt: details.negativePrompt,
        providerId: provider,
        providerName: details.provider,
        modelId: model,
        modelName: details.model,
        width,
        height,
        steps: details.steps,
        seed: details.seed,
        duration: details.duration,
        source: 'home',
      })

      setHistoryId(newHistoryId)
      setGeneratedAt(now)
      setImageDetails({ ...details, historyId: newHistoryId, generatedAt: now })
      toast.success(generationMode === 'edit' ? 'Image edited!' : 'Image generated!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      addStatus(`Error: ${msg}`)
      toast.error(msg)
    } finally {
    setLoading(false)
    }
  }

  // LLM Settings handlers
  const updateLLMSettings = useCallback((updates: Partial<LLMSettings>) => {
    setLLMSettings((prev) => {
      const newSettings = { ...prev, ...updates }
      saveLLMSettings(newSettings)
      return newSettings
    })
  }, [])

  const setLLMProvider = useCallback(
    (provider: LLMProviderType) => {
      updateLLMSettings({
        llmProvider: provider,
        llmModel: getDefaultLLMModel(provider),
      })
    },
    [updateLLMSettings]
  )

  const setLLMModel = useCallback(
    (model: string) => {
      updateLLMSettings({ llmModel: model })
    },
    [updateLLMSettings]
  )

  const setAutoTranslate = useCallback(
    (enabled: boolean) => {
      updateLLMSettings({ autoTranslate: enabled })
    },
    [updateLLMSettings]
  )

  const setCustomSystemPrompt = useCallback(
    (prompt: string) => {
      updateLLMSettings({ customSystemPrompt: prompt })
    },
    [updateLLMSettings]
  )

  const setTranslateProvider = useCallback(
    (provider: LLMProviderType) => {
      updateLLMSettings({
        translateProvider: provider,
        translateModel: getDefaultLLMModel(provider),
      })
    },
    [updateLLMSettings]
  )

  const setTranslateModel = useCallback(
    (model: string) => {
      updateLLMSettings({ translateModel: model })
    },
    [updateLLMSettings]
  )

  const setCustomOptimizeConfig = useCallback(
    (config: Partial<{ baseUrl: string; apiKey: string; model: string }>) => {
      setLLMSettings((prev) => {
        const newSettings = {
          ...prev,
          customOptimizeConfig: { ...prev.customOptimizeConfig, ...config },
        }
        saveLLMSettings(newSettings)
        return newSettings
      })
    },
    []
  )

  const setCustomTranslateConfig = useCallback(
    (config: Partial<{ baseUrl: string; apiKey: string; model: string }>) => {
      setLLMSettings((prev) => {
        const newSettings = {
          ...prev,
          customTranslateConfig: { ...prev.customTranslateConfig, ...config },
        }
        saveLLMSettings(newSettings)
        return newSettings
      })
    },
    []
  )

  // Get tokens for LLM provider (maps llm provider to token provider)
  const getTokensForLLMProvider = useCallback(
    async (llmProvider: LLMProviderType): Promise<string[]> => {
      switch (llmProvider) {
        case 'gitee-llm':
          return loadTokensArray('gitee')
        case 'modelscope-llm':
          return loadTokensArray('modelscope')
        case 'huggingface-llm':
          return loadTokensArray('huggingface')
        case 'deepseek':
          return loadTokensArray('deepseek')
        default:
          return []
      }
    },
    []
  )

  const getLLMTokens = useCallback(async (): Promise<string[]> => {
    return getTokensForLLMProvider(llmSettings.llmProvider)
  }, [llmSettings.llmProvider, getTokensForLLMProvider])

  const getTranslateTokens = useCallback(async (): Promise<string[]> => {
    return getTokensForLLMProvider(llmSettings.translateProvider)
  }, [llmSettings.translateProvider, getTokensForLLMProvider])

  // Optimize prompt handler
  const handleOptimize = useCallback(async () => {
    if (!prompt.trim() || isOptimizing) return

    setIsOptimizing(true)
    addStatus('Optimizing prompt...')

    try {
      const llmProvider = llmSettings.llmProvider
      const systemPrompt = `${getEffectiveSystemPrompt(llmSettings.customSystemPrompt)}\n\nEnsure the output is in English.`
      const modelId =
        llmProvider === 'custom' ? llmSettings.customOptimizeConfig.model : llmSettings.llmModel

      let optimized: string

      if (llmProvider === 'custom') {
        const { baseUrl, apiKey, model } = llmSettings.customOptimizeConfig
        if (!baseUrl || !apiKey || !model)
          throw new Error('Please configure custom provider URL, API key, and model')
        const client = createOpenAIClientForBaseUrl(baseUrl)
        const resp = await client.chatCompletions(
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1000,
          },
          apiKey
        )
        optimized = resp.choices?.[0]?.message?.content || ''
      } else {
        const cfg = LLM_PROVIDER_CONFIGS[llmProvider]
        const tokens = await getLLMTokens()
        const tokenProvider =
          llmProvider === 'gitee-llm'
            ? 'gitee'
            : llmProvider === 'modelscope-llm'
              ? 'modelscope'
              : llmProvider === 'huggingface-llm'
                ? 'huggingface'
                : llmProvider === 'deepseek'
                  ? 'deepseek'
                  : null

        if (cfg?.needsAuth && tokens.length === 0) {
          throw new Error(`Please configure your ${cfg.name} token first`)
        }

        if (!tokenProvider) {
          const resp = await openai.chatCompletions({
            model: getFullChatModelId(llmProvider, modelId),
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1000,
          })
          optimized = resp.choices?.[0]?.message?.content || ''
        } else {
          const rotated = await runWithTokenRotation(
            tokenProvider,
            tokens,
            (t) =>
              openai.chatCompletions(
                {
                  model: getFullChatModelId(llmProvider, modelId),
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt },
                  ],
                  max_tokens: 1000,
                },
                t ? buildChatTokenWithPrefix(llmProvider, t) : undefined
              ),
            { allowAnonymous: !cfg?.needsAuth }
          )
          if (!rotated.success) throw new Error(rotated.error)
          optimized = rotated.data.choices?.[0]?.message?.content || ''
        }
      }

      if (!optimized.trim()) throw new Error('Empty response from provider')

      setPrompt(optimized)
      addStatus('Prompt optimized!')
      toast.success('Prompt optimized!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Optimization failed'
      addStatus(`Error: ${msg}`)
      toast.error(msg)
    } finally {
      setIsOptimizing(false)
    }
  }, [prompt, isOptimizing, llmSettings, getLLMTokens, addStatus])

  // Translate prompt handler
  const handleTranslate = useCallback(async () => {
    if (!prompt.trim() || isTranslating) return

    setIsTranslating(true)
    addStatus('Translating prompt...')

    try {
      const llmProvider = llmSettings.translateProvider
      const systemPrompt = DEFAULT_TRANSLATE_SYSTEM_PROMPT
      const modelId =
        llmProvider === 'custom'
          ? llmSettings.customTranslateConfig.model
          : llmSettings.translateModel

      let translated: string

      if (llmProvider === 'custom') {
        const { baseUrl, apiKey, model } = llmSettings.customTranslateConfig
        if (!baseUrl || !apiKey || !model)
          throw new Error('Please configure custom provider URL, API key, and model')
        const client = createOpenAIClientForBaseUrl(baseUrl)
        const resp = await client.chatCompletions(
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1000,
            temperature: 0.3,
          },
          apiKey
        )
        translated = resp.choices?.[0]?.message?.content || ''
      } else {
        const cfg = LLM_PROVIDER_CONFIGS[llmProvider]
        const tokens = await getTranslateTokens()
        const tokenProvider =
          llmProvider === 'gitee-llm'
            ? 'gitee'
            : llmProvider === 'modelscope-llm'
              ? 'modelscope'
              : llmProvider === 'huggingface-llm'
                ? 'huggingface'
                : llmProvider === 'deepseek'
                  ? 'deepseek'
                  : null

        if (cfg?.needsAuth && tokens.length === 0) {
          throw new Error(`Please configure your ${cfg.name} token first`)
        }

        if (!tokenProvider) {
          const resp = await openai.chatCompletions({
            model: getFullChatModelId(llmProvider, modelId),
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1000,
            temperature: 0.3,
          })
          translated = resp.choices?.[0]?.message?.content || ''
        } else {
          const rotated = await runWithTokenRotation(
            tokenProvider,
            tokens,
            (t) =>
              openai.chatCompletions(
                {
                  model: getFullChatModelId(llmProvider, modelId),
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt },
                  ],
                  max_tokens: 1000,
                  temperature: 0.3,
                },
                t ? buildChatTokenWithPrefix(llmProvider, t) : undefined
              ),
            { allowAnonymous: !cfg?.needsAuth }
          )
          if (!rotated.success) throw new Error(rotated.error)
          translated = rotated.data.choices?.[0]?.message?.content || ''
        }
      }

      if (!translated.trim()) throw new Error('Empty response from provider')

      setPrompt(translated)
      addStatus('Prompt translated!')
      toast.success('Prompt translated to English!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Translation failed'
      addStatus(`Error: ${msg}`)
      toast.error(msg)
    } finally {
      setIsTranslating(false)
    }
  }, [prompt, isTranslating, llmSettings, getTranslateTokens, addStatus])

  return {
    // State
    tokens,
    currentToken,
    provider,
    model,
    availableModels,
    relaySettings,
    generationMode,
    referenceImages,
    prompt,
    negativePrompt,
    width,
    height,
    steps,
    loading,
    imageDetails,
    status,
    elapsed,
    selectedRatio,
    uhd,
    showInfo,
    isBlurred,
    // LLM State
    llmSettings,
    isOptimizing,
    isTranslating,
    // Setters
    setProvider,
    setModel,
    setRelaySettings,
    setGenerationMode,
    handleReferenceImages,
    setPrompt,
    setNegativePrompt,
    setWidth,
    setHeight,
    setSteps,
    setShowInfo,
    setIsBlurred,
    // LLM Setters
    setLLMProvider,
    setLLMModel,
    setTranslateProvider,
    setTranslateModel,
    setAutoTranslate,
    setCustomSystemPrompt,
    setCustomOptimizeConfig,
    setCustomTranslateConfig,
    // Handlers
    saveToken,
    handleRatioSelect,
    handleUhdToggle,
    handleDownload,
    handleDelete,
    handleGenerate,
    handleLoadFromHistory,
    historyId,
    generatedAt,
    // LLM Handlers
    handleOptimize,
    handleTranslate,
  }
}
