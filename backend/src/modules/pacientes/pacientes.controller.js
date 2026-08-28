import { asyncHandler } from '../../utils/asyncHandler.js';
import * as pacientesService from './pacientes.service.js';

export const listar = asyncHandler(async (req, res) => {
  const datos = await pacientesService.listar(req.query);
  res.json({ ok: true, data: datos, error: null });
});

export const obtener = asyncHandler(async (req, res) => {
  const datos = await pacientesService.obtener(req.params.id);
  res.json({ ok: true, data: datos, error: null });
});

export const crear = asyncHandler(async (req, res) => {
  const datos = await pacientesService.crear(req.body, req.usuario.id_usuario);
  res.status(201).json({ ok: true, data: datos, error: null });
});

export const actualizar = asyncHandler(async (req, res) => {
  const datos = await pacientesService.actualizar(req.params.id, req.body, req.usuario.id_usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const cambiarEstado = asyncHandler(async (req, res) => {
  const datos = await pacientesService.cambiarEstado(req.params.id, req.body.activo, req.usuario.id_usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const listarFisioterapeutas = asyncHandler(async (req, res) => {
  const datos = await pacientesService.listarFisioterapeutas();
  res.json({ ok: true, data: datos, error: null });
});

export const listarMetas = asyncHandler(async (req, res) => {
  const datos = await pacientesService.listarMetas(req.params.id);
  res.json({ ok: true, data: datos, error: null });
});

export const guardarMetas = asyncHandler(async (req, res) => {
  const datos = await pacientesService.guardarMetas(req.params.id, req.body.metas, req.usuario.id_usuario);
  res.json({ ok: true, data: datos, error: null });
});
