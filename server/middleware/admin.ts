import { Request, Response, NextFunction } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  console.log("Admin middleware - Session ID:", req.sessionID);
  console.log("Admin middleware - Is authenticated:", req.isAuthenticated());
  console.log("Admin middleware - User:", req.user ? req.user.id : 'No user');
  console.log("Admin middleware - Is admin:", req.user?.isAdmin);
  console.log("Admin middleware - Is super admin:", req.user?.isSuperAdmin);

  if (!req.isAuthenticated()) {
    console.log("Admin middleware: Authentication failed");
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!req.user?.isAdmin && !req.user?.isSuperAdmin) {
    console.log("Admin middleware: Admin access denied");
    return res.status(403).json({ message: "Admin access required" });
  }

  console.log("Admin middleware: Access granted");
  next();
};