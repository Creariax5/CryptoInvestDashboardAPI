// utils/validation-utils.js - Input validation utilities
const ApiError = require('./api-error');

/**
 * Validate Ethereum address
 * @param {string} address - Ethereum address to validate
 * @returns {Object} - Validation result
 */
function validateAddress(address) {
  // Basic Ethereum address validation (0x followed by 40 hex characters)
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  
  if (!address) {
    throw new ApiError('Wallet address is required', 400);
  }
  
  if (!addressRegex.test(address)) {
    throw new ApiError(
      'Invalid Ethereum address format. Address must start with "0x" followed by 40 hexadecimal characters.',
      400
    );
  }
  
  return { valid: true, address };
}

/**
 * Validate blockchain network/chain parameter
 * @param {string} chain - Chain parameter
 * @returns {Object} - Validation result
 */
function validateChain(chain) {
  const supportedChains = [
    'eth', 'ethereum', 'polygon', 'bsc', 'avalanche', 'fantom', 'cronos',
    'arbitrum', 'optimism', 'base', 'zkevm', 'linea'
  ];
  
  if (!chain) {
    throw new ApiError('Chain parameter is required', 400);
  }
  
  const normalizedChain = chain.toLowerCase();
  
  if (!supportedChains.includes(normalizedChain)) {
    throw new ApiError(
      `Unsupported chain: ${chain}. Supported chains are: ${supportedChains.join(', ')}`,
      400
    );
  }
  
  return { valid: true, chain: normalizedChain };
}

/**
 * Calculate USD value from token data
 * @param {string} balance - Token balance
 * @param {number} decimals - Token decimals
 * @param {number} usdPrice - Token USD price
 * @returns {number} - USD value
 */
function calculateUsdValue(balance, decimals, usdPrice) {
  return (parseFloat(balance) / Math.pow(10, parseInt(decimals))) * parseFloat(usdPrice);
}

/**
 * Get date X months ago in ISO format
 * @param {number} months - Number of months ago
 * @returns {string} - ISO date string
 */
function getDateMonthsAgo(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
}

module.exports = {
  validateAddress,
  validateChain,
  calculateUsdValue,
  getDateMonthsAgo
};