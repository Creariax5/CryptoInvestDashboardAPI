// tests/ankr-api-test.js - Test script for Ankr API endpoint
const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // Change if your server runs on a different port
const TEST_WALLET_ADDRESS = '0x29eA4918B83223F1EEc45F242d2D96A293B2FCF3'; // Vitalik's wallet
const NETWORKS = 'ethereum,polygon,arbitrum'; // Networks to test

/**
 * Test the Ankr API endpoint
 */
async function testAnkrApi() {
    console.log('====== Testing Ankr Advanced API Endpoint ======');
    console.log(`Wallet Address: ${TEST_WALLET_ADDRESS}`);
    console.log(`Networks: ${NETWORKS}`);
    console.log('-----------------------------------------------');
    
    try {
        const url = `${API_BASE_URL}/api/ankr/balances?address=${TEST_WALLET_ADDRESS}&networks=${NETWORKS}`;
        console.log(`Making request to: ${url}`);
        
        const startTime = Date.now();
        const response = await axios.get(url);
        const endTime = Date.now();
        
        console.log(`Response time: ${endTime - startTime}ms`);
        console.log('Status:', response.status);
        
        if (response.status === 200) {
            console.log('Success!');
            
            const data = response.data;
            console.log(`Provider: ${data.provider}`);
            console.log(`Address: ${data.address}`);
            console.log(`Networks requested: ${data.networks.join(', ')}`);
            
            if (data.tokens && data.tokens.length > 0) {
                console.log(`Found ${data.tokens.length} tokens`);
                
                // Group tokens by network
                const tokensByNetwork = {};
                data.tokens.forEach(token => {
                    if (!tokensByNetwork[token.network]) {
                        tokensByNetwork[token.network] = [];
                    }
                    tokensByNetwork[token.network].push(token);
                });
                
                // Display token summary by network
                Object.keys(tokensByNetwork).forEach(network => {
                    const networkTokens = tokensByNetwork[network];
                    console.log(`\n${network}: ${networkTokens.length} tokens`);
                    
                    // Display top 3 tokens by value
                    const topTokens = networkTokens
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 3);
                    
                    console.log('Top tokens:');
                    topTokens.forEach(token => {
                        console.log(`  - ${token.name} (${token.symbol}): ${token.balance} tokens, $${token.value.toFixed(2)}`);
                    });
                });
            } else {
                console.log('No tokens found');
            }
        } else {
            console.log('Failed with status:', response.status);
        }
    } catch (error) {
        console.error('Error testing Ankr API:');
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
testAnkrApi();

/* 
To run this test:
1. Make sure your API server is running (npm start in your main project directory)
2. Run this script with: node tests/ankr-api-test.js
*/ 