import { asyncHandler } from '../../utils/asyncHandler.js';
import * as portalService from './portal.service.js';

export const miAvance = asyncHandler(async (req, res) => {
  const datos = await portalService.miAvance(req.usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const miResumen = asyncHandler(async (req, res) => {
  const datos = await portalService.miResumen(req.usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const miEvolucion = asyncHandler(async (req, res) => {
  const datos = await portalService.miEvolucion(req.usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const misSesiones = asyncHandler(async (req, res) => {
  const datos = await portalService.misSesiones(req.usuario, req.query);
  res.json({ ok: true, data: datos, error: null });
});

export const miAvanceDedo = asyncHandler(async (req, res) => {
  const datos = await portalService.miAvanceDedo(req.usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const miReporte = asyncHandler(async (req, res) => {
  const { formato, ...filtros } = req.query;

  const { buffer, contentType, documento } = await portalService.miReporte(
    req.usuario,
    formato,
    filtros,
    req.ip,
  );

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${documento}"`);
  res.setHeader('X-Nombre-Documento', documento);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Nombre-Documento');
  res.send(buffer);
});
