#!/usr/bin/env python3
"""
Migration script to transfer data from PostgreSQL to Microsoft SQL Server.

This script:
1. Reads schema and data from PostgreSQL database
2. Creates equivalent tables in Microsoft SQL Server
3. Transfers all data from PostgreSQL to Microsoft SQL Server
4. Validates the migration

Usage:
    python migrate_postgres_to_mssql.py [--pg-host PG_HOST] [--pg-port PG_PORT] [--pg-user PG_USER] 
                                       [--pg-password PG_PASSWORD] [--pg-db PG_DB] [--mssql-host MSSQL_HOST] 
                                       [--mssql-port MSSQL_PORT] [--mssql-user MSSQL_USER] 
                                       [--mssql-password MSSQL_PASSWORD] [--mssql-db MSSQL_DB]

Example:
    python migrate_postgres_to_mssql.py --pg-host localhost --pg-port 5432 --pg-user ocr_user 
                                       --pg-password ocr_password --pg-db ocr_db --mssql-host localhost 
                                       --mssql-port 1433 --mssql-user sa --mssql-password OcrPassword123! 
                                       --mssql-db ocr_db
"""

import argparse
import sys
import time
from typing import Dict, List, Tuple, Any

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("Error: psycopg2 is required. Install it with 'pip install psycopg2-binary'")
    sys.exit(1)

try:
    import pyodbc
except ImportError:
    print("Error: pyodbc is required. Install it with 'pip install pyodbc'")
    sys.exit(1)

# PostgreSQL data types to Microsoft SQL Server data types mapping
PG_TO_MSSQL_TYPE_MAP = {
    'INTEGER': 'INT',
    'BIGINT': 'BIGINT',
    'SMALLINT': 'SMALLINT',
    'REAL': 'FLOAT',
    'DOUBLE PRECISION': 'FLOAT',
    'NUMERIC': 'DECIMAL(18,6)',
    'DECIMAL': 'DECIMAL(18,6)',
    'BOOLEAN': 'BIT',
    'TEXT': 'NVARCHAR(MAX)',
    'VARCHAR': 'NVARCHAR',
    'CHARACTER VARYING': 'NVARCHAR',
    'CHAR': 'NCHAR',
    'CHARACTER': 'NCHAR',
    'BYTEA': 'VARBINARY(MAX)',
    'TIMESTAMP': 'DATETIME2',
    'TIMESTAMP WITHOUT TIME ZONE': 'DATETIME2',
    'TIMESTAMP WITH TIME ZONE': 'DATETIMEOFFSET',
    'DATE': 'DATE',
    'TIME': 'TIME',
    'TIME WITHOUT TIME ZONE': 'TIME',
    'TIME WITH TIME ZONE': 'TIME',
    'INTERVAL': 'NVARCHAR(100)',
    'UUID': 'UNIQUEIDENTIFIER',
    'JSON': 'NVARCHAR(MAX)',
    'JSONB': 'NVARCHAR(MAX)',
    'ARRAY': 'NVARCHAR(MAX)',  # Arrays will be serialized to JSON
}

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Migrate data from PostgreSQL to Microsoft SQL Server')
    parser.add_argument('--pg-host', default='localhost', help='PostgreSQL host')
    parser.add_argument('--pg-port', default='5432', help='PostgreSQL port')
    parser.add_argument('--pg-user', default='ocr_user', help='PostgreSQL username')
    parser.add_argument('--pg-password', default='ocr_password', help='PostgreSQL password')
    parser.add_argument('--pg-db', default='ocr_db', help='PostgreSQL database name')
    parser.add_argument('--mssql-host', default='localhost', help='Microsoft SQL Server host')
    parser.add_argument('--mssql-port', default='1433', help='Microsoft SQL Server port')
    parser.add_argument('--mssql-user', default='sa', help='Microsoft SQL Server username')
    parser.add_argument('--mssql-password', default='OcrPassword123!', help='Microsoft SQL Server password')
    parser.add_argument('--mssql-db', default='ocr_db', help='Microsoft SQL Server database name')
    return parser.parse_args()

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
            column_default,
            character_maximum_length
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
            'default': row[3],
            'max_length': row[4]
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

