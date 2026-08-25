// Bootstrap: la tabla `usuario` empieza vacía, así que hace falta este script
// para crear el primer Administrador y poder iniciar sesión por primera vez.
//
// Uso:
//   node scripts/crear_admin.js "Nombre Completo" nombre_usuario correo@dominio.com contraseña
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { pool } from '../src/config/db.js';

dotenv.config();

async function main() {
  const [nombreCompleto, nombreUsuario, correo, password] = process.argv.slice(2);

  if (!nombreCompleto || !nombreUsuario || !password) {
    console.error(
      'Uso: node scripts/crear_admin.js "Nombre Completo" nombre_usuario correo@dominio.com contraseña',
    );
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_usuario_crear(?,?,?,?,?,?, @id_out)', [
      1, // id_perfil = Administrador
      nombreCompleto,
      nombreUsuario,
      correo || null,
      hash,
      null, // id_usuario_crea: no hay usuario previo para el primer administrador
    ]);
    const [[{ id_out }]] = await conn.query('SELECT @id_out AS id_out');
    console.log(`Usuario administrador creado con id_usuario = ${id_out}`);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error al crear el administrador:', err.message);
  process.exit(1);
});
