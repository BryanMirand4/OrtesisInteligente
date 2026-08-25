import { asyncHandler } from '../../utils/asyncHandler.js';
import * as perfilesService from './perfiles.service.js';

export const listarPerfiles = asyncHandler(async (req, res) => {
  const datos = await perfilesService.listarPerfiles();
  res.json({ ok: true, data: datos, error: null });
});

export const listarPermisos = asyncHandler(async (req, res) => {
  const datos = await perfilesService.listarPermisos();
  res.json({ ok: true, data: datos, error: null });
});

export const listarPermisosPorPerfil = asyncHandler(async (req, res) => {
  const datos = await perfilesService.listarPermisosPorPerfil(req.params.id);
  res.json({ ok: true, data: datos, error: null });
});
