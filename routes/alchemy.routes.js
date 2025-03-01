// routes/alchemy.routes.js - Alchemy API routes
const express = require('express');
const router = express.Router();
const alchemyController = require('../controllers/alchemy.controller');

/**
 * @route   GET /api/alchemy/balances
 * @desc    Get balances from Alchemy
 * @param   {string} address - Wallet address
 * @param   {string} networks - Comma-separated list of networks
 * @returns {Object} Token balances
 */
router.get('/balances', alchemyController.getBalances);

module.exports = router; 