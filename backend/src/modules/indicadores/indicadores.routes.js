import { Router } from 'express';
import { verificarToken } from '../../middleware/auth.js';
import { requiereRol } from '../../middleware/roles.js';
import { validate } from '../../middleware/validate.js';
import { periodoQuerySchema } from './indicadores.schemas.js';
import * as indicadoresController from './indicadores.controller.js';

const router = Router();

// Matriz de permisos (CLAUDE.md 6.1): Indicadores es exclusivo del Coordinador.
router.use(verificarToken, requiereRol('Coordinador'));
router.use(validate(periodoQuerySchema, 'query'));

// Carga completa de la vista en una sola llamada.
router.get('/', indicadoresController.panel);

// Cortes individuales, útiles para refrescar una sola tarjeta o tabla.
router.get('/resumen', indicadoresController.resumen);
router.get('/sesiones-por-semana', indicadoresController.sesionesPorSemana);
router.get('/por-fisioterapeuta', indicadoresController.porFisioterapeuta);
router.get('/por-diagnostico', indicadoresController.porDiagnostico);

export default router;
