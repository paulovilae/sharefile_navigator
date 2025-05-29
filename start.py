import subprocess
import sys
import os
import time
import venv
import shutil
import threading

# Helper to detect platform
is_windows = sys.platform.startswith('win')

# Define paths
backend_port = 8000
frontend_port = 5175
base_dir = os.path.dirname(__file__)
backend_dir = os.path.join(base_dir, 'backend')
frontend_dir = os.path.join(base_dir, 'frontend')
venv_dir = os.path.join(base_dir, '.venv-gpu')
backend_requirements = os.path.join(backend_dir, 'requirements.txt')

def run_command(command: list[str], cwd: str | None = None, shell: bool = False, check: bool = True, capture_output: bool = False) -> subprocess.CompletedProcess:
    """
    Runs a shell command and handles errors.
    """
    try:
        print(f"Executing command: {' '.join(command)} in {cwd if cwd else 'current directory'}")
        process = subprocess.run(command, cwd=cwd, shell=shell, check=check, capture_output=capture_output, text=True)
        if capture_output:
            print(process.stdout)
            if process.stderr:
                print(process.stderr)
        return process
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {e}")
        if e.stdout:
            print(f"Stdout: {e.stdout}")
        if e.stderr:
            print(f"Stderr: {e.stderr}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"Error: Command not found. Please ensure '{command[0]}' is in your PATH.")
        sys.exit(1)

def kill_process_on_port(port: int) -> None:
    """
    Checks for and kills processes running on the specified port.
    """
    print(f"Checking for processes on port {port}...")
    if is_windows:
        # Find the PID using netstat, then kill it
        find_pid_command = f'for /f "tokens=5" %a in (\'netstat -aon ^| findstr :{port}\') do taskkill /F /PID %a'
        subprocess.call(find_pid_command, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        # Unix: lsof to find and kill
        subprocess.call(f"fuser -k {port}/tcp", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Stop any running servers on backend and frontend ports
kill_process_on_port(backend_port)
kill_process_on_port(frontend_port)

# --- Virtual Environment Management ---
print("Ensuring Python virtual environment is set up...")
if not os.path.exists(venv_dir):
    print(f"Creating virtual environment at {venv_dir}...")
    venv.create(venv_dir, with_pip=True, symlinks=True)
    print("Virtual environment created.")
else:
    print("Virtual environment already exists.")

# Determine Python executable within the virtual environment
if is_windows:
    python_executable = os.path.join(venv_dir, 'Scripts', 'python.exe')
    pip_executable = os.path.join(venv_dir, 'Scripts', 'pip.exe')
else:
    python_executable = os.path.join(venv_dir, 'bin', 'python')
    pip_executable = os.path.join(venv_dir, 'bin', 'pip')

if not os.path.exists(python_executable):
    print(f"Error: Python executable not found in virtual environment at {python_executable}")
    sys.exit(1)

# --- Install Backend Dependencies ---
print("Installing backend dependencies...")
run_command([pip_executable, 'install', '-r', backend_requirements, '--cache-dir', os.path.join(base_dir, '.pip_cache')])
print("Backend dependencies installed.")

# --- Install Frontend Dependencies ---
print("Installing frontend dependencies...")
run_command(['npm', 'install'], cwd=frontend_dir, shell=is_windows)
print("Frontend dependencies installed.")

# --- Start Backend and Frontend Concurrently ---
print("Starting backend and frontend servers...")

# Set PYTHONPATH for the backend process
backend_env = os.environ.copy()
if 'PYTHONPATH' in backend_env:
    backend_env['PYTHONPATH'] = backend_dir + os.pathsep + backend_env['PYTHONPATH']
else:
    backend_env['PYTHONPATH'] = backend_dir

# Backend command
backend_cmd = [python_executable, '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', f'--port={backend_port}', '--reload']

# Frontend command
frontend_cmd = ['npm', 'run', 'dev']

# Function to run a process and print its output
def run_process(name: str, cmd: list[str], cwd: str, env: dict | None = None, shell: bool = False) -> None:
    print(f"Starting {name}...")
    process = subprocess.Popen(cmd, cwd=cwd, env=env, shell=shell)
    try:
        process.wait()
    except KeyboardInterrupt:
        print(f"Shutting down {name}...")
        process.terminate()

# Start processes in separate threads
backend_thread = threading.Thread(target=run_process, args=("Backend", backend_cmd, backend_dir, backend_env, False))
frontend_thread = threading.Thread(target=run_process, args=("Frontend", frontend_cmd, frontend_dir, None, is_windows))

backend_thread.start()
frontend_thread.start()

print(f'Backend started at: http://127.0.0.1:{backend_port}')
print(f'Frontend started at: http://localhost:{frontend_port}')
print("Application startup complete. Press Ctrl+C to shut down.")

try:
    backend_thread.join()
    frontend_thread.join()
except KeyboardInterrupt:
    print('Shutting down application...')
    # Threads will terminate when their processes are terminated by run_process
    sys.exit(0)