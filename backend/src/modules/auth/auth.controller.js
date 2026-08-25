import { asyncHandler } from '../../utils/asyncHandler.js';
import * as authService from './auth.service.js';

export const login = asyncHandler(async (req, res) => {
  const { nombre_usuario, password } = req.body;
  const resultado = await authService.login(nombre_usuario, password, req.ip);
  res.json({ ok: true, data: resultado, error: null });
});

// El JWT es sin estado: el logout solo indica al cliente que descarte el token.
export const logout = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: null, error: null });
});

export const recuperar = asyncHandler(async (req, res) => {
  const { correo } = req.body;
  const resultado = await authService.solicitarRecuperacion(correo);
  res.json({ ok: true, data: resultado, error: null });
});

export const restablecer = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const resultado = await authService.restablecerPassword(token, password);
  res.json({ ok: true, data: resultado, error: null });
});
