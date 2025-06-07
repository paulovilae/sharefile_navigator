#!/bin/bash

# Function to display help message
show_help() {
    echo "Docker Container Runner for OCR Application"
    echo "==========================================="
    echo ""
    echo "This script starts the Docker containers with automatic dependency handling."
    echo ""
    echo "Usage: ./docker-run.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --dev         Start in development mode (default)"
    echo "  -p, --prod        Start in production mode"
    echo "  -b, --build       Force rebuild of containers"
    echo "  -s, --stop        Stop running containers"
    echo "  -nb, --no-buildkit Disable BuildKit for Docker builds (slower but more compatible)"
    echo "  -h, --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./docker-run.sh              # Start in development mode"
    echo "  ./docker-run.sh -p           # Start in production mode"
    echo "  ./docker-run.sh -b           # Force rebuild in development mode"
    echo "  ./docker-run.sh -p -b        # Force rebuild in production mode"
    echo "  ./docker-run.sh -s           # Stop all containers"
    echo ""
}

# Default values
MODE="dev"
BUILD=""
STOP=false
NO_BUILDKIT=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--dev)
            MODE="dev"
            shift
            ;;
        -p|--prod)
            MODE="prod"
            shift
            ;;
        -b|--build)
            BUILD="--build"
            shift
            ;;
        -s|--stop)
            STOP=true
            shift
            ;;
        --no-buildkit|-nb)
            NO_BUILDKIT=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Display header
echo "Docker Container Runner for OCR Application"
echo "==========================================="
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "Error: Docker is not running or not installed."
    echo "Please start Docker and try again."
    exit 1
fi

# Check if NVIDIA Docker runtime is available
if command -v nvidia-smi &> /dev/null && nvidia-smi &> /dev/null; then
    echo "NVIDIA GPU detected. GPU acceleration will be available."
else
    echo "WARNING: NVIDIA drivers not detected. GPU acceleration may not be available."
fi

# Stop containers if requested
if [ "$STOP" = true ]; then
    echo "Stopping containers..."
    if [ "$MODE" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml down
    else
        docker-compose down
    fi
    echo "Containers stopped."
    exit 0
fi

# Ensure dependencies are in requirements.txt
echo "Checking dependencies in requirements.txt..."
REQUIREMENTS_PATH="backend/requirements.txt"

if ! grep -q "httpx" "$REQUIREMENTS_PATH"; then
    echo "Adding httpx to requirements.txt..."
    echo "httpx  # HTTP client for async API calls" >> "$REQUIREMENTS_PATH"
fi

if ! grep -q "psutil" "$REQUIREMENTS_PATH"; then
    echo "Adding psutil to requirements.txt..."
    echo "psutil  # System monitoring utilities" >> "$REQUIREMENTS_PATH"
fi

# Configure BuildKit (enabled by default for faster builds)
if [ "$NO_BUILDKIT" = true ]; then
    echo "BuildKit disabled as requested. Builds may be slower but more compatible."
    export COMPOSE_DOCKER_CLI_BUILD=0
    export DOCKER_BUILDKIT=0
else
    echo "BuildKit enabled for faster builds. Use --no-buildkit if you encounter issues."
    export COMPOSE_DOCKER_CLI_BUILD=1
    export DOCKER_BUILDKIT=1
fi

# Always stop existing containers first to avoid conflicts
echo "Stopping any existing containers..."
if [ "$MODE" = "prod" ]; then
    docker-compose -f docker-compose.prod.yml down
else
    docker-compose down
fi
echo "Existing containers stopped."

# Start containers
if [ "$MODE" = "prod" ]; then
    echo "Starting in PRODUCTION mode..."
    docker-compose -f docker-compose.prod.yml up -d $BUILD
    
    # Wait a bit for the container to start
    echo "Waiting for containers to start..."
    sleep 10
    
    # Check if the backend container is running
    CONTAINER_RUNNING=$(docker ps --filter "name=ocr2-backend" --format "{{.Names}}")
    
    if [ -n "$CONTAINER_RUNNING" ]; then
        # Install the missing dependencies directly in the container
        echo "Installing missing dependencies in the backend container..."
        docker exec ocr2-backend-1 pip3 install httpx psutil
        
        # Restart the backend container to apply changes
        echo "Restarting the backend container..."
        docker restart ocr2-backend-1
        
        echo "Production containers started successfully!"
        echo "Frontend available at: http://localhost"
        echo "Backend API available at: http://localhost/api"
    else
        echo "Error: Backend container failed to start. Check Docker logs for details."
        echo "Run: docker-compose -f docker-compose.prod.yml logs"
        exit 1
    fi
else
    echo "Starting in DEVELOPMENT mode..."
    
    # Start containers in foreground to show logs
    docker-compose up $BUILD
    
    # Note: The following code will only execute if the docker-compose command is interrupted
    echo "Development containers stopped."
fi

echo ""
echo "To see the logs, run: docker logs -f ocr2-backend-1"