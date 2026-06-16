import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Checks if the authenticated user has one of the allowed roles.
 * Must be used AFTER the authenticateToken middleware in the chain.
 * 
 * Usage:
 *   router.get('/admin-only', authenticateToken, authorizeRoles('ADMIN'), handler);
 *   router.get('/multi-role', authenticateToken, authorizeRoles('ADMIN', 'MANAGER'), handler);
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role?.toUpperCase() || 'USER';

    if (!allowedRoles.map(r => r.toUpperCase()).includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden: insufficient permissions',
        requiredRoles: allowedRoles,
        yourRole: userRole,
      });
    }

    next();
  };
};
