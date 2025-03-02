// tests/wallet-balance-apis-test.js - Test script for all wallet balance API endpoints
const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // Change if your server runs on a different port
const TEST_WALLET_ADDRESS = '0x29eA4918B83223F1EEc45F242d2D96A293B2FCF3'; // Vitalik's wallet
const NETWORKS = 'ethereum,polygon'; // Networks to test (use only those supported by all providers)

/**
 * Test all wallet balance API endpoints
 */
async function testAllBalanceApis() {
    console.log('====== Testing Wallet Balance API Endpoints ======');
    console.log(`Wallet Address: ${TEST_WALLET_ADDRESS}`);
    console.log(`Networks: ${NETWORKS}`);
    console.log('------------------------------------------------');
    
    // List of all balance API endpoints
    const endpoints = [
        { name: 'Ankr Advanced API', path: '/api/ankr/balances' },
        { name: 'Covalent (GoldRush)', path: '/api/goldrush/balances' },
        { name: 'Alchemy', path: '/api/alchemy/balances' },
        { name: 'The Graph', path: '/api/thegraph/balances' }
    ];
    
    // Test each endpoint
    for (const endpoint of endpoints) {
        console.log(`\n=> Testing ${endpoint.name} endpoint:`);
        await testEndpoint(endpoint.path);
        console.log('-'.repeat(50));
    }
}

/**
 * Test a specific endpoint
 * @param {string} path - API endpoint path
 */
async function testEndpoint(path) {
    try {
        const url = `${API_BASE_URL}${path}?address=${TEST_WALLET_ADDRESS}&networks=${NETWORKS}`;
        console.log(`Making request to: ${url}`);
        
        const startTime = Date.now();
        const response = await axios.get(url);
        const endTime = Date.now();
        
        console.log(`Response time: ${endTime - startTime}ms`);
        console.log('Status:', response.status);
        
        if (response.status === 200) {
            console.log('Success!');
            
            const data = response.data;
            
            // Print token count and value
            if (data.tokens && data.tokens.length > 0) {
                console.log(`Found ${data.tokens.length} tokens`);
                
                // Calculate total value
                const totalValue = data.tokens.reduce((sum, token) => sum + (token.value || 0), 0);
                console.log(`Total value: $${totalValue.toFixed(2)}`);
                
                // Group tokens by network
                const networkCounts = {};
                data.tokens.forEach(token => {
                    networkCounts[token.network] = (networkCounts[token.network] || 0) + 1;
                });
                
                // Print network distribution
                console.log('Token distribution by network:');
                Object.entries(networkCounts).forEach(([network, count]) => {
                    console.log(`  - ${network}: ${count} tokens`);
                });
                
                // Print top 3 tokens by value
                const topTokens = [...data.tokens]
                    .sort((a, b) => (b.value || 0) - (a.value || 0))
                    .slice(0, 3);
                
                console.log('Top tokens by value:');
                topTokens.forEach((token, index) => {
                    console.log(`  ${index + 1}. ${token.name} (${token.symbol}): ${token.balance} tokens, $${(token.value || 0).toFixed(2)}`);
                });
            } else {
                console.log('No tokens found');
            }
        } else {
            console.log('Failed with status:', response.status);
        }
    } catch (error) {
        console.error('Error testing endpoint:');
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received. Is the server running?');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error setting up request:', error.message);
        }
    }
}

// Run the test
testAllBalanceApis();

/* 
To run this test:
1. Make sure your API server is running (npm start in your main project directory)
2. Run this script with: node tests/wallet-balance-apis-test.js
*/ 