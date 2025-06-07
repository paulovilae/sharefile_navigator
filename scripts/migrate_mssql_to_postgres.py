#!/usr/bin/env python3
"""
Migration script to transfer data from Microsoft SQL Server to PostgreSQL.

This script:
1. Reads schema and data from Microsoft SQL Server database
2. Creates equivalent tables in PostgreSQL
3. Transfers all data from Microsoft SQL Server to PostgreSQL
4. Validates the migration

Usage:
    python migrate_mssql_to_postgres.py [--mssql-host MSSQL_HOST] [--mssql-port MSSQL_PORT] [--mssql-user MSSQL_USER] 
                                       [--mssql-password MSSQL_PASSWORD] [--mssql-db MSSQL_DB] [--pg-host PG_HOST] 
                                       [--pg-port PG_PORT] [--pg-user PG_USER] [--pg-password PG_PASSWORD] [--pg-db PG_DB]

Example:
    python migrate_mssql_to_postgres.py --mssql-host localhost --mssql-port 1433 --mssql-user sa 
                                       --mssql-password OcrPassword123! --mssql-db ocr_db --pg-host localhost 
                                       --pg-port 5432 --pg-user ocr_user --pg-password ocr_password --pg-db ocr_db
"""

import argparse
import sys
import time
from typing import Dict, List, Tuple, Any

try:
    import pyodbc
except ImportError:
    print("Error: pyodbc is required. Install it with 'pip install pyodbc'")
    sys.exit(1)

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("Error: psycopg2 is required. Install it with 'pip install psycopg2-binary'")
    sys.exit(1)

# Microsoft SQL Server data types to PostgreSQL data types mapping
MSSQL_TO_PG_TYPE_MAP = {
    'INT': 'INTEGER',
    'BIGINT': 'BIGINT',
    'SMALLINT': 'SMALLINT',
    'TINYINT': 'SMALLINT',
    'BIT': 'BOOLEAN',
    'DECIMAL': 'NUMERIC',
    'NUMERIC': 'NUMERIC',
    'FLOAT': 'DOUBLE PRECISION',
    'REAL': 'REAL',
    'MONEY': 'NUMERIC(19,4)',
    'SMALLMONEY': 'NUMERIC(10,4)',
    'CHAR': 'CHAR',
    'VARCHAR': 'VARCHAR',
    'TEXT': 'TEXT',
    'NCHAR': 'VARCHAR',
    'NVARCHAR': 'VARCHAR',
    'NTEXT': 'TEXT',
    'BINARY': 'BYTEA',
    'VARBINARY': 'BYTEA',
    'IMAGE': 'BYTEA',
    'DATETIME': 'TIMESTAMP',
    'DATETIME2': 'TIMESTAMP',
    'DATE': 'DATE',
    'TIME': 'TIME',
    'DATETIMEOFFSET': 'TIMESTAMP WITH TIME ZONE',
    'SMALLDATETIME': 'TIMESTAMP',
    'TIMESTAMP': 'BYTEA',  # SQL Server's TIMESTAMP is actually a rowversion, not a datetime
    'UNIQUEIDENTIFIER': 'UUID',
    'XML': 'XML',
    'SQL_VARIANT': 'TEXT',
}

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Migrate data from Microsoft SQL Server to PostgreSQL')
    parser.add_argument('--mssql-host', default='localhost', help='Microsoft SQL Server host')
    parser.add_argument('--mssql-port', default='1433', help='Microsoft SQL Server port')
    parser.add_argument('--mssql-user', default='sa', help='Microsoft SQL Server username')
    parser.add_argument('--mssql-password', default='OcrPassword123!', help='Microsoft SQL Server password')
    parser.add_argument('--mssql-db', default='ocr_db', help='Microsoft SQL Server database name')
    parser.add_argument('--pg-host', default='localhost', help='PostgreSQL host')
    parser.add_argument('--pg-port', default='5432', help='PostgreSQL port')
    parser.add_argument('--pg-user', default='ocr_user', help='PostgreSQL username')
    parser.add_argument('--pg-password', default='ocr_password', help='PostgreSQL password')
    parser.add_argument('--pg-db', default='ocr_db', help='PostgreSQL database name')
    return parser.parse_args()

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
            COLUMN_DEFAULT,
            CHARACTER_MAXIMUM_LENGTH
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
            'default': row[3],
            'max_length': row[4]
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

def map_mssql_type_to_pg(mssql_type: str, max_length: int = None) -> str:
    """Map Microsoft SQL Server data type to PostgreSQL data type."""
    # Extract base type from Microsoft SQL Server type
    base_type = mssql_type.split('(')[0].upper()
    
    # Handle special cases with length
    if base_type in ['VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR'] and max_length is not None:
        if max_length == -1 or max_length > 10485760:  # -1 means MAX in SQL Server
            return 'TEXT'
        else:
            return f"{MSSQL_TO_PG_TYPE_MAP.get(base_type, 'VARCHAR')}({max_length})"
    
    return MSSQL_TO_PG_TYPE_MAP.get(base_type, 'TEXT')

