// services/thegraph.service.js - The Graph API service
const axios = require('axios');
require('dotenv').config();

// The Graph API endpoints for different networks
const GRAPH_ENDPOINTS = {
    ethereum: {
        balancer: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
        uniswap: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3'
    },
    polygon: {
        balancer: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
        quickswap: 'https://api.thegraph.com/subgraphs/name/sameepsi/quickswap-v3'
    },
    arbitrum: {
        balancer: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2',
        uniswap: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-one'
    }
};

/**
 * Get token balances for a wallet address using The Graph
 * @param {string} address - Wallet address
 * @param {string[]} networks - Array of network names
 * @returns {Promise<Array>} Token balances
 */
async function getTokenBalances(address, networks = ['ethereum']) {
    try {
        // Filter networks to only those supported by The Graph
        const supportedNetworks = networks.filter(network => GRAPH_ENDPOINTS[network.toLowerCase()]);
        
        if (supportedNetworks.length === 0) {
            throw new Error('No supported networks provided for The Graph');
        }
        
        // Fetch balances for each network in parallel
        const balancePromises = supportedNetworks.map(async (network) => {
            try {
                const networkLower = network.toLowerCase();
                const endpoints = GRAPH_ENDPOINTS[networkLower];
                
                if (!endpoints) {
                    console.warn(`The Graph endpoints not configured for network: ${network}`);
                    return [];
                }
                
                // Get token balances from different protocols
                const balancerBalances = await getBalancerBalances(address, networkLower, endpoints.balancer);
                
                // Get other protocol balances as needed
                // const uniswapBalances = await getUniswapBalances(address, networkLower, endpoints.uniswap);
                
                // Combine balances from different protocols
                return [...balancerBalances]; // Add other protocol balances here
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
 * Get token balances from Balancer pools
 * @param {string} address - Wallet address
 * @param {string} network - Network name
 * @param {string} endpoint - The Graph endpoint
 * @returns {Promise<Array>} Token balances
 */
async function getBalancerBalances(address, network, endpoint) {
    try {
        // GraphQL query to get Balancer pool balances
        const query = `
            query GetBalancerBalances($address: String!) {
                poolShares(where: { userAddress: $address }) {
                    balance
                    poolId {
                        id
                        totalShares
                        tokens {
                            address
                            symbol
                            name
                            decimals
                            balance
                        }
                    }
                }
            }
        `;
        
        // Make the API request
        const response = await axios.post(endpoint, {
            query,
            variables: { address: address.toLowerCase() }
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
        
        // Validate the response structure
        if (!response.data) {
            console.error(`TheGraph API Error (${network}): Empty response data for Balancer balances`);
            return [];
        }
        
        if (response.data.errors) {
            console.error(`TheGraph API Error (${network}): GraphQL errors in Balancer query:`, response.data.errors);
            return [];
        }
        
        if (!response.data.data) {
            console.error(`TheGraph API Error (${network}): Missing data field in Balancer response`, response.data);
            return [];
        }
        
        if (!response.data.data.poolShares) {
            console.error(`TheGraph API Error (${network}): Missing poolShares in Balancer data`, response.data.data);
            return [];
        }
        
        const poolShares = response.data.data.poolShares;
        
        // Format the response
        const tokens = [];
        
        for (const share of poolShares) {
            // Check for missing or invalid data in each share
            if (!share.balance) {
                console.error(`TheGraph API Error (${network}): Missing balance in pool share`, share);
                continue;
            }
            
            if (!share.poolId) {
                console.error(`TheGraph API Error (${network}): Missing poolId in pool share`, share);
                continue;
            }
            
            if (!share.poolId.totalShares) {
                console.error(`TheGraph API Error (${network}): Missing totalShares in pool`, share.poolId);
                continue;
            }
            
            if (!share.poolId.tokens || !Array.isArray(share.poolId.tokens)) {
                console.error(`TheGraph API Error (${network}): Missing or invalid tokens array in pool`, share.poolId);
                continue;
            }
            
            const userShareRatio = parseFloat(share.balance) / parseFloat(share.poolId.totalShares);
            
            for (const token of share.poolId.tokens) {
                // Check for missing fields in token data
                const missingFields = [];
                if (!token.address) missingFields.push('address');
                if (!token.symbol) missingFields.push('symbol');
                if (!token.name) missingFields.push('name');
                if (token.decimals === undefined) missingFields.push('decimals');
                if (token.balance === undefined) missingFields.push('balance');
                
                if (missingFields.length > 0) {
                    console.error(`TheGraph API Error (${network}): Missing token fields: ${missingFields.join(', ')}`, token);
                    continue;
                }
                
                const userBalance = parseFloat(token.balance) * userShareRatio;
                
                if (userBalance <= 0) continue;
                
                tokens.push({
                    name: token.name || 'Unknown Token',
                    symbol: token.symbol || '???',
                    address: token.address,
                    decimals: parseInt(token.decimals),
                    balance: userBalance,
                    price: 0, // Price data not available from The Graph
                    value: 0, // Value data not available from The Graph
                    priceChange24h: 0,
                    network: getNetworkDisplayName(network),
                    type: 'cryptocurrency',
                    protocol: 'Balancer',
                    poolId: share.poolId.id,
                    icon: getTokenIcon(token.symbol, token.address, network)
                });
            }
        }
        
        return tokens;
    } catch (error) {
        console.error(`Error in getBalancerBalances for ${network}:`, error);
        return [];
    }
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
        arbitrum: 'Arbitrum'
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
        return '';
    }
    
    // Use TrustWallet assets repository for icons
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${network}/assets/${address}/logo.png`;
}

module.exports = {
    getTokenBalances
}; 