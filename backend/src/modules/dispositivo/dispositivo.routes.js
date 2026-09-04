import { Router } from 'express';
import { verificarToken } from '../../middleware/auth.js';
import { requiereRol } from '../../middleware/roles.js';
import { validate } from '../../middleware/validate.js';
import { guardarCalibracionSchema, guardarUmbralesSchema } from './dispositivo.schemas.js';
import * as dispositivoController from './dispositivo.controller.js';

const router = Router();

// Matriz de permisos (CLAUDE.md 6.1): Dispositivo (calibración/umbrales) es
// exclusivo del Administrador.
router.use(verificarToken, requiereRol('Administrador'));

router.get('/calibracion', dispositivoController.obtenerCalibracion);
router.put('/calibracion', validate(guardarCalibracionSchema), dispositivoController.guardarCalibracion);

router.get('/umbrales-fc', dispositivoController.obtenerUmbrales);
router.put('/umbrales-fc', validate(guardarUmbralesSchema), dispositivoController.guardarUmbrales);

export default router;
