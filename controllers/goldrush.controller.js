// controllers/goldrush.controller.js - GoldRush (Covalent) API controller
const goldrushService = require('../services/goldrush.service');

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
        
        // Get token balances from GoldRush service
        const balances = await goldrushService.getTokenBalances(address, networkList);
        
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

/**
 * Get protocol data for a wallet address
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Protocol data
 */
async function getProtocols(req, res) {
    // This is a placeholder for future implementation
    return res.status(200).json({ 
        success: true,
        message: 'GoldRush protocols route (placeholder)' 
    });
}

module.exports = {
    getBalances,
    getProtocols
};
