import { Router } from 'express';
import { verificarToken } from '../../middleware/auth.js';
import { requiereRol } from '../../middleware/roles.js';
import { validate } from '../../middleware/validate.js';
import {
  vistaPreviaQuerySchema,
  descargarQuerySchema,
  historialQuerySchema,
} from './reportes.schemas.js';
import * as reportesController from './reportes.controller.js';

const router = Router();

// Matriz de permisos (CLAUDE.md 6.1): el Coordinador genera reportes de todo
// el servicio y el Fisioterapeuta solo de lo propio. Ese recorte lo aplica
// reportes.service.js a partir del perfil del JWT. El reporte del propio
// Paciente se expone por /api/portal en el Sprint 5.
router.use(verificarToken, requiereRol('Coordinador', 'Fisioterapeuta'));

// Vista previa en pantalla: no genera archivo ni consume folio.
router.get('/', validate(vistaPreviaQuerySchema, 'query'), reportesController.vistaPrevia);

// Historial "REPORTES GENERADOS", reconstruido desde la bitácora.
router.get('/historial', validate(historialQuerySchema, 'query'), reportesController.historial);

// Generación del archivo: asigna folio, registra GENERAR_REPORTE y descarga.
router.get('/descargar', validate(descargarQuerySchema, 'query'), reportesController.descargar);

export default router;
