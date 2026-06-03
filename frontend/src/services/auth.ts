import type {
  LoginRequest,
  LoginResponse,
  PasswordChangeRequest,
  RegisterUserRequest,
  User,
} from '../types/auth'

import api from './api'

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', payload)
  return response.data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function fetchMe(): Promise<User> {
  const response = await api.get<User>('/auth/me')
  return response.data
}

export async function changePassword(payload: PasswordChangeRequest): Promise<void> {
  await api.put('/auth/password', payload)
}

export async function updateProfile(payload: { display_name: string }): Promise<User> {
  const response = await api.put<User>('/auth/me', payload)
  return response.data
}

export async function registerUser(payload: RegisterUserRequest): Promise<User> {
  const response = await api.post<User>('/auth/register', payload)
  return response.data
}
