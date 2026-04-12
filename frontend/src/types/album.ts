export interface Album {
  id: number
  name: string
  description: string | null
  cover_photo_id: number | null
  cover_photo: string | null
  photo_count: number
  created_at: string
  updated_at: string
}

export interface Tag {
  id: number
  name: string
}
