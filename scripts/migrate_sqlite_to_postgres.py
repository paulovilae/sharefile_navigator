#!/usr/bin/env python3
"""
Migration script to transfer data from SQLite to PostgreSQL.

This script:
1. Reads schema and data from SQLite database
2. Creates equivalent tables in PostgreSQL
3. Transfers all data from SQLite to PostgreSQL
4. Validates the migration

Usage:
    python migrate_sqlite_to_postgres.py [--sqlite-path SQLITE_PATH] [--pg-host PG_HOST] [--pg-port PG_PORT] 
                                        [--pg-user PG_USER] [--pg-password PG_PASSWORD] [--pg-db PG_DB]

Example:
    python migrate_sqlite_to_postgres.py --sqlite-path ./ocr.db --pg-host localhost --pg-port 5432 
                                        --pg-user ocr_user --pg-password ocr_password --pg-db ocr_db
"""

import argparse
import os
import sqlite3
import sys
import time
from typing import Dict, List, Tuple, Any

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("Error: psycopg2 is required. Install it with 'pip install psycopg2-binary'")
    sys.exit(1)

# SQLite data types to PostgreSQL data types mapping
SQLITE_TO_PG_TYPE_MAP = {
    'INTEGER': 'INTEGER',
    'REAL': 'DOUBLE PRECISION',
    'TEXT': 'TEXT',
    'BLOB': 'BYTEA',
    'BOOLEAN': 'BOOLEAN',
    'DATETIME': 'TIMESTAMP',
    'DATE': 'DATE',
    'TIME': 'TIME',
    'TIMESTAMP': 'TIMESTAMP',
    'VARCHAR': 'VARCHAR',
    'CHAR': 'CHAR',
    'NUMERIC': 'NUMERIC',
}

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Migrate data from SQLite to PostgreSQL')
    parser.add_argument('--sqlite-path', default='./ocr.db', help='Path to SQLite database file')
    parser.add_argument('--pg-host', default='localhost', help='PostgreSQL host')
    parser.add_argument('--pg-port', default='5432', help='PostgreSQL port')
    parser.add_argument('--pg-user', default='ocr_user', help='PostgreSQL username')
    parser.add_argument('--pg-password', default='ocr_password', help='PostgreSQL password')
    parser.add_argument('--pg-db', default='ocr_db', help='PostgreSQL database name')
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

