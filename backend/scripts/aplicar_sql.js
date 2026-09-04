// Aplica uno o más archivos .sql contra la base configurada en .env.
// Entiende la directiva `DELIMITER` (como el cliente mysql), así que sirve
// para los archivos de procedimientos almacenados del proyecto.
//
// Uso:
//   node scripts/aplicar_sql.js ../db/sp_sprint3.sql ../db/seed_sprint3.sql
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

// Divide el script en sentencias respetando los cambios de DELIMITER.
function partirSentencias(sql) {
  const sentencias = [];
  let delimitador = ';';
  let buffer = '';

  for (const linea of sql.split(/\r?\n/)) {
    const m = linea.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (m) {
      delimitador = m[1];
      continue;
    }
    buffer += linea + '\n';
    if (buffer.trimEnd().endsWith(delimitador)) {
      const s = buffer.trimEnd().slice(0, -delimitador.length).trim();
      if (s) sentencias.push(s);
      buffer = '';
    }
  }
  if (buffer.trim()) sentencias.push(buffer.trim());
  return sentencias;
}

async function main() {
  const archivos = process.argv.slice(2);
  if (archivos.length === 0) {
    console.error('Uso: node scripts/aplicar_sql.js <archivo.sql> [archivo2.sql ...]');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    for (const rel of archivos) {
      const ruta = path.resolve(rel);
      const sql = fs.readFileSync(ruta, 'utf8');
      const sentencias = partirSentencias(sql);
      console.log(`\n${rel} — ${sentencias.length} sentencias`);
      for (const s of sentencias) {
        await conn.query(s);
      }
      console.log(`  OK`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Error al aplicar el SQL:', err.sqlMessage || err.message);
  process.exit(1);
});
