import type { AxiosProgressEvent } from 'axios'
import api from './api'

const UTF8_FILENAME_REGEX = /filename\*=UTF-8''([^;]+)/i
const FILENAME_REGEX = /filename="?([^"]+)"?/i

export interface BackupImportResult {
  message: string
  photo_count: number
  music_count: number
  thumbnails_regenerated: boolean
}

export interface BackupExportResult {
  blob: Blob
  filename: string
}

function resolveExportFilename(contentDisposition?: string): string | null {
  if (!contentDisposition) {
    return null
  }

  const utf8Match = UTF8_FILENAME_REGEX.exec(contentDisposition)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    }
    catch {
      // Fall through to fallback if decoding fails
    }
  }

  const fallbackMatch = FILENAME_REGEX.exec(contentDisposition)
  if (fallbackMatch?.[1]) {
    return fallbackMatch[1]
  }

  return null
}

export async function exportBackup(onProgress?: (progress: number) => void): Promise<BackupExportResult> {
  const response = await api.post<Blob>('/backup/export', undefined, {
    responseType: 'blob',
    onDownloadProgress: (event: AxiosProgressEvent) => {
      if (!onProgress || !event.total) {
        return
      }
      const progress = Math.min(100, Math.round((event.loaded / event.total) * 100))
      onProgress(progress)
    },
  })

  const contentDisposition = response.headers['content-disposition'] as string | undefined
  const filename = resolveExportFilename(contentDisposition)
    ?? `timesand-backup-${new Date().toISOString().slice(0, 10)}.zip`

  return {
    blob: response.data,
    filename,
  }
}

export async function importBackup(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<BackupImportResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<BackupImportResult>('/backup/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (!onProgress || !event.total) {
        return
      }
      const progress = Math.min(100, Math.round((event.loaded / event.total) * 100))
      onProgress(progress)
    },
  })

  return response.data
}
