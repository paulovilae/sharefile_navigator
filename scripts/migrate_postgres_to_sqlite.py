#!/usr/bin/env python3
"""
Migration script to transfer data from PostgreSQL to SQLite.

This script:
1. Reads schema and data from PostgreSQL database
2. Creates equivalent tables in SQLite
3. Transfers all data from PostgreSQL to SQLite
4. Validates the migration

Usage:
    python migrate_postgres_to_sqlite.py [--sqlite-path SQLITE_PATH] [--pg-host PG_HOST] [--pg-port PG_PORT] 
                                        [--pg-user PG_USER] [--pg-password PG_PASSWORD] [--pg-db PG_DB]

Example:
    python migrate_postgres_to_sqlite.py --sqlite-path ./ocr.db --pg-host localhost --pg-port 5432 
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

# PostgreSQL data types to SQLite data types mapping
PG_TO_SQLITE_TYPE_MAP = {
    'INTEGER': 'INTEGER',
    'BIGINT': 'INTEGER',
    'SMALLINT': 'INTEGER',
    'INT': 'INTEGER',
    'SERIAL': 'INTEGER',
    'BIGSERIAL': 'INTEGER',
    'REAL': 'REAL',
    'DOUBLE PRECISION': 'REAL',
    'FLOAT': 'REAL',
    'NUMERIC': 'REAL',
    'DECIMAL': 'REAL',
    'TEXT': 'TEXT',
    'VARCHAR': 'TEXT',
    'CHAR': 'TEXT',
    'CHARACTER': 'TEXT',
    'CHARACTER VARYING': 'TEXT',
    'BYTEA': 'BLOB',
    'BOOLEAN': 'INTEGER',  # SQLite doesn't have a boolean type
    'TIMESTAMP': 'TEXT',
    'TIMESTAMP WITH TIME ZONE': 'TEXT',
    'TIMESTAMP WITHOUT TIME ZONE': 'TEXT',
    'DATE': 'TEXT',
    'TIME': 'TEXT',
    'TIME WITH TIME ZONE': 'TEXT',
    'TIME WITHOUT TIME ZONE': 'TEXT',
    'INTERVAL': 'TEXT',
    'JSON': 'TEXT',
    'JSONB': 'TEXT',
    'UUID': 'TEXT',
}

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Migrate data from PostgreSQL to SQLite')
    parser.add_argument('--sqlite-path', default='./ocr.db', help='Path to SQLite database file')
    parser.add_argument('--pg-host', default='localhost', help='PostgreSQL host')
    parser.add_argument('--pg-port', default='5432', help='PostgreSQL port')
    parser.add_argument('--pg-user', default='ocr_user', help='PostgreSQL username')
    parser.add_argument('--pg-password', default='ocr_password', help='PostgreSQL password')
    parser.add_argument('--pg-db', default='ocr_db', help='PostgreSQL database name')
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

def get_postgres_tables(conn: psycopg2.extensions.connection) -> List[str]:
    """Get list of tables from PostgreSQL database."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    tables = [row[0] for row in cursor.fetchall()]
    cursor.close()
    return tables

def get_postgres_table_schema(conn: psycopg2.extensions.connection, table_name: str) -> List[Dict[str, Any]]:
    """Get schema information for a PostgreSQL table."""
    cursor = conn.cursor()
    cursor.execute(f"""
        SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
        FROM 
            information_schema.columns 
        WHERE 
            table_schema = 'public' 
            AND table_name = %s
        ORDER BY 
            ordinal_position;
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
            kcu.column_name
        FROM
            information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
        WHERE
            tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
            AND tc.table_name = %s
        ORDER BY
            kcu.ordinal_position;
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

def map_pg_type_to_sqlite(pg_type: str) -> str:
    """Map PostgreSQL data type to SQLite data type."""
    # Extract base type from PostgreSQL type
    base_type = pg_type.split('(')[0].upper()
    
    return PG_TO_SQLITE_TYPE_MAP.get(base_type, 'TEXT')

def create_sqlite_table(sqlite_conn: sqlite3.Connection, table_name: str, columns: List[Dict[str, Any]]):
    """Create table in SQLite database."""
    cursor = sqlite_conn.cursor()
    
    # Build CREATE TABLE statement
    column_defs = []
    
    for col in columns:
        sqlite_type = map_pg_type_to_sqlite(col['type'])
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

def get_postgres_data(conn: psycopg2.extensions.connection, table_name: str) -> Tuple[List[str], List[Tuple]]:
    """Get column names and data from PostgreSQL table."""
    cursor = conn.cursor()
    cursor.execute(f'SELECT * FROM "{table_name}";')
    
    # Get column names
    column_names = [desc[0] for desc in cursor.description]
    
    # Get data
    data = cursor.fetchall()
    
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

def validate_migration(pg_conn: psycopg2.extensions.connection, sqlite_conn: sqlite3.Connection, table_name: str) -> bool:
    """Validate that data was migrated correctly by comparing row counts."""
    pg_cursor = pg_conn.cursor()
    sqlite_cursor = sqlite_conn.cursor()
    
    pg_cursor.execute(f'SELECT COUNT(*) FROM "{table_name}";')
    pg_count = pg_cursor.fetchone()[0]
    
    sqlite_cursor.execute(f'SELECT COUNT(*) FROM "{table_name}";')
    sqlite_count = sqlite_cursor.fetchone()[0]
    
    pg_cursor.close()
    sqlite_cursor.close()
    
    if pg_count == sqlite_count:
        print(f"Validation successful for {table_name}: {pg_count} rows")
        return True
    else:
        print(f"Validation failed for {table_name}: PostgreSQL has {pg_count} rows, SQLite has {sqlite_count} rows")
        return False

def main():
    """Main function to migrate data from PostgreSQL to SQLite."""
    args = parse_args()
    
    print("Starting migration from PostgreSQL to SQLite...")
    start_time = time.time()
    
    # Connect to databases
    pg_conn = connect_postgres(args.pg_host, args.pg_port, args.pg_user, args.pg_password, args.pg_db)
    
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
    
    # Get list of tables from PostgreSQL
    tables = get_postgres_tables(pg_conn)
    print(f"Found {len(tables)} tables in PostgreSQL database: {', '.join(tables)}")
    
    # Process each table
    validation_results = []
    for table_name in tables:
        print(f"\nProcessing table: {table_name}")
        
        # Get table schema
        columns = get_postgres_table_schema(pg_conn, table_name)
        
        # Create table in SQLite
        create_sqlite_table(sqlite_conn, table_name, columns)
        
        # Get data from PostgreSQL
        column_names, data = get_postgres_data(pg_conn, table_name)
        
        # Insert data into SQLite
        insert_data_to_sqlite(sqlite_conn, table_name, column_names, data)
        
        # Validate migration
        validation_result = validate_migration(pg_conn, sqlite_conn, table_name)
        validation_results.append((table_name, validation_result))
    
    # Close connections
    pg_conn.close()
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