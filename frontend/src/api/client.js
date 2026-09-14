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
    const error = new Error(json.error || 'Ocurrió un error inesperado.');
    // Código estable opcional (p. ej. 'META_ALCANZADA') para que la vista
    // reaccione a un error puntual sin tener que parsear el mensaje.
    error.code = json.code ?? null;
    throw error;
  }

  return json.data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
};

// Descarga de archivos generados por el backend (Excel/PDF). No pasa por
// `request` porque la respuesta es binaria, no el sobre { ok, data, error }.
// El nombre del documento lo asigna el servidor y viaja en X-Nombre-Documento.
export async function descargarArchivo(path, nombrePorDefecto = 'reporte') {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error || 'No se pudo generar el reporte.');
  }

  const nombre = res.headers.get('X-Nombre-Documento') || nombrePorDefecto;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);

  return nombre;
}

export function construirQueryString(params = {}) {
  const entradas = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  const qs = new URLSearchParams(entradas).toString();
  return qs ? `?${qs}` : '';
}
