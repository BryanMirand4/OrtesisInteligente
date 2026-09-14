import { Router } from 'express';
import { verificarToken } from '../../middleware/auth.js';
import { requiereRol } from '../../middleware/roles.js';
import { validate } from '../../middleware/validate.js';
import { listarExpedientesQuerySchema } from './expedientes.schemas.js';
import * as expedientesController from './expedientes.controller.js';

const router = Router();

// Matriz de permisos (CLAUDE.md 6.1): Expedientes lo consulta el
// Fisioterapeuta (solo los asignados, filtrado en el servicio) y el
// Coordinador en modo lectura. El expediente propio del Paciente se expone
// aparte, por /api/portal, en el Sprint 5.
router.use(verificarToken, requiereRol('Fisioterapeuta', 'Coordinador'));

router.get('/', validate(listarExpedientesQuerySchema, 'query'), expedientesController.listar);

router.get('/:id', expedientesController.detalle);
router.get('/:id/resumen', expedientesController.resumen);
router.get('/:id/evolucion', expedientesController.evolucion);
router.get('/:id/evolucion-dedo', expedientesController.evolucionPorDedo);
router.get('/:id/sesiones', expedientesController.sesiones);
router.get('/:id/avance-metas', expedientesController.avanceMetas);

export default router;
