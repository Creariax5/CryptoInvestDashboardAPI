#!/bin/bash
# test-ankr-api.sh - Script to test the Ankr API endpoint

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}======== Ankr Advanced API Test ========${NC}"

# Check if server is running on port 3000
if nc -z localhost 3000 2>/dev/null; then
    echo -e "${GREEN}API server is already running on port 3000${NC}"
else
    echo -e "${YELLOW}Starting API server...${NC}"
    echo -e "The server will be started in background. To stop it later, use: ${RED}npx kill-port 3000${NC}"
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating sample .env file...${NC}"
        cp .env.example .env
        echo -e "${GREEN}.env file created from example. Edit it to add your real API keys.${NC}"
    fi
    
    # Start server in background
    npm start &
    
    # Save PID to kill it later if needed
    SERVER_PID=$!
    
    # Wait for server to start
    echo -e "${YELLOW}Waiting for server to start...${NC}"
    sleep 5
fi

# Check if the API is running
echo -e "${YELLOW}Checking API status...${NC}"
if curl -s http://localhost:3000/api/status | grep -q "operational"; then
    echo -e "${GREEN}API is operational!${NC}"
    
    # Run the Ankr API test
    echo -e "\n${YELLOW}Running Ankr API test...${NC}"
    node tests/ankr-api-test.js
    
    # Ask if user wants to test all endpoints
    echo -e "\n${YELLOW}Do you want to test all wallet balance endpoints? (y/n)${NC}"
    read -r test_all
    
    if [[ "$test_all" =~ ^[Yy]$ ]]; then
        echo -e "\n${YELLOW}Running all wallet balance API tests...${NC}"
        node tests/wallet-balance-apis-test.js
    fi
else
    echo -e "${RED}API is not responding. Make sure the server is running correctly.${NC}"
    # Kill the server process if we started it
    if [ -n "$SERVER_PID" ]; then
        kill $SERVER_PID
        echo -e "${YELLOW}Server process killed.${NC}"
    fi
    exit 1
fi

echo -e "\n${GREEN}Tests completed!${NC}"
echo -e "${YELLOW}The API server is still running in the background.${NC}"
echo -e "To stop it, use: ${RED}npx kill-port 3000${NC}" 