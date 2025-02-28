// File: index.js - Main server file
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const session = require('express-session');
const querystring = require('querystring');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session for Coinbase OAuth (use a more robust store in production)
app.use(session({
  secret: process.env.SESSION_SECRET || 'wallet-dashboard-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// API Keys
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const COVALENT_API_KEY = process.env.COVALENT_API_KEY;
const COINBASE_CLIENT_ID = process.env.COINBASE_CLIENT_ID;
const COINBASE_CLIENT_SECRET = process.env.COINBASE_CLIENT_SECRET;

// Routes
// Main wallet dashboard data endpoint
app.get('/api/dashboard', async (req, res) => {
  try {
    const { address, networks = 'ethereum,polygon,bsc,optimism,arbitrum' } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const networkArray = networks.split(',');
    
    // Get data from different sources in parallel
    const [walletBalances, defiPositions, transactions, feeData] = await Promise.all([
      getWalletBalances(address, networkArray),
      getDefiPositions(address, networkArray),
      getTransactionHistory(address, networkArray),
      getFeeAnalysis(address, networkArray),
    ]);
    
    // Calculate totals
    const totalBalance = calculateTotalBalance(walletBalances);
    const totalDefiValue = calculateTotalDefiValue(defiPositions);
    const cryptoAssetsValue = totalBalance - totalDefiValue;
    const totalFeesPaid = calculateTotalFees(feeData);
    
    // Create portfolio history for chart
    const portfolioHistory = await getPortfolioHistory(address, networkArray);
    
    // Format response
    const response = {
      overview: {
        totalBalance,
        defiPositions: totalDefiValue,
        cryptoAssets: cryptoAssetsValue,
        totalFeesPaid,
      },
      walletBalances,
      defiPositions,
      transactions,
      feeData,
      charts: {
        portfolioHistory,
        feesByNetwork: formatFeesByNetwork(feeData),
        feesByType: formatFeesByType(feeData),
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    return res.status(500).json({ error: 'Failed to fetch wallet data' });
  }
});

// Coinbase OAuth routes
// Step 1: Redirect to Coinbase for authorization
app.get('/api/coinbase/auth', (req, res) => {
  // Create the authorization URL
  const authUrl = 'https://www.coinbase.com/oauth/authorize?' + 
    querystring.stringify({
      response_type: 'code',
      client_id: COINBASE_CLIENT_ID,
      redirect_uri: `${process.env.API_BASE_URL}/api/coinbase/callback`,
      scope: 'wallet:accounts:read,wallet:transactions:read,wallet:buys:read,wallet:sells:read'
    });
  
  res.redirect(authUrl);
});

// Step 2: Handle the callback from Coinbase
app.get('/api/coinbase/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://api.coinbase.com/oauth/token', {
      grant_type: 'authorization_code',
      code,
      client_id: COINBASE_CLIENT_ID,
      client_secret: COINBASE_CLIENT_SECRET,
      redirect_uri: `${process.env.API_BASE_URL}/api/coinbase/callback`
    });
    
    // Store tokens in session (use a database in production)
    req.session.coinbase = {
      access_token: tokenResponse.data.access_token,
      refresh_token: tokenResponse.data.refresh_token,
      expires_at: Date.now() + (tokenResponse.data.expires_in * 1000)
    };
    
    // Redirect to frontend
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?coinbase=connected`);
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=coinbase_auth_failed`);
  }
});

// Get Coinbase wallet data
app.get('/api/coinbase/data', async (req, res) => {
  // Check if user is authenticated with Coinbase
  if (!req.session.coinbase || !req.session.coinbase.access_token) {
    return res.status(401).json({ error: 'Not authenticated with Coinbase' });
  }
  
  try {
    // Check if token is expired and refresh if needed
    if (req.session.coinbase.expires_at < Date.now()) {
      await refreshCoinbaseToken(req);
    }
    
    // Fetch accounts from Coinbase
    const accountsResponse = await axios.get('https://api.coinbase.com/v2/accounts', {
      headers: {
        'Authorization': `Bearer ${req.session.coinbase.access_token}`,
        'CB-VERSION': '2022-01-01'
      }
    });
    
    const accounts = accountsResponse.data.data;
    
    // Format accounts
    const formattedAccounts = accounts.map(account => ({
      id: account.id,
      name: account.name,
      currency: account.currency.code,
      balance: {
        amount: account.balance.amount,
        currency: account.balance.currency
      },
      native_balance: {
        amount: account.native_balance.amount,
        currency: account.native_balance.currency
      },
      type: account.type,
      created_at: account.created_at,
      updated_at: account.updated_at
    }));
    
    // Fetch transactions for each account
    const transactions = [];
    
    for (const account of accounts) {
      try {
        const txResponse = await axios.get(`https://api.coinbase.com/v2/accounts/${account.id}/transactions`, {
          headers: {
            'Authorization': `Bearer ${req.session.coinbase.access_token}`,
            'CB-VERSION': '2022-01-01'
          },
          params: {
            limit: 10 // Limit to recent transactions
          }
        });
        
        const accountTxs = txResponse.data.data.map(tx => ({
          id: tx.id,
          type: tx.type,
          status: tx.status,
          amount: tx.amount.amount,
          currency: tx.amount.currency,
          native_amount: tx.native_amount.amount,
          native_currency: tx.native_amount.currency,
          created_at: tx.created_at,
          updated_at: tx.updated_at
        }));
        
        transactions.push(...accountTxs);
      } catch (error) {
        console.error(`Error fetching transactions for account ${account.id}:`, error.message);
      }
    }
    
    // Return formatted data
    return res.status(200).json({
      accounts: formattedAccounts,
      transactions: transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    });
  } catch (error) {
    console.error('Error fetching Coinbase data:', error);
    return res.status(500).json({ error: 'Failed to fetch Coinbase data' });
  }
});

// Helper function to refresh Coinbase token
async function refreshCoinbaseToken(req) {
  try {
    const refreshResponse = await axios.post('https://api.coinbase.com/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: req.session.coinbase.refresh_token,
      client_id: COINBASE_CLIENT_ID,
      client_secret: COINBASE_CLIENT_SECRET
    });
    
    req.session.coinbase = {
      access_token: refreshResponse.data.access_token,
      refresh_token: refreshResponse.data.refresh_token,
      expires_at: Date.now() + (refreshResponse.data.expires_in * 1000)
    };
    
    return req.session.coinbase.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new Error('Failed to refresh Coinbase token');
  }
}

