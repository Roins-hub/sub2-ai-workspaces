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
  type OpenAIImageRequest,
} from '@z-image/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  buildChatTokenWithPrefix,
  buildImageTokenWithPrefix,
  createOpenAIClientForBaseUrl,
  editWithCustomRelay,
  generateWithCustomRelay,
  getFullChatModelId,
  getFullImageModelId,
  openai,
} from '@/lib/api'
import {
  type BatchGenerationTask,
  buildBatchPrompts,
  MAX_BATCH_CONCURRENCY,
  runWithConcurrency,
} from '@/lib/batchQueue'
import {
  ASPECT_RATIOS,
  type BatchPromptMode,
  DEFAULT_IMAGE_RELAY_SETTINGS,
  DEFAULT_NEGATIVE_PROMPT,
  DEFAULT_PROMPT,
  getDefaultLLMModel,
  getDefaultModel,
  getEffectiveSystemPrompt,
  getModelsByProvider,
  type ImageGenerationMode,
  type ImageRelaySettings,
  type LLMProviderType,
  type LLMSettings,
  loadLLMSettings,
  loadSettings,
  normalizeImageRelayRoot,
  PROVIDER_CONFIGS,
  type ProviderType,
  saveLLMSettings,
  saveSettings,
} from '@/lib/constants'
import { encryptAndStoreToken, loadAllTokens, loadTokensArray } from '@/lib/crypto'
import type { ImageHistoryItem } from '@/lib/historyStore'
import { getHistoryById, saveToHistory } from '@/lib/historyStore'
import { checkStorageLimit, getBlob, storeBlob } from '@/lib/imageBlobStore'
import { parseTokens, runWithTokenRotation } from '@/lib/tokenRotation'

