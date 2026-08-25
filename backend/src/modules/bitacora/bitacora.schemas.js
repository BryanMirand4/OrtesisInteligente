import { z } from 'zod';

export const listarBitacoraQuerySchema = z.object({
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
  id_usuario: z.coerce.number().int().positive().optional(),
  tipo_accion: z.string().optional(),
  modulo: z.string().optional(),
});
