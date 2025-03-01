// services/fees.service.js - Fee analysis service
const axios = require('axios');
const { MORALIS_API_KEY } = require('../config/environment');
const { getChainFormat } = require('../utils/chain-utils');

/**
 * Get fee analysis for a wallet across multiple networks
 * @param {string} address - Wallet address
 * @param {Array<string>} networks - Array of network names
 * @returns {Promise<Object>} - Fee data object
 */
async function getFeeAnalysis(address, networks) {
  // Initialize fee data structure
  const feeData = {
    totalFees: 0,
    feesByNetwork: {},
    feesByType: {
      'Swaps': 0,
      'Bridges': 0,
      'Smart Contract Calls': 0,
      'Liquidity Provision': 0,
      'Withdrawals': 0
    }
  };
  
  // Initialize network fees
  for (const network of networks) {
    feeData.feesByNetwork[network] = 0;
  }
  
  // For each network, try to get a simplified fee analysis from transactions
  for (const network of networks) {
    try {
      // Convert network name to chain format for Moralis
      const chain = getChainFormat(network);
      
      console.log(`Calculating fees for ${network} with chain parameter: ${chain}`);
      
      const response = await axios.get(`https://deep-index.moralis.io/api/v2/${address}`, {
        params: { 
          chain,
          limit: 20
        },
        headers: { 'X-API-Key': MORALIS_API_KEY }
      });
      
      if (response.data && response.data.result) {
        // Simple fee estimation from transactions
        let networkFees = 0;
        
        response.data.result.forEach(tx => {
          if (tx.gas_price && tx.receipt_gas_used) {
            const fee = (parseInt(tx.gas_price) * parseInt(tx.receipt_gas_used)) / 1e18;
            
            // Approximate USD values based on network
            const priceMap = {
              'eth': 2800,
              'matic': 0.27,
              'bsc': 595,
              'arbitrum': 2800,
              'optimism': 2800,
              'base': 2800
            };
            const tokenPrice = priceMap[chain.toLowerCase()] || 0;
            
            const feeUsd = fee * tokenPrice;
            
            networkFees += feeUsd;
            feeData.totalFees += feeUsd;
            
            // All fees categorized as "Smart Contract Calls" for simplicity
            feeData.feesByType['Smart Contract Calls'] += feeUsd;
          }
        });
        
        feeData.feesByNetwork[network] = networkFees;
      }
    } catch (error) {
      console.error(`Error analyzing ${network} fees:`, error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      }
    }
  }
  
  return feeData;
}

/**
 * Get default fee data when fee analysis fails
 * @returns {Object} - Default fee data object
 */
function getDefaultFeeData() {
  return {
    totalFees: 25.75,
    feesByNetwork: {
      'ethereum': 15.23,
      'polygon': 5.82,
      'bsc': 2.15,
      'optimism': 1.45,
      'arbitrum': 1.10
    },
    feesByType: {
      'Swaps': 5.15,
      'Bridges': 0,
      'Smart Contract Calls': 20.60,
      'Liquidity Provision': 0,
      'Withdrawals': 0
    }
  };
}

/**
 * Calculate total fees from fee data
 * @param {Object} feeData - Fee data object
 * @returns {number} - Total fees in USD
 */
function calculateTotalFees(feeData) {
  return feeData.totalFees;
}

/**
 * Format fees by network for chart data
 * @param {Object} feeData - Fee data object
 * @returns {Array} - Array of network fee objects
 */
function formatFeesByNetwork(feeData) {
  return Object.entries(feeData.feesByNetwork).map(([network, fee]) => ({
    network,
    fee,
    percentage: (fee / feeData.totalFees) * 100
  }));
}

/**
 * Format fees by type for chart data
 * @param {Object} feeData - Fee data object
 * @returns {Array} - Array of fee type objects
 */
function formatFeesByType(feeData) {
  return Object.entries(feeData.feesByType).map(([type, fee]) => ({
    type,
    fee,
    percentage: (fee / feeData.totalFees) * 100
  }));
}

/**
 * Get daily fees data for the last 7 days
 * @returns {Array} - Array of daily fee objects
 */
function getDailyFeesData() {
  const today = new Date();
  const data = [];
  
  // Generate last 7 days of fees data
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: formatDate(date),
      value: +(Math.random() * 0.4 + 0.1).toFixed(2) // Random value between 0.1-0.5
    });
  }
  
  return data;
}

/**
 * Format date as MMM DD (e.g., Feb 21)
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

module.exports = {
  getFeeAnalysis,
  getDefaultFeeData,
  calculateTotalFees,
  formatFeesByNetwork,
  formatFeesByType,
  getDailyFeesData
};
