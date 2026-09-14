export class AppError extends Error {
  // `code` es un identificador estable y opcional (p. ej. 'META_ALCANZADA')
  // para que el frontend pueda reaccionar a un error puntual sin parsear el
  // mensaje. Si no se especifica, el contrato de respuesta no cambia.
  constructor(status, message, code = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
