import { Handle, type NodeProps, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { Bot, Copy, GitBranch, MessageSquare, Trash2, User } from 'lucide-react'
import { memo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import type { MessageNodeData, MessageRole } from '@/stores/conversationFlowStore'

interface MessageNodeProps extends NodeProps {
  data: MessageNodeData
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MessageNodeComponent({ data, selected }: MessageNodeProps) {
  const { role, content, timestamp, isActive, isOnActivePath, childIds } = data

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content)
  }, [content])

  const isUser = role === 'user'
  const hasBranches = childIds.length > 1

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: isOnActivePath ? 1 : 0.5,
        scale: 1,
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        relative min-w-[280px] max-w-[400px] rounded-2xl
        transition-all duration-300 ease-out
        ${isUser ? 'user-message-node' : 'ai-message-node'}
        ${isActive ? 'ring-2 ring-orange-500/60 shadow-[0_0_30px_rgba(249,115,22,0.3)]' : ''}
        ${selected ? 'ring-2 ring-blue-500/60' : ''}
        ${!isOnActivePath ? 'grayscale-[30%]' : ''}
      `}
      style={{
        background: isUser
          ? 'linear-gradient(135deg, rgba(39, 39, 42, 0.9) 0%, rgba(24, 24, 27, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(15, 15, 15, 0.85) 0%, rgba(24, 24, 27, 0.9) 100%)',
        backdropFilter: 'blur(12px)',
        border: isUser
          ? '1px solid rgba(255, 255, 255, 0.15)'
          : '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Source Handle (Top) - for receiving connections */}
      <Handle
        type="target"
        position={Position.Top}
        className={`!w-3 !h-3 !border-2 transition-colors duration-200 ${
          isOnActivePath ? '!bg-orange-500 !border-orange-400' : '!bg-zinc-600 !border-zinc-500'
        }`}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div
            className={`
              flex items-center justify-center w-7 h-7 rounded-full
              ${isUser ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}
            `}
          >
            {isUser ? <User size={14} /> : <Bot size={14} />}
          </div>
          <span className="text-xs font-medium text-zinc-400">{isUser ? 'You' : 'AI'}</span>
          {hasBranches && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-700/50">
              <GitBranch size={10} className="text-zinc-500" />
              <span className="text-[10px] text-zinc-500">{childIds.length}</span>
            </div>
          )}
        </div>
        <span className="text-[10px] text-zinc-500">{formatTimestamp(timestamp)}</span>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {isUser ? (
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="text-sm text-zinc-300 leading-relaxed prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Actions (visible on hover/active) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isActive || selected ? 1 : 0 }}
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-800/90 border border-zinc-700/50"
      >
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-full hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Copy"
        >
          <Copy size={12} />
        </button>
        <button
          type="button"
          className="p-1.5 rounded-full hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Branch from here"
        >
          <GitBranch size={12} />
        </button>
        <button
          type="button"
          className="p-1.5 rounded-full hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Reply"
        >
          <MessageSquare size={12} />
        </button>
        <button
          type="button"
          className="p-1.5 rounded-full hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </motion.div>

      {/* Target Handle (Bottom) - for outgoing connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={`!w-3 !h-3 !border-2 transition-colors duration-200 ${
          isOnActivePath ? '!bg-orange-500 !border-orange-400' : '!bg-zinc-600 !border-zinc-500'
        }`}
      />
    </motion.div>
  )
}

export const MessageNode = memo(MessageNodeComponent)

export type { MessageRole }
