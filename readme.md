# Crypto Invest Dashboard API

A comprehensive API for fetching cryptocurrency wallet data across multiple chains and data providers.

## Features

- Multi-chain wallet data retrieval
- Support for multiple data providers:
  - Moralis
  - Covalent (GoldRush)
  - Ankr Advanced API
  - Alchemy
  - The Graph
- Token balances
- Transaction history
- DeFi positions
- Gas fee analysis

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your API keys:
   ```
   cp .env.example .env
   ```
4. Start the server:
   ```
   npm start
   ```

## API Endpoints

### Dashboard

- `GET /api/dashboard/wallet` - Get comprehensive wallet dashboard data
  - Query parameters:
    - `address` - Wallet address (required)
    - `networks` - Comma-separated list of networks (optional, default: ethereum,polygon,bsc,optimism,arbitrum)

### Token Balances

#### Covalent (GoldRush)

- `GET /api/goldrush/balances` - Get token balances using Covalent API
  - Query parameters:
    - `address` - Wallet address (required)
    - `networks` - Comma-separated list of networks (optional, default: ethereum)

#### Ankr Advanced API

- `GET /api/ankr/balances` - Get token balances using Ankr Multi-chain API
  - Query parameters:
    - `address` - Wallet address (required)
    - `networks` - Comma-separated list of networks (optional, default: ethereum)
  - Features:
    - Single entry point for all supported blockchains
    - Query archive data at near-instant speeds
    - Interact with multiple chains in a single request
    - Supports over 70 blockchains including EVM and non-EVM chains
  - Available SDKs:
    - JavaScript: `npm install @ankr.com/ankr.js`
    - Python: `pip install ankr-sdk`
    - React: `npm install @ankr.com/react-hooks`
  - Documentation: https://www.ankr.com/docs/advanced-api/

#### Alchemy

- `GET /api/alchemy/balances` - Get token balances using Alchemy API
  - Query parameters:
    - `address` - Wallet address (required)
    - `networks` - Comma-separated list of networks (optional, default: ethereum)

#### The Graph

- `GET /api/thegraph/balances` - Get token balances using The Graph
  - Query parameters:
    - `address` - Wallet address (required)
    - `networks` - Comma-separated list of networks (optional, default: ethereum)

### Other Endpoints

- `GET /api/status` - Check API status

## Response Format

All API endpoints return data in the following format:

```json
{
  "success": true,
  "address": "0x...",
  "networks": ["ethereum", "polygon"],
  "tokens": [
    {
      "name": "Ethereum",
      "symbol": "ETH",
      "address": "0x...",
      "decimals": 18,
      "balance": 1.5,
      "price": 3000,
      "value": 4500,
      "priceChange24h": 2.5,
      "network": "Ethereum",
      "type": "native",
      "icon": "https://..."
    },
    // More tokens...
  ]
}
```

## Error Handling

In case of an error, the API will return:

```json
{
  "success": false,
  "message": "Error message"
}
```

## Supported Networks

### EVM Networks
- Ethereum (ethereum)
- Polygon (polygon)
- Binance Smart Chain (bsc)
- Optimism (optimism)
- Arbitrum (arbitrum)
- Avalanche (avalanche)
- Fantom (fantom)
- Gnosis (gnosis)
- Base (base)
- Aurora (aurora)
- Celo (celo)
- Cronos (cronos)
- Harmony (harmony)
- Metis (metis)
- Moonbeam (moonbeam)
- Moonriver (moonriver)
- zkSync (zksync)
- Linea (linea)
- Scroll (scroll)
- Mantle (mantle)

### Non-EVM Networks (Ankr only)
- Solana (solana)
- NEAR (near)
- Polkadot (polkadot)
- Kusama (kusama)
- Bitcoin (bitcoin)
- Filecoin (filecoin)
- Cosmos (cosmos)
- Osmosis (osmosis)

Note: Not all networks are supported by all data providers.

## License

ISC