def create_postgres_table(pg_conn: psycopg2.extensions.connection, table_name: str, columns: List[Dict[str, Any]]):
    """Create table in PostgreSQL database."""
    cursor = pg_conn.cursor()
    
    # Build CREATE TABLE statement
    column_defs = []
    primary_keys = []
    
    for col in columns:
        pg_type = map_mssql_type_to_pg(col['type'], col.get('max_length'))
        nullable = "NOT NULL" if col['notnull'] else ""
        
        column_def = f"\"{col['name']}\" {pg_type} {nullable}"
        column_defs.append(column_def)
        
        if col.get('pk', False):
            primary_keys.append(col['name'])
    
    # Add primary key constraint if applicable
    if primary_keys:
        pk_constraint = f", PRIMARY KEY ({', '.join([f'\"{pk}\"' for pk in primary_keys])})"
    else:
        pk_constraint = ""
    
    create_table_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" ({", ".join(column_defs)}{pk_constraint});'
    
    try:
        cursor.execute(create_table_sql)
        print(f"Created table {table_name} in PostgreSQL")
    except psycopg2.Error as e:
        print(f"Error creating table {table_name} in PostgreSQL: {e}")
    
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
        # Convert any None values to NULL for PostgreSQL
        processed_row = []
        for value in row:
            if isinstance(value, bytearray):
                # Convert bytearray to bytes for PostgreSQL
                processed_row.append(bytes(value))
            else:
                processed_row.append(value)
        data.append(tuple(processed_row))
    
    cursor.close()
    return column_names, data

def insert_data_to_postgres(pg_conn: psycopg2.extensions.connection, table_name: str, column_names: List[str], data: List[Tuple]):
    """Insert data into PostgreSQL table."""
    if not data:
        print(f"No data to insert for table {table_name}")
        return
    
    cursor = pg_conn.cursor()
    
    # Create placeholders for prepared statement
    placeholders = ', '.join([f'%s' for _ in column_names])
    columns = ', '.join([f'"{col}"' for col in column_names])
    
    insert_sql = f'INSERT INTO "{table_name}" ({columns}) VALUES ({placeholders});'
    
    try:
        # Use executemany for better performance
        batch_size = 1000  # Process in batches to avoid memory issues
        total_rows = len(data)
        
        for i in range(0, total_rows, batch_size):
            batch = data[i:i + batch_size]
            cursor.executemany(insert_sql, batch)
            print(f"Inserted {min(i + batch_size, total_rows)}/{total_rows} rows into {table_name}")
        
        print(f"Completed inserting {total_rows} rows into {table_name}")
    except psycopg2.Error as e:
        print(f"Error inserting data into {table_name}: {e}")
    
    cursor.close()

def validate_migration(mssql_conn: pyodbc.Connection, pg_conn: psycopg2.extensions.connection, table_name: str) -> bool:
    """Validate that data was migrated correctly by comparing row counts."""
    mssql_cursor = mssql_conn.cursor()
    pg_cursor = pg_conn.cursor()
    
    mssql_cursor.execute(f'SELECT COUNT(*) FROM [{table_name}];')
    mssql_count = mssql_cursor.fetchone()[0]
    
    pg_cursor.execute(f'SELECT COUNT(*) FROM "{table_name}";')
    pg_count = pg_cursor.fetchone()[0]
    
    mssql_cursor.close()
    pg_cursor.close()
    
    if mssql_count == pg_count:
        print(f"Validation successful for {table_name}: {mssql_count} rows")
        return True
    else:
        print(f"Validation failed for {table_name}: Microsoft SQL Server has {mssql_count} rows, PostgreSQL has {pg_count} rows")
        return False

def main():
    """Main function to migrate data from Microsoft SQL Server to PostgreSQL."""
    args = parse_args()
    
    print("Starting migration from Microsoft SQL Server to PostgreSQL...")
    start_time = time.time()
    
    # Connect to databases
    mssql_conn = connect_mssql(args.mssql_host, args.mssql_port, args.mssql_user, args.mssql_password, args.mssql_db)
    pg_conn = connect_postgres(args.pg_host, args.pg_port, args.pg_user, args.pg_password, args.pg_db)
    
    # Get list of tables from Microsoft SQL Server
    tables = get_mssql_tables(mssql_conn)
    print(f"Found {len(tables)} tables in Microsoft SQL Server database: {', '.join(tables)}")
    
    # Process each table
    validation_results = []
    for table_name in tables:
        print(f"\nProcessing table: {table_name}")
        
        # Get table schema
        columns = get_mssql_table_schema(mssql_conn, table_name)
        
        # Create table in PostgreSQL
        create_postgres_table(pg_conn, table_name, columns)
        
        # Get data from Microsoft SQL Server
        column_names, data = get_mssql_data(mssql_conn, table_name)
        
        # Insert data into PostgreSQL
        insert_data_to_postgres(pg_conn, table_name, column_names, data)
        
        # Validate migration
        validation_result = validate_migration(mssql_conn, pg_conn, table_name)
        validation_results.append((table_name, validation_result))
    
    # Close connections
    mssql_conn.close()
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