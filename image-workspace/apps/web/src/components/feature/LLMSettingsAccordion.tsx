import { DEFAULT_OPTIMIZE_SYSTEM_PROMPT } from '@z-image/shared'
import { RotateCcw, Sparkles } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  getLLMModels,
  LLM_PROVIDER_OPTIONS,
  type LLMProviderType,
  type LLMSettings,
} from '@/lib/constants'

interface LLMSettingsAccordionProps {
  llmSettings: LLMSettings
  setLLMProvider: (provider: LLMProviderType) => void
  setLLMModel: (model: string) => void
  setAutoTranslate: (enabled: boolean) => void
  setCustomSystemPrompt: (prompt: string) => void
}

export function LLMSettingsAccordion({
  llmSettings,
  setLLMProvider,
  setLLMModel,
  setAutoTranslate,
  setCustomSystemPrompt,
}: LLMSettingsAccordionProps) {
  const availableModels = getLLMModels(llmSettings.llmProvider)
  const hasCustomPrompt = (llmSettings.customSystemPrompt ?? '').trim() !== ''

  const handleResetSystemPrompt = () => {
    setCustomSystemPrompt('')
  }

  return (
    <Accordion
      type="single"
      collapsible
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-4"
    >
      <AccordionItem value="llm" className="border-none">
        <AccordionTrigger className="text-zinc-300 hover:no-underline">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Prompt Optimization Settings</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pb-2">
            {/* LLM Provider Selection */}
            <div>
              <Label className="text-zinc-400 text-xs">LLM Provider</Label>
              <Select
                value={llmSettings.llmProvider}
                onValueChange={(v) => setLLMProvider(v as LLMProviderType)}
              >
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900/70 backdrop-blur-md border-zinc-700 text-white">
                  {LLM_PROVIDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                      {!opt.needsAuth && (
                        <span className="ml-2 text-xs text-green-500">(Free)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* LLM Model Selection */}
            <div>
              <Label className="text-zinc-400 text-xs">LLM Model</Label>
              <Select value={llmSettings.llmModel} onValueChange={setLLMModel}>
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900/70 backdrop-blur-md border-zinc-700 text-white">
                  {availableModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                      {m.description && (
                        <span className="ml-2 text-xs text-zinc-500">- {m.description}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-Translate Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-zinc-300 text-sm">Auto-Translate</Label>
                <p className="text-zinc-500 text-xs mt-0.5">
                  Automatically translate Chinese prompts to English
                </p>
              </div>
              <Switch
                checked={llmSettings.autoTranslate}
                onCheckedChange={setAutoTranslate}
                className="data-[state=unchecked]:[&>span]:bg-zinc-500 data-[state=checked]:[&>span]:bg-blue-500"
              />
            </div>

            {/* Custom System Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-zinc-400 text-xs">
                  Custom System Prompt
                  {hasCustomPrompt && <span className="ml-2 text-purple-400">(Custom)</span>}
                </Label>
                {hasCustomPrompt && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetSystemPrompt}
                    className="h-6 px-2 text-zinc-500 hover:text-zinc-300"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
              <Textarea
                rows={4}
                value={llmSettings.customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                placeholder={`${DEFAULT_OPTIMIZE_SYSTEM_PROMPT.slice(0, 200)}...`}
                className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none text-xs"
              />
              <p className="text-zinc-600 text-xs mt-1">
                Leave empty to use the default system prompt. The language instruction will be
                appended automatically.
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
