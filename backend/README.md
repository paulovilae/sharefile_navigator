# SharePoint OCR File Explorer - Backend

This directory contains the FastAPI backend for the SharePoint OCR File Explorer project.

## Overview

The backend provides:
- SharePoint integration via Microsoft Graph API
- OCR processing capabilities
- File management and content retrieval
- Block workflow system for modular document processing
- Database models and migrations
- API endpoints for frontend integration

## Directory Structure

```
backend/
├── alembic/                  # Database migrations
│   ├── versions/             # Migration scripts
│   └── env.py                # Alembic environment configuration
├── app/                      # Main application code
│   ├── api/                  # API endpoints
│   │   ├── blocks.py         # Block workflow system endpoints
│   │   ├── ocr/              # OCR processing endpoints and utilities
│   │   │   ├── batch_processing.py  # Batch processing logic
│   │   │   ├── pipeline.py   # OCR pipeline implementation
│   │   │   └── routes.py     # OCR API routes
│   │   └── sharepoint.py     # SharePoint integration endpoints
│   ├── db/                   # Database models and utilities
│   │   ├── models/           # SQLAlchemy models
│   │   └── session.py        # Database session management
│   ├── routers/              # FastAPI routers
│   ├── schemas/              # Pydantic schemas for API validation
│   ├── utils/                # Utility functions
│   │   ├── cache_utils.py    # Caching utilities
│   │   ├── gpu_utils.py      # GPU detection and management
│   │   └── llm_utils.py      # Language model utilities
│   └── main.py               # FastAPI application entry point
├── requirements.txt          # Python dependencies
└── README.md                 # This file
```

## Setup

### Prerequisites

- Python 3.8+ (3.11 or 3.12 recommended for GPU support)
- NVIDIA GPU with CUDA support (optional, for GPU acceleration)
- PostgreSQL or SQLite (configurable)
- Microsoft Azure App registration with SharePoint permissions

### Installation

1. Create a virtual environment:
   ```bash
   python -m venv .venv
   # On Windows
   .venv\Scripts\activate
   # On Mac/Linux
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   # For CPU-only
   pip install -r requirements.txt
   
   # For GPU support
   pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu121
   ```

3. Set up environment variables (create a `.env` file in the project root):
   ```
   CLIENT_ID=your-client-id
   CLIENT_SECRET=your-client-secret
   TENANT_ID=your-tenant-id
   SHAREPOINT_SITE=your-tenant.sharepoint.com
   SHAREPOINT_SITE_NAME=YourSiteName
   DATABASE_URL=sqlite:///ocr.db  # or your PostgreSQL connection string
   ```

### Running the Server

```bash
# From the project root
uvicorn backend.app.main:app --reload

# Or from the backend directory
cd backend
uvicorn app.main:app --reload
```

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database Migrations

This project uses Alembic for database migrations:

```bash
# Generate a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## Testing

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=app
```

## GPU Support

The backend supports GPU acceleration for OCR processing. To verify GPU availability:

```python
python -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('Device:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')"
```

## Block Workflow System

The backend implements a modular block workflow system that allows for:
- Creating block categories
- Defining block templates with configuration schemas
- Building workflows from block templates
- Executing and monitoring workflow blocks
- Storing execution results and logs

See the API documentation for details on the block workflow endpoints.