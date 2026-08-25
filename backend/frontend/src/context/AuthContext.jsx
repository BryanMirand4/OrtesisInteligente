import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const iniciarSesion = useCallback(async (nombreUsuario, password) => {
    const { token: nuevoToken, usuario: nuevoUsuario } = await authApi.login(nombreUsuario, password);
    localStorage.setItem('token', nuevoToken);
    localStorage.setItem('usuario', JSON.stringify(nuevoUsuario));
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
    return nuevoUsuario;
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // El JWT es sin estado: el logout es best-effort, igual se limpia localmente.
    }
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  }, []);

  const value = useMemo(
    () => ({ usuario, token, estaAutenticado: Boolean(token), iniciarSesion, cerrarSesion }),
    [usuario, token, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
