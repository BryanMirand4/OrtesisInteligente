import { asyncHandler } from '../../utils/asyncHandler.js';
import * as expedientesService from './expedientes.service.js';

export const listar = asyncHandler(async (req, res) => {
  const datos = await expedientesService.listar(req.query, req.usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const detalle = asyncHandler(async (req, res) => {
  const datos = await expedientesService.detalle(req.params.id, req.usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const resumen = asyncHandler(async (req, res) => {
  const datos = await expedientesService.resumen(req.params.id, req.usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const evolucion = asyncHandler(async (req, res) => {
  const datos = await expedientesService.evolucion(req.params.id, req.usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const evolucionPorDedo = asyncHandler(async (req, res) => {
  const datos = await expedientesService.evolucionPorDedo(req.params.id, req.usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const sesiones = asyncHandler(async (req, res) => {
  const datos = await expedientesService.sesiones(req.params.id, req.usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const avanceMetas = asyncHandler(async (req, res) => {
  const datos = await expedientesService.avanceMetas(req.params.id, req.usuario);
  res.json({ ok: true, data: datos, error: null });
});
