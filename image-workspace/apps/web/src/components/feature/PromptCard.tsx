import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  Copy,
  FileImage,
  Globe,
  Images,
  Layers3,
  List,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Type,
  Wand2,
  X,
} from 'lucide-react'
import { type CSSProperties, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { buildBatchPrompts } from '@/lib/batchQueue'
import {
  ASPECT_RATIOS,
  type AspectRatio,
  type BatchPromptMode,
  type ImageGenerationMode,
  RESOLUTION_OPTIONS,
  type ResolutionLevel,
} from '@/lib/constants'

interface PromptCardProps {
  prompt: string
  negativePrompt: string
  steps: number
  width: number
  height: number
  selectedRatio: string
  resolutionLevel: ResolutionLevel
  loading: boolean
  setPrompt: (v: string) => void
  setNegativePrompt: (v: string) => void
  setSteps: (v: number) => void
  handleRatioSelect: (ratio: AspectRatio) => void
  handleResolutionSelect: (level: ResolutionLevel) => void
  handleGenerate: () => void
  // Prompt optimization/translation
  onOptimize?: () => void
  onTranslate?: () => void
  isOptimizing?: boolean
  isTranslating?: boolean
  isCustomProvider?: boolean
  generationMode: ImageGenerationMode
  referenceImages: File[]
  setGenerationMode: (mode: ImageGenerationMode) => void
  onReferenceImagesChange: (files: File[]) => void
  batchPromptMode: BatchPromptMode
  batchCount: number
  batchConcurrency: number
  batchPrompts: string[]
  setBatchPromptMode: (mode: BatchPromptMode) => void
  setBatchCount: (count: number) => void
  setBatchConcurrency: (count: number) => void
  setBatchPrompts: (prompts: string[]) => void
}

interface SteppedRangeControlProps {
  value: number
  label: string
  hint: string
  valueLabel: string
  ariaLabel: string
  disabled: boolean
  min: number
  labels: readonly string[]
  onChange: (value: number) => void
}

function SteppedRangeControl({
  value,
  label,
  hint,
  valueLabel,
  ariaLabel,
  disabled,
  min,
  labels,
  onChange,
}: SteppedRangeControlProps) {
  const max = min + labels.length - 1
  const accentIndex = Math.min(Math.max(value - min, 0), 3)
  const sliderAccent = `var(--zenith-slider-${accentIndex + 1})`
  const sliderStyle = {
    '--slider-accent': sliderAccent,
    '--slider-accent-soft': `color-mix(in srgb, ${sliderAccent} 14%, transparent)`,
  } as CSSProperties

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-900/70 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{hint}</p>
        </div>
        <span
          className="shrink-0 rounded-xl px-3 py-1.5 font-mono text-sm font-semibold tabular-nums transition-colors duration-300"
          style={{
            color: sliderAccent,
            backgroundColor: `color-mix(in srgb, ${sliderAccent} 14%, transparent)`,
          }}
        >
          {valueLabel}
        </span>
      </div>

      <div className="mt-5">
        <div className="relative" style={sliderStyle}>
          <Slider
            value={[value]}
            onValueChange={(values) => onChange(values[0])}
            min={min}
            max={max}
            step={1}
            disabled={disabled}
            aria-label={ariaLabel}
            className="animated-slider h-10 [&_[data-slot=slider-range]]:bg-[var(--slider-accent)] [&_[data-slot=slider-thumb]]:relative [&_[data-slot=slider-thumb]]:z-30 [&_[data-slot=slider-thumb]]:size-8 [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:transition-transform [&_[data-slot=slider-thumb]]:duration-200 [&_[data-slot=slider-thumb]]:ease-out [&_[data-slot=slider-thumb]]:hover:scale-110 [&_[data-slot=slider-thumb]]:focus-visible:scale-110 [&_[data-slot=slider-track]]:h-8 [&_[data-slot=slider-track]]:bg-zinc-200 dark:[&_[data-slot=slider-track]]:bg-zinc-700"
          />
          <div className="pointer-events-none absolute inset-x-4 top-1/2 z-20 flex -translate-y-1/2 justify-between">
            {labels.map((_, index) => {
              const step = min + index
              return (
                <span key={step} className="flex w-0 justify-center">
                  <span
                    className={`size-1.5 shrink-0 rounded-full transition-colors duration-200 ${
                      step <= value ? 'bg-white/50' : 'bg-zinc-400 dark:bg-zinc-500'
                    }`}
                  />
                </span>
              )
            })}
          </div>
        </div>
        <div className="mx-4 mt-1 flex justify-between font-mono text-[11px] tabular-nums text-zinc-500">
          {labels.map((stepLabel) => (
            <span key={stepLabel} className="flex w-0 justify-center whitespace-nowrap">
              {stepLabel}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ReferenceImagePreview({ file }: { file: File }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  return <img src={url} alt={file.name} className="h-full w-full object-cover" />
}

export function PromptCard({
  prompt,
  negativePrompt,
  steps,
  width,
  height,
  selectedRatio,
  resolutionLevel,
  loading,
  setPrompt,
  setNegativePrompt,
  setSteps,
  handleRatioSelect,
  handleResolutionSelect,
  handleGenerate,
  onOptimize,
  onTranslate,
  isOptimizing = false,
  isTranslating = false,
  isCustomProvider = false,
  generationMode,
  referenceImages,
  setGenerationMode,
  onReferenceImagesChange,
  batchPromptMode,
  batchCount,
  batchConcurrency,
  batchPrompts,
  setBatchPromptMode,
  setBatchCount,
  setBatchConcurrency,
  setBatchPrompts,
}: PromptCardProps) {
  const { t } = useTranslation()
  const [batchPromptDraft, setBatchPromptDraft] = useState('')
  const [editingBatchPrompt, setEditingBatchPrompt] = useState<number | null>(null)
  const isProcessing = isOptimizing || isTranslating
  const isMultiPromptBatch = generationMode === 'batch' && batchPromptMode === 'lines'
  const batchTaskCount = buildBatchPrompts(batchPromptMode, prompt, batchPrompts, batchCount).length
  const activeBatchConcurrency = batchPromptMode === 'repeat' ? batchCount : batchConcurrency
  const canConfirmBatchPrompt =
    batchPromptDraft.trim().length > 0 &&
    (editingBatchPrompt !== null || batchPrompts.length < 8) &&
    !loading

  const resetBatchPromptEditor = () => {
    setBatchPromptDraft('')
    setEditingBatchPrompt(null)
  }

  const confirmBatchPrompt = () => {
    const normalized = batchPromptDraft.trim()
    if (!normalized || !canConfirmBatchPrompt) return

    if (editingBatchPrompt === null) {
      setBatchPrompts([...batchPrompts, normalized])
    } else {
      setBatchPrompts(
        batchPrompts.map((item, index) => (index === editingBatchPrompt ? normalized : item))
      )
    }
    resetBatchPromptEditor()
  }

  const editBatchPrompt = (index: number) => {
    setBatchPromptDraft(batchPrompts[index])
    setEditingBatchPrompt(index)
  }

  const removeBatchPrompt = (index: number) => {
    setBatchPrompts(batchPrompts.filter((_, itemIndex) => itemIndex !== index))
    resetBatchPromptEditor()
  }

  return (
    <Card className="rounded-2xl border-zinc-800 bg-zinc-900/50">
      <CardContent className="p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-zinc-300 text-sm font-medium">{t('prompt.title')}</Label>
            <div className="flex items-center gap-1">
              {onTranslate && !isMultiPromptBatch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onTranslate}
                  disabled={isProcessing || !prompt.trim()}
                  className="h-7 rounded-lg px-2 text-zinc-400 hover:bg-blue-500/10 hover:text-blue-400"
                  title={t('prompt.translateToEnglish')}
                >
                  {isTranslating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                  <span className="ml-1 text-xs">{t('prompt.translate')}</span>
                </Button>
              )}
              {onOptimize && !isMultiPromptBatch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onOptimize}
                  disabled={isProcessing || !prompt.trim()}
                  className="h-7 rounded-lg px-2 text-zinc-400 hover:bg-sky-500/10 hover:text-sky-300"
                  title={t('prompt.optimizePrompt')}
                >
                  {isOptimizing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  <span className="ml-1 text-xs">{t('prompt.optimize')}</span>
                </Button>
              )}
            </div>
          </div>
          <Textarea
            rows={isMultiPromptBatch ? 4 : 8}
            value={isMultiPromptBatch ? batchPromptDraft : prompt}
            onChange={(e) =>
              isMultiPromptBatch ? setBatchPromptDraft(e.target.value) : setPrompt(e.target.value)
            }
            placeholder={
              isMultiPromptBatch ? t('batch.promptDraftPlaceholder') : t('prompt.placeholder')
            }
            className="max-h-48 resize-none overflow-y-auto rounded-xl border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600"
          />
          {isMultiPromptBatch && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-zinc-500">
                {t('batch.confirmedCount', { count: batchPrompts.length })}
              </span>
              <div className="flex items-center gap-1.5">
                {editingBatchPrompt !== null && (
                  <button
                    type="button"
                    onClick={resetBatchPromptEditor}
                    disabled={loading}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" /> {t('common.cancel')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={confirmBatchPrompt}
                  disabled={!canConfirmBatchPrompt}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-sky-500 bg-sky-500/10 px-3 text-xs text-sky-500 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-transparent disabled:text-zinc-600"
                >
                  {editingBatchPrompt === null ? (
                    <Plus className="h-3.5 w-3.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {editingBatchPrompt === null ? t('batch.confirmPrompt') : t('batch.savePrompt')}
                </button>
              </div>
            </div>
          )}
        </div>

        {isCustomProvider && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setGenerationMode('generate')}
                className={
                  generationMode === 'generate'
                    ? 'rounded-xl border border-sky-400 bg-sky-500/10 text-sky-500 hover:bg-sky-500/15 hover:text-sky-400'
                    : 'rounded-xl border border-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-200'
                }
              >
                <Type className="mr-1.5 h-3.5 w-3.5" />
                文字生图
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setGenerationMode('edit')}
                className={
                  generationMode === 'edit'
                    ? 'rounded-xl border border-sky-400 bg-sky-500/10 text-sky-500 hover:bg-sky-500/15 hover:text-sky-400'
                    : 'rounded-xl border border-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-200'
                }
              >
                <Images className="mr-1.5 h-3.5 w-3.5" />
                图生图 / 多参考图
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setGenerationMode('batch')}
                className={
                  generationMode === 'batch'
                    ? 'rounded-xl border border-sky-400 bg-sky-500/10 text-sky-500 hover:bg-sky-500/15 hover:text-sky-400'
                    : 'rounded-xl border border-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-200'
                }
              >
                <Layers3 className="mr-1.5 h-3.5 w-3.5" />
                {t('batch.mode')}
              </Button>
            </div>
            {generationMode === 'batch' && (
              <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/55 p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-zinc-900 p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setBatchPromptMode('repeat')
                      resetBatchPromptEditor()
                    }}
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs transition-all duration-200 active:scale-[0.98] ${
                      batchPromptMode === 'repeat'
                        ? 'bg-zinc-700 text-white shadow-sm'
                        : 'text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-200'
                    }`}
                  >
                    <Copy className="h-3.5 w-3.5" /> {t('batch.repeatMode')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchPromptMode('lines')}
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs transition-all duration-200 active:scale-[0.98] ${
                      batchPromptMode === 'lines'
                        ? 'bg-zinc-700 text-white shadow-sm'
                        : 'text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-200'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" /> {t('batch.linesMode')}
                  </button>
                </div>

                {batchPromptMode === 'repeat' ? (
                  <SteppedRangeControl
                    value={batchCount}
                    onChange={setBatchCount}
                    label={t('batch.repeatControl')}
                    hint={t('batch.repeatControlHint', { count: batchCount })}
                    valueLabel={t('batch.imageCount', { count: batchCount })}
                    ariaLabel={t('batch.repeatControl')}
                    disabled={loading}
                    min={1}
                    labels={['1', '2', '3', '4']}
                  />
                ) : (
                  <div className="space-y-3">
                    <SteppedRangeControl
                      value={batchConcurrency}
                      onChange={setBatchConcurrency}
                      label={t('batch.linesConcurrency')}
                      hint={t('batch.linesConcurrencyHint', { count: batchConcurrency })}
                      valueLabel={t('batch.concurrentCount', { count: batchConcurrency })}
                      ariaLabel={t('batch.linesConcurrency')}
                      disabled={loading}
                      min={1}
                      labels={['1', '2', '3', '4']}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-400">{t('batch.confirmedPrompts')}</span>
                      <span className="font-mono text-[11px] text-zinc-600">
                        {batchPrompts.length}/8
                      </span>
                    </div>
                    {batchPrompts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-800 px-3 py-5 text-center text-xs text-zinc-600">
                        {t('batch.noConfirmedPrompts')}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {batchPrompts.map((item, index) => (
                          <div
                            key={`${index}-${item}`}
                            className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-2 rounded-xl border px-2 py-2.5 transition-colors ${
                              editingBatchPrompt === index
                                ? 'border-sky-500/70 bg-sky-500/5'
                                : 'border-zinc-800 bg-zinc-900/60'
                            }`}
                          >
                            <span className="pt-0.5 font-mono text-[10px] text-sky-500">
                              #{String(index + 1).padStart(2, '0')}
                            </span>
                            <p className="min-w-0 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">
                              {item}
                            </p>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => editBatchPrompt(index)}
                                disabled={loading}
                                className="flex size-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
                                title={t('common.edit')}
                                aria-label={`${t('common.edit')} ${index + 1}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeBatchPrompt(index)}
                                disabled={loading}
                                className="flex size-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                                title={t('common.delete')}
                                aria-label={`${t('common.delete')} ${index + 1}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-1 pt-3 text-[11px]">
                  <span className="text-zinc-500">
                    {t('batch.requestSummary', { count: batchTaskCount })}
                  </span>
                  <span className="font-mono text-sky-500">
                    {t('batch.concurrency', { count: activeBatchConcurrency })}
                  </span>
                </div>
              </div>
            )}
            {generationMode === 'edit' && (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-zinc-300 text-xs">
                    参考图（最多 4 张，每张不超过 10MB）
                  </Label>
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800">
                    <FileImage className="h-3.5 w-3.5" /> 上传
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      className="sr-only"
                      onChange={(event) => {
                        onReferenceImagesChange(Array.from(event.target.files || []))
                        event.currentTarget.value = ''
                      }}
                    />
                  </label>
                </div>
                {referenceImages.length > 0 ? (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {referenceImages.map((file, index) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
                      >
                        <ReferenceImagePreview file={file} />
                        <button
                          type="button"
                          aria-label="删除参考图"
                          className="absolute right-1 top-1 hidden rounded-lg bg-black/70 p-1 text-white group-hover:block"
                          onClick={() =>
                            onReferenceImagesChange(
                              referenceImages.filter((_, itemIndex) => itemIndex !== index)
                            )
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">上传一张或多张图片作为编辑参考。</p>
                )}
              </div>
            )}
          </div>
        )}

        {!isCustomProvider && (
          <Accordion type="single" collapsible>
            <AccordionItem value="advanced" className="border-zinc-800">
              <AccordionTrigger className="text-zinc-400 text-sm hover:no-underline py-2">
                {t('prompt.advancedSettings')}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-zinc-400 text-xs">{t('prompt.negativePrompt')}</Label>
                    <Textarea
                      rows={2}
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs flex items-center gap-2">
                      <RotateCcw
                        className="w-3 h-3 cursor-pointer hover:text-sky-400"
                        onClick={() => setSteps(9)}
                      />
                      {t('prompt.inferenceStepsLabel')}:{' '}
                      <span className="text-sky-400 font-mono">{steps}</span>
                    </Label>
                    <Slider
                      value={[steps]}
                      onValueChange={(v) => setSteps(v[0])}
                      min={1}
                      max={50}
                      step={1}
                      className="mt-2 bg-sky-500"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <div className="space-y-3">
          <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('prompt.imageSettings')}
          </Label>
          <div className="grid w-full grid-cols-5 gap-2">
            {ASPECT_RATIOS.map((ratio) => {
              const Icon = ratio.icon
              const isSelected = selectedRatio === ratio.label
              return (
                <button
                  type="button"
                  key={ratio.label}
                  onClick={() => handleRatioSelect(ratio)}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 transition-all duration-200 active:scale-[0.97] sm:py-4 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600 shadow-[0_8px_24px_rgba(14,165,233,0.12)] dark:text-sky-300'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-sky-300 hover:text-sky-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-sky-700 dark:hover:text-sky-300'
                  }`}
                >
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  <span className="text-xs font-semibold sm:text-sm">{ratio.label}</span>
                </button>
              )
            })}
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={selectedRatio}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <SteppedRangeControl
                value={Math.max(
                  0,
                  RESOLUTION_OPTIONS.findIndex((option) => option.id === resolutionLevel)
                )}
                onChange={(value) => {
                  const option = RESOLUTION_OPTIONS[value]
                  if (option) handleResolutionSelect(option.id)
                }}
                label={t('prompt.resolution')}
                hint={t('prompt.resolutionHint', { width, height })}
                valueLabel={
                  RESOLUTION_OPTIONS.find((option) => option.id === resolutionLevel)?.label ??
                  '720P'
                }
                ariaLabel={t('prompt.resolution')}
                disabled={loading}
                min={0}
                labels={RESOLUTION_OPTIONS.map((option) => option.label)}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || (generationMode === 'batch' && batchTaskCount === 0)}
          className="h-12 w-full rounded-xl bg-sky-500 text-base font-semibold text-white shadow-[0_10px_28px_rgba(14,165,233,0.2)] transition-all duration-200 hover:bg-sky-600 hover:shadow-[0_12px_32px_rgba(14,165,233,0.28)] active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {t('prompt.generating')}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              {generationMode === 'edit'
                ? '生成编辑图'
                : generationMode === 'batch'
                  ? t('batch.generate', { count: batchTaskCount })
                  : t('prompt.generate')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
