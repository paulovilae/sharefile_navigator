@echo off
setlocal enabledelayedexpansion

:: Default values
set MODE=dev
set BUILD=
set STOP=false
set NO_BUILDKIT=false

:: Parse command line arguments
:parse_args
if "%~1"=="" goto :end_parse_args
if "%~1"=="-d" set MODE=dev& goto :next_arg
if "%~1"=="--dev" set MODE=dev& goto :next_arg
if "%~1"=="-p" set MODE=prod& goto :next_arg
if "%~1"=="--prod" set MODE=prod& goto :next_arg
if "%~1"=="-b" set BUILD=--build& goto :next_arg
if "%~1"=="--build" set BUILD=--build& goto :next_arg
if "%~1"=="-s" set STOP=true& goto :next_arg
if "%~1"=="--stop" set STOP=true& goto :next_arg
if "%~1"=="--no-buildkit" set NO_BUILDKIT=true& goto :next_arg
if "%~1"=="-nb" set NO_BUILDKIT=true& goto :next_arg
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help

echo Unknown option: %~1
goto :show_help

:next_arg
shift
goto :parse_args

:end_parse_args

:: Display header
echo Docker Container Runner for OCR Application
echo ===========================================
echo.

:: Check if Docker is running
docker info > nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: Docker is not running or not installed.
    echo Please start Docker and try again.
    exit /b 1
)

:: Check if NVIDIA Docker runtime is available
nvidia-smi > nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo WARNING: NVIDIA drivers not detected. GPU acceleration may not be available.
) else (
    echo NVIDIA GPU detected. GPU acceleration will be available.
)

:: Stop containers if requested
if "%STOP%"=="true" (
    echo Stopping containers...
    if "%MODE%"=="prod" (
        docker-compose -f docker-compose.prod.yml down
    ) else (
        docker-compose down
    )
    echo Containers stopped.
    exit /b 0
)

:: Ensure dependencies are in requirements.txt
echo Checking dependencies in requirements.txt...
set "HTTPX_FOUND="
set "PSUTIL_FOUND="

for /f "tokens=*" %%a in (backend\requirements.txt) do (
    echo %%a | findstr /i "httpx" > nul && set "HTTPX_FOUND=1"
    echo %%a | findstr /i "psutil" > nul && set "PSUTIL_FOUND=1"
)

if not defined HTTPX_FOUND (
    echo Adding httpx to requirements.txt...
    echo httpx  # HTTP client for async API calls >> backend\requirements.txt
)

if not defined PSUTIL_FOUND (
    echo Adding psutil to requirements.txt...
    echo psutil  # System monitoring utilities >> backend\requirements.txt
)

:: Configure BuildKit (enabled by default for faster builds)
if "%NO_BUILDKIT%"=="true" (
    echo BuildKit disabled as requested. Builds may be slower but more compatible.
    set COMPOSE_DOCKER_CLI_BUILD=0
    set DOCKER_BUILDKIT=0
) else (
    echo BuildKit enabled for faster builds. Use --no-buildkit if you encounter issues.
    set COMPOSE_DOCKER_CLI_BUILD=1
    set DOCKER_BUILDKIT=1
)

:: Always stop existing containers first to avoid conflicts
echo Stopping any existing containers...
if "%MODE%"=="prod" (
    docker-compose -f docker-compose.prod.yml down
) else (
    docker-compose down
)
echo Existing containers stopped.

:: Start containers
if "%MODE%"=="prod" (
    echo Starting in PRODUCTION mode...
    docker-compose -f docker-compose.prod.yml up -d %BUILD%
    
    :: Wait a bit for the container to start
    echo Waiting for containers to start...
    timeout /t 10 /nobreak > nul
    
    :: Check if the backend container is running
    docker ps --filter "name=ocr2-backend" --format "{{.Names}}" > temp.txt
    set /p CONTAINER_RUNNING=<temp.txt
    del temp.txt
    
    if defined CONTAINER_RUNNING (
        :: Install the missing dependencies directly in the container
        echo Installing missing dependencies in the backend container...
        docker exec ocr2-backend-1 pip3 install httpx psutil
        
        :: Restart the backend container to apply changes
        echo Restarting the backend container...
        docker restart ocr2-backend-1
        
        echo Production containers started successfully!
        echo Frontend available at: http://localhost
        echo Backend API available at: http://localhost/api
    ) else (
        echo Error: Backend container failed to start. Check Docker logs for details.
        echo Run: docker-compose -f docker-compose.prod.yml logs
        exit /b 1
    )
) else (
    echo Starting in DEVELOPMENT mode...
    
    :: Start containers in foreground to show logs
    docker-compose up %BUILD%
    
    :: Note: The following code will only execute if the docker-compose command is interrupted
    echo Development containers stopped.
)

echo.
echo To see the logs, run: docker logs -f ocr2-backend-1

exit /b 0

:show_help
echo Docker Container Runner for OCR Application
echo ===========================================
echo.
echo This script starts the Docker containers with automatic dependency handling.
echo.
echo Usage: docker-run.bat [OPTIONS]
echo.
echo Options:
echo   -d, --dev         Start in development mode (default)
echo   -p, --prod        Start in production mode
echo   -b, --build       Force rebuild of containers
echo   -s, --stop        Stop running containers
echo   -nb, --no-buildkit Disable BuildKit for Docker builds (slower but more compatible)
echo   -h, --help        Show this help message
echo.
echo Examples:
echo   docker-run.bat              # Start in development mode
echo   docker-run.bat -p           # Start in production mode
echo   docker-run.bat -b           # Force rebuild in development mode
echo   docker-run.bat -p -b        # Force rebuild in production mode
echo   docker-run.bat -s           # Stop all containers
echo.
exit /b 0