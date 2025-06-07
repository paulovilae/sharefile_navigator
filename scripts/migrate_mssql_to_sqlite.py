#!/usr/bin/env python3
"""
Migration script to transfer data from Microsoft SQL Server to SQLite.

This script:
1. Reads schema and data from Microsoft SQL Server database
2. Creates equivalent tables in SQLite
3. Transfers all data from Microsoft SQL Server to SQLite
4. Validates the migration

Usage:
    python migrate_mssql_to_sqlite.py [--sqlite-path SQLITE_PATH] [--mssql-host MSSQL_HOST] [--mssql-port MSSQL_PORT] 
                                     [--mssql-user MSSQL_USER] [--mssql-password MSSQL_PASSWORD] [--mssql-db MSSQL_DB]

Example:
    python migrate_mssql_to_sqlite.py --sqlite-path ./ocr.db --mssql-host localhost --mssql-port 1433 
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

# Microsoft SQL Server data types to SQLite data types mapping
MSSQL_TO_SQLITE_TYPE_MAP = {
    'INT': 'INTEGER',
    'BIGINT': 'INTEGER',
    'SMALLINT': 'INTEGER',
    'TINYINT': 'INTEGER',
    'BIT': 'INTEGER',
    'DECIMAL': 'REAL',
    'NUMERIC': 'REAL',
    'FLOAT': 'REAL',
    'REAL': 'REAL',
    'MONEY': 'REAL',
    'SMALLMONEY': 'REAL',
    'CHAR': 'TEXT',
    'VARCHAR': 'TEXT',
    'TEXT': 'TEXT',
    'NCHAR': 'TEXT',
    'NVARCHAR': 'TEXT',
    'NTEXT': 'TEXT',
    'BINARY': 'BLOB',
    'VARBINARY': 'BLOB',
    'IMAGE': 'BLOB',
    'DATETIME': 'TEXT',
    'DATETIME2': 'TEXT',
    'DATE': 'TEXT',
    'TIME': 'TEXT',
    'DATETIMEOFFSET': 'TEXT',
    'SMALLDATETIME': 'TEXT',
    'TIMESTAMP': 'BLOB',
    'UNIQUEIDENTIFIER': 'TEXT',
    'XML': 'TEXT',
    'SQL_VARIANT': 'TEXT',
}

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Migrate data from Microsoft SQL Server to SQLite')
    parser.add_argument('--sqlite-path', default='./ocr.db', help='Path to SQLite database file')
    parser.add_argument('--mssql-host', default='localhost', help='Microsoft SQL Server host')
    parser.add_argument('--mssql-port', default='1433', help='Microsoft SQL Server port')
    parser.add_argument('--mssql-user', default='sa', help='Microsoft SQL Server username')
    parser.add_argument('--mssql-password', default='OcrPassword123!', help='Microsoft SQL Server password')
    parser.add_argument('--mssql-db', default='ocr_db', help='Microsoft SQL Server database name')
    return parser.parse_args()

def connect_sqlite(db_path: str) -> sqlite3.Connection:
    """Connect to SQLite database."""
    try:
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA foreign_keys = OFF")  # Disable foreign key constraints during migration
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

def get_mssql_tables(conn: pyodbc.Connection) -> List[str]:
    """Get list of tables from Microsoft SQL Server database."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_SCHEMA = 'dbo'
        ORDER BY TABLE_NAME;
    """)
    tables = [row[0] for row in cursor.fetchall()]
    cursor.close()
    return tables

def get_mssql_table_schema(conn: pyodbc.Connection, table_name: str) -> List[Dict[str, Any]]:
    """Get schema information for a Microsoft SQL Server table."""
    cursor = conn.cursor()
    cursor.execute(f"""
        SELECT 
            COLUMN_NAME, 
            DATA_TYPE, 
            IS_NULLABLE,
            COLUMN_DEFAULT
        FROM 
            INFORMATION_SCHEMA.COLUMNS 
        WHERE 
            TABLE_SCHEMA = 'dbo' 
            AND TABLE_NAME = ?
        ORDER BY 
            ORDINAL_POSITION;
    """, (table_name,))
    
    columns = []
    for row in cursor.fetchall():
        column = {
            'name': row[0],
            'type': row[1].upper(),
            'notnull': row[2] == 'NO',
            'default': row[3]
        }
        columns.append(column)
    
    # Check for primary key
    cursor.execute("""
        SELECT 
            COLUMN_NAME
        FROM 
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        WHERE 
            tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            AND kcu.TABLE_SCHEMA = 'dbo'
            AND kcu.TABLE_NAME = ?
        ORDER BY 
            ORDINAL_POSITION;
    """, (table_name,))
    
    pk_columns = [row[0] for row in cursor.fetchall()]
    
    # Mark primary key columns
    for column in columns:
        if column['name'] in pk_columns:
            column['pk'] = True
        else:
            column['pk'] = False
    
    cursor.close()
    return columns

def map_mssql_type_to_sqlite(mssql_type: str) -> str:
    """Map Microsoft SQL Server data type to SQLite data type."""
    # Extract base type from Microsoft SQL Server type
    base_type = mssql_type.split('(')[0].upper()
    
    return MSSQL_TO_SQLITE_TYPE_MAP.get(base_type, 'TEXT')

def create_sqlite_table(sqlite_conn: sqlite3.Connection, table_name: str, columns: List[Dict[str, Any]]):
    """Create table in SQLite database."""
    cursor = sqlite_conn.cursor()
    
    # Build CREATE TABLE statement
    column_defs = []
    
    for col in columns:
        sqlite_type = map_mssql_type_to_sqlite(col['type'])
        constraints = []
        
        if col['pk']:
            constraints.append('PRIMARY KEY')
        
        if col['notnull']:
            constraints.append('NOT NULL')
        
        column_def = f'"{col["name"]}" {sqlite_type}'
        if constraints:
            column_def += ' ' + ' '.join(constraints)
        
        column_defs.append(column_def)
    
    create_table_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" ({", ".join(column_defs)});'
    
    try:
        cursor.execute(create_table_sql)
        print(f"Created table {table_name} in SQLite")
    except sqlite3.Error as e:
        print(f"Error creating table {table_name} in SQLite: {e}")
    
    cursor.close()

def get_mssql_data(conn: pyodbc.Connection, table_name: str) -> Tuple[List[str], List[Tuple]]:
    """Get column names and data from Microsoft SQL Server table."""
    cursor = conn.cursor()
    cursor.execute(f'SELECT * FROM [{table_name}];')
    
    # Get column names
    column_names = [column[0] for column in cursor.description]
    
    # Get data
    data = []
    for row in cursor.fetchall():
        # Convert any None values to NULL for SQLite
        processed_row = []
        for value in row:
            if isinstance(value, bytearray):
                # Convert bytearray to bytes for SQLite
                processed_row.append(bytes(value))
            else:
                processed_row.append(value)
        data.append(tuple(processed_row))
    
    cursor.close()
    return column_names, data

def insert_data_to_sqlite(sqlite_conn: sqlite3.Connection, table_name: str, column_names: List[str], data: List[Tuple]):
    """Insert data into SQLite table."""
    if not data:
        print(f"No data to insert for table {table_name}")
        return
    
    cursor = sqlite_conn.cursor()
    
    # Create placeholders for prepared statement
    placeholders = ', '.join(['?' for _ in column_names])
    columns = ', '.join([f'"{col}"' for col in column_names])
    
    insert_sql = f'INSERT INTO "{table_name}" ({columns}) VALUES ({placeholders});'
    
    try:
        # Use executemany for better performance
        cursor.executemany(insert_sql, data)
        sqlite_conn.commit()
        print(f"Inserted {len(data)} rows into {table_name}")
    except sqlite3.Error as e:
        print(f"Error inserting data into {table_name}: {e}")
    
    cursor.close()

def validate_migration(mssql_conn: pyodbc.Connection, sqlite_conn: sqlite3.Connection, table_name: str) -> bool:
    """Validate that data was migrated correctly by comparing row counts."""
    mssql_cursor = mssql_conn.cursor()
    sqlite_cursor = sqlite_conn.cursor()
    
    mssql_cursor.execute(f'SELECT COUNT(*) FROM [{table_name}];')
    mssql_count = mssql_cursor.fetchone()[0]
    
    sqlite_cursor.execute(f'SELECT COUNT(*) FROM "{table_name}";')
    sqlite_count = sqlite_cursor.fetchone()[0]
    
    mssql_cursor.close()
    sqlite_cursor.close()
    
    if mssql_count == sqlite_count:
        print(f"Validation successful for {table_name}: {mssql_count} rows")
        return True
    else:
        print(f"Validation failed for {table_name}: Microsoft SQL Server has {mssql_count} rows, SQLite has {sqlite_count} rows")
        return False

def main():
    """Main function to migrate data from Microsoft SQL Server to SQLite."""
    args = parse_args()
    
    print("Starting migration from Microsoft SQL Server to SQLite...")
    start_time = time.time()
    
    # Connect to databases
    mssql_conn = connect_mssql(args.mssql_host, args.mssql_port, args.mssql_user, args.mssql_password, args.mssql_db)
    
    # Check if SQLite file exists and back it up if it does
    if os.path.exists(args.sqlite_path):
        backup_path = f"{args.sqlite_path}.backup.{int(time.time())}"
        print(f"SQLite database file already exists. Creating backup at {backup_path}")
        try:
            with open(args.sqlite_path, 'rb') as src, open(backup_path, 'wb') as dst:
                dst.write(src.read())
        except Exception as e:
            print(f"Error creating backup: {e}")
            sys.exit(1)
    
    sqlite_conn = connect_sqlite(args.sqlite_path)
    
    # Get list of tables from Microsoft SQL Server
    tables = get_mssql_tables(mssql_conn)
    print(f"Found {len(tables)} tables in Microsoft SQL Server database: {', '.join(tables)}")
    
    # Process each table
    validation_results = []
    for table_name in tables:
        print(f"\nProcessing table: {table_name}")
        
        # Get table schema
        columns = get_mssql_table_schema(mssql_conn, table_name)
        
        # Create table in SQLite
        create_sqlite_table(sqlite_conn, table_name, columns)
        
        # Get data from Microsoft SQL Server
        column_names, data = get_mssql_data(mssql_conn, table_name)
        
        # Insert data into SQLite
        insert_data_to_sqlite(sqlite_conn, table_name, column_names, data)
        
        # Validate migration
        validation_result = validate_migration(mssql_conn, sqlite_conn, table_name)
        validation_results.append((table_name, validation_result))
    
    # Close connections
    mssql_conn.close()
    sqlite_conn.close()
    
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
        print("\nTo use SQLite in your application, set the following environment variables:")
        print("  export DB_TYPE=sqlite")
        print("  export DATABASE_URL=sqlite:///ocr.db")
    else:
        print("Some tables failed validation. Please check the logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()