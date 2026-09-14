import { Router } from 'express';
import { verificarToken } from '../../middleware/auth.js';
import { requiereRol } from '../../middleware/roles.js';
import { validate } from '../../middleware/validate.js';
import {
  iniciarSesionSchema,
  conectarSesionSchema,
  finalizarSesionSchema,
} from './sesiones.schemas.js';
import * as sesionesController from './sesiones.controller.js';

const router = Router();

// Matriz de permisos (CLAUDE.md 6.1): "Sesión en vivo" es exclusiva del
// Fisioterapeuta. El acceso a cada sesión se acota además a su fisioterapeuta
// dueño dentro del service.
router.use(verificarToken, requiereRol('Fisioterapeuta'));

router.post('/', validate(iniciarSesionSchema), sesionesController.iniciar);
router.get('/activa', sesionesController.obtenerActiva);
router.get('/:id', sesionesController.obtener);
router.post('/:id/conectar', validate(conectarSesionSchema), sesionesController.conectar);
router.put('/:id/pausar', sesionesController.pausar);
router.put('/:id/reanudar', sesionesController.reanudar);
router.put('/:id/finalizar', validate(finalizarSesionSchema), sesionesController.finalizar);
router.put('/:id/cancelar', sesionesController.cancelar);
router.get('/:id/lecturas', sesionesController.listarLecturas);

export default router;
