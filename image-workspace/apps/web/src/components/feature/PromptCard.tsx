import { FileImage, Globe, Loader2, RotateCcw, Sparkles, Trash2, Wand2 } from 'lucide-react'
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
import { ASPECT_RATIOS, type AspectRatio } from '@/lib/constants'

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
  generationMode: 'generate' | 'edit'
  referenceImages: File[]
  setGenerationMode: (mode: 'generate' | 'edit') => void
  onReferenceImagesChange: (files: File[]) => void
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
}: PromptCardProps) {
  const { t } = useTranslation()
  const isProcessing = isOptimizing || isTranslating

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-zinc-300 text-sm font-medium">{t('prompt.title')}</Label>
            <div className="flex items-center gap-1">
              {onTranslate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onTranslate}
                  disabled={isProcessing || !prompt.trim()}
                  className="h-7 px-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10"
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
              {onOptimize && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onOptimize}
                  disabled={isProcessing || !prompt.trim()}
                  className="h-7 px-2 text-zinc-400 hover:text-purple-400 hover:bg-purple-500/10"
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
            rows={8}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('prompt.placeholder')}
            className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none overflow-y-auto max-h-48"
          />
        </div>

        {isCustomProvider && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setGenerationMode('generate')}
                className={generationMode === 'generate'
                  ? 'border border-orange-400 bg-orange-500/10 text-orange-300 hover:bg-orange-500/15 hover:text-orange-200'
                  : 'border border-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-200'}
              >
                文字生图
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setGenerationMode('edit')}
                className={generationMode === 'edit'
                  ? 'border border-orange-400 bg-orange-500/10 text-orange-300 hover:bg-orange-500/15 hover:text-orange-200'
                  : 'border border-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-200'}
              >
                图生图 / 多参考图
              </Button>
            </div>
            {generationMode === 'edit' && (
              <div className="rounded-md border border-dashed border-zinc-700 bg-zinc-950/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-zinc-300 text-xs">参考图（最多 4 张，每张不超过 10MB）</Label>
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800">
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
                      <div key={`${file.name}-${file.lastModified}-${index}`} className="group relative aspect-square overflow-hidden rounded border border-zinc-800 bg-zinc-900">
                        <ReferenceImagePreview file={file} />
                        <button type="button" aria-label="删除参考图" className="absolute right-1 top-1 hidden rounded bg-black/70 p-1 text-white group-hover:block" onClick={() => onReferenceImagesChange(referenceImages.filter((_, itemIndex) => itemIndex !== index))}>
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

        {!isCustomProvider && <Accordion type="single" collapsible>
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
        </Accordion>}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-300 text-sm font-medium">{t('prompt.aspectRatio')}</Label>
            <div className="flex items-center gap-4">
              {!isCustomProvider && <div className="flex items-center gap-2">
                <Label htmlFor="uhd" className="text-zinc-400 text-xs">
                  {t('prompt.uhd2k')}
                </Label>
                <Switch
                  id="uhd"
                  checked={uhd}
                  className="data-[state=unchecked]:[&>span]:bg-zinc-500 data-[state=checked]:[&>span]:bg-yellow-400"
                  onCheckedChange={handleUhdToggle}
                />
              </div>}
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
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg border transition-all ${
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

        {!isCustomProvider && <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-400 text-xs flex items-center gap-2">
              <RotateCcw
                className="w-3 h-3 cursor-pointer hover:text-orange-400"
                onClick={() => {
                  const ratio = ASPECT_RATIOS.find((r) => r.label === selectedRatio)
                  if (ratio) setWidth(uhd ? ratio.presets[1].w : ratio.presets[0].w)
                }}
              />
              {t('prompt.widthLabel')}: <span className="text-orange-400 font-mono">{width}px</span>
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
        </div>}

        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12 text-base disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {t('prompt.generating')}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              {generationMode === 'edit' ? '生成编辑图' : t('prompt.generate')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
