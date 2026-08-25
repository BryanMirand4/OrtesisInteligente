import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';

export async function login(nombreUsuario, password, ip) {
  const [results] = await pool.query('CALL sp_auth_usuario_login(?)', [nombreUsuario]);
  const usuario = results[0][0];

  if (!usuario) {
    await pool.query('CALL sp_auth_login_fallido(?,?,?)', [null, nombreUsuario, ip]);
    throw new AppError(401, 'Usuario o contraseña incorrectos.');
  }

  if (usuario.bloqueado) {
    throw new AppError(403, 'Cuenta bloqueada por múltiples intentos fallidos. Contactá al administrador.');
  }

  if (!usuario.activo) {
    throw new AppError(403, 'Cuenta inactiva.');
  }

  const passwordValida = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordValida) {
    await pool.query('CALL sp_auth_login_fallido(?,?,?)', [usuario.id_usuario, nombreUsuario, ip]);
    throw new AppError(401, 'Usuario o contraseña incorrectos.');
  }

  await pool.query('CALL sp_auth_login_exitoso(?,?)', [usuario.id_usuario, ip]);

  const token = jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      id_perfil: usuario.id_perfil,
      perfil_nombre: usuario.perfil_nombre,
      nombre_usuario: usuario.nombre_usuario,
      nombre_completo: usuario.nombre_completo,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
  );

  return {
    token,
    usuario: {
      id_usuario: usuario.id_usuario,
      id_perfil: usuario.id_perfil,
      perfil_nombre: usuario.perfil_nombre,
      nombre_usuario: usuario.nombre_usuario,
      nombre_completo: usuario.nombre_completo,
      correo: usuario.correo,
    },
  };
}

export async function solicitarRecuperacion(correo) {
  const [results] = await pool.query('CALL sp_auth_buscar_por_correo(?)', [correo]);
  const usuario = results[0][0];

  if (usuario && usuario.activo) {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query('CALL sp_auth_token_generar(?,?,?)', [usuario.id_usuario, token, 1]);
    if (process.env.NODE_ENV !== 'production') {
      return { mensaje: 'Se generó un token de recuperación.', token };
    }
  }

  // Respuesta genérica: evita revelar si el correo existe en el sistema.
  return { mensaje: 'Si el correo existe en el sistema, se enviaron instrucciones de recuperación.' };
}

export async function restablecerPassword(token, password) {
  const hash = await bcrypt.hash(password, 12);
  await pool.query('CALL sp_auth_password_restablecer(?,?)', [token, hash]);
  return { mensaje: 'Contraseña actualizada correctamente.' };
}
