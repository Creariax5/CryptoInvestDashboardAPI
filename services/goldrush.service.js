// services/goldrush.service.js - GoldRush (Covalent) API service
const axios = require('axios');
require('dotenv').config();

// GoldRush API base URL
const GOLDRUSH_API_URL = 'https://api.covalenthq.com/v1';
const GOLDRUSH_API_KEY = process.env.COVALENT_API_KEY || 'demo-api-key';

/**
 * Get token balances for a wallet address using GoldRush (Covalent) API
 * @param {string} address - Wallet address
 * @param {string[]} networks - Array of network names
 * @returns {Promise<Array>} Token balances
 */
async function getTokenBalances(address, networks = ['ethereum']) {
    try {
        // Map network names to chain IDs
        const chainIds = networks.map(network => getChainId(network)).filter(id => id !== null);
        
        if (chainIds.length === 0) {
            throw new Error('No valid networks provided');
        }
        
        // Fetch balances for each chain in parallel
        const balancePromises = chainIds.map(async (chainId) => {
            try {
                const url = `${GOLDRUSH_API_URL}/${chainId}/address/${address}/balances_v2/`;
                const response = await axios.get(url, {
                    params: {
                        key: GOLDRUSH_API_KEY,
                        nft: false,
                        "no-nft-fetch": true
                    },
                    timeout: 10000 // 10 second timeout
                });
                
                // Validate the response structure
                if (!response.data) {
                    console.error(`GoldRush API Error (chain ${chainId}): Empty response data`);
                    return [];
                }
                
                if (response.data.error) {
                    console.error(`GoldRush API Error (chain ${chainId}):`, response.data.error);
                    return [];
                }
                
                if (!response.data.data) {
                    console.error(`GoldRush API Error (chain ${chainId}): Missing data in response`, response.data);
                    return [];
                }
                
                if (!response.data.data.items) {
                    console.error(`GoldRush API Error (chain ${chainId}): Missing items in data`, response.data.data);
                    return [];
                }
                
                // Format the response
                return response.data.data.items.map(item => {
                    // Check for missing fields and log them
                    const missingFields = [];
                    
                    if (!item.contract_name) missingFields.push('contract_name');
                    if (!item.contract_ticker_symbol) missingFields.push('contract_ticker_symbol');
                    if (!item.contract_address) missingFields.push('contract_address');
                    if (item.contract_decimals === undefined) missingFields.push('contract_decimals');
                    if (item.balance === undefined) missingFields.push('balance');
                    if (item.quote === undefined) missingFields.push('quote');
                    
                    if (missingFields.length > 0) {
                        console.error(`GoldRush API Error (chain ${chainId}): Missing fields in token data: ${missingFields.join(', ')}`, item);
                    }
                    
                    const network = getNetworkFromChainId(chainId);
                    return {
                        name: item.contract_name || 'Unknown Token',
                        symbol: item.contract_ticker_symbol || '???',
                        address: item.contract_address,
                        decimals: item.contract_decimals || 18, // Default to 18 if missing
                        balance: parseFloat(item.balance || '0') / Math.pow(10, item.contract_decimals || 18),
                        price: item.quote_rate || 0,
                        value: item.quote || 0,
                        priceChange24h: item.quote_rate_24h ? (item.quote_rate_24h - item.quote_rate) / item.quote_rate * 100 : 0,
                        network: network,
                        type: item.native_token ? 'native' : 'cryptocurrency',
                        icon: getTokenIcon(item.contract_ticker_symbol, item.contract_address, network)
                    };
                }).filter(token => token.balance > 0); // Filter out zero balances
            } catch (error) {
                console.error(`Error fetching balances for chain ${chainId}:`, error);
                return []; // Return empty array for this chain
            }
        });
        
        // Wait for all requests to complete
        const results = await Promise.all(balancePromises);
        
        // Combine and sort results
        const allTokens = results.flat().sort((a, b) => b.value - a.value);
        
        return allTokens;
    } catch (error) {
        console.error('Error in getTokenBalances:', error);
        throw error;
    }
}

/**
 * Map network name to Covalent chain ID
 * @param {string} network - Network name
 * @returns {number|null} Chain ID or null if not supported
 */
function getChainId(network) {
    const networkMap = {
        'ethereum': 1,
        'polygon': 137,
        'bsc': 56,
        'avalanche': 43114,
        'optimism': 10,
        'arbitrum': 42161,
        'fantom': 250,
        'gnosis': 100,
        'base': 8453
    };
    
    return networkMap[network.toLowerCase()] || null;
}

/**
 * Map chain ID to network name
 * @param {number} chainId - Chain ID
 * @returns {string} Network name
 */
function getNetworkFromChainId(chainId) {
    const chainMap = {
        1: 'Ethereum',
        137: 'Polygon',
        56: 'BSC',
        43114: 'Avalanche',
        10: 'Optimism',
        42161: 'Arbitrum',
        250: 'Fantom',
        100: 'Gnosis',
        8453: 'Base'
    };
    
    return chainMap[chainId] || 'Unknown';
}

/**
 * Get token icon URL
 * @param {string} symbol - Token symbol
 * @param {string} address - Token contract address
 * @param {string} network - Network name
 * @returns {string} Icon URL
 */
function getTokenIcon(symbol, address, network) {
    // Use TrustWallet assets repository for icons
    // For well-known tokens, this will work well
    const chain = network.toLowerCase();
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${address}/logo.png`;
}

module.exports = {
    getTokenBalances
};
