import { Handle, type NodeProps, Position } from '@xyflow/react'
import { GitBranch, User } from 'lucide-react'
import { memo } from 'react'

export type UserPromptNodeData = {
  prompt: string
  timestamp: string
  width: number
  height: number
  batchCount: number
}

function UserPromptNode({ data, selected }: NodeProps) {
  const { prompt, timestamp, width, height, batchCount } = data as UserPromptNodeData

  return (
    <div
      className={`
        relative rounded-2xl px-4 py-3 w-[280px] shadow-lg
        transition-all duration-300 ease-out
        ${
          selected
            ? 'bg-zinc-800 ring-2 ring-orange-500/60 shadow-[0_0_30px_rgba(249,115,22,0.25)]'
            : 'bg-zinc-800/90 hover:bg-zinc-800'
        }
      `}
      style={{
        backdropFilter: 'blur(8px)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`!w-3 !h-3 !border-2 transition-colors ${
          selected ? '!bg-orange-500 !border-orange-400' : '!bg-zinc-600 !border-zinc-500'
        }`}
      />

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div
          className={`
            w-6 h-6 rounded-full flex items-center justify-center transition-colors
            ${selected ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-700 text-zinc-400'}
          `}
        >
          <User size={12} />
        </div>
        <span className="text-zinc-500 text-xs">{timestamp}</span>
        <span className="text-zinc-600 text-xs">|</span>
        <span className="text-zinc-500 text-xs">
          {width}x{height}
        </span>
        <span className="text-zinc-500 text-xs">x{batchCount}</span>
      </div>

      <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
        <p className="text-zinc-200 text-sm leading-relaxed break-words">{prompt}</p>
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
          <GitBranch size={10} className="text-white" />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className={`!w-3 !h-3 !border-2 transition-colors ${
          selected ? '!bg-orange-500 !border-orange-400' : '!bg-orange-500 !border-orange-400'
        }`}
      />
    </div>
  )
}

export default memo(UserPromptNode)
