import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes.js';
import usuariosRoutes from './modules/usuarios/usuarios.routes.js';
import perfilesRoutes from './modules/usuarios/perfiles.routes.js';
import bitacoraRoutes from './modules/bitacora/bitacora.routes.js';
import pacientesRoutes from './modules/pacientes/pacientes.routes.js';
import catalogosRoutes from './modules/catalogos/catalogos.routes.js';
import sesionesRoutes from './modules/sesiones/sesiones.routes.js';
import dispositivoRoutes from './modules/dispositivo/dispositivo.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api', perfilesRoutes); // expone /api/perfiles y /api/permisos
app.use('/api/bitacora', bitacoraRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api', catalogosRoutes); // expone /api/diagnosticos, /api/protocolos y /api/dedos
app.use('/api/sesiones', sesionesRoutes);
app.use('/api/dispositivo', dispositivoRoutes);

app.use((req, res) => {
  res.status(404).json({ ok: false, data: null, error: 'Recurso no encontrado.' });
});

app.use(errorHandler);
