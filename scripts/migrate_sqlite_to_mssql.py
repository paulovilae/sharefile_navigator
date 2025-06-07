#!/usr/bin/env python3
"""
Migration script to transfer data from SQLite to Microsoft SQL Server.

This script:
1. Reads schema and data from SQLite database
2. Creates equivalent tables in Microsoft SQL Server
3. Transfers all data from SQLite to Microsoft SQL Server
4. Validates the migration

Usage:
    python migrate_sqlite_to_mssql.py [--sqlite-path SQLITE_PATH] [--mssql-host MSSQL_HOST] [--mssql-port MSSQL_PORT] 
                                     [--mssql-user MSSQL_USER] [--mssql-password MSSQL_PASSWORD] [--mssql-db MSSQL_DB]

Example:
    python migrate_sqlite_to_mssql.py --sqlite-path ./ocr.db --mssql-host localhost --mssql-port 1433 
                                     --mssql-user sa --mssql-password OcrPassword123! --mssql-db ocr_db
"""

import argparse
import os
import sqlite3
import sys
import time
from typing import Dict, List, Tuple, Any

try:
    import pyodbc
except ImportError:
    print("Error: pyodbc is required. Install it with 'pip install pyodbc'")
    sys.exit(1)

# SQLite data types to Microsoft SQL Server data types mapping
SQLITE_TO_MSSQL_TYPE_MAP = {
    'INTEGER': 'INT',
    'REAL': 'FLOAT',
    'TEXT': 'NVARCHAR(MAX)',
    'BLOB': 'VARBINARY(MAX)',
    'BOOLEAN': 'BIT',
    'DATETIME': 'DATETIME2',
    'DATE': 'DATE',
    'TIME': 'TIME',
    'TIMESTAMP': 'DATETIME2',
    'VARCHAR': 'NVARCHAR',
    'CHAR': 'NCHAR',
    'NUMERIC': 'DECIMAL(18,6)',
}

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Migrate data from SQLite to Microsoft SQL Server')
    parser.add_argument('--sqlite-path', default='./ocr.db', help='Path to SQLite database file')
    parser.add_argument('--mssql-host', default='localhost', help='Microsoft SQL Server host')
    parser.add_argument('--mssql-port', default='1433', help='Microsoft SQL Server port')
    parser.add_argument('--mssql-user', default='sa', help='Microsoft SQL Server username')
    parser.add_argument('--mssql-password', default='OcrPassword123!', help='Microsoft SQL Server password')
    parser.add_argument('--mssql-db', default='ocr_db', help='Microsoft SQL Server database name')
    return parser.parse_args()

def connect_sqlite(db_path: str) -> sqlite3.Connection:
    """Connect to SQLite database."""
    if not os.path.exists(db_path):
        print(f"Error: SQLite database file not found at {db_path}")
        sys.exit(1)
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        print(f"Error connecting to SQLite database: {e}")
        sys.exit(1)

def connect_mssql(host: str, port: str, user: str, password: str, dbname: str) -> pyodbc.Connection:
    """Connect to Microsoft SQL Server database."""
    try:
        conn_str = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={host},{port};"
            f"DATABASE={dbname};"
            f"UID={user};"
            f"PWD={password}"
        )
        conn = pyodbc.connect(conn_str)
        return conn
    except pyodbc.Error as e:
        print(f"Error connecting to Microsoft SQL Server database: {e}")
        sys.exit(1)

def get_sqlite_tables(conn: sqlite3.Connection) -> List[str]:
    """Get list of tables from SQLite database."""
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cursor.fetchall()]
    cursor.close()
    return tables

def get_sqlite_table_schema(conn: sqlite3.Connection, table_name: str) -> List[Dict[str, Any]]:
    """Get schema information for a SQLite table."""
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name});")
    columns = []
    
    for row in cursor.fetchall():
        column = {
            'name': row['name'],
            'type': row['type'].upper(),
            'notnull': row['notnull'],
            'pk': row['pk']
        }
        columns.append(column)
    
    cursor.close()
    return columns

def map_sqlite_type_to_mssql(sqlite_type: str) -> str:
    """Map SQLite data type to Microsoft SQL Server data type."""
    # Extract base type from SQLite type (e.g., "INTEGER PRIMARY KEY" -> "INTEGER")
    base_type = sqlite_type.split('(')[0].split(' ')[0].upper()
    
    # Handle special cases
    if 'CHAR' in base_type and '(' in sqlite_type:
        # Extract size for VARCHAR/CHAR types
        size = sqlite_type.split('(')[1].split(')')[0]
        return f"NVARCHAR({size})"
    
    return SQLITE_TO_MSSQL_TYPE_MAP.get(base_type, 'NVARCHAR(MAX)')

