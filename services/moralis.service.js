// services/moralis.service.js - Moralis API service
const axios = require('axios');
const ApiError = require('../utils/api-error');
const { 
  getChainFormat, 
  getNativeTokenName, 
  getNativeTokenSymbol,
  getApproximateNativeTokenPrice
} = require('../utils/chain-utils');
const { calculateUsdValue } = require('../utils/validation-utils');
const { MORALIS_API_KEY } = require('../config/environment');

/**
 * Get token balances for a wallet across multiple networks
 * @param {string} address - Wallet address
 * @param {Array<string>} networks - Array of network names
 * @returns {Promise<Array>} - Array of token balances
 */
async function getWalletBalances(address, networks) {
  const balances = [];
  
  // Fetch ERC20 token balances for each network
  for (const network of networks) {
    try {
      // Convert network name to chain format that Moralis expects
      const chain = getChainFormat(network);
      
      console.log(`Fetching ${network} balances with chain parameter: ${chain}`);
      
      const response = await axios.get(`https://deep-index.moralis.io/api/v2/${address}/erc20`, {
        params: { chain },
        headers: { 'X-API-Key': MORALIS_API_KEY }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Found ${response.data.length} tokens on ${network}`);
        
        // Add network info to each token
        const networkBalances = response.data.map(token => ({
          ...token,
          network,
          usdValue: calculateUsdValue(token.balance, token.decimals, token.usd_price || 0)
        }));
        
        balances.push(...networkBalances);
      }
    } catch (error) {
      console.error(`Error fetching ${network} balances:`, error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      }
    }
  }
  
  // Add native token balances (ETH, MATIC, etc.)
  for (const network of networks) {
    try {
      // Convert network name to chain format for Moralis
      const chain = getChainFormat(network);
      
      console.log(`Fetching ${network} native balance with chain parameter: ${chain}`);
      
      const response = await axios.get(`https://deep-index.moralis.io/api/v2/${address}/balance`, {
        params: { chain },
        headers: { 'X-API-Key': MORALIS_API_KEY }
      });
      
      if (response.data && response.data.balance) {
        console.log(`✅ Found native balance on ${network}: ${response.data.balance}`);
        
        // Get approximate native token price
        const usdPrice = getApproximateNativeTokenPrice(chain);
        
        const nativeBalance = {
          token_address: '0xnative',
          name: getNativeTokenName(network),
          symbol: getNativeTokenSymbol(network),
          decimals: 18,
          balance: response.data.balance,
          network,
          usdValue: calculateUsdValue(response.data.balance, 18, usdPrice)
        };
        
        balances.push(nativeBalance);
      }
    } catch (error) {
      console.error(`Error fetching ${network} native balance:`, error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      }
    }
  }
  
  return balances;
}

/**
 * Get transaction history for a wallet across multiple networks
 * @param {string} address - Wallet address
 * @param {Array<string>} networks - Array of network names
 * @returns {Promise<Array>} - Array of transactions
 */
async function getTransactionHistory(address, networks) {
  const transactions = [];
  
  for (const network of networks) {
    try {
      // Convert network name to chain format for Moralis
      const chain = getChainFormat(network);
      
      console.log(`Fetching ${network} transactions with chain parameter: ${chain}`);
      
      const response = await axios.get(`https://deep-index.moralis.io/api/v2/${address}`, {
        params: { 
          chain,
          limit: 10 // Reduced limit to avoid timeouts
        },
        headers: { 'X-API-Key': MORALIS_API_KEY }
      });
      
      if (response.data && response.data.result) {
        console.log(`✅ Found ${response.data.result.length} transactions on ${network}`);
        
        // Process transactions
        const networkTxs = response.data.result.map(tx => {
          // Determine transaction type
          let type = 'Transfer';
          if (tx.to_address && tx.from_address) {
            if (tx.to_address.toLowerCase() === address.toLowerCase() && 
                tx.from_address.toLowerCase() !== address.toLowerCase()) {
              type = 'Receive';
            } else if (tx.from_address.toLowerCase() === address.toLowerCase() && 
                      tx.to_address.toLowerCase() !== address.toLowerCase()) {
              type = 'Send';
            }
          }
          
          // Format date
          const date = new Date(tx.block_timestamp);
          
          return {
            hash: tx.hash,
            date: date.toISOString().split('T')[0],
            time: date.toTimeString().substring(0, 5),
            type,
            amount: tx.value || '0',
            asset: getNativeTokenSymbol(network),
            network,
            status: 'Completed',
            investor: '-',
            txType: 'native'
          };
        });
        
        transactions.push(...networkTxs);
      }
    } catch (error) {
      console.error(`Error fetching ${network} transactions:`, error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      }
    }
  }
  
  // Sort by date, newest first
  return transactions.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateB - dateA;
  });
}

