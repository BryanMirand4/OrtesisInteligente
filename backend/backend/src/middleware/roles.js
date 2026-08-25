import { AppError } from '../utils/AppError.js';

export const requiereRol = (...perfilesPermitidos) => (req, res, next) => {
  if (!req.usuario || !perfilesPermitidos.includes(req.usuario.perfil_nombre)) {
    return next(new AppError(403, 'No tenés permisos para acceder a este recurso.'));
  }
  next();
};
