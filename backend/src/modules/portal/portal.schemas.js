import { z } from 'zod';

export const misSesionesQuerySchema = z.object({
  limite: z.coerce.number().int().min(1).max(200).optional(),
});

// El paciente no elige tipo de reporte ni destinatario: solo el formato y,
// opcionalmente, el período. Cualquier otro filtro sería un intento de mirar
// más allá de su propio expediente.
export const miReporteQuerySchema = z.object({
  formato: z.enum(['pdf', 'xlsx']).default('pdf'),
  fecha_inicio: z.string().date().optional(),
  fecha_fin: z.string().date().optional(),
});
