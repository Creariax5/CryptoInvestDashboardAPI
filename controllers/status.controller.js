// controllers/status.controller.js - API status controller
const axios = require('axios');
const { 
  MORALIS_API_KEY, 
  GOLDRUSH_API_KEY, 
  COINBASE_CLIENT_ID,
  COINBASE_CLIENT_SECRET
} = require('../config/environment');

/**
 * Get API status and health check
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getApiStatus(req, res) {
  const apiVersion = '1.0.0';
  const startTime = new Date();
  
  const status = {
    api: {
      version: apiVersion,
      timestamp: startTime.toISOString(),
      uptime: process.uptime()
    },
    dependencies: {
      moralis: { status: 'unknown' },
      goldRush: { status: 'unknown' },
      coinbase: { status: 'unknown' }
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  };
  
  // Check Moralis API key
  if (MORALIS_API_KEY) {
    status.dependencies.moralis = {
      status: 'configured',
      message: 'Moralis API key is set'
    };
  } else {
    status.dependencies.moralis = {
      status: 'not configured',
      message: 'MORALIS_API_KEY not set in environment variables'
    };
  }
  
  // Check GoldRush API key
  if (GOLDRUSH_API_KEY) {
    status.dependencies.goldRush = {
      status: 'configured',
      message: 'GoldRush API key is set'
    };
  } else {
    status.dependencies.goldRush = {
      status: 'not configured',
      message: 'GOLDRUSH_API_KEY not set in environment variables'
    };
  }
  
  // Check Coinbase configuration
  if (COINBASE_CLIENT_ID && COINBASE_CLIENT_SECRET) {
    status.dependencies.coinbase = {
      status: 'configured',
      message: 'Coinbase OAuth credentials are set'
    };
  } else {
    status.dependencies.coinbase = {
      status: 'not configured',
      message: 'Coinbase OAuth credentials are not set in environment variables'
    };
  }
  
  res.status(200).json(status);
}

module.exports = {
  getApiStatus
};