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
        
        // Validate the response structure
        if (!response.data) {
            console.error(`Alchemy API Error (${network}): Empty response data`);
            return [];
        }
        
        if (response.data.error) {
            console.error(`Alchemy API Error (${network}):`, response.data.error);
            return [];
        }
        
        if (!response.data.result) {
            console.error(`Alchemy API Error (${network}): Missing result in response`, response.data);
            return [];
        }
        
        if (!response.data.result.tokenBalances) {
            console.error(`Alchemy API Error (${network}): Missing tokenBalances in result`, response.data.result);
            return [];
        }
        
        const tokenBalances = response.data.result.tokenBalances;
        
        // Get token metadata for each token
        const tokenMetadataPromises = tokenBalances.map(async (token) => {
            if (!token.tokenBalance) {
                console.error(`Alchemy API Error (${network}): Missing tokenBalance field`, token);
                return null;
            }
            
            if (parseFloat(token.tokenBalance) === 0) return null;
            
            try {
                if (!token.contractAddress) {
                    console.error(`Alchemy API Error (${network}): Missing contractAddress field`, token);
                    return null;
                }
                
                const metadata = await getTokenMetadata(token.contractAddress, network, apiUrl);
                
                if (!metadata) {
                    console.error(`Alchemy API Error (${network}): Failed to fetch metadata for token`, token.contractAddress);
                    return null;
                }
                
                const missingMetadataFields = [];
                if (!metadata.name) missingMetadataFields.push('name');
                if (!metadata.symbol) missingMetadataFields.push('symbol');
                if (metadata.decimals === undefined) missingMetadataFields.push('decimals');
                
                if (missingMetadataFields.length > 0) {
                    console.error(`Alchemy API Error (${network}): Missing metadata fields: ${missingMetadataFields.join(', ')} for token ${token.contractAddress}`, metadata);
                }
                
                // Calculate token balance using the token's decimals
                const decimals = metadata.decimals || 18;
                const balance = parseInt(token.tokenBalance, 16) / Math.pow(10, decimals);
                
                // Format the token data
                return {
                    name: metadata.name || 'Unknown Token',
                    symbol: metadata.symbol || '???',
                    address: token.contractAddress,
                    decimals: decimals,
                    balance: balance,
                    price: 0, // Alchemy doesn't provide price data
                    value: 0, // We don't have price data to calculate value
                    priceChange24h: 0,
                    network: getNetworkDisplayName(network),
                    type: 'cryptocurrency',
                    icon: getTokenIcon(metadata.symbol, token.contractAddress, network)
                };
            } catch (error) {
                console.error(`Error processing token metadata for ${token.contractAddress} on ${network}:`, error.message);
                return null;
            }
        });
        
        // Wait for all metadata requests to complete
        const tokens = await Promise.all(tokenMetadataPromises);
        
        // Filter out null values and return
        return tokens.filter(token => token !== null);
    } catch (error) {
        console.error(`Error in getTokenBalancesForNetwork for ${network}:`, error);
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
        
        // Validate the response structure
        if (!response.data) {
            console.error(`Alchemy API Error (${network}): Empty response data for native balance`);
            return null;
        }
        
        if (response.data.error) {
            console.error(`Alchemy API Error (${network}): Error fetching native balance:`, response.data.error);
            return null;
        }
        
        if (!response.data.result) {
            console.error(`Alchemy API Error (${network}): Missing result in native balance response`, response.data);
            return null;
        }
        
        const balance = parseInt(response.data.result, 16) / 1e18; // Convert from wei to ether
            
        // Get native token info (symbol, name, etc.)
        const tokenInfo = getNativeTokenInfo(network);
        
        if (!tokenInfo) {
            console.error(`Alchemy API Error (${network}): Could not get native token info`);
            return null;
        }
        
        // Format the token data
        return {
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            address: '',
            decimals: 18,
            balance: balance,
            price: 0, // We would need to fetch this from a price feed
            value: 0, // We would need price data to calculate this
            priceChange24h: 0,
            network: getNetworkDisplayName(network),
            type: 'native',
            icon: tokenInfo.icon
        };
    } catch (error) {
        console.error(`Error in getNativeBalanceForNetwork for ${network}:`, error);
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
        
        // Validate the response structure
        if (!response.data) {
            console.error(`Alchemy API Error (${network}): Empty response data for token metadata of ${contractAddress}`);
            return null;
        }
        
        if (response.data.error) {
            console.error(`Alchemy API Error (${network}): Error fetching token metadata for ${contractAddress}:`, response.data.error);
            return null;
        }
        
        if (!response.data.result) {
            console.error(`Alchemy API Error (${network}): Missing result in token metadata response for ${contractAddress}`, response.data);
            return null;
        }
        
        // Check for missing fields in the metadata
        const metadata = response.data.result;
        const missingFields = [];
        
        if (!metadata.name) missingFields.push('name');
        if (!metadata.symbol) missingFields.push('symbol');
        if (metadata.decimals === undefined) missingFields.push('decimals');
        if (metadata.logo === undefined) missingFields.push('logo');
        
        if (missingFields.length > 0) {
            console.error(`Alchemy API Warning (${network}): Incomplete metadata for token ${contractAddress}, missing: ${missingFields.join(', ')}`, metadata);
        }
        
        return metadata;
    } catch (error) {
        console.error(`Error in getTokenMetadata for ${contractAddress} on ${network}:`, error);
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