/**
 * Get NFT count for a wallet
 * @param {string} address - Wallet address
 * @param {string} network - Network name
 * @returns {Promise<number>} - NFT count
 */
async function getNftCount(address, network) {
  try {
    const chain = getChainFormat(network);
    
    console.log(`Fetching NFT count for ${address} on ${chain}`);
    
    const response = await axios.get(`https://deep-index.moralis.io/api/v2/${address}/nft`, {
      params: { 
        chain,
        limit: 1,
        format: 'decimal'
      },
      headers: { 'X-API-Key': MORALIS_API_KEY }
    });
    
    if (response.data && response.data.total) {
      console.log(`✅ Found ${response.data.total} NFTs for ${address}`);
      return response.data.total;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error fetching NFT count:`, error.message);
    return 0;
  }
}

/**
 * Get NFTs for a wallet
 * @param {string} address - Wallet address
 * @param {string} chain - Chain parameter
 * @param {number} limit - Result limit
 * @returns {Promise<Object>} - NFTs data
 */
async function getNfts(address, chain, limit = 20) {
  try {
    console.log(`Fetching NFTs for ${address} on chain ${chain}...`);
    
    const response = await axios.get(`https://deep-index.moralis.io/api/v2/${address}/nft`, {
      params: { 
        chain, 
        format: 'decimal',
        limit,
        normalizeMetadata: true
      },
      headers: { 'X-API-Key': MORALIS_API_KEY }
    });
    
    if (response.data && response.data.result) {
      console.log(`✅ Successfully fetched ${response.data.result.length} NFTs`);
      
      // Format the NFT data
      const nfts = response.data.result.map(nft => ({
        tokenId: nft.token_id,
        name: nft.name || `NFT #${nft.token_id}`,
        symbol: nft.symbol,
        contractAddress: nft.token_address,
        contractType: nft.contract_type,
        collectionName: nft.name,
        image: nft.normalized_metadata?.image || null,
        metadata: nft.normalized_metadata,
        lastTransferTimestamp: nft.last_token_uri_sync,
        chain
      }));
      
      return {
        total: response.data.total,
        page: response.data.page,
        pageSize: response.data.page_size,
        nfts
      };
    }
    
    return { nfts: [] };
  } catch (error) {
    throw ApiError.fromError(error, "fetching NFTs", { address, chain });
  }
}

/**
 * Get specific NFT details
 * @param {string} contractAddress - NFT contract address
 * @param {string} tokenId - NFT token ID
 * @param {string} chain - Chain parameter
 * @returns {Promise<Object>} - NFT details
 */
async function getNftDetails(contractAddress, tokenId, chain) {
  try {
    console.log(`Fetching details for NFT ${contractAddress}/${tokenId} on chain ${chain}...`);
    
    const response = await axios.get(`https://deep-index.moralis.io/api/v2.2/nft/${contractAddress}/${tokenId}`, {
      params: { 
        chain,
        format: 'decimal',
        normalizeMetadata: true
      },
      headers: { 'X-API-Key': MORALIS_API_KEY }
    });
    
    if (response.data) {
      console.log(`✅ Successfully fetched NFT details`);
      
      // Format the response
      return {
        tokenId: response.data.token_id,
        name: response.data.name || `NFT #${response.data.token_id}`,
        symbol: response.data.symbol,
        contractAddress: response.data.token_address,
        contractType: response.data.contract_type,
        collectionName: response.data.name,
        image: response.data.normalized_metadata?.image || null,
        description: response.data.normalized_metadata?.description || null,
        attributes: response.data.normalized_metadata?.attributes || [],
        metadata: response.data.normalized_metadata,
        owner: response.data.owner_of,
        chain
      };
    }
    
    throw new ApiError('NFT not found', 404);
  } catch (error) {
    throw ApiError.fromError(error, "fetching NFT details", { contractAddress, tokenId, chain });
  }
}

module.exports = {
  getWalletBalances,
  getTransactionHistory,
  getNftCount,
  getNfts,
  getNftDetails
};