// Blockchain data fetching functions
async function getWalletBalances(address, networks) {
  // Using Moralis to get token balances across networks
  const balances = [];
  
  for (const network of networks) {
    try {
      const response = await axios.get(`https://deep-index.moralis.io/api/v2/${address}/erc20`, {
        params: { chain: network },
        headers: { 'X-API-Key': MORALIS_API_KEY }
      });
      
      // Add network info to each token
      const networkBalances = response.data.map(token => ({
        ...token,
        network,
        usdValue: calculateUsdValue(token.balance, token.decimals, token.usd_price || 0)
      }));
      
      balances.push(...networkBalances);
    } catch (error) {
      console.error(`Error fetching ${network} balances:`, error.message);
    }
  }
  
  // Add native token balances (ETH, MATIC, etc.)
  for (const network of networks) {
    try {
      const response = await axios.get(`https://deep-index.moralis.io/api/v2/${address}/balance`, {
        params: { chain: network },
        headers: { 'X-API-Key': MORALIS_API_KEY }
      });
      
      // Get native token price
      const priceResponse = await axios.get(`https://deep-index.moralis.io/api/v2/erc20/${getNativeTokenAddress(network)}/price`, {
        params: { chain: network },
        headers: { 'X-API-Key': MORALIS_API_KEY }
      });
      
      const nativeBalance = {
        token_address: '0xnative',
        name: getNativeTokenName(network),
        symbol: getNativeTokenSymbol(network),
        decimals: 18,
        balance: response.data.balance,
        network,
        usdValue: calculateUsdValue(response.data.balance, 18, priceResponse.data.usdPrice)
      };
      
      balances.push(nativeBalance);
    } catch (error) {
      console.error(`Error fetching ${network} native balance:`, error.message);
    }
  }
  
  return balances;
}

async function getDefiPositions(address, networks) {
  // For DeFi positions, we can use Covalent
  const positions = [];
  
  for (const network of networks) {
    try {
      // Get liquidity provider positions
      const response = await axios.get(
        `https://api.covalenthq.com/v1/${getChainId(network)}/address/${address}/staking/`,
        {
          auth: {
            username: COVALENT_API_KEY,
            password: ''
          }
        }
      );
      
      if (response.data.data?.items) {
        const networkPositions = response.data.data.items.map(pos => ({
          ...pos,
          network
        }));
        positions.push(...networkPositions);
      }
    } catch (error) {
      console.error(`Error fetching ${network} DeFi positions:`, error.message);
    }
  }
  
  return positions;
}

async function getTransactionHistory(address, networks) {
  // Get transaction history using Moralis
  const transactions = [];
  
  for (const network of networks) {
    try {
      const response = await axios.get(`https://deep-index.moralis.io/api/v2/${address}`, {
        params: { 
          chain: network,
          limit: 20
        },
        headers: { 'X-API-Key': MORALIS_API_KEY }
      });
      
      // Add network info and format the transactions
      const networkTxs = response.data.result.map(tx => {
        // Determine transaction type
        let type = 'Transfer';
        if (tx.to_address.toLowerCase() === address.toLowerCase() && tx.from_address.toLowerCase() !== address.toLowerCase()) {
          type = 'Receive';
        } else if (tx.from_address.toLowerCase() === address.toLowerCase() && tx.to_address.toLowerCase() !== address.toLowerCase()) {
          type = 'Send';
        }
        
        // Format date
        const date = new Date(tx.block_timestamp);
        
        return {
          hash: tx.hash,
          date: date.toISOString().split('T')[0],
          time: date.toTimeString().substring(0, 5),
          type,
          amount: tx.value,
          asset: getNativeTokenSymbol(network),
          network,
          status: 'Completed',
          investor: '-' // This would need to be determined through other means
        };
      });
      
      transactions.push(...networkTxs);
    } catch (error) {
      console.error(`Error fetching ${network} transactions:`, error.message);
    }
  }
  
  // Sort by date, newest first
  return transactions.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateB - dateA;
  });
}

