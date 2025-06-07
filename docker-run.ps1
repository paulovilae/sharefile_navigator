param (
    [switch]$dev,
    [switch]$prod,
    [switch]$build,
    [switch]$stop,
    [switch]$help,
    [switch]$noBuildKit
)

# Show help if requested
if ($help) {
    Write-Host "Docker Container Runner for OCR Application"
    Write-Host "==========================================="
    Write-Host ""
    Write-Host "This script starts the Docker containers with automatic dependency handling."
    Write-Host ""
    Write-Host "Usage: .\docker-run.ps1 [-dev] [-prod] [-build] [-stop] [-noBuildKit] [-help]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -dev         Start in development mode (default)"
    Write-Host "  -prod        Start in production mode"
    Write-Host "  -build       Force rebuild of containers"
    Write-Host "  -stop        Stop running containers"
    Write-Host "  -noBuildKit  Disable BuildKit for Docker builds (slower but more compatible)"
    Write-Host "  -help        Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\docker-run.ps1              # Start in development mode"
    Write-Host "  .\docker-run.ps1 -prod        # Start in production mode"
    Write-Host "  .\docker-run.ps1 -build       # Force rebuild in development mode"
    Write-Host "  .\docker-run.ps1 -prod -build # Force rebuild in production mode"
    Write-Host "  .\docker-run.ps1 -stop        # Stop all containers"
    exit
}

# Default to dev mode if neither is specified
if (-not $prod) {
    $dev = $true
}

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "Error: Docker is not running or not installed."
    Write-Host "Please start Docker and try again."
    exit 1
}

# Check if NVIDIA Docker runtime is available
try {
    nvidia-smi | Out-Null
    Write-Host "NVIDIA GPU detected. GPU acceleration will be available."
} catch {
    Write-Host "WARNING: NVIDIA drivers not detected. GPU acceleration may not be available."
}

# Stop containers if requested
if ($stop) {
    Write-Host "Stopping containers..."
    if ($prod) {
        docker-compose -f docker-compose.prod.yml down
    } else {
        docker-compose down
    }
    Write-Host "Containers stopped."
    exit 0
}

# Ensure dependencies are in requirements.txt
$requirementsPath = "backend/requirements.txt"
$requirements = Get-Content $requirementsPath

# Check if httpx is already in requirements.txt
if (-not ($requirements -match "httpx")) {
    Write-Host "Adding httpx to requirements.txt..."
    Add-Content -Path $requirementsPath -Value "httpx  # HTTP client for async API calls"
}

# Check if psutil is already in requirements.txt
if (-not ($requirements -match "psutil")) {
    Write-Host "Adding psutil to requirements.txt..."
    Add-Content -Path $requirementsPath -Value "psutil  # System monitoring utilities"
}

# Configure BuildKit (enabled by default for faster builds)
if ($noBuildKit) {
    Write-Host "BuildKit disabled as requested. Builds may be slower but more compatible."
    $env:COMPOSE_DOCKER_CLI_BUILD = 0
    $env:DOCKER_BUILDKIT = 0
} else {
    Write-Host "BuildKit enabled for faster builds. Use -noBuildKit if you encounter issues."
    $env:COMPOSE_DOCKER_CLI_BUILD = 1
    $env:DOCKER_BUILDKIT = 1
}

# Build flag
$buildFlag = if ($build) { "--build" } else { "" }

# Always stop existing containers first to avoid conflicts
Write-Host "Stopping any existing containers..."
if ($prod) {
    docker-compose -f docker-compose.prod.yml down
} else {
    docker-compose down
}
Write-Host "Existing containers stopped."

# Start containers
if ($prod) {
    Write-Host "Starting in PRODUCTION mode..."
    docker-compose -f docker-compose.prod.yml up -d $buildFlag
    
    # Wait a bit for the container to start
    Write-Host "Waiting for containers to start..."
    Start-Sleep -Seconds 10
    
    # Check if the backend container is running
    $containerRunning = docker ps --filter "name=ocr2-backend" --format "{{.Names}}"
    
    if ($containerRunning) {
        # Install the missing dependencies directly in the container
        Write-Host "Installing missing dependencies in the backend container..."
        docker exec ocr2-backend-1 pip3 install httpx psutil
        
        # Restart the backend container to apply changes
        Write-Host "Restarting the backend container..."
        docker restart ocr2-backend-1
        
        Write-Host "Production containers started successfully!"
        Write-Host "Frontend available at: http://localhost"
        Write-Host "Backend API available at: http://localhost/api"
    } else {
        Write-Host "Error: Backend container failed to start. Check Docker logs for details."
        Write-Host "Run: docker-compose -f docker-compose.prod.yml logs"
        exit 1
    }
} else {
    Write-Host "Starting in DEVELOPMENT mode..."
    
    # Start containers in foreground to show logs
    if ($build) {
        docker-compose up --build
    } else {
        docker-compose up
    }
    
    # Note: The following code will only execute if the docker-compose command is interrupted
    Write-Host "Development containers stopped."
}

Write-Host ""
Write-Host "To see the logs, run: docker logs -f ocr2-backend-1"