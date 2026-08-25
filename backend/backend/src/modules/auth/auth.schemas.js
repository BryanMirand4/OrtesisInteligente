import { z } from 'zod';

export const loginSchema = z.object({
  nombre_usuario: z.string().min(1, 'El usuario es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const recuperarSchema = z.object({
  correo: z.string().email('Correo inválido'),
});

export const restablecerSchema = z.object({
  token: z.string().length(64, 'Token inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});
