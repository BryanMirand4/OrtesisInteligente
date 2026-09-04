import { asyncHandler } from '../../utils/asyncHandler.js';
import * as sesionesService from './sesiones.service.js';

export const iniciar = asyncHandler(async (req, res) => {
  const datos = await sesionesService.iniciar(req.body.id_paciente, req.usuario.id_usuario);
  res.status(201).json({ ok: true, data: datos, error: null });
});

export const obtenerActiva = asyncHandler(async (req, res) => {
  const datos = await sesionesService.obtenerActiva(req.usuario.id_usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const obtener = asyncHandler(async (req, res) => {
  const datos = await sesionesService.obtener(req.params.id, req.usuario.id_usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const conectar = asyncHandler(async (req, res) => {
  const datos = await sesionesService.conectar(req.params.id, req.body.puerto, req.usuario.id_usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const finalizar = asyncHandler(async (req, res) => {
  const datos = await sesionesService.finalizar(
    req.params.id,
    req.body.observaciones ?? null,
    req.usuario.id_usuario,
  );
  res.json({ ok: true, data: datos, error: null });
});

export const cancelar = asyncHandler(async (req, res) => {
  const datos = await sesionesService.cancelar(req.params.id, req.usuario.id_usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const listarLecturas = asyncHandler(async (req, res) => {
  const datos = await sesionesService.listarLecturas(req.params.id, req.usuario.id_usuario);
  res.json({ ok: true, data: datos, error: null });
});
