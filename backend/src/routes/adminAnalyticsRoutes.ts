import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as adminAnalyticsController from '../controllers/adminAnalyticsController';

const router = express.Router();

// All admin analytics routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// ============================================
// ANALYTICS
// ============================================
router.get('/sales', adminAnalyticsController.getSales);
router.get('/user-behavior', adminAnalyticsController.getUserBehavior);
router.get('/inventory', adminAnalyticsController.getInventory);
router.post('/generate', adminAnalyticsController.generateAnalytics);
router.get('/revenue', adminAnalyticsController.getRevenueOverview);
router.get('/top-products', adminAnalyticsController.getTopProducts);
router.get('/top-customers', adminAnalyticsController.getTopCustomers);

// ============================================
// REPORTS
// ============================================
router.post('/reports', adminAnalyticsController.createReport);
router.get('/reports', adminAnalyticsController.getReports);
router.put('/reports/:reportId', adminAnalyticsController.updateReport);
router.delete('/reports/:reportId', adminAnalyticsController.deleteReport);

export default router;
