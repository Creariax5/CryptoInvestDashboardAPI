// routes/goldrush.routes.js - GoldRush (Covalent) API routes
const express = require('express');
const router = express.Router();
const goldrushController = require('../controllers/goldrush.controller');

/**
 * @route   GET /api/goldrush/balances
 * @desc    Get balances from GoldRush
 * @param   {string} address - Wallet address
 * @param   {string} networks - Comma-separated list of networks
 * @returns {Object} Token balances
 */
router.get('/balances', goldrushController.getBalances);

/**
 * @route   GET /api/goldrush/protocols
 * @desc    Get protocol data from GoldRush
 * @param   {string} address - Wallet address
 * @param   {string} networks - Comma-separated list of networks
 * @returns {Object} Protocol data
 */
router.get('/protocols', goldrushController.getProtocols);

module.exports = router;