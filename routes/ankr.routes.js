// routes/ankr.routes.js - Ankr Advanced API routes
const express = require('express');
const router = express.Router();
const ankrController = require('../controllers/ankr.controller');

/**
 * @route   GET /api/ankr/balances
 * @desc    Get wallet balances using Ankr's Advanced Multi-chain API
 * @param   {string} address - Wallet address (EVM: 0x format, non-EVM: chain-specific format)
 * @param   {string} networks - Comma-separated list of networks (optional, default: ethereum)
 *                             EVM networks: ethereum, polygon, bsc, avalanche, optimism, arbitrum, etc.
 *                             Non-EVM networks: solana, near, polkadot, bitcoin, etc.
 * @returns {Object} Token balances across all specified networks
 * 
 * @example GET /api/ankr/balances?address=0x123...&networks=ethereum,polygon,solana
 * 
 * @note    Ankr's Advanced API provides a single entry point for accessing data across 
 *          70+ blockchains including both EVM and non-EVM networks. The API can fetch 
 *          balances for multiple chains in a single request, greatly improving efficiency.
 */
router.get('/balances', ankrController.getBalances);

module.exports = router; 