import { Handle, type NodeProps, Position } from '@xyflow/react'
import { ImageIcon, Settings } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ConfigData } from '@/stores/flowStore'

interface ConfigNodeProps extends NodeProps {
  data: ConfigData
}

function ConfigNodeComponent({ data, selected }: ConfigNodeProps) {
  const { t } = useTranslation()
  const { prompt, width, height, batchCount, seed, isPreview } = data

  // Truncate displayed prompt
  const displayPrompt = prompt.length > 80 ? `${prompt.slice(0, 80)}...` : prompt

  return (
    <div
      className={`
        relative rounded-2xl p-4 w-[300px] transition-all duration-200
        ${
          isPreview
            ? 'bg-zinc-800/60 border-2 border-dashed border-orange-500/50'
            : 'bg-zinc-800 border border-zinc-700'
        }
        ${selected && !isPreview ? 'ring-2 ring-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : ''}
        hover:border-orange-500/70
      `}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Preview badge */}
      {isPreview && (
        <div className="absolute -top-3 left-4 px-2 py-0.5 bg-orange-500/20 border border-orange-500/50 rounded-full">
          <span className="text-[10px] text-orange-400 font-medium">{t('flow.preview')}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center">
          <Settings size={14} className="text-zinc-400" />
        </div>
        <span className="text-xs text-zinc-500 font-medium">{t('flow.config')}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <ImageIcon size={12} />
          <span>x{batchCount}</span>
        </div>
      </div>

      {/* Prompt */}
      <div className="mb-3">
        <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
          {displayPrompt || <span className="text-zinc-500 italic">{t('flow.enterPrompt')}</span>}
        </p>
      </div>

      {/* Config details */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 rounded bg-zinc-700/50 text-[10px] text-zinc-400">
          {width}×{height}
        </span>
        <span className="px-2 py-0.5 rounded bg-zinc-700/50 text-[10px] text-zinc-400">
          Seed: {seed}
        </span>
      </div>

      {/* Bottom handle - only for confirmed nodes */}
      {!isPreview && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-orange-500 !border-2 !border-orange-400"
        />
      )}

      {/* Double-click hint on hover */}
      {!isPreview && (
        <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="text-xs text-zinc-300">{t('flow.doubleClickEdit')}</span>
        </div>
      )}
    </div>
  )
}

export const ConfigNode = memo(ConfigNodeComponent)
export default ConfigNode
