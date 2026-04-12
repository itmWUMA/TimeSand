export interface Music {
  id: number
  title: string
  artist: string | null
  filename: string
  file_path: string
  file_size: number
  duration: number | null
  mime_type: string
  uploaded_at: string
}

export interface Playlist {
  id: number
  name: string
  is_default: boolean
  track_count: number
  created_at: string
  tracks: Music[]
}

export interface ListMusicResponse {
  items: Music[]
  total: number
  page: number
  page_size: number
}

export interface ListPlaylistsResponse {
  items: Playlist[]
}
