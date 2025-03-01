// app.js - Express app setup
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { SESSION_SECRET, NODE_ENV } = require('./config/environment');

// Import middleware
const { requestLogger } = require('./middleware/logging');
const { errorHandler } = require('./middleware/error-handler');

// Import routes
const dashboardRoutes = require('./routes/dashboard.routes');
const coinbaseRoutes = require('./routes/coinbase.routes');
const goldrushRoutes = require('./routes/goldrush.routes');
const nftRoutes = require('./routes/nft.routes');
const testRoutes = require('./routes/test.routes');
const ankrRoutes = require('./routes/ankr.routes');
const alchemyRoutes = require('./routes/alchemy.routes');
const thegraphRoutes = require('./routes/thegraph.routes');

// Initialize Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Session for Coinbase OAuth (use a more robust store in production)
app.use(session({
  secret: SESSION_SECRET || 'wallet-dashboard-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: NODE_ENV === 'production' }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/coinbase', coinbaseRoutes);
app.use('/api/goldrush', goldrushRoutes);
app.use('/api/nfts', nftRoutes);
app.use('/api/test', testRoutes);
app.use('/api/ankr', ankrRoutes);
app.use('/api/alchemy', alchemyRoutes);
app.use('/api/thegraph', thegraphRoutes);

// Home route
app.get('/', (req, res) => {
    res.send(`
        <h1>Crypto Invest Dashboard API</h1>
        <p>Welcome to the Crypto Invest Dashboard API. Use the endpoints below to access wallet data.</p>
        <ul>
            <li><a href="/api/dashboard">/api/dashboard</a> - Get comprehensive wallet dashboard data</li>
            <li><a href="/api/goldrush/balances">/api/goldrush/balances</a> - Get token balances using Covalent API</li>
            <li><a href="/api/ankr/balances">/api/ankr/balances</a> - Get token balances using Ankr API</li>
            <li><a href="/api/alchemy/balances">/api/alchemy/balances</a> - Get token balances using Alchemy API</li>
            <li><a href="/api/thegraph/balances">/api/thegraph/balances</a> - Get token balances using The Graph</li>
            <li><a href="/api/status">/api/status</a> - Check API status</li>
        </ul>
    `);
});

// Status endpoint
app.get('/api/status', require('./controllers/status.controller').getApiStatus);

// Developer guide
app.get('/readme', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'readme.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: true,
    error_message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;