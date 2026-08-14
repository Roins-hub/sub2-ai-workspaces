/**
 * Optional migrations / cleanup helpers.
 *
 * Keep these opt-in: deleting IndexedDB databases is destructive for local-only caches.
 */

export const LEGACY_BLOB_DB_NAME = 'zenith-image-blobs'

export async function deleteLegacyBlobDb(): Promise<void> {
  // Browser-only API; no-op in non-browser contexts.
  if (typeof indexedDB === 'undefined') return

  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(LEGACY_BLOB_DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}
