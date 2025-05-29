# Coding Style Guide

*   Always use black for code formatting with a line length of 120 characters.
*   Use type hints in all Python code.
*   Write docstrings for all functions and classes, following the Google style guide.
*   Prioritize using the most common library in the community.
*   When adding new features to websites, ensure they are responsive and accessible.
*   Use console.log for debugging in Javascript code.
*   When executing commands, assume the environment is Windows PowerShell.
*   Always run the backend server from the `ocr/backend` directory.
*   Always run the frontend server from the `ocr/frontend` directory.
*   The Python virtual environment is located at `ocr/.venv-gpu`.

## Terminal and Working Directory Management

When a new terminal is invoked, remember to work in the correct directory:

*   `/frontend` for frontend-related actions.
*   `/backend` for backend-related actions.
*   `.` (the root directory) for global actions related to both servers.

For example:

*   To run the backend (Windows): `cd .\\backend\\ && uvicorn app.main:app --reload --port 8000`
*   For the frontend: `cd frontend && npm run dev`

To verify that the agents are receiving and applying these rules, first install the `roo` command-line tool by running `pip install roo` in a console or terminal. You may encounter dependency conflicts. If so, try upgrading the conflicting packages (`click` and `packaging`) using the following commands:
`pip install --upgrade click`
`pip install --upgrade packaging`
To check the agent logs and verify that the rules are being applied, please consult the `roo` documentation for the correct command and instructions.