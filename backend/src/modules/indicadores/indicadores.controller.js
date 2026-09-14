import { asyncHandler } from '../../utils/asyncHandler.js';
import * as indicadoresService from './indicadores.service.js';

export const panel = asyncHandler(async (req, res) => {
  const datos = await indicadoresService.panel(req.query);
  res.json({ ok: true, data: datos, error: null });
});

export const resumen = asyncHandler(async (req, res) => {
  const datos = await indicadoresService.resumen(req.query);
  res.json({ ok: true, data: datos, error: null });
});

export const sesionesPorSemana = asyncHandler(async (req, res) => {
  const datos = await indicadoresService.sesionesPorSemana(req.query);
  res.json({ ok: true, data: datos, error: null });
});

export const porFisioterapeuta = asyncHandler(async (req, res) => {
  const datos = await indicadoresService.porFisioterapeuta(req.query);
  res.json({ ok: true, data: datos, error: null });
});

export const porDiagnostico = asyncHandler(async (req, res) => {
  const datos = await indicadoresService.porDiagnostico(req.query);
  res.json({ ok: true, data: datos, error: null });
});
