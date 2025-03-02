// controllers/dashboard.controller.js - Dashboard controller
const ApiError = require('../utils/api-error');
const { validateAddress } = require('../utils/validation-utils');
const moralisService = require('../services/moralis.service');
const portfolioService = require('../services/portfolio.service');
const feesService = require('../services/fees.service');
const goldrushService = require('../services/goldrush.service');

/**
 * Get comprehensive wallet dashboard data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getDashboardData(req, res, next) {
  try {
    const { address, networks = 'ethereum,polygon,bsc,optimism,arbitrum', provider = 'moralis' } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Validate address
    validateAddress(address);
    
    const networkArray = networks.split(',');
    
    // Get data from different services in parallel
    try {
      // Determine which service to use for wallet balances
      let walletBalancesPromise;
      
      if (provider.toLowerCase() === 'goldrush') {
        walletBalancesPromise = goldrushService.getTokenBalances(address, networkArray);
      } else {
        // Default to Moralis
        walletBalancesPromise = moralisService.getWalletBalances(address, networkArray);
      }
      
      const [walletBalances, defiPositions, transactions, feeData] = await Promise.all([
        walletBalancesPromise.catch(error => {
          console.warn(`Continuing with empty wallet balances from ${provider} due to error:`, error.message);
          return [];
        }),
        
        portfolioService.getDefiPositions(address, networkArray).catch(error => {
          console.warn("Continuing with empty DeFi positions due to error:", error.message);
          return [];
        }),
        
        moralisService.getTransactionHistory(address, networkArray).catch(error => {
          console.warn("Continuing with empty transaction history due to error:", error.message);
          return [];
        }),
        
        feesService.getFeeAnalysis(address, networkArray).catch(error => {
          console.warn("Continuing with default fee data due to error:", error.message);
          return feesService.getDefaultFeeData();
        }),
      ]);
      
      // Calculate totals
      const totalBalance = portfolioService.calculateTotalBalance(walletBalances);
      const totalDefiValue = portfolioService.calculateTotalDefiValue(defiPositions);
      const cryptoAssetsValue = totalBalance - totalDefiValue;
      const totalFeesPaid = feesService.calculateTotalFees(feeData);
      
      // Get NFT count (if possible)
      let nftCount = 0;
      try {
        nftCount = await moralisService.getNftCount(address, networkArray[0]);
      } catch (error) {
        console.warn("Error getting NFT count:", error.message);
      }
      
      // Create portfolio history for chart
      const portfolioHistory = await portfolioService.getPortfolioHistory(address, networkArray)
        .catch(error => {
          console.warn("Using mock portfolio history due to error:", error.message);
          return portfolioService.getMockPortfolioHistory();
        });
      
      // Generate daily fees data for the fees chart
      const feesChartData = feesService.getDailyFeesData();
      
      // Format response
      const response = {
        overview: {
          totalBalance,
          defiPositions: totalDefiValue,
          cryptoAssets: cryptoAssetsValue,
          totalFeesPaid,
          nftCount,
          // Add change percentages for overview cards
          dailyChange: {
            totalBalance: generateRandomPercentage(),
            defiPositions: generateRandomPercentage(),
            cryptoAssets: generateRandomPercentage(),
            totalFeesPaid: generateRandomPercentage(),
          },
          dataProvider: provider.toLowerCase() // Include the data provider in the response
        },
        walletBalances: sortByUsdValue(walletBalances),
        defiPositions,
        transactions,
        feeData,
        charts: {
          portfolioHistory,
          feesByNetwork: feesService.formatFeesByNetwork(feeData),
          feesByType: feesService.formatFeesByType(feeData),
          dailyFees: feesChartData,
        },
        // Add network information
        networks: networkArray.map(network => ({
          name: network,
          chainId: getNetworkChainId(network),
          icon: getNetworkIcon(network),
          nativeToken: getNativeTokenForNetwork(network),
        }))
      };
      
      return res.status(200).json(response);
    } catch (error) {
      throw ApiError.fromError(error, "processing wallet data", { address, networks });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Generate a random percentage change for demonstration
 * @returns {number} - Random percentage between -5 and +5
 */
function generateRandomPercentage() {
  // Return a value between -5 and +5
  return (Math.random() * 10 - 5).toFixed(2);
}

/**
 * Sort tokens by USD value in descending order
 * @param {Array} tokens - Array of token objects
 * @returns {Array} - Sorted array
 */
function sortByUsdValue(tokens) {
  return [...tokens].sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));
}

/**
 * Get chain ID for a network
 * @param {string} network - Network name
 * @returns {string} - Chain ID
 */
function getNetworkChainId(network) {
  const chainIds = {
    'ethereum': '1',
    'polygon': '137',
    'bsc': '56',
    'optimism': '10', 
    'arbitrum': '42161',
    'base': '8453'
  };
  return chainIds[network.toLowerCase()] || '';
}

/**
 * Get icon class for a network
 * @param {string} network - Network name
 * @returns {string} - Icon class
 */
function getNetworkIcon(network) {
  const icons = {
    'ethereum': 'fab fa-ethereum',
    'polygon': 'fas fa-hexagon',
    'bsc': 'fas fa-chess-rook',
    'optimism': 'fas fa-bolt',
    'arbitrum': 'fas fa-ring',
    'base': 'fas fa-square'
  };
  return icons[network.toLowerCase()] || 'fas fa-network-wired';
}

/**
 * Get native token for a network
 * @param {string} network - Network name
 * @returns {string} - Native token symbol
 */
function getNativeTokenForNetwork(network) {
  const tokens = {
    'ethereum': 'ETH',
    'polygon': 'MATIC',
    'bsc': 'BNB',
    'optimism': 'ETH', 
    'arbitrum': 'ETH',
    'base': 'ETH'
  };
  return tokens[network.toLowerCase()] || 'ETH';
}

module.exports = {
  getDashboardData
};