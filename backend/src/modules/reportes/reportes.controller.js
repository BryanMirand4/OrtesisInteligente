import { asyncHandler } from '../../utils/asyncHandler.js';
import * as reportesService from './reportes.service.js';

// Separa el tipo/formato de los filtros propiamente dichos.
function separarFiltros(query) {
  const { tipo, formato, ...filtros } = query;
  return { tipo, formato, filtros };
}

export const vistaPrevia = asyncHandler(async (req, res) => {
  const { tipo, filtros } = separarFiltros(req.query);
  const datos = await reportesService.vistaPrevia(tipo, filtros, req.usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const historial = asyncHandler(async (req, res) => {
  const datos = await reportesService.historial(req.query, req.usuario);
  res.json({ ok: true, data: datos, error: null });
});

export const descargar = asyncHandler(async (req, res) => {
  const { tipo, formato, filtros } = separarFiltros(req.query);

  const { buffer, contentType, documento } = await reportesService.generar(
    tipo,
    formato,
    filtros,
    req.usuario,
    req.ip,
  );

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${documento}"`);
  // El nombre del archivo viaja también en un encabezado propio porque el
  // frontend descarga con fetch y no puede leer Content-Disposition sin esto.
  res.setHeader('X-Nombre-Documento', documento);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Nombre-Documento');
  res.send(buffer);
});
