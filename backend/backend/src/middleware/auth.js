import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

export function verificarToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return next(new AppError(401, 'No se proporcionó un token de autenticación.'));
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new AppError(401, 'Token inválido o expirado.'));
  }
}
