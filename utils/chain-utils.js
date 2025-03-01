// utils/chain-utils.js - Chain-related utility functions

/**
 * Convert network names to Moralis chain format
 * @param {string} network - Network name (e.g., 'ethereum', 'polygon')
 * @returns {string} - Chain format for Moralis API
 */
function getChainFormat(network) {
    const chainMap = {
      'ethereum': 'eth',
      'polygon': 'polygon',
      'bsc': 'bsc',
      'avalanche': 'avalanche',
      'optimism': 'optimism',
      'arbitrum': 'arbitrum',
      'base': 'base'
    };
    return chainMap[network] || network;
  }
  
  /**
   * Get chain ID for GoldRush/Covalent API
   * @param {string} network - Network name
   * @returns {string} - Chain ID for GoldRush/Covalent API
   */
  function getGoldRushChainId(network) {
    const chainIds = {
      'ethereum': 'eth-mainnet',
      'polygon': 'matic-mainnet',
      'bsc': 'bsc-mainnet',
      'avalanche': 'avalanche-mainnet',
      'optimism': 'optimism-mainnet',
      'arbitrum': 'arbitrum-mainnet',
      'base': 'base-mainnet'
    };
    return chainIds[network] || 'eth-mainnet';
  }
  
  /**
   * Get numeric chain ID
   * @param {string} network - Network name
   * @returns {number} - Numeric chain ID
   */
  function getNumericChainId(network) {
    const chainIds = {
      'ethereum': 1,
      'polygon': 137,
      'bsc': 56,
      'avalanche': 43114,
      'optimism': 10,
      'arbitrum': 42161,
      'base': 8453
    };
    return chainIds[network] || 1;
  }
  
  /**
   * Get native token address for price lookup
   * @param {string} network - Network name
   * @returns {string} - Address of wrapped native token for price lookup
   */
  function getNativeTokenAddress(network) {
    const addresses = {
      'ethereum': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
      'polygon': '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WMATIC
      'bsc': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // WBNB
      'optimism': '0x4200000000000000000000000000000000000006', // WETH on Optimism
      'arbitrum': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH on Arbitrum
      'base': '0x4200000000000000000000000000000000000006'  // WETH on Base
    };
    return addresses[network] || addresses['ethereum'];
  }
  
  /**
   * Get native token name
   * @param {string} network - Network name
   * @returns {string} - Native token name
   */
  function getNativeTokenName(network) {
    const names = {
      'ethereum': 'Ethereum',
      'polygon': 'Polygon',
      'bsc': 'BNB Chain',
      'avalanche': 'Avalanche',
      'optimism': 'Ethereum',
      'arbitrum': 'Ethereum',
      'base': 'Ethereum'
    };
    return names[network] || 'Unknown';
  }
  
  /**
   * Get native token symbol
   * @param {string} network - Network name
   * @returns {string} - Native token symbol
   */
  function getNativeTokenSymbol(network) {
    const symbols = {
      'ethereum': 'ETH',
      'polygon': 'MATIC',
      'bsc': 'BNB',
      'avalanche': 'AVAX',
      'optimism': 'ETH',
      'arbitrum': 'ETH',
      'base': 'ETH'
    };
    return symbols[network] || 'ETH';
  }
  
  /**
   * Get approximate native token USD price
   * This is a simplified approach - in production, use a price oracle
   * @param {string} chain - Chain in Moralis format
   * @returns {number} - Approximate USD price
   */
  function getApproximateNativeTokenPrice(chain) {
    const priceMap = {
      'eth': 2800,
      'matic': 0.27,
      'bsc': 595,
      'avax': 35,
      'arbitrum': 2800,
      'optimism': 2800,
      'base': 2800
    };
    return priceMap[chain.toLowerCase()] || 0;
  }
  
  module.exports = {
    getChainFormat,
    getGoldRushChainId,
    getNumericChainId,
    getNativeTokenAddress,
    getNativeTokenName,
    getNativeTokenSymbol,
    getApproximateNativeTokenPrice
  };