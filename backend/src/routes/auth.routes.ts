import { Router } from 'express';
import { register, login, getMe, getAllUsers, updateUserRole, deleteUser } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);

// Admin-only user management routes
router.get('/users', authenticateToken, authorizeRoles('ADMIN'), getAllUsers);
router.put('/users/:id/role', authenticateToken, authorizeRoles('ADMIN'), updateUserRole);
router.delete('/users/:id', authenticateToken, authorizeRoles('ADMIN'), deleteUser);

export default router;

