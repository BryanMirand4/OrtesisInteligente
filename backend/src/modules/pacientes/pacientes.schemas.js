import { z } from 'zod';

// z.coerce.boolean() usa Boolean(valor): en un query string "false" es un
// string no vacío, así que Boolean("false") da true. Por eso los filtros
// booleanos de querystring se parsean explícitamente contra 'true'/'false'.
const booleanDesdeQuery = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

const camposPaciente = {
  nombres: z.string().min(1).max(80),
  apellidos: z.string().min(1).max(80),
  fecha_nacimiento: z.string().date(),
  sexo: z.enum(['M', 'F']),
  telefono: z.string().max(20).optional().nullable(),
  id_diagnostico: z.coerce.number().int().positive().optional().nullable(),
  mano_afectada: z.enum(['Izquierda', 'Derecha', 'Ambas']),
  fecha_ingreso: z.string().date(),
  id_fisioterapeuta: z.coerce.number().int().positive(),
  id_protocolo: z.coerce.number().int().positive().optional().nullable(),
};

export const crearPacienteSchema = z.object(camposPaciente);
export const actualizarPacienteSchema = z.object(camposPaciente);

export const cambiarEstadoPacienteSchema = z.object({
  activo: z.boolean(),
});

export const listarPacientesQuerySchema = z.object({
  activo: booleanDesdeQuery,
  id_diagnostico: z.coerce.number().int().positive().optional(),
  q: z.string().optional(),
});

export const guardarMetasSchema = z.object({
  metas: z
    .array(
      z.object({
        id_dedo: z.coerce.number().int().positive(),
        angulo_meta: z.coerce.number().min(0).max(180),
      }),
    )
    .min(1),
});
