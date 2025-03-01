// routes/thegraph.routes.js - The Graph API routes
const express = require('express');
const router = express.Router();
const thegraphController = require('../controllers/thegraph.controller');

/**
 * @route   GET /api/thegraph/balances
 * @desc    Get balances from The Graph
 * @param   {string} address - Wallet address
 * @param   {string} networks - Comma-separated list of networks
 * @returns {Object} Token balances
 */
router.get('/balances', thegraphController.getBalances);

module.exports = router; 