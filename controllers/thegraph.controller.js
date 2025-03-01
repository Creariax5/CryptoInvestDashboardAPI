// controllers/thegraph.controller.js - The Graph API controller
const thegraphService = require('../services/thegraph.service');

/**
 * Get token balances for a wallet address
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Token balances
 */
async function getBalances(req, res) {
    try {
        const { address, networks } = req.query;
        
        // Validate address
        if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid wallet address. Please provide a valid Ethereum address.' 
            });
        }
        
        // Parse networks parameter
        const networkList = networks ? networks.split(',') : ['ethereum'];
        
        // Get token balances from The Graph service
        const balances = await thegraphService.getTokenBalances(address, networkList);
        
        // Return the balances
        return res.status(200).json({
            success: true,
            address,
            networks: networkList,
            tokens: balances
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