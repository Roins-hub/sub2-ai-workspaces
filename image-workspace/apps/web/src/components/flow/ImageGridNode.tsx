import { Handle, type NodeProps, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { decryptTokenFromStore } from '@/lib/crypto'

export type ImageGridNodeData = {
  prompt: string
  width?: number
  height?: number
}

type ImageSlot = {
  url: string | null
  loading: boolean
  error: string | null
}

async function generateImage(
  prompt: string,
  apiKey: string,
  width: number,
  height: number
): Promise<string> {
  const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer gitee:${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: '',
      model: 'gitee/z-image-turbo',
      size: `${width}x${height}`,
      steps: 9,
      n: 1,
      response_format: 'url',
    }),
  })

  const json = (await res.json().catch(() => null)) as
    | { data?: Array<{ url?: string }> }
    | { error?: { message?: string } }
    | null

  if (!res.ok)
    throw new Error(
      (json as { error?: { message?: string } } | null)?.error?.message || 'Failed to generate'
    )
  const url = (json as { data?: Array<{ url?: string }> } | null)?.data?.[0]?.url
  if (!url) throw new Error('No image returned')
  return url
}

function ImageGridNode({ data }: NodeProps) {
  const { prompt, width = 512, height = 512 } = data as ImageGridNodeData
  const [slots, setSlots] = useState<ImageSlot[]>(
    Array(4).fill({ url: null, loading: true, error: null })
  )
  const [apiKey, setApiKey] = useState<string | null>(null)
  const generatingRef = useRef(false)

  useEffect(() => {
    decryptTokenFromStore('gitee').then((key: string) => setApiKey(key || null))
  }, [])

  useEffect(() => {
    if (apiKey === null) return
    if (!apiKey) {
      setSlots(Array(4).fill({ url: null, loading: false, error: 'No API Key' }))
      return
    }

    // Prevent double execution from React StrictMode
    if (generatingRef.current) return
    generatingRef.current = true

    // Launch 4 concurrent requests
    for (let i = 0; i < 4; i++) {
      generateImage(prompt, apiKey, width, height)
        .then((url) => {
          setSlots((prev) => {
            const next = [...prev]
            next[i] = { url, loading: false, error: null }
            return next
          })
        })
        .catch((err) => {
          setSlots((prev) => {
            const next = [...prev]
            next[i] = { url: null, loading: false, error: err.message }
            return next
          })
        })
    }
  }, [apiKey, prompt, width, height])

  return (
    <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-xl p-4 min-w-[320px] shadow-2xl">
      <Handle type="target" position={Position.Top} className="!bg-zinc-600" />

      <p className="text-zinc-300 text-sm mb-3 line-clamp-2">{prompt}</p>

      <div className="grid grid-cols-2 gap-2">
        {slots.map((slot, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-square rounded-lg overflow-hidden bg-zinc-800"
          >
            {slot.loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            ) : slot.error ? (
              <div className="w-full h-full flex items-center justify-center p-2">
                <span className="text-red-400 text-xs text-center">{slot.error}</span>
              </div>
            ) : (
              <img
                src={slot.url!}
                alt={`Generated ${i + 1}`}
                className="w-full h-full object-cover"
              />
            )}
          </motion.div>
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-zinc-600" />
    </div>
  )
}

export default memo(ImageGridNode)
