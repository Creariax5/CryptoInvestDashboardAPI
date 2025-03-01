// routes/dashboard.routes.js - Dashboard API routes
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

/**
 * @route   GET /api/dashboard
 * @desc    Get comprehensive wallet dashboard data
 */
router.get('/', dashboardController.getDashboardData);

/**
 * @route   GET /api/dashboard/wallet
 * @desc    Get wallet dashboard specific data
 */
router.get('/wallet', dashboardController.getDashboardData);

module.exports = router;
