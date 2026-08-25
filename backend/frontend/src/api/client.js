const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({ ok: false, error: 'Respuesta inválida del servidor.' }));

  if (!res.ok || !json.ok) {
    throw new Error(json.error || 'Ocurrió un error inesperado.');
  }

  return json.data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
};

export function construirQueryString(params = {}) {
  const entradas = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  const qs = new URLSearchParams(entradas).toString();
  return qs ? `?${qs}` : '';
}
