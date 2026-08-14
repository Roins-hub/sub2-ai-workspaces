import { Handle, type NodeProps, Position } from '@xyflow/react'
import { ImageIcon } from 'lucide-react'
import { memo } from 'react'

export type PromptConfigNodeData = {
  prompt: string
  width: number
  height: number
  model: string
  batchCount: number
}

function PromptConfigNode({ data }: NodeProps) {
  const { prompt, width, height, model, batchCount } = data as PromptConfigNodeData

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 min-w-[280px] shadow-2xl">
      <div className="flex items-center gap-2 mb-3 text-zinc-400 text-xs">
        <ImageIcon size={14} />
        <span>{model}</span>
        <span className="text-zinc-600">•</span>
        <span>
          {width}x{height}
        </span>
        <span className="text-zinc-600">•</span>
        <span>x{batchCount}</span>
      </div>

      <p className="text-zinc-200 text-sm leading-relaxed">{prompt}</p>

      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500" />
    </div>
  )
}

export default memo(PromptConfigNode)
