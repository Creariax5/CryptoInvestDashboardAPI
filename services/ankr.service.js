// services/ankr.service.js - Ankr Advanced API service
const axios = require('axios');
require('dotenv').config();

/**
 * Ankr Advanced Multi-chain API
 * 
 * Features:
 * - Single entry point for all supported blockchains
 * - Query archive data at near-instant speeds
 * - Interact with multiple chains in a single request
 * - Support for JavaScript SDK, Python SDK, and React hooks
 *
 * Documentation: https://www.ankr.com/docs/advanced-api/
 * 
 * Available SDKs:
 * - JavaScript: npm install @ankr.com/ankr.js
 * - Python: pip install ankr-sdk
 * - React: npm install @ankr.com/react-hooks
 */

// Ankr API base URL - single entry point for all chains
const ANKR_API_URL = 'https://rpc.ankr.com/multichain';
const ANKR_API_KEY = process.env.ANKR_API_KEY || 'demo-api-key';

/**
 * Get token balances for a wallet address using Ankr Advanced API
 * @param {string} address - Wallet address
 * @param {string[]} networks - Array of network names
 * @returns {Promise<Array>} Token balances
 */
async function getWalletBalances(address, networks = ['ethereum']) {
    try {
        // Map network names to Ankr blockchain identifiers
        const blockchains = networks.map(network => getAnkrBlockchain(network)).filter(bc => bc !== null);
        
        if (blockchains.length === 0) {
            throw new Error('No valid networks provided');
        }
        
        // Using the ankr_getAccountBalance RPC method
        // This is a powerful method that fetches balances across multiple chains in a single request
        const payload = {
            jsonrpc: '2.0',
            method: 'ankr_getAccountBalance',
            params: {
                blockchain: blockchains.length > 1 ? blockchains : blockchains[0], // Can be a single chain or array
                walletAddress: address,
                onlyWhitelisted: false, // Include all tokens, not just whitelisted ones
                nativeFirst: true // List native tokens first in the response
            },
            id: Date.now()
        };
        
        // Make the API request to the multi-chain endpoint
        const response = await axios.post(ANKR_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ANKR_API_KEY}`
            },
            timeout: 10000 // 10 second timeout
        });
        
        // Validate the response structure
        if (!response.data) {
            console.error('Ankr API Error: Empty response data');
            return [];
        }
        
        if (response.data.error) {
            console.error('Ankr API Error:', response.data.error);
            return [];
        }
        
        if (!response.data.result) {
            console.error('Ankr API Error: Missing result in response', response.data);
            return [];
        }
        
        if (!response.data.result.assets) {
            console.error('Ankr API Error: Missing assets in result', response.data.result);
            return [];
        }
        
        // Format the response
        return response.data.result.assets.map(asset => {
            // Check for missing fields and log them
            const missingFields = [];
            
            if (!asset.blockchain) missingFields.push('blockchain');
            if (!asset.tokenName) missingFields.push('tokenName');
            if (!asset.tokenSymbol) missingFields.push('tokenSymbol');
            if (asset.tokenDecimals === undefined) missingFields.push('tokenDecimals');
            if (!asset.balance) missingFields.push('balance');
            
            if (missingFields.length > 0) {
                console.error(`Ankr API: Missing fields in asset data: ${missingFields.join(', ')}`, asset);
            }
            
            const network = getNetworkFromAnkrBlockchain(asset.blockchain || 'unknown');
            
            return {
                name: asset.tokenName || 'Unknown Token',
                symbol: asset.tokenSymbol || '???',
                address: asset.tokenAddress || '',
                decimals: asset.tokenDecimals || 18, // Default to 18 if missing
                balance: parseFloat(asset.balance || '0'),
                price: asset.tokenPrice || 0,
                value: asset.balanceUsd || 0,
                priceChange24h: 0, // Ankr doesn't provide price change data
                network: network,
                type: asset.tokenType === 'NATIVE' ? 'native' : 'cryptocurrency',
                icon: getTokenIcon(asset.tokenSymbol, asset.tokenAddress, network)
            };
        }).filter(token => token.balance > 0); // Filter out zero balances
    } catch (error) {
        console.error('Error in getWalletBalances:', error);
        throw error;
    }
}

/**
 * Map network name to Ankr blockchain identifier
 * @param {string} network - Network name
 * @returns {string|null} Ankr blockchain identifier or null if not supported
 */
function getAnkrBlockchain(network) {
    // Ankr supports over 70 blockchains with a single endpoint
    const networkMap = {
        // EVM chains
        'ethereum': 'eth',
        'polygon': 'polygon',
        'bsc': 'bsc',
        'avalanche': 'avalanche',
        'optimism': 'optimism',
        'arbitrum': 'arbitrum',
        'fantom': 'fantom',
        'gnosis': 'gnosis',
        'base': 'base',
        'aurora': 'aurora',
        'celo': 'celo',
        'cronos': 'cronos',
        'harmony': 'harmony',
        'metis': 'metis',
        'moonbeam': 'moonbeam',
        'moonriver': 'moonriver',
        'zksync': 'zksync',
        'linea': 'linea',
        'scroll': 'scroll',
        'mantle': 'mantle',
        
        // Non-EVM chains
        'solana': 'solana',
        'near': 'near',
        'polkadot': 'polkadot',
        'kusama': 'kusama',
        'bitcoin': 'bitcoin',
        'filecoin': 'filecoin',
        'cosmos': 'cosmos',
        'osmosis': 'osmosis'
    };
    
    return networkMap[network.toLowerCase()] || null;
}

/**
 * Map Ankr blockchain identifier to network name
 * @param {string} blockchain - Ankr blockchain identifier
 * @returns {string} Network name
 */
function getNetworkFromAnkrBlockchain(blockchain) {
    const blockchainMap = {
        // EVM chains
        'eth': 'Ethereum',
        'polygon': 'Polygon',
        'bsc': 'BSC',
        'avalanche': 'Avalanche',
        'optimism': 'Optimism',
        'arbitrum': 'Arbitrum',
        'fantom': 'Fantom',
        'gnosis': 'Gnosis',
        'base': 'Base',
        'aurora': 'Aurora',
        'celo': 'Celo',
        'cronos': 'Cronos',
        'harmony': 'Harmony',
        'metis': 'Metis',
        'moonbeam': 'Moonbeam',
        'moonriver': 'Moonriver',
        'zksync': 'zkSync',
        'linea': 'Linea',
        'scroll': 'Scroll',
        'mantle': 'Mantle',
        
        // Non-EVM chains
        'solana': 'Solana',
        'near': 'NEAR',
        'polkadot': 'Polkadot',
        'kusama': 'Kusama',
        'bitcoin': 'Bitcoin',
        'filecoin': 'Filecoin',
        'cosmos': 'Cosmos',
        'osmosis': 'Osmosis'
    };
    
    return blockchainMap[blockchain] || 'Unknown';
}

/**
 * Get token icon URL
 * @param {string} symbol - Token symbol
 * @param {string} address - Token contract address
 * @param {string} network - Network name
 * @returns {string} Icon URL
 */
function getTokenIcon(symbol, address, network) {
    if (!address) {
        // For native tokens, use a different approach
        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${network.toLowerCase()}/info/logo.png`;
    }
    
    // Use TrustWallet assets repository for icons
    const chain = network.toLowerCase();
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${address}/logo.png`;
}

// The following methods could be implemented for extended functionality:
// - ankr_getTokenAllowance - Get token allowance
// - ankr_getTokenHolders - Get token holders
// - ankr_getTransactionsByAddress - Get transactions by address
// - ankr_getNFTsByAddress - Get NFTs by address
// - ankr_getCurrencies - Get supported currencies
// - ankr_getBlockchainStats - Get blockchain statistics

module.exports = {
    getWalletBalances
}; 