type ImageDetailsWithMeta = ImageDetails & { historyId?: string; generatedAt?: number }
type GenerationOutcome = {
  details: ImageDetails
  blob: Blob
  historyId?: string
  blobId?: string
  generatedAt: number
  savedLocally: boolean
}

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
  const [batchPromptMode, setBatchPromptMode] = useState<BatchPromptMode>('repeat')
  const [batchCount, setBatchCount] = useState(4)
  const [batchConcurrency, setBatchConcurrency] = useState(MAX_BATCH_CONCURRENCY)
  const [batchPrompts, setBatchPrompts] = useState<string[]>([])
  const [batchTasks, setBatchTasks] = useState<BatchGenerationTask[]>([])
  const [batchDownloading, setBatchDownloading] = useState(false)
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
  const batchObjectUrlsRef = useRef(new Set<string>())
  const batchCancelledRef = useRef(false)
  const batchRunIdRef = useRef(0)

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
  }, [
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
  ])

  useEffect(() => {
    localStorage.setItem('isBlurred', String(isBlurred))
  }, [isBlurred])

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      for (const url of batchObjectUrlsRef.current) URL.revokeObjectURL(url)
      batchObjectUrlsRef.current.clear()
    },
    []
  )

  const showBlob = useCallback((blob: Blob): string => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(blob)
    objectUrlRef.current = url
    return url
  }, [])

  const showBatchBlob = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob)
    batchObjectUrlsRef.current.add(url)
    return url
  }, [])

  const releaseBatchObjectUrls = useCallback(() => {
    for (const url of batchObjectUrlsRef.current) URL.revokeObjectURL(url)
    batchObjectUrlsRef.current.clear()
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
    else if (accepted.length !== imageFiles.length)
      toast.error('最多上传 4 张图片，单张不能超过 10MB')
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

  const handleLoadFromHistory = useCallback(
    async (item: ImageHistoryItem) => {
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
    },
    [showBlob]
  )

  const generateOne = useCallback(
    async (
      taskPrompt: string,
      mode: Exclude<ImageGenerationMode, 'batch'>
    ): Promise<GenerationOutcome> => {
      const providerConfig = PROVIDER_CONFIGS[provider]
      const providerTokens = parseTokens(currentToken)

      if (providerConfig.requiresAuth && providerTokens.length === 0) {
        throw new Error(`Please configure your ${providerConfig.name} token first`)
      }
      if (!taskPrompt.trim()) throw new Error('请先填写提示词')
      if (mode === 'edit' && provider !== 'custom') {
        throw new Error('图生图目前仅支持自定义中转站')
      }
      if (mode === 'edit' && referenceImages.length === 0) {
        throw new Error('请先上传至少一张参考图')
      }

      const start = Date.now()
      const seed = Math.floor(Math.random() * 2147483647)
      const supportsNegative = selectedModelConfig?.features?.negativePrompt ?? true
      const effectiveNegativePrompt = supportsNegative ? negativePrompt : ''
      const request: OpenAIImageRequest =
        provider === 'custom'
          ? {
              model,
              prompt: taskPrompt,
              size: width === height ? '1024x1024' : width > height ? '1536x1024' : '1024x1536',
              quality: relaySettings.quality,
              background: relaySettings.background,
              output_format: relaySettings.outputFormat,
              n: 1,
            }
          : {
              model: getFullImageModelId(provider, model),
              prompt: taskPrompt,
              ...(effectiveNegativePrompt ? { negative_prompt: effectiveNegativePrompt } : {}),
              size: `${width}x${height}`,
              steps,
              seed,
              n: 1,
              response_format: 'url',
            }

      const rotated = await runWithTokenRotation(
        provider,
        providerTokens,
        (token) => {
          if (provider === 'custom') {
            if (mode === 'edit') {
              return editWithCustomRelay({
                baseUrl: relaySettings.baseUrl,
                apiKey: token || '',
                model,
                prompt: taskPrompt,
                images: referenceImages,
                size: request.size,
                quality: relaySettings.quality,
                background: relaySettings.background,
                outputFormat: relaySettings.outputFormat,
              })
            }
            return generateWithCustomRelay({
              baseUrl: relaySettings.baseUrl,
              apiKey: token || '',
              payload: { ...request },
            })
          }
          return openai.generateImage(
            request,
            token ? buildImageTokenWithPrefix(provider, token) : undefined
          )
        },
        { allowAnonymous: !providerConfig.requiresAuth }
      )

      if (!rotated.success) throw new Error(rotated.error)

      const image = rotated.data.data?.[0]
      if (!image?.url && !image?.b64_json) throw new Error('中转站没有返回图片')
      const blob = image.b64_json
        ? await (
            await fetch(`data:image/${relaySettings.outputFormat};base64,${image.b64_json}`)
          ).blob()
        : await (await fetch(image.url as string)).blob()

      const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`
      const details: ImageDetails = {
        url: '',
        provider: providerConfig.name,
        model,
        dimensions: `${width} x ${height}`,
        duration,
        seed,
        steps,
        prompt: taskPrompt,
        negativePrompt: negativePrompt || '',
      }

      const generatedAt = Date.now()
      const storageLimit = await checkStorageLimit(blob.size)
      const candidateBlobId = crypto.randomUUID()
      const storedBlobId = storageLimit?.needsCleanup
        ? null
        : await storeBlob(candidateBlobId, blob)
      const blobId = storedBlobId || undefined
      const savedLocally = Boolean(blobId)
      const historyId = blobId
        ? saveToHistory({
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
        : undefined

      return { details, blob, historyId, blobId, generatedAt, savedLocally }
    },
    [
      provider,
      currentToken,
      referenceImages,
      selectedModelConfig,
      negativePrompt,
      model,
      width,
      height,
      relaySettings,
      steps,
    ]
  )

  const updateBatchTask = useCallback((id: string, updates: Partial<BatchGenerationTask>) => {
    setBatchTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...updates } : task))
    )
  }, [])

  const handleBatchGenerate = useCallback(async () => {
    const prompts = buildBatchPrompts(batchPromptMode, prompt, batchPrompts, batchCount)
    if (prompts.length === 0) {
      toast.error(batchPromptMode === 'lines' ? '请至少确认一条提示词' : '请先填写提示词')
      return
    }

    const providerConfig = PROVIDER_CONFIGS[provider]
    if (providerConfig.requiresAuth && parseTokens(currentToken).length === 0) {
      toast.error(`Please configure your ${providerConfig.name} token first`)
      return
    }

    releaseBatchObjectUrls()
    batchCancelledRef.current = false
    const runId = batchRunIdRef.current + 1
    batchRunIdRef.current = runId
    const tasks: BatchGenerationTask[] = prompts.map((taskPrompt, index) => ({
      id: crypto.randomUUID(),
      index,
      prompt: taskPrompt,
      status: 'queued',
    }))
    setBatchTasks(tasks)
    setLoading(true)
    setStatus(`批量任务已开始：0 / ${tasks.length}`)

    let successCount = 0
    let failureCount = 0
    const concurrency = Math.min(
      MAX_BATCH_CONCURRENCY,
      batchPromptMode === 'repeat' ? batchCount : batchConcurrency
    )
    await runWithConcurrency(
      tasks,
      concurrency,
      () => batchCancelledRef.current || batchRunIdRef.current !== runId,
      async (task) => {
        const startedAt = Date.now()
        updateBatchTask(task.id, {
          status: 'running',
          error: undefined,
          startedAt,
          finishedAt: undefined,
        })
        try {
          const outcome = await generateOne(task.prompt, 'generate')
          const details = { ...outcome.details, url: showBatchBlob(outcome.blob) }
          successCount += 1
          updateBatchTask(task.id, {
            status: 'success',
            details,
            historyId: outcome.historyId,
            blobId: outcome.blobId,
            generatedAt: outcome.generatedAt,
            savedLocally: outcome.savedLocally,
            finishedAt: Date.now(),
          })
        } catch (error) {
          failureCount += 1
          updateBatchTask(task.id, {
            status: 'error',
            error: error instanceof Error ? error.message : '生成失败',
            finishedAt: Date.now(),
          })
        }
        setStatus(`批量生成中：${successCount + failureCount} / ${tasks.length}`)
      }
    )

    if (batchRunIdRef.current !== runId) return
    if (batchCancelledRef.current) {
      setBatchTasks((current) =>
        current.map((task) =>
          task.status === 'queued' ? { ...task, status: 'cancelled' as const } : task
        )
      )
    }
    setLoading(false)
    const cancelledCount = tasks.length - successCount - failureCount
    setStatus(
      `批量任务完成：成功 ${successCount}，失败 ${failureCount}${cancelledCount > 0 ? `，取消 ${cancelledCount}` : ''}`
    )
    if (failureCount === 0 && cancelledCount === 0) toast.success(`已生成 ${successCount} 张图片`)
    else toast.warning(`批量任务完成：${successCount} 张成功，${failureCount} 张失败`)
  }, [
    batchPromptMode,
    prompt,
    batchPrompts,
    batchCount,
    batchConcurrency,
    provider,
    currentToken,
    releaseBatchObjectUrls,
    updateBatchTask,
    generateOne,
    showBatchBlob,
  ])

  const cancelBatch = useCallback(() => {
    batchCancelledRef.current = true
    setBatchTasks((current) =>
      current.map((task) =>
        task.status === 'queued' ? { ...task, status: 'cancelled' as const } : task
      )
    )
    toast.info('已取消尚未开始的任务，正在生成的任务会继续完成')
  }, [])

  const retryBatchTask = useCallback(
    async (id: string) => {
      if (loading) return
      const task = batchTasks.find((item) => item.id === id)
      if (!task || (task.status !== 'error' && task.status !== 'cancelled')) return
      updateBatchTask(id, {
        status: 'running',
        error: undefined,
        startedAt: Date.now(),
        finishedAt: undefined,
      })
      setLoading(true)
      try {
        const outcome = await generateOne(task.prompt, 'generate')
        updateBatchTask(id, {
          status: 'success',
          details: { ...outcome.details, url: showBatchBlob(outcome.blob) },
          historyId: outcome.historyId,
          blobId: outcome.blobId,
          generatedAt: outcome.generatedAt,
          savedLocally: outcome.savedLocally,
          finishedAt: Date.now(),
        })
        toast.success('重试成功')
      } catch (error) {
        const message = error instanceof Error ? error.message : '生成失败'
        updateBatchTask(id, { status: 'error', error: message, finishedAt: Date.now() })
        toast.error(message)
      } finally {
        setLoading(false)
      }
    },
    [batchTasks, generateOne, loading, showBatchBlob, updateBatchTask]
  )

  const downloadBatchTask = useCallback(
    async (id: string) => {
      const task = batchTasks.find((item) => item.id === id)
      if (!task?.details) return
      const { downloadBlob, downloadImage } = await import('@/lib/utils')
      const blob = task.blobId ? await getBlob(task.blobId) : null
      const filename = `zenith-batch-${String(task.index + 1).padStart(2, '0')}.${relaySettings.outputFormat}`
      if (blob) downloadBlob(blob, filename)
      else await downloadImage(task.details.url, filename, task.details.provider)
    },
    [batchTasks, relaySettings.outputFormat]
  )

  const downloadBatchAsZip = useCallback(async () => {
    const completed = batchTasks.filter(
      (task): task is BatchGenerationTask & { details: ImageDetails } =>
        task.status === 'success' && Boolean(task.details)
    )
    if (completed.length === 0 || batchDownloading) return
    setBatchDownloading(true)
    try {
      const { downloadImagesAsZip } = await import('@/lib/utils')
      await downloadImagesAsZip(
        completed.map((task) => ({
          url: task.details.url,
          filename: `zenith-${String(task.index + 1).padStart(2, '0')}.${relaySettings.outputFormat}`,
        })),
        `zenith-batch-${Date.now()}.zip`
      )
      toast.success(`已打包 ${completed.length} 张图片`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '打包下载失败')
    } finally {
      setBatchDownloading(false)
    }
  }, [batchDownloading, batchTasks, relaySettings.outputFormat])

  const clearBatchResults = useCallback(() => {
    if (loading) return
    batchRunIdRef.current += 1
    releaseBatchObjectUrls()
    setBatchTasks([])
    setStatus('Ready.')
  }, [loading, releaseBatchObjectUrls])

  const handleGenerate = async () => {
    if (generationMode === 'batch') {
      await handleBatchGenerate()
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
      addStatus(`Sending request to ${PROVIDER_CONFIGS[provider].name}...`)
      const outcome = await generateOne(prompt, generationMode)
      const url = showBlob(outcome.blob)
      setHistoryId(outcome.historyId || null)
      setGeneratedAt(outcome.generatedAt)
      setImageDetails({
        ...outcome.details,
        url,
        historyId: outcome.historyId,
        generatedAt: outcome.generatedAt,
      })
      addStatus(`Image generated in ${outcome.details.duration}!`)
      if (!outcome.savedLocally) {
        toast.warning('浏览器存储空间不足，请先下载图片；本次结果不会写入历史记录')
      }
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
    batchPromptMode,
    batchCount,
    batchConcurrency,
    batchPrompts,
    batchTasks,
    batchDownloading,
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
    setBatchPromptMode,
    setBatchCount,
    setBatchConcurrency,
    setBatchPrompts,
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
    cancelBatch,
    retryBatchTask,
    downloadBatchTask,
    downloadBatchAsZip,
    clearBatchResults,
    handleLoadFromHistory,
    historyId,
    generatedAt,
    // LLM Handlers
    handleOptimize,
    handleTranslate,
  }
}
