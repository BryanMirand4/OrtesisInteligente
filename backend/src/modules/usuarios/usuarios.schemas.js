import { z } from 'zod';

// z.coerce.boolean() usa Boolean(valor): en un query string "false" es un
// string no vacío, así que Boolean("false") da true. Por eso los filtros
// booleanos de querystring se parsean explícitamente contra 'true'/'false'.
const booleanDesdeQuery = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

export const crearUsuarioSchema = z.object({
  id_perfil: z.coerce.number().int().positive(),
  nombre_completo: z.string().min(1).max(120),
  nombre_usuario: z.string().min(3).max(60),
  correo: z.string().email().max(120).optional().nullable(),
  password: z.string().min(8).max(72),
});

export const actualizarUsuarioSchema = z.object({
  id_perfil: z.coerce.number().int().positive(),
  nombre_completo: z.string().min(1).max(120),
  correo: z.string().email().max(120).optional().nullable(),
});

export const cambiarEstadoSchema = z.object({
  activo: z.boolean(),
});

export const listarUsuariosQuerySchema = z.object({
  id_perfil: z.coerce.number().int().positive().optional(),
  activo: booleanDesdeQuery,
  q: z.string().optional(),
});
