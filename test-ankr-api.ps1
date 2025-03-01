# test-ankr-api.ps1 - PowerShell script to test the Ankr API endpoint

# Function to check if server is running on port 3000
function Test-ServerRunning {
    try {
        $connection = New-Object System.Net.Sockets.TcpClient('localhost', 3000)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

Write-Host "======== Ankr Advanced API Test ========" -ForegroundColor Yellow

# Check if server is running on port 3000
if (Test-ServerRunning) {
    Write-Host "API server is already running on port 3000" -ForegroundColor Green
} else {
    Write-Host "Starting API server..." -ForegroundColor Yellow
    Write-Host "The server will be started in a new window. Close that window when finished." -ForegroundColor Red
    
    # Check if .env file exists
    if (-not (Test-Path -Path .\.env)) {
        Write-Host "Creating sample .env file..." -ForegroundColor Yellow
        Copy-Item .\.env.example .\.env
        Write-Host ".env file created from example. Edit it to add your real API keys." -ForegroundColor Green
    }
    
    # Start server in a new window
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm start"
    
    # Wait for server to start
    Write-Host "Waiting for server to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Check if the API is running
Write-Host "Checking API status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/status" -UseBasicParsing
    if ($response.Content -match "operational") {
        Write-Host "API is operational!" -ForegroundColor Green
        
        # Run the Ankr API test
        Write-Host "`nRunning Ankr API test..." -ForegroundColor Yellow
        node tests/ankr-api-test.js
        
        # Ask if user wants to test all endpoints
        $testAll = Read-Host "`nDo you want to test all wallet balance endpoints? (y/n)"
        
        if ($testAll -eq "y" -or $testAll -eq "Y") {
            Write-Host "`nRunning all wallet balance API tests..." -ForegroundColor Yellow
            node tests/wallet-balance-apis-test.js
        }
    } else {
        Write-Host "API is not responding properly." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "API is not responding. Make sure the server is running correctly." -ForegroundColor Red
    exit 1
}

Write-Host "`nTests completed!" -ForegroundColor Green
Write-Host "The API server is still running in a separate window." -ForegroundColor Yellow
Write-Host "Close that window when you're finished testing." -ForegroundColor Yellow 