async function getFeeAnalysis(address, networks) {
  // Analyze gas fees from transactions
  const feeData = {
    totalFees: 0,
    feesByNetwork: {},
    feesByType: {
      'Swaps': 0,
      'Bridges': 0,
      'Smart Contract Calls': 0,
      'Liquidity Provision': 0,
      'Withdrawals': 0
    }
  };
  
  for (const network of networks) {
    try {
      const response = await axios.get(`https://deep-index.moralis.io/api/v2/${address}`, {
        params: { 
          chain: network,
          from_date: getDateMonthsAgo(3)
        },
        headers: { 'X-API-Key': MORALIS_API_KEY }
      });
      
      // Calculate fees
      let networkFees = 0;
      
      response.data.result.forEach(tx => {
        if (tx.gas_price && tx.receipt_gas_used) {
          const fee = (parseInt(tx.gas_price) * parseInt(tx.receipt_gas_used)) / 1e18;
          
          // Get native token price
          // Note: In a real implementation, you'd want to get historical prices
          const feeUsd = fee * 3000; // Example price, would be dynamically fetched
          
          networkFees += feeUsd;
          feeData.totalFees += feeUsd;
          
          // Categorize transaction type - this would need more sophisticated logic
          // based on contract interactions
          if (tx.to_address.toLowerCase().includes('0x')) {
            feeData.feesByType['Smart Contract Calls'] += feeUsd;
          } else {
            feeData.feesByType['Swaps'] += feeUsd;
          }
        }
      });
      
      feeData.feesByNetwork[network] = networkFees;
    } catch (error) {
      console.error(`Error analyzing ${network} fees:`, error.message);
    }
  }
  
  return feeData;
}

async function getPortfolioHistory(address, networks) {
  // This would ideally use historical balance data from Covalent
  // Simplified example with mock data
  const today = new Date();
  const data = [];
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: 980 + Math.floor(Math.random() * 300) // Random example
    });
  }
  
  return data;
}

// Utility functions
function calculateTotalBalance(tokens) {
  return tokens.reduce((sum, token) => sum + (token.usdValue || 0), 0);
}

function calculateTotalDefiValue(positions) {
  return positions.reduce((sum, pos) => sum + (pos.usdValue || 0), 0);
}

function calculateTotalFees(feeData) {
  return feeData.totalFees;
}

function calculateUsdValue(balance, decimals, usdPrice) {
  return (parseFloat(balance) / Math.pow(10, parseInt(decimals))) * parseFloat(usdPrice);
}

function formatFeesByNetwork(feeData) {
  return Object.entries(feeData.feesByNetwork).map(([network, fee]) => ({
    network,
    fee,
    percentage: (fee / feeData.totalFees) * 100
  }));
}

function formatFeesByType(feeData) {
  return Object.entries(feeData.feesByType).map(([type, fee]) => ({
    type,
    fee,
    percentage: (fee / feeData.totalFees) * 100
  }));
}

function getChainId(network) {
  const chainIds = {
    'ethereum': 1,
    'polygon': 137,
    'bsc': 56,
    'avalanche': 43114,
    'optimism': 10,
    'arbitrum': 42161,
    'base': 8453
  };
  return chainIds[network] || 1;
}

function getNativeTokenAddress(network) {
  // Placeholder native token addresses for price lookup
  const addresses = {
    'ethereum': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    'polygon': '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WMATIC
    'bsc': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // WBNB
    'optimism': '0x4200000000000000000000000000000000000006', // WETH on Optimism
    'arbitrum': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' // WETH on Arbitrum
  };
  return addresses[network] || addresses['ethereum'];
}

function getNativeTokenName(network) {
  const names = {
    'ethereum': 'Ethereum',
    'polygon': 'Polygon',
    'bsc': 'BNB Chain',
    'avalanche': 'Avalanche',
    'optimism': 'Ethereum',
    'arbitrum': 'Ethereum',
    'base': 'Ethereum'
  };
  return names[network] || 'Unknown';
}

function getNativeTokenSymbol(network) {
  const symbols = {
    'ethereum': 'ETH',
    'polygon': 'MATIC',
    'bsc': 'BNB',
    'avalanche': 'AVAX',
    'optimism': 'ETH',
    'arbitrum': 'ETH',
    'base': 'ETH'
  };
  return symbols[network] || 'ETH';
}

function getDateMonthsAgo(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
}

// Start the server
app.listen(PORT, () => {
  console.log(`Wallet Dashboard API running on port ${PORT}`);
});

module.exports = app; // For serverless deployments
