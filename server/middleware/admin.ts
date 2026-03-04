import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  logger.debug("Admin middleware - isAuth:", req.isAuthenticated(), "isAdmin:", req.user?.isAdmin);

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!req.user?.isAdmin && !req.user?.isSuperAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};