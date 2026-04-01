const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('attivo_token');
}

export function saveToken(token: string) {
  localStorage.setItem('attivo_token', token);
  // Cookie necessário para o middleware do Next.js (server-side) ler o token
  document.cookie = `attivo_token=${token}; path=/; max-age=${8 * 3600}; SameSite=Lax`;
}

export function clearToken() {
  localStorage.removeItem('attivo_token');
  document.cookie = 'attivo_token=; path=/; max-age=0';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