def connect_postgres(host: str, port: str, user: str, password: str, dbname: str) -> psycopg2.extensions.connection:
    """Connect to PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=dbname
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return conn
    except psycopg2.Error as e:
        print(f"Error connecting to PostgreSQL database: {e}")
        sys.exit(1)

def get_sqlite_tables(conn: sqlite3.Connection) -> List[str]:
    """Get list of tables from SQLite database."""
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cursor.fetchall()]
    cursor.close()
    return tables

def get_sqlite_table_schema(conn: sqlite3.Connection, table_name: str) -> List[Dict[str, str]]:
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

def map_sqlite_type_to_pg(sqlite_type: str) -> str:
    """Map SQLite data type to PostgreSQL data type."""
    # Extract base type from SQLite type (e.g., "INTEGER PRIMARY KEY" -> "INTEGER")
    base_type = sqlite_type.split('(')[0].split(' ')[0].upper()
    
    # Handle special cases
    if 'CHAR' in base_type and '(' in sqlite_type:
        # Extract size for VARCHAR/CHAR types
        size = sqlite_type.split('(')[1].split(')')[0]
        return f"VARCHAR({size})"
    
    return SQLITE_TO_PG_TYPE_MAP.get(base_type, 'TEXT')

def create_pg_table(pg_conn: psycopg2.extensions.connection, table_name: str, columns: List[Dict[str, str]]):
    """Create table in PostgreSQL database."""
    cursor = pg_conn.cursor()
    
    # Build CREATE TABLE statement
    column_defs = []
    primary_keys = []
    
    for col in columns:
        pg_type = map_sqlite_type_to_pg(col['type'])
        nullable = "NOT NULL" if col['notnull'] else ""
        
        column_def = f"\"{col['name']}\" {pg_type} {nullable}"
        column_defs.append(column_def)
        
        if col['pk']:
            primary_keys.append(col['name'])
    
    # Add primary key constraint if applicable
    if primary_keys:
        pk_constraint = f", PRIMARY KEY ({', '.join([f'\"{pk}\"' for pk in primary_keys])})"
    else:
        pk_constraint = ""
    
    create_table_sql = f"CREATE TABLE IF NOT EXISTS \"{table_name}\" ({', '.join(column_defs)}{pk_constraint});"
    
    try:
        cursor.execute(create_table_sql)
        print(f"Created table {table_name} in PostgreSQL")
    except psycopg2.Error as e:
        print(f"Error creating table {table_name} in PostgreSQL: {e}")
    
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

def insert_data_to_pg(pg_conn: psycopg2.extensions.connection, table_name: str, column_names: List[str], data: List[Tuple]):
    """Insert data into PostgreSQL table."""
    if not data:
        print(f"No data to insert for table {table_name}")
        return
    
    cursor = pg_conn.cursor()
    
    # Create placeholders for prepared statement
    placeholders = ', '.join(['%s'] * len(column_names))
    columns = ', '.join([f"\"{col}\"" for col in column_names])
    
    insert_sql = f"INSERT INTO \"{table_name}\" ({columns}) VALUES ({placeholders});"
    
    try:
        # Use executemany for better performance
        cursor.executemany(insert_sql, data)
        print(f"Inserted {len(data)} rows into {table_name}")
    except psycopg2.Error as e:
        print(f"Error inserting data into {table_name}: {e}")
    
    cursor.close()

def validate_migration(sqlite_conn: sqlite3.Connection, pg_conn: psycopg2.extensions.connection, table_name: str) -> bool:
    """Validate that data was migrated correctly by comparing row counts."""
    sqlite_cursor = sqlite_conn.cursor()
    pg_cursor = pg_conn.cursor()
    
    sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
    sqlite_count = sqlite_cursor.fetchone()[0]
    
    pg_cursor.execute(f"SELECT COUNT(*) FROM \"{table_name}\";")
    pg_count = pg_cursor.fetchone()[0]
    
    sqlite_cursor.close()
    pg_cursor.close()
    
    if sqlite_count == pg_count:
        print(f"Validation successful for {table_name}: {sqlite_count} rows")
        return True
    else:
        print(f"Validation failed for {table_name}: SQLite has {sqlite_count} rows, PostgreSQL has {pg_count} rows")
        return False

def main():
    """Main function to migrate data from SQLite to PostgreSQL."""
    args = parse_args()
    
    print("Starting migration from SQLite to PostgreSQL...")
    start_time = time.time()
    
    # Connect to databases
    sqlite_conn = connect_sqlite(args.sqlite_path)
    pg_conn = connect_postgres(args.pg_host, args.pg_port, args.pg_user, args.pg_password, args.pg_db)
    
    # Get list of tables from SQLite
    tables = get_sqlite_tables(sqlite_conn)
    print(f"Found {len(tables)} tables in SQLite database: {', '.join(tables)}")
    
    # Process each table
    validation_results = []
    for table_name in tables:
        print(f"\nProcessing table: {table_name}")
        
        # Get table schema
        columns = get_sqlite_table_schema(sqlite_conn, table_name)
        
        # Create table in PostgreSQL
        create_pg_table(pg_conn, table_name, columns)
        
        # Get data from SQLite
        column_names, data = get_sqlite_data(sqlite_conn, table_name)
        
        # Insert data into PostgreSQL
        insert_data_to_pg(pg_conn, table_name, column_names, data)
        
        # Validate migration
        validation_result = validate_migration(sqlite_conn, pg_conn, table_name)
        validation_results.append((table_name, validation_result))
    
    # Close connections
    sqlite_conn.close()
    pg_conn.close()
    
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
        print("\nTo use PostgreSQL in your application, set the following environment variables:")
        print("  export DB_TYPE=postgres")
        print(f"  export DATABASE_URL=postgresql://{args.pg_user}:{args.pg_password}@{args.pg_host}:{args.pg_port}/{args.pg_db}")
    else:
        print("Some tables failed validation. Please check the logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()