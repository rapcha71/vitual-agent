import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "No autenticado" });
  }

  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Acceso denegado. Se requieren privilegios de administrador." });
  }

  next();
}
