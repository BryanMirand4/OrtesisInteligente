import { asyncHandler } from '../../utils/asyncHandler.js';
import * as dispositivoService from './dispositivo.service.js';

export const obtenerCalibracion = asyncHandler(async (req, res) => {
  const datos = await dispositivoService.listarCalibracion();
  res.json({ ok: true, data: datos, error: null });
});

export const guardarCalibracion = asyncHandler(async (req, res) => {
  const datos = await dispositivoService.guardarCalibracion(
    req.body.calibraciones,
    req.usuario.id_usuario,
  );
  res.json({ ok: true, data: datos, error: null });
});

export const obtenerUmbrales = asyncHandler(async (req, res) => {
  const datos = await dispositivoService.listarUmbrales();
  res.json({ ok: true, data: datos, error: null });
});

export const guardarUmbrales = asyncHandler(async (req, res) => {
  const datos = await dispositivoService.guardarUmbrales(req.body.umbrales, req.usuario.id_usuario);
  res.json({ ok: true, data: datos, error: null });
});
