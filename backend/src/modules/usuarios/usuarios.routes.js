import { Router } from 'express';
import { verificarToken } from '../../middleware/auth.js';
import { requiereRol } from '../../middleware/roles.js';
import { validate } from '../../middleware/validate.js';
import {
  crearUsuarioSchema,
  actualizarUsuarioSchema,
  cambiarEstadoSchema,
  listarUsuariosQuerySchema,
} from './usuarios.schemas.js';
import * as usuariosController from './usuarios.controller.js';

const router = Router();

// Matriz de permisos: gestión de usuarios es exclusiva del Administrador.
router.use(verificarToken, requiereRol('Administrador'));

router.get('/', validate(listarUsuariosQuerySchema, 'query'), usuariosController.listar);
router.post('/', validate(crearUsuarioSchema), usuariosController.crear);
router.get('/:id', usuariosController.obtener);
router.put('/:id', validate(actualizarUsuarioSchema), usuariosController.actualizar);
router.put('/:id/estado', validate(cambiarEstadoSchema), usuariosController.cambiarEstado);
router.put('/:id/desbloquear', usuariosController.desbloquear);

export default router;
