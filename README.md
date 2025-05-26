# SharePoint OCR File Explorer

A modern web application for browsing, searching, and previewing files in SharePoint document libraries, with backend OCR processing support.

---

## Features

### File Explorer (Frontend)
- **SharePoint Library Browser:** Browse all available document libraries and their folder structures.
- **File Table View:** See files in the current folder with columns for Name, Size, Created, Modified, Created By, Modified By, and Preview.
- **Sorting:** Click up/down arrows in the table header to sort by Name, Size, Created, or Modified (ascending/descending, with active/inactive arrow coloring).
- **Filtering:** Filter files by Name, Created By, or Modified By using text boxes under the table header. Filtering is debounced for a smooth, hot-reload experience.
- **Pagination:** Choose number of rows per page and navigate between pages.
- **File Download:** Click a file name to download it directly.
- **File Preview:** Click the preview icon to open a side drawer with:
  - PDF preview (inline)
  - Image preview (inline)
  - CSV preview (table)
  - Text/Markdown preview (formatted)
  - Download link for Office files and other unsupported types
- **Responsive UI:** Built with React, Material UI, and React-Admin for a modern, accessible experience.

### Backend (FastAPI)
- **SharePoint Integration:** Connects to Microsoft Graph API to list libraries, folders, and files.
- **Filtering & Sorting:** All file filtering and sorting is handled server-side for efficiency.
- **File Content Endpoint:** Streams file content for download or preview.
- **Health Check:** `/health` endpoint for backend status.
- **CORS Support:** Configured for local frontend-backend development.

### OCR Processing (Python)
- **OCR Pipeline:** (Pluggable) Python scripts for processing PDF files with OCR, ready for integration with the SharePoint backend.

### Modular Block Workflow System (Backend)
- **Block Categories:** Organize block templates into logical groups (e.g., File Managers, Processors).
- **Block Templates:** Define reusable block types (e.g., PDF Converter, OCR, File Uploader) with config schema and UI hints.
- **Workflows:** User-defined sequences of blocks, supporting complex document processing flows.
- **Workflow Blocks:** Instances of block templates within a workflow, with per-workflow config and ordering.
- **Block Executions:** Stores execution runs, logs, errors, timestamps, and results for each block in a workflow.
- **Admin CRUD:** Full API for managing categories, templates, workflows, workflow blocks, and executions.
- **Swagger UI Grouping:** All block-related endpoints are grouped in the API docs for easy navigation.

---

## Platform Structure

```
ocr/
├── backend/
│   └── app/
│       ├── main.py            # FastAPI app entrypoint, CORS, health check
│       └── api/
│           └── sharepoint.py  # SharePoint API endpoints (libraries, folders, files, file_content)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main React app, file explorer logic
│   │   ├── CustomAppBar.js    # Custom top bar
│   │   └── ...                # Other React components and styles
│   ├── public/
│   ├── package.json
│   └── README.md
├── ocr_pipeline.py            # OCR processing script (standalone)
├── test_connection.py         # SharePoint connection and file download test
├── test_sql_connection.py     # SQL connection test
├── start.py                   # Script to start both backend and frontend
├── requirements.txt           # Top-level Python requirements
└── .env                       # Environment variables (not committed)
```

---

## Setup & Usage

### Prerequisites

- Python 3.8+
- Node.js 18+

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # On Windows
source .venv/bin/activate  # On Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Backend Setup with GPU (CUDA) Support

1. **Install Python 3.11 or 3.12**
   - Download from [python.org](https://www.python.org/downloads/).

2. **Create a virtual environment (from the project root):**
   ```sh
   py -3.11 -m venv .venv-gpu
   .venv-gpu\Scripts\activate  # On Windows
   # or
   source .venv-gpu/bin/activate  # On Mac/Linux
   ```

3. **Install backend dependencies with CUDA support:**
   ```sh
   pip install -r backend/requirements.txt --extra-index-url https://download.pytorch.org/whl/cu121
   ```
   - This will install torch and torchvision with CUDA 12.1 support for GPU acceleration.

4. **Start the backend (from the project root):**
   ```sh
   uvicorn backend.app.main:app --reload
   ```

5. **Verify GPU is available in PyTorch:**
   ```sh
   python -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('Device:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')"
   ```
   - You should see `CUDA available: True` and your GPU name.

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

### One-Click Start

You can use the provided `start.py` script to start both servers:

```bash
python start.py
```

### Environment Variables

Create a `.env` file in the root with your Microsoft Graph API credentials and SharePoint site info:

```
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
TENANT_ID=your-tenant-id
SHAREPOINT_SITE=your-tenant.sharepoint.com
SHAREPOINT_SITE_NAME=YourSiteName
```

---

## API Endpoints

- `GET /api/sharepoint/libraries` — List document libraries
- `GET /api/sharepoint/folders` — List folders in a library/folder
- `GET /api/sharepoint/files` — List files (supports filtering and sorting)
- `GET /api/sharepoint/file_content` — Download/preview file content
- `GET /health` — Backend health check

### Block Workflow API Endpoints

All endpoints are available under `/api/blocks/` and grouped in the Swagger UI as follows:

- **Block Categories**
  - `GET /block_categories` — List categories
  - `POST /block_category` — Create category
  - `GET /block_category/{cat_id}` — Get category
  - `PUT /block_category/{cat_id}` — Update category
  - `DELETE /block_category/{cat_id}` — Delete category
- **Block Templates**
  - `GET /block_templates` — List templates
  - `POST /block_template` — Create template
  - `GET /block_template/{tpl_id}` — Get template
  - `PUT /block_template/{tpl_id}` — Update template
  - `DELETE /block_template/{tpl_id}` — Delete template
- **Workflows**
  - `GET /workflows` — List workflows
  - `POST /workflow` — Create workflow
  - `GET /workflow/{wf_id}` — Get workflow
  - `PUT /workflow/{wf_id}` — Update workflow
  - `DELETE /workflow/{wf_id}` — Delete workflow
- **Workflow Blocks**
  - `GET /workflow_blocks` — List workflow blocks
  - `POST /workflow_block` — Create workflow block
  - `GET /workflow_block/{wb_id}` — Get workflow block
  - `PUT /workflow_block/{wb_id}` — Update workflow block
  - `DELETE /workflow_block/{wb_id}` — Delete workflow block
- **Block Executions**
  - `GET /block_executions` — List executions
  - `POST /block_execution` — Create execution
  - `GET /block_execution/{exec_id}` — Get execution
  - `PUT /block_execution/{exec_id}` — Update execution
  - `DELETE /block_execution/{exec_id}` — Delete execution

See the Swagger UI (`/docs`) for full details and interactive API testing.

---

## Development Notes

- All filtering and sorting is performed on the backend for scalability.
- The frontend is fully hot-reloading and responsive.
- OCR processing is modular and can be triggered/integrated as needed.

---

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0).

- Free for personal and non-commercial use.
- For commercial use, please contact: your@email.com

See the LICENSE file for full details.

---
