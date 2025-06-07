"""
API endpoints for database settings and migration.
"""
import os
import subprocess
import sys
import json
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.utils.db_config import get_db, get_db_type

router = APIRouter()

class PostgresSettings(BaseModel):
    host: str
    port: str
    user: str
    password: str
    database: str

class MssqlSettings(BaseModel):
    host: str
    port: str
    user: str
    password: str
    database: str
    pid: str = "Express"

class DatabaseSettings(BaseModel):
    db_type: str
    postgres: Optional[PostgresSettings] = None
    mssql: Optional[MssqlSettings] = None

class MigrationRequest(BaseModel):
    source: str
    target: str
    settings: Dict[str, Any]

@router.get("/database")
async def get_database_settings():
    """Get current database settings."""
    db_type = get_db_type()
    
    # Get PostgreSQL settings from environment variables if available
    postgres_settings = None
    if os.getenv('POSTGRES_USER'):
        postgres_settings = {
            "host": os.getenv('POSTGRES_HOST', 'postgres'),
            "port": os.getenv('POSTGRES_PORT', '5432'),
            "user": os.getenv('POSTGRES_USER', 'ocr_user'),
            "password": os.getenv('POSTGRES_PASSWORD', 'ocr_password'),
            "database": os.getenv('POSTGRES_DB', 'ocr_db')
        }
    
    # Get Microsoft SQL Server settings from environment variables if available
    mssql_settings = None
    if os.getenv('MSSQL_USER'):
        mssql_settings = {
            "host": os.getenv('MSSQL_HOST', 'mssql'),
            "port": os.getenv('MSSQL_PORT', '1433'),
            "user": os.getenv('MSSQL_USER', 'sa'),
            "password": os.getenv('MSSQL_PASSWORD', 'OcrPassword123!'),
            "database": os.getenv('MSSQL_DB', 'ocr_db'),
            "pid": os.getenv('MSSQL_PID', 'Express')
        }
    
    return {
        "db_type": db_type,
        "postgres": postgres_settings,
        "mssql": mssql_settings
    }

@router.post("/database")
async def update_database_settings(settings: DatabaseSettings):
    """Update database settings."""
    # Validate settings
    if settings.db_type not in ['sqlite', 'postgres', 'mssql']:
        raise HTTPException(status_code=400, detail="Invalid database type. Must be 'sqlite', 'postgres', or 'mssql'.")
    
    if settings.db_type == 'postgres' and not settings.postgres:
        raise HTTPException(status_code=400, detail="PostgreSQL settings are required when db_type is 'postgres'.")
    
    if settings.db_type == 'mssql' and not settings.mssql:
        raise HTTPException(status_code=400, detail="Microsoft SQL Server settings are required when db_type is 'mssql'.")
    
    # Create .env file with database settings
    env_vars = [
        f"DB_TYPE={settings.db_type}"
    ]
    
    if settings.db_type == 'postgres':
        pg = settings.postgres
        pg_url = f"postgresql://{pg.user}:{pg.password}@{pg.host}:{pg.port}/{pg.database}"
        env_vars.extend([
            f"DATABASE_URL={pg_url}",
            f"POSTGRES_HOST={pg.host}",
            f"POSTGRES_PORT={pg.port}",
            f"POSTGRES_USER={pg.user}",
            f"POSTGRES_PASSWORD={pg.password}",
            f"POSTGRES_DB={pg.database}"
        ])
    elif settings.db_type == 'mssql':
        ms = settings.mssql
        ms_url = f"mssql+pyodbc://{ms.user}:{ms.password}@{ms.host}:{ms.port}/{ms.database}?driver=ODBC+Driver+17+for+SQL+Server"
        env_vars.extend([
            f"DATABASE_URL={ms_url}",
            f"MSSQL_HOST={ms.host}",
            f"MSSQL_PORT={ms.port}",
            f"MSSQL_USER={ms.user}",
            f"MSSQL_PASSWORD={ms.password}",
            f"MSSQL_DB={ms.database}",
            f"MSSQL_PID={ms.pid}"
        ])
    else:
        env_vars.append("DATABASE_URL=sqlite:///ocr.db")
    
    # Write to .env file
    with open(".env", "w") as f:
        f.write("\n".join(env_vars))
    
    return {"status": "success", "message": "Database settings updated successfully."}

@router.post("/migrate-database")
async def migrate_database(request: MigrationRequest, background_tasks: BackgroundTasks):
    """Migrate data from one database to another."""
    valid_migrations = [
        ('sqlite', 'postgres'),
        ('sqlite', 'mssql'),
        ('postgres', 'sqlite'),
        ('mssql', 'sqlite'),
        ('postgres', 'mssql'),
        ('mssql', 'postgres')
    ]
    
    if (request.source, request.target) not in valid_migrations:
        raise HTTPException(
            status_code=400,
            detail=f"Only migrations from SQLite to PostgreSQL or Microsoft SQL Server are supported."
        )
    
    # Determine which migration script to use
    if request.source == 'sqlite' and request.target == 'postgres':
        script_path = os.path.join(os.getcwd(), "scripts", "migrate_sqlite_to_postgres.py")
    elif request.source == 'sqlite' and request.target == 'mssql':
        script_path = os.path.join(os.getcwd(), "scripts", "migrate_sqlite_to_mssql.py")
    elif request.source == 'postgres' and request.target == 'sqlite':
        script_path = os.path.join(os.getcwd(), "scripts", "migrate_postgres_to_sqlite.py")
    elif request.source == 'mssql' and request.target == 'sqlite':
        script_path = os.path.join(os.getcwd(), "scripts", "migrate_mssql_to_sqlite.py")
    elif request.source == 'postgres' and request.target == 'mssql':
        script_path = os.path.join(os.getcwd(), "scripts", "migrate_postgres_to_mssql.py")
    elif request.source == 'mssql' and request.target == 'postgres':
        script_path = os.path.join(os.getcwd(), "scripts", "migrate_mssql_to_postgres.py")
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Migration from {request.source} to {request.target} is not supported."
        )
    
    if not os.path.exists(script_path):
        raise HTTPException(
            status_code=500,
            detail=f"Migration script not found: {script_path}"
        )
    
    # Run migration in background task to avoid timeout
    background_tasks.add_task(
        run_migration,
        script_path,
        request.target,
        request.settings.dict()
    )
    
    return {
        "status": "started",
        "message": "Database migration started. This may take several minutes.",
        "tables_migrated": 0  # Will be updated when migration completes
    }

async def run_migration(script_path: str, target_db: str, settings: Dict[str, Any]):
    """Run the migration script as a background task."""
    cmd = [
        sys.executable,
        script_path,
    ]
    
    # Add source and target database parameters
    if "sqlite" in script_path:
        cmd.extend(["--sqlite-path", "./ocr.db"])
    
    if "postgres" in script_path:
        cmd.extend([
            "--pg-host", settings["host"],
            "--pg-port", settings["port"],
            "--pg-user", settings["user"],
            "--pg-password", settings["password"],
            "--pg-db", settings["database"]
        ])
    
    if "mssql" in script_path:
        cmd.extend([
            "--mssql-host", settings["host"],
            "--mssql-port", settings["port"],
            "--mssql-user", settings["user"],
            "--mssql-password", settings["password"],
            "--mssql-db", settings["database"]
        ])
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        print(f"Migration completed: {result.stdout}")
    except subprocess.CalledProcessError as e:
        print(f"Migration failed: {e.stderr}")