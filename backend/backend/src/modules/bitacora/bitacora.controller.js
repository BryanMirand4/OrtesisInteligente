import { asyncHandler } from '../../utils/asyncHandler.js';
import * as bitacoraService from './bitacora.service.js';

export const listar = asyncHandler(async (req, res) => {
  const datos = await bitacoraService.listar(req.query);
  res.json({ ok: true, data: datos, error: null });
});
