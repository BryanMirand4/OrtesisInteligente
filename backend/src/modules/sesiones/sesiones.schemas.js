import { z } from 'zod';

export const iniciarSesionSchema = z.object({
  id_paciente: z.coerce.number().int().positive(),
  // El fisioterapeuta puede continuar aunque el paciente ya haya alcanzado
  // la meta de sesiones de su protocolo (ver sesiones.service.js).
  forzar_meta_superada: z.coerce.boolean().optional().default(false),
});

export const conectarSesionSchema = z.object({
  // 'MOCK' o un puerto real (p. ej. 'COM4', '/dev/ttyUSB0').
  puerto: z.string().trim().min(1).max(30),
  // Duración del temporizador de la sesión, en minutos. Opcional: sin ella
  // el cronómetro solo cuenta hacia arriba, sin corte automático.
  duracion_planeada_minutos: z.coerce.number().int().min(1).max(180).optional().nullable(),
});

export const finalizarSesionSchema = z.object({
  observaciones: z.string().max(500).optional().nullable(),
});
