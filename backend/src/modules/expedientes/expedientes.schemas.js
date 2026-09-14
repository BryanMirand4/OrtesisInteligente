import { z } from 'zod';

export const listarExpedientesQuerySchema = z.object({
  q: z.string().max(120).optional(),
});
