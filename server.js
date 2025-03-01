// server.js - Main entry point
const app = require('./app');
const { PORT } = require('./config/environment');

// Start the server
app.listen(PORT, () => {
  console.log(`Wallet Dashboard API running on port ${PORT}`);
  console.log(`Try the API: http://localhost:${PORT}`);
});