import { z } from 'zod';

export const iniciarSesionSchema = z.object({
  id_paciente: z.coerce.number().int().positive(),
});

export const conectarSesionSchema = z.object({
  // 'MOCK' o un puerto real (p. ej. 'COM4', '/dev/ttyUSB0').
  puerto: z.string().trim().min(1).max(30),
});

export const finalizarSesionSchema = z.object({
  observaciones: z.string().max(500).optional().nullable(),
});
