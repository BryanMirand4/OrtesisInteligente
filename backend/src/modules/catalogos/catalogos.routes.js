import { Router } from 'express';
import { verificarToken } from '../../middleware/auth.js';
import { requiereRol } from '../../middleware/roles.js';
import { validate } from '../../middleware/validate.js';
import {
  crearDiagnosticoSchema,
  actualizarDiagnosticoSchema,
  crearProtocoloSchema,
  actualizarProtocoloSchema,
  cambiarEstadoCatalogoSchema,
  listarCatalogoQuerySchema,
} from './catalogos.schemas.js';
import * as diagnosticosController from './diagnosticos.controller.js';
import * as protocolosController from './protocolos.controller.js';
import * as dedosController from './dedos.controller.js';

const router = Router();

// Este router se monta en '/api' (no en '/api/catalogos') para exponer
// /api/diagnosticos, /api/protocolos y /api/dedos tal cual el listado de
// endpoints de referencia. Por eso la autenticación va por ruta, igual que
// en perfiles.routes.js.

// Lectura: cualquier perfil de staff la necesita para poblar combos en el
// formulario de pacientes (diagnóstico, protocolo, dedos para metas).
const lecturaStaff = [verificarToken, requiereRol('Administrador', 'Coordinador', 'Fisioterapeuta')];
// Alta/edición de catálogos: exclusiva del Administrador (matriz de permisos, 6.1).
const soloAdmin = [verificarToken, requiereRol('Administrador')];

router.get('/diagnosticos', lecturaStaff, validate(listarCatalogoQuerySchema, 'query'), diagnosticosController.listar);
router.post('/diagnosticos', soloAdmin, validate(crearDiagnosticoSchema), diagnosticosController.crear);
router.get('/diagnosticos/:id', lecturaStaff, diagnosticosController.obtener);
router.put('/diagnosticos/:id', soloAdmin, validate(actualizarDiagnosticoSchema), diagnosticosController.actualizar);
router.put('/diagnosticos/:id/estado', soloAdmin, validate(cambiarEstadoCatalogoSchema), diagnosticosController.cambiarEstado);

router.get('/protocolos', lecturaStaff, validate(listarCatalogoQuerySchema, 'query'), protocolosController.listar);
router.post('/protocolos', soloAdmin, validate(crearProtocoloSchema), protocolosController.crear);
router.get('/protocolos/:id', lecturaStaff, protocolosController.obtener);
router.put('/protocolos/:id', soloAdmin, validate(actualizarProtocoloSchema), protocolosController.actualizar);
router.put('/protocolos/:id/estado', soloAdmin, validate(cambiarEstadoCatalogoSchema), protocolosController.cambiarEstado);

router.get('/dedos', lecturaStaff, dedosController.listar);

export default router;
