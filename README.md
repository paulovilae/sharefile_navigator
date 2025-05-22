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
