# Wallet Dashboard API Deployment Guide

This guide explains how to deploy the Express.js Wallet Dashboard API to Vercel.

## Prerequisites

1. [Node.js](https://nodejs.org/) 14.x or later
2. [Vercel CLI](https://vercel.com/download) installed (`npm i -g vercel`)
3. A Vercel account
4. API keys from Moralis, Covalent, and Coinbase (if using Coinbase integration)

## Local Development

1. Clone the repository and navigate to the project folder
2. Create a `.env` file based on `.env.example`
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. The API will be available at `http://localhost:3000`

## Deploying to Vercel

### Option 1: Using Vercel CLI (Recommended for first deployment)

1. Make sure you're logged in to Vercel CLI:
   ```bash
   vercel login
   ```

2. Deploy from the project directory:
   ```bash
   vercel
   ```

3. Follow the prompts to set up the project.

4. When prompted to add environment variables, add all the variables from your `.env` file.

5. Once deployed, you'll get a URL for your API.

### Option 2: Using Vercel Dashboard

1. Push your code to a GitHub, GitLab, or Bitbucket repository

2. Go to [Vercel Dashboard](https://vercel.com/dashboard)

3. Click "New Project"

4. Import your repository

5. Configure the project:
   - Framework Preset: `Other`
   - Root Directory: `./` (or appropriate directory if in a monorepo)
   - Build Command: `npm install`
   - Output Directory: `.`

6. Add environment variables from your `.env` file

7. Click "Deploy"

## Setting Environment Variables

Make sure to set the following environment variables in the Vercel project settings:

- `PORT`: Not required for Vercel, it will manage the port automatically
- `NODE_ENV`: Set to `production` for production deployments
- `API_BASE_URL`: Your deployed API URL (e.g., `https://your-api.vercel.app`)
- `FRONTEND_URL`: URL of your frontend app
- `SESSION_SECRET`: Secret key for session management
- `MORALIS_API_KEY`: Your Moralis API key
- `COVALENT_API_KEY`: Your Covalent API key
- `COINBASE_CLIENT_ID`: Your Coinbase OAuth client ID (if using Coinbase integration)
- `COINBASE_CLIENT_SECRET`: Your Coinbase OAuth client secret (if using Coinbase integration)

## Session Management for Production

For production, you should use a more robust session store instead of the default memory store:

1. Install a compatible session store (example using Redis):
   ```bash
   npm install connect-redis redis
   ```

2. Update `index.js` to use the Redis store:
   ```javascript
   const session = require('express-session');
   const RedisStore = require('connect-redis').default;
   const { createClient } = require('redis');

   // Initialize Redis client
   const redisClient = createClient({
     url: process.env.REDIS_URL
   });
   redisClient.connect().catch(console.error);

   // Initialize session middleware with Redis store
   app.use(session({
     store: new RedisStore({ client: redisClient }),
     secret: process.env.SESSION_SECRET,
     resave: false,
     saveUninitialized: false,
     cookie: { 
       secure: process.env.NODE_ENV === 'production',
       maxAge: 24 * 60 * 60 * 1000 // 1 day
     }
   }));
   ```

3. Add `REDIS_URL` to your environment variables with a connection string to your Redis instance.

## Troubleshooting

If you encounter issues during deployment:

1. Check the Vercel deployment logs in your dashboard

2. Verify all environment variables are correctly set

3. For Coinbase OAuth issues, ensure the redirect URI in your Coinbase app settings matches your API's callback URL: `https://your-api.vercel.app/api/coinbase/callback`

4. For CORS issues, make sure your frontend domain is properly configured in the CORS middleware

## Monitoring and Scaling

- Monitor API usage through Vercel Analytics
- Add proper error logging using services like Sentry
- For high-traffic applications, consider adding a caching layer