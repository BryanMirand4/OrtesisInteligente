import { z } from 'zod';

// `id_fisioterapeuta` NO se acepta como filtro: el alcance se deriva del
// perfil que viaja en el JWT (ver reportes.service.js).
const filtrosReporte = {
  tipo: z.enum(['consolidado', 'diagnostico', 'evolucion']).default('consolidado'),
  fecha_inicio: z.string().date().optional(),
  fecha_fin: z.string().date().optional(),
  id_paciente: z.coerce.number().int().positive().optional(),
  id_diagnostico: z.coerce.number().int().positive().optional(),
};

export const vistaPreviaQuerySchema = z.object(filtrosReporte);

export const descargarQuerySchema = z.object({
  ...filtrosReporte,
  formato: z.enum(['xlsx', 'pdf']).default('xlsx'),
});

export const historialQuerySchema = z.object({
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
  limite: z.coerce.number().int().min(1).max(500).optional(),
});
