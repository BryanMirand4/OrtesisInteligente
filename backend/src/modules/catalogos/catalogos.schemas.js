import { z } from 'zod';

// z.coerce.boolean() usa Boolean(valor): en un query string "false" es un
// string no vacío, así que Boolean("false") da true. Por eso los filtros
// booleanos de querystring se parsean explícitamente contra 'true'/'false'.
const booleanDesdeQuery = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

export const crearDiagnosticoSchema = z.object({
  codigo: z.string().max(20).optional().nullable(),
  nombre: z.string().min(1).max(150),
  descripcion: z.string().max(255).optional().nullable(),
});

export const actualizarDiagnosticoSchema = crearDiagnosticoSchema;

export const crearProtocoloSchema = z.object({
  nombre: z.string().min(1).max(150),
  descripcion: z.string().max(2000).optional().nullable(),
  sesiones_meta: z.coerce.number().int().positive().optional().nullable(),
});

export const actualizarProtocoloSchema = crearProtocoloSchema;

export const cambiarEstadoCatalogoSchema = z.object({
  activo: z.boolean(),
});

export const listarCatalogoQuerySchema = z.object({
  activo: booleanDesdeQuery,
  q: z.string().optional(),
});