def create_mssql_table(mssql_conn: pyodbc.Connection, table_name: str, columns: List[Dict[str, Any]]):
    """Create table in Microsoft SQL Server database."""
    cursor = mssql_conn.cursor()
    
    # Build CREATE TABLE statement
    column_defs = []
    primary_keys = []
    
    for col in columns:
        mssql_type = map_sqlite_type_to_mssql(col['type'])
        nullable = "NOT NULL" if col['notnull'] else "NULL"
        
        column_def = f"[{col['name']}] {mssql_type} {nullable}"
        column_defs.append(column_def)
        
        if col['pk']:
            primary_keys.append(col['name'])
    
    # Add primary key constraint if applicable
    if primary_keys:
        pk_constraint = f", CONSTRAINT PK_{table_name} PRIMARY KEY ({', '.join([f'[{pk}]' for pk in primary_keys])})"
    else:
        pk_constraint = ""
    
    create_table_sql = f"IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '{table_name}') CREATE TABLE [{table_name}] ({', '.join(column_defs)}{pk_constraint});"
    
    try:
        cursor.execute(create_table_sql)
        cursor.commit()
        print(f"Created table {table_name} in Microsoft SQL Server")
    except pyodbc.Error as e:
        print(f"Error creating table {table_name} in Microsoft SQL Server: {e}")
    
    cursor.close()

def get_sqlite_data(conn: sqlite3.Connection, table_name: str) -> Tuple[List[str], List[Tuple]]:
    """Get column names and data from SQLite table."""
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name};")
    
    # Get column names
    column_names = [description[0] for description in cursor.description]
    
    # Get data
    data = cursor.fetchall()
    
    cursor.close()
    return column_names, data

def insert_data_to_mssql(mssql_conn: pyodbc.Connection, table_name: str, column_names: List[str], data: List[Tuple]):
    """Insert data into Microsoft SQL Server table."""
    if not data:
        print(f"No data to insert for table {table_name}")
        return
    
    cursor = mssql_conn.cursor()
    
    # Create placeholders for prepared statement
    placeholders = ', '.join(['?' for _ in column_names])
    columns = ', '.join([f"[{col}]" for col in column_names])
    
    insert_sql = f"INSERT INTO [{table_name}] ({columns}) VALUES ({placeholders});"
    
    try:
        # Use executemany for better performance
        batch_size = 1000  # Process in batches to avoid memory issues
        total_rows = len(data)
        
        for i in range(0, total_rows, batch_size):
            batch = data[i:i + batch_size]
            cursor.executemany(insert_sql, batch)
            cursor.commit()
            print(f"Inserted {min(i + batch_size, total_rows)}/{total_rows} rows into {table_name}")
        
        print(f"Completed inserting {total_rows} rows into {table_name}")
    except pyodbc.Error as e:
        print(f"Error inserting data into {table_name}: {e}")
    
    cursor.close()

def validate_migration(sqlite_conn: sqlite3.Connection, mssql_conn: pyodbc.Connection, table_name: str) -> bool:
    """Validate that data was migrated correctly by comparing row counts."""
    sqlite_cursor = sqlite_conn.cursor()
    mssql_cursor = mssql_conn.cursor()
    
    sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
    sqlite_count = sqlite_cursor.fetchone()[0]
    
    mssql_cursor.execute(f"SELECT COUNT(*) FROM [{table_name}];")
    mssql_count = mssql_cursor.fetchone()[0]
    
    sqlite_cursor.close()
    mssql_cursor.close()
    
    if sqlite_count == mssql_count:
        print(f"Validation successful for {table_name}: {sqlite_count} rows")
        return True
    else:
        print(f"Validation failed for {table_name}: SQLite has {sqlite_count} rows, Microsoft SQL Server has {mssql_count} rows")
        return False

def main():
    """Main function to migrate data from SQLite to Microsoft SQL Server."""
    args = parse_args()
    
    print("Starting migration from SQLite to Microsoft SQL Server...")
    start_time = time.time()
    
    # Connect to databases
    sqlite_conn = connect_sqlite(args.sqlite_path)
    mssql_conn = connect_mssql(args.mssql_host, args.mssql_port, args.mssql_user, args.mssql_password, args.mssql_db)
    
    # Get list of tables from SQLite
    tables = get_sqlite_tables(sqlite_conn)
    print(f"Found {len(tables)} tables in SQLite database: {', '.join(tables)}")
    
    # Process each table
    validation_results = []
    for table_name in tables:
        print(f"\nProcessing table: {table_name}")
        
        # Get table schema
        columns = get_sqlite_table_schema(sqlite_conn, table_name)
        
        # Create table in Microsoft SQL Server
        create_mssql_table(mssql_conn, table_name, columns)
        
        # Get data from SQLite
        column_names, data = get_sqlite_data(sqlite_conn, table_name)
        
        # Insert data into Microsoft SQL Server
        insert_data_to_mssql(mssql_conn, table_name, column_names, data)
        
        # Validate migration
        validation_result = validate_migration(sqlite_conn, mssql_conn, table_name)
        validation_results.append((table_name, validation_result))
    
    # Close connections
    sqlite_conn.close()
    mssql_conn.close()
    
    # Print summary
    print("\nMigration Summary:")
    all_valid = True
    for table_name, result in validation_results:
        status = "SUCCESS" if result else "FAILED"
        print(f"  {table_name}: {status}")
        if not result:
            all_valid = False
    
    elapsed_time = time.time() - start_time
    print(f"\nMigration completed in {elapsed_time:.2f} seconds")
    
    if all_valid:
        print("All tables were successfully migrated!")
        print("\nTo use Microsoft SQL Server in your application, set the following environment variables:")
        print("  export DB_TYPE=mssql")
        print(f"  export DATABASE_URL=mssql+pyodbc://{args.mssql_user}:{args.mssql_password}@{args.mssql_host}:{args.mssql_port}/{args.mssql_db}?driver=ODBC+Driver+17+for+SQL+Server")
    else:
        print("Some tables failed validation. Please check the logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()