import subprocess
import sys
import os
import time

# Helper to detect platform
is_windows = sys.platform.startswith('win')

# Backend venv activation (optional, user should activate manually if needed)
backend_port = 8000
frontend_port = 3000
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')

def kill_process_on_port(port):
    print(f"Checking for processes on port {port}...")
    if is_windows:
        # Find the PID using netstat, then kill it
        find_pid = f'for /f "tokens=5" %a in (\"netstat -aon | findstr :{port}\") do taskkill /F /PID %a'
        subprocess.call(find_pid, shell=True)
    else:
        # Unix: lsof to find and kill
        subprocess.call(f"fuser -k {port}/tcp", shell=True)

# Stop any running servers on backend and frontend ports
kill_process_on_port(backend_port)
kill_process_on_port(frontend_port)

# Set PYTHONPATH to backend for backend process
env = os.environ.copy()
if 'PYTHONPATH' in env:
    env['PYTHONPATH'] = backend_dir + os.pathsep + env['PYTHONPATH']
else:
    env['PYTHONPATH'] = backend_dir

# Start backend (using correct app path)
backend_cmd = [sys.executable, '-m', 'uvicorn', 'app.main:app', '--reload']
backend_proc = subprocess.Popen(backend_cmd, cwd=os.path.dirname(__file__), env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

# Wait briefly to check if backend starts successfully
time.sleep(3)
if backend_proc.poll() is not None:
    out, err = backend_proc.communicate()
    print('Backend failed to start!')
    print('--- Backend stdout ---')
    print(out.decode())
    print('--- Backend stderr ---')
    print(err.decode())
    sys.exit(1)

# Start frontend
frontend_cmd = ['npm', 'start']
frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir, shell=is_windows)

print('Backend and frontend are starting...')
print('Backend: http://127.0.0.1:8000')
print('Frontend: http://localhost:3000 (or as configured)')

try:
    backend_proc.wait()
    frontend_proc.wait()
except KeyboardInterrupt:
    print('Shutting down...')
    backend_proc.terminate()
    frontend_proc.terminate() 