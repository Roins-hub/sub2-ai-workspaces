import type { ImageDetails } from '@z-image/shared'
import type { BatchPromptMode } from './constants'

export type BatchTaskStatus = 'queued' | 'running' | 'success' | 'error' | 'cancelled'

export interface BatchGenerationTask {
  id: string
  index: number
  prompt: string
  status: BatchTaskStatus
  startedAt?: number
  finishedAt?: number
  details?: ImageDetails
  historyId?: string
  blobId?: string
  generatedAt?: number
  error?: string
  savedLocally?: boolean
}

export function buildBatchPrompts(
  mode: BatchPromptMode,
  prompt: string,
  prompts: string[],
  count: number
): string[] {
  if (mode === 'lines') {
    return prompts
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8)
  }

  const normalized = prompt.trim()
  if (!normalized) return []
  return Array.from({ length: Math.min(8, Math.max(2, count)) }, () => normalized)
}

export function getBatchTaskDuration(
  task: Pick<BatchGenerationTask, 'startedAt' | 'finishedAt'>,
  now = Date.now()
): string | null {
  if (task.startedAt === undefined) return null
  const finishedAt = task.finishedAt ?? now
  const durationMs = Math.max(0, finishedAt - task.startedAt)
  return `${(durationMs / 1000).toFixed(1)}s`
}

export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  shouldCancel: () => boolean,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0
  const workerCount = Math.min(Math.max(1, concurrency), items.length)

  const runWorker = async () => {
    while (!shouldCancel()) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      await worker(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: workerCount }, runWorker))
}
