# Utility Scripts

This directory contains various utility scripts for the SharePoint OCR File Explorer project. These scripts are used for testing, debugging, database migrations, and other maintenance tasks.

## Categories

### Testing & Connectivity

- [test_connection.py](./test_connection.py) - Test basic connectivity
- [test_backend_connection.py](./test_backend_connection.py) - Test connection to the backend API
- [test_sharepoint_connectivity.py](./test_sharepoint_connectivity.py) - Test SharePoint connectivity
- [test_sql_connection.py](./test_sql_connection.py) - Test database connectivity
- [check_sharepoint_env.py](./check_sharepoint_env.py) - Check SharePoint environment variables

### GPU & CUDA Testing

- [check_cuda.py](./check_cuda.py) - Check CUDA availability
- [test_cuda.py](./test_cuda.py) - Test CUDA functionality
- [test_easyocr_gpu.py](./test_easyocr_gpu.py) - Test EasyOCR with GPU
- [test_gpu_detection.py](./test_gpu_detection.py) - Test GPU detection
- [test_gpu_tracking.py](./test_gpu_tracking.py) - Test GPU usage tracking
- [upgrade_pytorch_gpu.py](./upgrade_pytorch_gpu.py) - Upgrade PyTorch for GPU support

### Batch Processing Testing

- [test_batch_processing.py](./test_batch_processing.py) - Test batch processing
- [test_batch_processing_improved.py](./test_batch_processing_improved.py) - Test improved batch processing
- [reconnect_batch_process.html](./reconnect_batch_process.html) - HTML page for reconnecting to batch processes
- [diagnose_batch_issue.py](./diagnose_batch_issue.py) - Diagnose batch processing issues

### Database Migrations

- [migrate_sqlite_to_postgres.py](./migrate_sqlite_to_postgres.py) - Migrate from SQLite to PostgreSQL
- [migrate_sqlite_to_mssql.py](./migrate_sqlite_to_mssql.py) - Migrate from SQLite to MS SQL Server
- [migrate_postgres_to_sqlite.py](./migrate_postgres_to_sqlite.py) - Migrate from PostgreSQL to SQLite
- [migrate_postgres_to_mssql.py](./migrate_postgres_to_mssql.py) - Migrate from PostgreSQL to MS SQL Server
- [migrate_mssql_to_sqlite.py](./migrate_mssql_to_sqlite.py) - Migrate from MS SQL Server to SQLite
- [migrate_mssql_to_postgres.py](./migrate_mssql_to_postgres.py) - Migrate from MS SQL Server to PostgreSQL
- [list_sqlite_tables.py](./list_sqlite_tables.py) - List tables in SQLite database

### Caching & Status Management

- [clear_cache_and_refresh.js](./clear_cache_and_refresh.js) - Clear cache and refresh
- [clear_status_cache.js](./clear_status_cache.js) - Clear status cache
- [final_cache_clear.js](./final_cache_clear.js) - Final cache clearing
- [force_status_refresh.js](./force_status_refresh.js) - Force status refresh
- [fix_ocr_status.py](./fix_ocr_status.py) - Fix OCR status issues
- [find_and_fix_file_status.py](./find_and_fix_file_status.py) - Find and fix file status issues
- [test_status_update.py](./test_status_update.py) - Test status update functionality
- [debug_status_issue.py](./debug_status_issue.py) - Debug status issues

### Preloading & Image Processing

- [test_preload_system.py](./test_preload_system.py) - Test preload system
- [test_preloaded_images.py](./test_preloaded_images.py) - Test preloaded images
- [test_image_search.py](./test_image_search.py) - Test image search functionality
- [create_demo_thumbnail.py](./create_demo_thumbnail.py) - Create demo thumbnails

### System Monitoring & Maintenance

- [system_monitor.html](./system_monitor.html) - HTML page for system monitoring
- [add_system_monitor_translation.py](./add_system_monitor_translation.py) - Add translations for system monitor
- [test_frontend_polling.html](./test_frontend_polling.html) - Test frontend polling
- [find_largest_git_files.py](./find_largest_git_files.py) - Find largest files in git repository

### Seeding & Setup

- [seed_sharepoint_settings.py](./seed_sharepoint_settings.py) - Seed SharePoint settings
- [seed_sidebar_menu.py](./seed_sidebar_menu.py) - Seed sidebar menu

## Usage

Most scripts can be run directly with Python:

```bash
python scripts/script_name.py
```

HTML files can be opened in a browser:

```bash
# On Windows
start scripts/system_monitor.html

# On macOS
open scripts/system_monitor.html

# On Linux
xdg-open scripts/system_monitor.html
```

JavaScript files can be run with Node.js:

```bash
node scripts/clear_cache_and_refresh.js
```

## Adding New Scripts

When adding new scripts to this directory:

1. Follow the naming convention: use descriptive names with underscores
2. Add appropriate documentation at the top of the script
3. Update this README.md to include the new script in the appropriate category
4. Make sure the script has proper error handling and logging