// config/environment.js - Environment variables configuration
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3002',
  SESSION_SECRET: process.env.SESSION_SECRET || 'wallet-dashboard-secret',
  MORALIS_API_KEY: process.env.MORALIS_API_KEY,
  GOLDRUSH_API_KEY: process.env.GOLDRUSH_API_KEY,
  COINBASE_CLIENT_ID: process.env.COINBASE_CLIENT_ID,
  COINBASE_CLIENT_SECRET: process.env.COINBASE_CLIENT_SECRET
};