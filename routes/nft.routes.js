// routes/nft.routes.js - NFT API routes
const express = require('express');
const router = express.Router();

// TODO: Implement real controller functions
const nftController = {
  getNfts: (req, res) => {
    // Placeholder until real implementation
    res.status(200).json({ message: 'NFTs list route (placeholder)' });
  },
  
  getNftDetails: (req, res) => {
    // Placeholder until real implementation
    const { contractAddress, tokenId } = req.params;
    res.status(200).json({ 
      message: 'NFT details route (placeholder)',
      contractAddress,
      tokenId
    });
  }
};

/**
 * @route   GET /api/nfts
 * @desc    Get NFTs for a wallet
 */
router.get('/', nftController.getNfts);

/**
 * @route   GET /api/nfts/:contractAddress/:tokenId
 * @desc    Get details for a specific NFT
 */
router.get('/:contractAddress/:tokenId', nftController.getNftDetails);

module.exports = router;