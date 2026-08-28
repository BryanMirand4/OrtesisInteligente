import { asyncHandler } from '../../utils/asyncHandler.js';
import * as dedosService from './dedos.service.js';

export const listar = asyncHandler(async (req, res) => {
  const datos = await dedosService.listar();
  res.json({ ok: true, data: datos, error: null });
});
