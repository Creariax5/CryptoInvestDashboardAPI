// routes/goldrush.routes.js - GoldRush (Covalent) API routes
const express = require('express');
const router = express.Router();

// TODO: Implement real controller functions
const goldrushController = {
  getBalances: (req, res) => {
    // Placeholder until real implementation
    res.status(200).json({ message: 'GoldRush balances route (placeholder)' });
  },
  
  getProtocols: (req, res) => {
    // Placeholder until real implementation
    res.status(200).json({ message: 'GoldRush protocols route (placeholder)' });
  }
};

/**
 * @route   GET /api/goldrush/balances
 * @desc    Get balances from GoldRush
 */
router.get('/balances', goldrushController.getBalances);

/**
 * @route   GET /api/goldrush/protocols
 * @desc    Get protocol data from GoldRush
 */
router.get('/protocols', goldrushController.getProtocols);

module.exports = router;