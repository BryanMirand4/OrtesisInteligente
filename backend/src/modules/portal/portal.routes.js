import { Router } from 'express';
import { verificarToken } from '../../middleware/auth.js';
import { requiereRol } from '../../middleware/roles.js';
import { validate } from '../../middleware/validate.js';
import { misSesionesQuerySchema, miReporteQuerySchema } from './portal.schemas.js';
import * as portalController from './portal.controller.js';

const router = Router();

// Matriz de permisos (CLAUDE.md 6.1): el Portal es exclusivo del perfil
// Paciente. El personal clínico consulta el mismo expediente por /api/expedientes,
// que es donde sí ve observaciones, frecuencia cardíaca y umbrales.
//
// Ninguna ruta recibe un id de paciente: el expediente se deriva del JWT.
router.use(verificarToken, requiereRol('Paciente'));

// Carga completa de la vista "Mi rehabilitación".
router.get('/mi-avance', portalController.miAvance);

// Bloques individuales, por si la vista necesita refrescar solo una parte.
router.get('/mi-resumen', portalController.miResumen);
router.get('/mi-evolucion', portalController.miEvolucion);
router.get('/mis-sesiones', validate(misSesionesQuerySchema, 'query'), portalController.misSesiones);
router.get('/mi-avance-dedo', portalController.miAvanceDedo);

// "Descargar mi reporte": asigna folio y registra GENERAR_REPORTE en bitácora.
router.get('/mi-reporte', validate(miReporteQuerySchema, 'query'), portalController.miReporte);

export default router;
