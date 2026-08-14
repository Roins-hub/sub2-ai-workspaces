/**
 * Lightweight image history store.
 *
 * Metadata is stored in localStorage and image bytes are stored in IndexedDB.
 */

import type { ProviderType } from '@/lib/constants'

export const HISTORY_STORAGE_KEY = 'zenith_image_history'
export const HISTORY_TTL_MS = 24 * 60 * 60 * 1000
const MAX_ITEMS = 200

export interface ImageHistoryItem {
  id: string
  url: string
  blobId?: string

  prompt: string
  negativePrompt?: string

  providerId: ProviderType
  providerName: string

  modelId: string
  modelName: string

  width: number
  height: number
  steps: number
  seed: number

  duration?: string

  timestamp: number
  expiresAt: number
  source?: 'home' | 'flow'
}

function safeParseArray(value: string | null): ImageHistoryItem[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    // Basic shape check; tolerate extra keys for forward/backward compatibility.
    return parsed.filter((x) => !!x && typeof x === 'object') as ImageHistoryItem[]
  } catch {
    return []
  }
}

function writeHistory(items: ImageHistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignore quota / serialization errors
  }
}

function generateId(): string {
  // crypto.randomUUID is available in modern browsers; fall back for older runtimes.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID()
  }
  return `hist_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function getHistory(): ImageHistoryItem[] {
  return safeParseArray(localStorage.getItem(HISTORY_STORAGE_KEY))
}

export function getAllHistoryIncludingExpired(): ImageHistoryItem[] {
  return safeParseArray(localStorage.getItem(HISTORY_STORAGE_KEY))
}

export function saveToHistory(
  item: Omit<ImageHistoryItem, 'id' | 'timestamp' | 'expiresAt'>
): string {
  const now = Date.now()
  const entry: ImageHistoryItem = {
    ...item,
    id: generateId(),
    timestamp: now,
    expiresAt: now + HISTORY_TTL_MS,
  }

  const prev = getHistory()
  const next = [entry, ...prev].slice(0, MAX_ITEMS)
  writeHistory(next)
  return entry.id
}

export function getHistoryById(id: string): ImageHistoryItem | null {
  const items = getAllHistoryIncludingExpired()
  return items.find((i) => i.id === id) || null
}

export function deleteHistoryItem(id: string): void {
  const target = getHistoryById(id)
  if (target?.blobId) void import('./imageBlobStore').then(({ deleteBlob }) => deleteBlob(target.blobId as string))
  const items = getAllHistoryIncludingExpired().filter((i) => i.id !== id)
  writeHistory(items)
}

export function clearExpiredHistory(): number {
  const items = getAllHistoryIncludingExpired()
  const now = Date.now()
  const valid = items.filter((i) => i.blobId || typeof i.expiresAt !== 'number' || i.expiresAt > now)
  writeHistory(valid)
  return items.length - valid.length
}

export function clearAllHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY)
    void import('./imageBlobStore').then(({ clearAllBlobs }) => clearAllBlobs())
  } catch {
    // ignore
  }
}

export function getHistoryStats(): { total: number; expired: number; valid: number } {
  const items = getAllHistoryIncludingExpired()
  const now = Date.now()
  const valid = items.filter((i) => typeof i.expiresAt !== 'number' || i.expiresAt > now)
  return { total: items.length, valid: valid.length, expired: items.length - valid.length }
}
