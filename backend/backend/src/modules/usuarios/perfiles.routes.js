import { Router } from 'express';
import { verificarToken } from '../../middleware/auth.js';
import { requiereRol } from '../../middleware/roles.js';
import * as perfilesController from './perfiles.controller.js';

const router = Router();

// Este router se monta en '/api' (no en un subprefijo propio) para exponer
// /api/perfiles y /api/permisos tal cual el listado de endpoints de referencia.
// Por eso la autenticación va por ruta y no con router.use(): un router.use()
// sin path aquí interceptaría CUALQUIER /api/* no coincidente (p. ej.
// /api/bitacora) antes de que llegue a su router correspondiente o al 404.
const soloAdmin = [verificarToken, requiereRol('Administrador')];

router.get('/perfiles', soloAdmin, perfilesController.listarPerfiles);
router.get('/perfiles/:id/permisos', soloAdmin, perfilesController.listarPermisosPorPerfil);
router.get('/permisos', soloAdmin, perfilesController.listarPermisos);

export default router;
