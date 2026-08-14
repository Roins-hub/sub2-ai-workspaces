import { Handle, type NodeProps, Position } from '@xyflow/react'
import { Loader2 } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { decryptTokenFromStore } from '@/lib/crypto'

export type SingleImageNodeData = {
  prompt: string
  width: number
  height: number
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

function SingleImageNode({ data }: NodeProps) {
  const { prompt, width, height } = data as SingleImageNodeData
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const generatingRef = useRef(false)

  useEffect(() => {
    decryptTokenFromStore('gitee').then((key: string) => setApiKey(key || null))
  }, [])

  useEffect(() => {
    if (apiKey === null) return
    if (!apiKey) {
      setLoading(false)
      setError('No API Key')
      return
    }

    // Prevent double execution from React StrictMode
    if (generatingRef.current) return
    generatingRef.current = true

    generateImage(prompt, apiKey, width, height)
      .then((url) => {
        setImageUrl(url)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [apiKey, prompt, width, height])

  return (
    <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-xl p-3 shadow-2xl">
      <Handle type="target" position={Position.Top} className="!bg-emerald-500" />

      <div className="w-[256px] h-[256px] rounded-lg overflow-hidden bg-zinc-800">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <span className="text-red-400 text-xs text-center">{error}</span>
          </div>
        ) : (
          <img src={imageUrl!} alt="Generated" className="w-full h-full object-cover" />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-zinc-600" />
    </div>
  )
}

export default memo(SingleImageNode)