def map_pg_type_to_mssql(pg_type: str, max_length: int = None) -> str:
    """Map PostgreSQL data type to Microsoft SQL Server data type."""
    # Extract base type from PostgreSQL type
    base_type = pg_type.split('(')[0].upper()
    
    # Handle special cases with length
    if base_type in ['VARCHAR', 'CHARACTER VARYING', 'CHAR', 'CHARACTER'] and max_length is not None:
        if max_length == -1:  # -1 means unlimited in PostgreSQL
            return 'NVARCHAR(MAX)'
        else:
            return f"NVARCHAR({max_length})"
    
    return PG_TO_MSSQL_TYPE_MAP.get(base_type, 'NVARCHAR(MAX)')

def create_mssql_table(mssql_conn: pyodbc.Connection, table_name: str, columns: List[Dict[str, Any]]):
    """Create table in Microsoft SQL Server database."""
    cursor = mssql_conn.cursor()
    
    # Build CREATE TABLE statement
    column_defs = []
    primary_keys = []
    
    for col in columns:
        mssql_type = map_pg_type_to_mssql(col['type'], col.get('max_length'))
        nullable = "NOT NULL" if col['notnull'] else "NULL"
        
        column_def = f"[{col['name']}] {mssql_type} {nullable}"
        column_defs.append(column_def)
        
        if col.get('pk', False):
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

def validate_migration(pg_conn: psycopg2.extensions.connection, mssql_conn: pyodbc.Connection, table_name: str) -> bool:
    """Validate that data was migrated correctly by comparing row counts."""
    pg_cursor = pg_conn.cursor()
    mssql_cursor = mssql_conn.cursor()
    
    pg_cursor.execute(f'SELECT COUNT(*) FROM "{table_name}";')
    pg_count = pg_cursor.fetchone()[0]
    
    mssql_cursor.execute(f'SELECT COUNT(*) FROM [{table_name}];')
    mssql_count = mssql_cursor.fetchone()[0]
    
    pg_cursor.close()
    mssql_cursor.close()
    
    if pg_count == mssql_count:
        print(f"Validation successful for {table_name}: {pg_count} rows")
        return True
    else:
        print(f"Validation failed for {table_name}: PostgreSQL has {pg_count} rows, Microsoft SQL Server has {mssql_count} rows")
        return False

def main():
    """Main function to migrate data from PostgreSQL to Microsoft SQL Server."""
    args = parse_args()
    
    print("Starting migration from PostgreSQL to Microsoft SQL Server...")
    start_time = time.time()
    
    # Connect to databases
    pg_conn = connect_postgres(args.pg_host, args.pg_port, args.pg_user, args.pg_password, args.pg_db)
    mssql_conn = connect_mssql(args.mssql_host, args.mssql_port, args.mssql_user, args.mssql_password, args.mssql_db)
    
    # Get list of tables from PostgreSQL
    tables = get_postgres_tables(pg_conn)
    print(f"Found {len(tables)} tables in PostgreSQL database: {', '.join(tables)}")
    
    # Process each table
    validation_results = []
    for table_name in tables:
        print(f"\nProcessing table: {table_name}")
        
        # Get table schema
        columns = get_postgres_table_schema(pg_conn, table_name)
        
        # Create table in Microsoft SQL Server
        create_mssql_table(mssql_conn, table_name, columns)
        
        # Get data from PostgreSQL
        column_names, data = get_postgres_data(pg_conn, table_name)
        
        # Insert data into Microsoft SQL Server
        insert_data_to_mssql(mssql_conn, table_name, column_names, data)
        
        # Validate migration
        validation_result = validate_migration(pg_conn, mssql_conn, table_name)
        validation_results.append((table_name, validation_result))
    
    # Close connections
    pg_conn.close()
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