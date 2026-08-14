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
import { useEffect, useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { buildBatchPrompts, MAX_BATCH_CONCURRENCY } from '@/lib/batchQueue'
import {
  ASPECT_RATIOS,
  type AspectRatio,
  type BatchPromptMode,
  type ImageGenerationMode,
} from '@/lib/constants'

interface PromptCardProps {
  prompt: string
  negativePrompt: string
  steps: number
  width: number
  height: number
  selectedRatio: string
  uhd: boolean
  loading: boolean
  setPrompt: (v: string) => void
  setNegativePrompt: (v: string) => void
  setSteps: (v: number) => void
  setWidth: (v: number) => void
  setHeight: (v: number) => void
  handleRatioSelect: (ratio: AspectRatio) => void
  handleUhdToggle: (enabled: boolean) => void
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

interface BatchRangeControlProps {
  value: number
  label: string
  hint: string
  valueLabel: string
  ariaLabel: string
  disabled: boolean
  onChange: (value: number) => void
}

function BatchRangeControl({
  value,
  label,
  hint,
  valueLabel,
  ariaLabel,
  disabled,
  onChange,
}: BatchRangeControlProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-200">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{hint}</p>
        </div>
        <span className="shrink-0 rounded-xl bg-orange-500/15 px-3 py-1.5 font-mono text-sm font-semibold tabular-nums text-orange-300">
          {valueLabel}
        </span>
      </div>

      <div className="mt-5">
        <div className="relative">
          <Slider
            value={[value]}
            onValueChange={(values) => onChange(values[0])}
            min={1}
            max={MAX_BATCH_CONCURRENCY}
            step={1}
            disabled={disabled}
            aria-label={ariaLabel}
            className="h-9 [&_[data-slot=slider-range]]:bg-orange-500 [&_[data-slot=slider-thumb]]:relative [&_[data-slot=slider-thumb]]:z-30 [&_[data-slot=slider-thumb]]:size-7 [&_[data-slot=slider-thumb]]:border-4 [&_[data-slot=slider-thumb]]:border-zinc-100 [&_[data-slot=slider-thumb]]:bg-zinc-200 [&_[data-slot=slider-thumb]]:shadow-[0_4px_14px_rgba(0,0,0,0.35)] [&_[data-slot=slider-thumb]]:transition-transform [&_[data-slot=slider-thumb]]:duration-200 [&_[data-slot=slider-thumb]]:hover:scale-105 [&_[data-slot=slider-track]]:h-3 [&_[data-slot=slider-track]]:bg-zinc-700"
          />
          <div className="pointer-events-none absolute inset-x-1 top-1/2 z-20 flex -translate-y-1/2 justify-between">
            {Array.from({ length: MAX_BATCH_CONCURRENCY }, (_, index) => index + 1).map((step) => (
              <span
                key={step}
                className={`size-1.5 rounded-full ${step <= value ? 'bg-white/45' : 'bg-zinc-500'}`}
              />
            ))}
          </div>
        </div>
        <div className="mt-1 flex justify-between px-0.5 font-mono text-[11px] tabular-nums text-zinc-500">
          {Array.from({ length: MAX_BATCH_CONCURRENCY }, (_, index) => (
            <span key={index + 1}>{index + 1}</span>
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
  uhd,
  loading,
  setPrompt,
  setNegativePrompt,
  setSteps,
  setWidth,
  setHeight,
  handleRatioSelect,
  handleUhdToggle,
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
                  className="h-7 rounded-lg px-2 text-zinc-400 hover:bg-orange-500/10 hover:text-orange-300"
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
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-orange-500 bg-orange-500/10 px-3 text-xs text-orange-300 transition-colors hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-transparent disabled:text-zinc-600"
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
                    ? 'rounded-xl border border-orange-400 bg-orange-500/10 text-orange-300 hover:bg-orange-500/15 hover:text-orange-200'
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
                    ? 'rounded-xl border border-orange-400 bg-orange-500/10 text-orange-300 hover:bg-orange-500/15 hover:text-orange-200'
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
                    ? 'rounded-xl border border-orange-400 bg-orange-500/10 text-orange-300 hover:bg-orange-500/15 hover:text-orange-200'
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
                  <BatchRangeControl
                    value={batchCount}
                    onChange={setBatchCount}
                    label={t('batch.repeatControl')}
                    hint={t('batch.repeatControlHint', { count: batchCount })}
                    valueLabel={t('batch.imageCount', { count: batchCount })}
                    ariaLabel={t('batch.repeatControl')}
                    disabled={loading}
                  />
                ) : (
                  <div className="space-y-3">
                    <BatchRangeControl
                      value={batchConcurrency}
                      onChange={setBatchConcurrency}
                      label={t('batch.linesConcurrency')}
                      hint={t('batch.linesConcurrencyHint', { count: batchConcurrency })}
                      valueLabel={t('batch.concurrentCount', { count: batchConcurrency })}
                      ariaLabel={t('batch.linesConcurrency')}
                      disabled={loading}
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
                                ? 'border-orange-500/70 bg-orange-500/5'
                                : 'border-zinc-800 bg-zinc-900/60'
                            }`}
                          >
                            <span className="pt-0.5 font-mono text-[10px] text-orange-400">
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
                  <span className="font-mono text-orange-400">
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
                        className="w-3 h-3 cursor-pointer hover:text-orange-400"
                        onClick={() => setSteps(9)}
                      />
                      {t('prompt.inferenceStepsLabel')}:{' '}
                      <span className="text-orange-400 font-mono">{steps}</span>
                    </Label>
                    <Slider
                      value={[steps]}
                      onValueChange={(v) => setSteps(v[0])}
                      min={1}
                      max={50}
                      step={1}
                      className="mt-2 bg-orange-500"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-300 text-sm font-medium">{t('prompt.aspectRatio')}</Label>
            <div className="flex items-center gap-4">
              {!isCustomProvider && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="uhd" className="text-zinc-400 text-xs">
                    {t('prompt.uhd2k')}
                  </Label>
                  <Switch
                    id="uhd"
                    checked={uhd}
                    className="data-[state=unchecked]:[&>span]:bg-zinc-500 data-[state=checked]:[&>span]:bg-yellow-400"
                    onCheckedChange={handleUhdToggle}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {ASPECT_RATIOS.map((ratio) => {
              const Icon = ratio.icon
              const isSelected = selectedRatio === ratio.label
              return (
                <button
                  type="button"
                  key={ratio.label}
                  onClick={() => handleRatioSelect(ratio)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-4 py-2 transition-all ${
                    isSelected
                      ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{ratio.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {!isCustomProvider && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400 text-xs flex items-center gap-2">
                <RotateCcw
                  className="w-3 h-3 cursor-pointer hover:text-orange-400"
                  onClick={() => {
                    const ratio = ASPECT_RATIOS.find((r) => r.label === selectedRatio)
                    if (ratio) setWidth(uhd ? ratio.presets[1].w : ratio.presets[0].w)
                  }}
                />
                {t('prompt.widthLabel')}:{' '}
                <span className="text-orange-400 font-mono">{width}px</span>
              </Label>
              <Slider
                value={[width]}
                onValueChange={(v) => setWidth(v[0])}
                min={512}
                max={2048}
                step={64}
                className="mt-2 bg-orange-500"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs flex items-center gap-2">
                <RotateCcw
                  className="w-3 h-3 cursor-pointer hover:text-orange-400"
                  onClick={() => {
                    const ratio = ASPECT_RATIOS.find((r) => r.label === selectedRatio)
                    if (ratio) setHeight(uhd ? ratio.presets[1].h : ratio.presets[0].h)
                  }}
                />
                {t('prompt.heightLabel')}:{' '}
                <span className="text-orange-400 font-mono">{height}px</span>
              </Label>
              <Slider
                value={[height]}
                onValueChange={(v) => setHeight(v[0])}
                min={512}
                max={2048}
                step={64}
                className="mt-2 bg-orange-500"
              />
            </div>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={loading || (generationMode === 'batch' && batchTaskCount === 0)}
          className="h-12 w-full rounded-xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-600 active:scale-[0.99] disabled:opacity-50"
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
