import { AppError } from '../utils/AppError.js';

export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ ok: false, data: null, error: err.message, code: err.code });
  }

  // Errores lanzados con SIGNAL SQLSTATE '45000' dentro de los procedimientos almacenados
  if (err.sqlState === '45000') {
    return res.status(400).json({ ok: false, data: null, error: err.sqlMessage });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ ok: false, data: null, error: 'El registro ya existe.' });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ ok: false, data: null, error: 'El registro relacionado no existe o fue dado de baja.' });
  }

  console.error(err);
  return res.status(500).json({ ok: false, data: null, error: 'Error interno del servidor.' });
}
