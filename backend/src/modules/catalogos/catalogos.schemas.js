import { z } from 'zod';

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
  activo: z.coerce.boolean().optional(),
  q: z.string().optional(),
});
