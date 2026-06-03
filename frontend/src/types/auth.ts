export type UserRole = 'admin' | 'member'

export interface User {
  id: number
  username: string
  display_name: string
  role: UserRole
  is_active: boolean
}

export interface UserSetting {
  user_id: number
  language: string
  theme: string
  draw_weight_mode: string
  draw_date_range_days: number
  draw_default_album_id: number | null
  slideshow_interval_seconds: number
  slideshow_ken_burns: boolean
  slideshow_shuffle: boolean
  music_volume: number
  music_auto_play: boolean
}

export interface LoginRequest {
  username: string
  password: string
  remember_me: boolean
}

export interface LoginResponse {
  user: User
}

export interface PasswordChangeRequest {
  old_password: string
  new_password: string
}

export interface RegisterUserRequest {
  username: string
  display_name: string
  password: string
  role: UserRole
}
