import { api, saveToken, clearToken } from './api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'MASTER_ADMIN' | 'AFFILIATE' | 'BROKER';
  affiliateId?: string | null;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await api.post<{ accessToken: string; user: AuthUser }>('/auth/login', { email, password });
  saveToken(res.accessToken);
  return res.user;
}

export async function getMe(): Promise<AuthUser> {
  const res = await api.get<{ user: AuthUser }>('/auth/me');
  return res.user;
}

export function logout() {
  clearToken();
  if (typeof window !== 'undefined') window.location.href = '/login';
}
