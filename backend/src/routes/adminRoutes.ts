import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as adminController from '../controllers/adminController';

const router = express.Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// ============================================
// USER MANAGEMENT
// ============================================
router.get('/users', adminController.getAllUsers);
router.get('/users/stats', adminController.getUserStats);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);

// ============================================
// SYSTEM SETTINGS
// ============================================
router.get('/settings', adminController.getSystemSettings);
router.get('/settings/:key', adminController.getSystemSettingByKey);
router.put('/settings/:key', adminController.updateSystemSetting);
router.delete('/settings/:key', adminController.deleteSystemSetting);

// ============================================
// ADMIN LOGS
// ============================================
router.get('/logs', adminController.getAdminLogs);

// ============================================
// DASHBOARD
// ============================================
router.get('/dashboard', adminController.getDashboardOverview);

export default router;
