// services/alchemy.service.js - Alchemy API service
const axios = require('axios');
require('dotenv').config();

// Alchemy API base URLs for different networks
const ALCHEMY_API_URLS = {
    ethereum: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_ETH || 'demo-api-key'}`,
    polygon: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_POLYGON || 'demo-api-key'}`,
    optimism: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_OPTIMISM || 'demo-api-key'}`,
    arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_ARBITRUM || 'demo-api-key'}`,
    base: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_BASE || 'demo-api-key'}`
};

/**
 * Get token balances for a wallet address using Alchemy API
 * @param {string} address - Wallet address
 * @param {string[]} networks - Array of network names
 * @returns {Promise<Array>} Token balances
 */
async function getTokenBalances(address, networks = ['ethereum']) {
    try {
        // Filter networks to only those supported by Alchemy
        const supportedNetworks = networks.filter(network => ALCHEMY_API_URLS[network.toLowerCase()]);
        
        if (supportedNetworks.length === 0) {
            throw new Error('No supported networks provided for Alchemy');
        }
        
        // Fetch balances for each network in parallel
        const balancePromises = supportedNetworks.map(async (network) => {
            try {
                const networkLower = network.toLowerCase();
                const apiUrl = ALCHEMY_API_URLS[networkLower];
                
                if (!apiUrl) {
                    console.warn(`Alchemy API URL not configured for network: ${network}`);
                    return [];
                }
                
                // Get token balances
                const tokenBalances = await getTokenBalancesForNetwork(address, networkLower, apiUrl);
                
                // Get native token balance
                const nativeBalance = await getNativeBalanceForNetwork(address, networkLower, apiUrl);
                
                // Combine token and native balances
                return [...tokenBalances, nativeBalance].filter(token => token && token.balance > 0);
            } catch (error) {
                console.error(`Error fetching balances for network ${network}:`, error.message);
                return []; // Return empty array for this network
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
 * Get token balances for a specific network
 * @param {string} address - Wallet address
 * @param {string} network - Network name
 * @param {string} apiUrl - Alchemy API URL
 * @returns {Promise<Array>} Token balances
 */
async function getTokenBalancesForNetwork(address, network, apiUrl) {
    try {
        // Prepare the request payload
        const payload = {
            jsonrpc: '2.0',
            method: 'alchemy_getTokenBalances',
            params: [address, 'erc20'],
            id: Date.now()
        };
        
        // Make the API request
        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
        
        // Check if the response contains valid data
        if (response.data && response.data.result && response.data.result.tokenBalances) {
            const tokenBalances = response.data.result.tokenBalances;
            
            // Get token metadata for each token
            const tokenMetadataPromises = tokenBalances.map(async (token) => {
                if (parseFloat(token.tokenBalance) === 0) return null;
                
                try {
                    const metadata = await getTokenMetadata(token.contractAddress, network, apiUrl);
                    if (!metadata) return null;
                    
                    const balance = parseFloat(token.tokenBalance) / Math.pow(10, metadata.decimals);
                    
                    // Get token price (this would require additional API calls to price feeds)
                    // For simplicity, we're not implementing price fetching here
                    const price = 0;
                    const value = 0;
                    
                    return {
                        name: metadata.name || 'Unknown Token',
                        symbol: metadata.symbol || '???',
                        address: token.contractAddress,
                        decimals: metadata.decimals,
                        balance: balance,
                        price: price,
                        value: value,
                        priceChange24h: 0,
                        network: getNetworkDisplayName(network),
                        type: 'cryptocurrency',
                        icon: getTokenIcon(metadata.symbol, token.contractAddress, network)
                    };
                } catch (error) {
                    console.error(`Error getting metadata for token ${token.contractAddress}:`, error.message);
                    return null;
                }
            });
            
            const tokenMetadata = await Promise.all(tokenMetadataPromises);
            return tokenMetadata.filter(token => token !== null);
        }
        
        return [];
    } catch (error) {
        console.error(`Error in getTokenBalancesForNetwork for ${network}:`, error.message);
        return [];
    }
}

/**
 * Get native token balance for a specific network
 * @param {string} address - Wallet address
 * @param {string} network - Network name
 * @param {string} apiUrl - Alchemy API URL
 * @returns {Promise<Object>} Native token balance
 */
async function getNativeBalanceForNetwork(address, network, apiUrl) {
    try {
        // Prepare the request payload
        const payload = {
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest'],
            id: Date.now()
        };
        
        // Make the API request
        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 second timeout
        });
        
        // Check if the response contains valid data
        if (response.data && response.data.result) {
            const balance = parseInt(response.data.result, 16) / 1e18; // Convert from wei to ether
            
            if (balance === 0) return null;
            
            // Get native token info
            const nativeToken = getNativeTokenInfo(network);
            
            // Get token price (this would require additional API calls to price feeds)
            // For simplicity, we're not implementing price fetching here
            const price = 0;
            const value = 0;
            
            return {
                name: nativeToken.name,
                symbol: nativeToken.symbol,
                address: '',
                decimals: 18,
                balance: balance,
                price: price,
                value: value,
                priceChange24h: 0,
                network: getNetworkDisplayName(network),
                type: 'native',
                icon: nativeToken.icon
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Error in getNativeBalanceForNetwork for ${network}:`, error.message);
        return null;
    }
}

/**
 * Get token metadata
 * @param {string} contractAddress - Token contract address
 * @param {string} network - Network name
 * @param {string} apiUrl - Alchemy API URL
 * @returns {Promise<Object>} Token metadata
 */
async function getTokenMetadata(contractAddress, network, apiUrl) {
    try {
        // Prepare the request payload
        const payload = {
            jsonrpc: '2.0',
            method: 'alchemy_getTokenMetadata',
            params: [contractAddress],
            id: Date.now()
        };
        
        // Make the API request
        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 second timeout
        });
        
        // Check if the response contains valid data
        if (response.data && response.data.result) {
            return response.data.result;
        }
        
        return null;
    } catch (error) {
        console.error(`Error in getTokenMetadata for ${contractAddress}:`, error.message);
        return null;
    }
}

/**
 * Get native token info for a network
 * @param {string} network - Network name
 * @returns {Object} Native token info
 */
function getNativeTokenInfo(network) {
    const nativeTokens = {
        ethereum: {
            name: 'Ethereum',
            symbol: 'ETH',
            icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png'
        },
        polygon: {
            name: 'Polygon',
            symbol: 'MATIC',
            icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png'
        },
        optimism: {
            name: 'Ethereum',
            symbol: 'ETH',
            icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png'
        },
        arbitrum: {
            name: 'Ethereum',
            symbol: 'ETH',
            icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png'
        },
        base: {
            name: 'Ethereum',
            symbol: 'ETH',
            icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png'
        }
    };
    
    return nativeTokens[network] || {
        name: 'Unknown',
        symbol: '???',
        icon: ''
    };
}

/**
 * Get display name for a network
 * @param {string} network - Network name
 * @returns {string} Network display name
 */
function getNetworkDisplayName(network) {
    const networkNames = {
        ethereum: 'Ethereum',
        polygon: 'Polygon',
        optimism: 'Optimism',
        arbitrum: 'Arbitrum',
        base: 'Base'
    };
    
    return networkNames[network] || network.charAt(0).toUpperCase() + network.slice(1);
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
        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${network}/info/logo.png`;
    }
    
    // Use TrustWallet assets repository for icons
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${network}/assets/${address}/logo.png`;
}

module.exports = {
    getTokenBalances
}; 