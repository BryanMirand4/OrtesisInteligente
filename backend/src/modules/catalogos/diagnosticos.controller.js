import { asyncHandler } from '../../utils/asyncHandler.js';
import * as diagnosticosService from './diagnosticos.service.js';

export const listar = asyncHandler(async (req, res) => {
  const datos = await diagnosticosService.listar(req.query);
  res.json({ ok: true, data: datos, error: null });
});

export const obtener = asyncHandler(async (req, res) => {
  const datos = await diagnosticosService.obtener(req.params.id);
  res.json({ ok: true, data: datos, error: null });
});

export const crear = asyncHandler(async (req, res) => {
  const datos = await diagnosticosService.crear(req.body, req.usuario.id_usuario);
  res.status(201).json({ ok: true, data: datos, error: null });
});

export const actualizar = asyncHandler(async (req, res) => {
  const datos = await diagnosticosService.actualizar(req.params.id, req.body, req.usuario.id_usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const cambiarEstado = asyncHandler(async (req, res) => {
  const datos = await diagnosticosService.cambiarEstado(req.params.id, req.body.activo, req.usuario.id_usuario);
  res.json({ ok: true, data: datos, error: null });
});
