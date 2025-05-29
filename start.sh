#!/bin/bash
set -x

# Redirect stderr to stdout
exec 2>&1

# Redirect output to a file

# Log when the script starts
echo "Starting start.sh"

# Function to execute commands and log errors
function execute_command {
  local command="$1"
  local timeout=$2
  echo "Executing: $command"
  if eval "timeout $timeout $command"; then
    echo "Command '$command' executed successfully."
  else
    echo "ERROR: Command '$command' failed. Exiting."
    exit 1
  fi
}

# Backend settings
BACKEND_PORT=8000
# Frontend settings
FRONTEND_PORT=5175

# Export backend port for frontend to use
export VITE_BACKEND_PORT=$BACKEND_PORT

# Change directory to the backend directory
echo "Changing directory to backend"

# Create a virtual environment if one doesn't exist
if [ ! -d "backend/.venv-gpu" ]; then
  echo "Creating virtual environment"
  (cd backend && execute_command "python3 -m venv .venv-gpu" 300) || exit 1
  echo "Virtual environment created successfully."
fi

# Activate the virtual environment
echo "Activating virtual environment"

# Install the dependencies
echo "Installing dependencies"
# Ensure USE_PIP_CACHE is set to true
export USE_PIP_CACHE="true"

if [ "${USE_PIP_CACHE}" != "true" ]; then
  (cd backend && execute_command "pip install --no-cache-dir -v -r requirements.txt" 300)
else
  (cd backend && execute_command "pip install -v -r requirements.txt" 300)
fi
echo "Backend dependencies installed successfully."

# Start the uvicorn server
echo "Starting uvicorn server"
(cd backend && source .venv-gpu/bin/activate && uvicorn app.main:app --reload --port "$BACKEND_PORT") &
backend_pid=$!
echo "Backend server started successfully at http://localhost:$BACKEND_PORT"


# Change directory to the frontend directory
echo "Changing directory to frontend"

# Install the frontend dependencies
echo "Installing frontend dependencies"
(cd frontend && execute_command "npm install" 300) || exit 1
echo "Frontend dependencies installed successfully."

# Start the frontend
echo "Starting frontend"
(cd frontend && npm run dev) &
frontend_pid=$!
echo "Frontend server started successfully at http://localhost:$FRONTEND_PORT"

# Wait for both processes to complete
wait "$backend_pid"
wait "$frontend_pid"

echo "start.sh completed"

echo "start.sh completed"