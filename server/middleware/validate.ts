import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Middleware que valida req.body con un schema Zod.
 * Si falla, responde 400 con los errores de validación.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body) as T;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
        return res.status(400).json({
          message: "Datos inválidos",
          errors: messages,
        });
      }
      next(error);
    }
  };
}

/**
 * Valida req.query con un schema Zod.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as T;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
        return res.status(400).json({ message: "Parámetros inválidos", errors: messages });
      }
      next(error);
    }
  };
}
