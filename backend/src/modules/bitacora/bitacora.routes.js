import { Router } from 'express';
import { verificarToken } from '../../middleware/auth.js';
import { requiereRol } from '../../middleware/roles.js';
import { validate } from '../../middleware/validate.js';
import { listarBitacoraQuerySchema } from './bitacora.schemas.js';
import * as bitacoraController from './bitacora.controller.js';

const router = Router();

router.use(verificarToken, requiereRol('Administrador'));
router.get('/', validate(listarBitacoraQuerySchema, 'query'), bitacoraController.listar);

export default router;
