import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { loginSchema, recuperarSchema, restablecerSchema } from './auth.schemas.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/recuperar', validate(recuperarSchema), authController.recuperar);
router.post('/restablecer', validate(restablecerSchema), authController.restablecer);

export default router;
