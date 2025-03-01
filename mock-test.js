// mock-test.js - Standalone test for Ankr service
const ankrService = require('./services/ankr.service');
const fs = require('fs');
const axios = require('axios');

// Set the TEST_MODE flag to false to make a real API call
const TEST_MODE = false;
// Set the API_MODE flag to true to call the API endpoint instead of the service directly
const API_MODE = true;

/**
 * Test the Ankr service directly
 */
async function testAnkrService() {
    console.log('====== Testing Ankr Advanced API Service ======');
    
    // Test wallet address (Vitalik's wallet)
    const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const networks = ['ethereum', 'polygon', 'arbitrum'];
    
    console.log(`Wallet Address: ${testAddress}`);
    console.log(`Networks: ${networks.join(', ')}`);
    console.log('----------------------------------------------');
    
    try {
        let data;
        
        if (TEST_MODE) {
            // Use mock data from sample-response.json
            console.log('Using mock data (TEST_MODE=true)');
            try {
                const sampleData = JSON.parse(fs.readFileSync('./sample-response.json', 'utf8'));
                data = sampleData.tokens || [];
                console.log(`Successfully loaded mock data with ${data.length} tokens`);
            } catch (error) {
                console.error('Error loading mock data:', error.message);
                data = [];
            }
        } else if (API_MODE) {
            // Make a real API call to the endpoint
            console.log('Making API call to the Ankr endpoint...');
            const startTime = Date.now();
            const url = `http://localhost:3000/api/ankr/balances?address=${testAddress}&networks=${networks.join(',')}`;
            console.log(`URL: ${url}`);
            
            const response = await axios.get(url);
            const endTime = Date.now();
            
            console.log(`API call completed in ${endTime - startTime}ms`);
            console.log(`Status: ${response.status}`);
            
            if (response.data && response.data.success) {
                console.log('Success!');
                data = response.data.tokens || [];
                console.log(`Provider: ${response.data.provider}`);
            } else {
                console.error('API call failed:', response.data);
                data = [];
            }
        } else {
            // Make a real API call to the service directly
            console.log('Making direct call to Ankr service...');
            const startTime = Date.now();
            data = await ankrService.getWalletBalances(testAddress, networks);
            const endTime = Date.now();
            console.log(`Service call completed in ${endTime - startTime}ms`);
        }
        
        // Process the data
        if (data && data.length > 0) {
            console.log(`Found ${data.length} tokens`);
            
            // Group tokens by network
            const tokensByNetwork = {};
            data.forEach(token => {
                if (!tokensByNetwork[token.network]) {
                    tokensByNetwork[token.network] = [];
                }
                tokensByNetwork[token.network].push(token);
            });
            
            // Calculate total value
            const totalValue = data.reduce((sum, token) => sum + (token.value || 0), 0);
            console.log(`Total value: $${totalValue.toFixed(2)}`);
            
            // Display token summary by network
            Object.keys(tokensByNetwork).forEach(network => {
                const networkTokens = tokensByNetwork[network];
                console.log(`\n${network}: ${networkTokens.length} tokens`);
                
                // Display top 3 tokens by value
                const topTokens = networkTokens
                    .sort((a, b) => (b.value || 0) - (a.value || 0))
                    .slice(0, 3);
                
                console.log('Top tokens:');
                topTokens.forEach(token => {
                    console.log(`  - ${token.name} (${token.symbol}): ${token.balance} tokens, $${(token.value || 0).toFixed(2)}`);
                });
            });
        } else {
            console.log('No tokens found');
        }
    } catch (error) {
        console.error('Error testing Ankr service:', error);
    }
}

// Run the test
testAnkrService(); 