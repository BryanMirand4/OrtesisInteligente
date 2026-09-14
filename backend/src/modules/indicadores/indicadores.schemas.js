import { z } from 'zod';

// Período de consulta. Si no llega, los procedimientos asumen el mes en curso.
export const periodoQuerySchema = z.object({
  fecha_inicio: z.string().date().optional(),
  fecha_fin: z.string().date().optional(),
});
