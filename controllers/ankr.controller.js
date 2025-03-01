// controllers/ankr.controller.js - Ankr Advanced API controller
const ankrService = require('../services/ankr.service');

/**
 * Get token balances for a wallet address using Ankr's Advanced Multi-chain API
 * 
 * This endpoint leverages Ankr's single entry point for fetching balances across
 * multiple blockchains in a single request, including both EVM and non-EVM chains.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Token balances across specified networks
 */
async function getBalances(req, res) {
    try {
        const { address, networks, includeNonEvm } = req.query;
        
        // Validate address - Note that for non-EVM chains, different address formats apply
        // For EVM chains, enforce the 0x format
        if (!address || (address.startsWith('0x') && !address.match(/^0x[a-fA-F0-9]{40}$/))) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid wallet address format.' 
            });
        }
        
        // Parse networks parameter
        const networkList = networks ? networks.split(',') : ['ethereum'];
        
        // Get token balances from Ankr service
        const balances = await ankrService.getWalletBalances(address, networkList);
        
        // Return the balances
        return res.status(200).json({
            success: true,
            address,
            networks: networkList,
            tokens: balances,
            provider: 'Ankr Advanced API',
            supportedChains: {
                evm: [
                    'ethereum', 'polygon', 'bsc', 'avalanche', 'optimism', 
                    'arbitrum', 'fantom', 'gnosis', 'base', 'aurora', 
                    'celo', 'cronos', 'harmony', 'metis', 'moonbeam', 
                    'moonriver', 'zksync', 'linea', 'scroll', 'mantle'
                ],
                nonEvm: [
                    'solana', 'near', 'polkadot', 'kusama', 'bitcoin',
                    'filecoin', 'cosmos', 'osmosis'
                ]
            }
        });
    } catch (error) {
        console.error('Error in getBalances controller:', error);
        return res.status(500).json({ 
            success: false, 
            message: `Failed to fetch balances: ${error.message}` 
        });
    }
}

module.exports = {
    getBalances
}; 