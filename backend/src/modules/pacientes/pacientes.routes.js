import { Router } from 'express';
import { verificarToken } from '../../middleware/auth.js';
import { requiereRol } from '../../middleware/roles.js';
import { validate } from '../../middleware/validate.js';
import {
  crearPacienteSchema,
  actualizarPacienteSchema,
  cambiarEstadoPacienteSchema,
  listarPacientesQuerySchema,
  guardarMetasSchema,
} from './pacientes.schemas.js';
import * as pacientesController from './pacientes.controller.js';
import * as expedientesController from '../expedientes/expedientes.controller.js';

const router = Router();

// Matriz de permisos (CLAUDE.md 6.1): Pacientes es gestionado por el
// Fisioterapeuta; el Coordinador solo tiene lectura; Administrador y
// Paciente no tienen acceso a este módulo.
router.use(verificarToken, requiereRol('Fisioterapeuta', 'Coordinador'));

const soloFisio = requiereRol('Fisioterapeuta');

router.get('/fisioterapeutas', pacientesController.listarFisioterapeutas);

router.get('/', validate(listarPacientesQuerySchema, 'query'), pacientesController.listar);
router.post('/', soloFisio, validate(crearPacienteSchema), pacientesController.crear);
router.get('/:id', pacientesController.obtener);
router.put('/:id', soloFisio, validate(actualizarPacienteSchema), pacientesController.actualizar);
router.put('/:id/estado', soloFisio, validate(cambiarEstadoPacienteSchema), pacientesController.cambiarEstado);

// Alias declarado en CLAUDE.md (7): las sesiones del paciente son las mismas
// que lista el expediente, con idéntico control de pertenencia.
router.get('/:id/sesiones', expedientesController.sesiones);

router.get('/:id/metas', pacientesController.listarMetas);
router.put('/:id/metas', soloFisio, validate(guardarMetasSchema), pacientesController.guardarMetas);

export default router;
