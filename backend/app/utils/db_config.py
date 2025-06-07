"""
Database configuration utility for managing database connections.
Supports both SQLite and PostgreSQL databases.
"""
import os
import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base

# Base class for SQLAlchemy models
Base = declarative_base()

# Get database configuration from environment variables
DB_TYPE = os.getenv('DB_TYPE', 'sqlite').lower()
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ocr.db')

# PostgreSQL connection parameters
PG_USER = os.getenv('POSTGRES_USER', 'ocr_user')
PG_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'ocr_password')
PG_DB = os.getenv('POSTGRES_DB', 'ocr_db')
PG_HOST = os.getenv('POSTGRES_HOST', 'postgres')
PG_PORT = os.getenv('POSTGRES_PORT', '5432')

# Microsoft SQL Server connection parameters
MSSQL_USER = os.getenv('MSSQL_USER', 'sa')
MSSQL_PASSWORD = os.getenv('MSSQL_PASSWORD', 'OcrPassword123!')
MSSQL_DB = os.getenv('MSSQL_DB', 'ocr_db')
MSSQL_HOST = os.getenv('MSSQL_HOST', 'mssql')
MSSQL_PORT = os.getenv('MSSQL_PORT', '1433')

# Construct database URL based on DB_TYPE
if DB_TYPE == 'postgres' and 'postgresql' not in DATABASE_URL:
    DATABASE_URL = f"postgresql://{PG_USER}:{PG_PASSWORD}@{PG_HOST}:{PG_PORT}/{PG_DB}"
elif DB_TYPE == 'mssql' and 'mssql' not in DATABASE_URL:
    DATABASE_URL = f"mssql+pyodbc://{MSSQL_USER}:{MSSQL_PASSWORD}@{MSSQL_HOST}:{MSSQL_PORT}/{MSSQL_DB}?driver=ODBC+Driver+17+for+SQL+Server"

# Create SQLAlchemy engine and session factory
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """
    Get a SQLAlchemy database session.
    
    Returns:
        Session: A SQLAlchemy session object
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_connection():
    """
    Get a raw database connection for direct SQL queries.
    
    Returns:
        Connection: A database connection object (sqlite3.Connection, psycopg2.connection, or pyodbc.connection)
    """
    if DB_TYPE == 'postgres':
        import psycopg2
        conn = psycopg2.connect(
            dbname=PG_DB,
            user=PG_USER,
            password=PG_PASSWORD,
            host=PG_HOST,
            port=PG_PORT
        )
        return conn
    elif DB_TYPE == 'mssql':
        import pyodbc
        conn_str = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={MSSQL_HOST},{MSSQL_PORT};"
            f"DATABASE={MSSQL_DB};"
            f"UID={MSSQL_USER};"
            f"PWD={MSSQL_PASSWORD}"
        )
        conn = pyodbc.connect(conn_str)
        return conn
    else:
        # SQLite connection
        db_path = DATABASE_URL.replace('sqlite:///', '')
        return sqlite3.connect(db_path)

def init_db():
    """
    Initialize the database by creating all tables.
    """
    Base.metadata.create_all(bind=engine)

def get_db_type():
    """
    Get the current database type.
    
    Returns:
        str: 'sqlite', 'postgres', or 'mssql'
    """
    return DB_TYPE