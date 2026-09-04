import { z } from 'zod';

export const guardarCalibracionSchema = z.object({
  calibraciones: z
    .array(
      z.object({
        id_dedo: z.coerce.number().int().positive(),
        valor_min_adc: z.coerce.number().int().min(0).max(1023),
        valor_max_adc: z.coerce.number().int().min(0).max(1023),
        angulo_min: z.coerce.number().min(0).max(180),
        angulo_max: z.coerce.number().min(0).max(180),
      }),
    )
    .min(1),
});

export const guardarUmbralesSchema = z.object({
  umbrales: z
    .array(
      z.object({
        id_param: z.coerce.number().int().positive(),
        fc_umbral: z.coerce.number().int().min(60).max(240),
      }),
    )
    .min(1),
});
