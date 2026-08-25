import { AppError } from '../utils/AppError.js';

export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const mensaje = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(' | ');
    return next(new AppError(400, mensaje));
  }
  req[source] = result.data;
  next();
};
