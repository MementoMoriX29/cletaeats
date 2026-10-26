const express       = require('express');
const reportService = require('../services/reportService');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

const adminOnly = [verifyToken, requireRole('admin')];
const wrap = (fn) => async (_req, res, next) => {
  try { res.json(await fn()); } catch (err) { next(err); }
};

router.get('/clients/active',       ...adminOnly, wrap(reportService.getActiveClients));
router.get('/clients/suspended',    ...adminOnly, wrap(reportService.getSuspendedClients));
router.get('/clients/most-orders',  ...adminOnly, wrap(reportService.getClientsMostOrders));

router.get('/restaurants',                     ...adminOnly, wrap(reportService.listRestaurants));
router.get('/restaurants/most-orders',         ...adminOnly, wrap(reportService.getRestaurantMostOrders));
router.get('/restaurants/least-orders',        ...adminOnly, wrap(reportService.getRestaurantLeastOrders));
router.get('/restaurants/sales-by-restaurant', ...adminOnly, wrap(reportService.getSalesByRestaurant));
router.get('/restaurants/total-sales',         ...adminOnly, wrap(reportService.getTotalSales));

router.get('/delivery-persons/no-warnings', ...adminOnly, wrap(reportService.getDeliveryPersonsNoWarnings));
router.get('/delivery-persons/complaints',  ...adminOnly, wrap(reportService.getDeliveryPersonsComplaints));

router.get('/orders/by-client',  ...adminOnly, wrap(reportService.getOrdersByClient));
router.get('/orders/peak-hours', ...adminOnly, wrap(reportService.getPeakHours));

module.exports = router;
