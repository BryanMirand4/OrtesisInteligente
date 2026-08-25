import { AppError } from '../utils/AppError.js';

export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ ok: false, data: null, error: err.message });
  }

  // Errores lanzados con SIGNAL SQLSTATE '45000' dentro de los procedimientos almacenados
  if (err.sqlState === '45000') {
    return res.status(400).json({ ok: false, data: null, error: err.sqlMessage });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ ok: false, data: null, error: 'El registro ya existe.' });
  }

  console.error(err);
  return res.status(500).json({ ok: false, data: null, error: 'Error interno del servidor.' });
}
