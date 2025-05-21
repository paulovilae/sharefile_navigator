import os
from dotenv import load_dotenv
import pyodbc

load_dotenv()

server = os.getenv('SQL_SERVER')
database = os.getenv('SQL_DATABASE')
username = os.getenv('SQL_USERNAME')
password = os.getenv('SQL_PASSWORD')
driver = os.getenv('SQL_DRIVER', '{ODBC Driver 18 for SQL Server}')
extra = os.getenv('SQL_EXTRA', '')

print("Using database:", database)

# Connection string without database (for creation)
conn_str_server = f'DRIVER={driver};SERVER={server};UID={username};PWD={password}'
if extra:
    conn_str_server += f';{extra}'

# Connection string with database (for table creation)
conn_str_db = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password}'
if extra:
    conn_str_db += f';{extra}'

create_table_sql = """
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OCR_Results' AND xtype='U')
CREATE TABLE OCR_Results (
    id INT IDENTITY(1,1) PRIMARY KEY,
    file_path NVARCHAR(1024) NOT NULL,
    file_name NVARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_created_at DATETIME,
    pdf_author NVARCHAR(255),
    pdf_title NVARCHAR(255),
    pdf_subject NVARCHAR(255),
    pdf_keywords NVARCHAR(255),
    ocr_text NVARCHAR(MAX),
    language NVARCHAR(32),
    status NVARCHAR(32),
    processed_at DATETIME DEFAULT GETDATE(),
    error_message NVARCHAR(MAX),
    tags NVARCHAR(MAX)
)
"""

try:
    # Step 1: Connect to server, check/create database
    with pyodbc.connect(conn_str_server, autocommit=True) as conn:
        print("Connected to SQL Server (server-level).")
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sys.databases WHERE name = ?", (database,))
        row = cursor.fetchone()
        if row:
            print(f"Database '{database}' already exists.")
        else:
            print(f"Database '{database}' does not exist. Creating...")
            cursor.execute(f"CREATE DATABASE [{database}]")
            print(f"Database '{database}' created successfully.")

    # Step 2: Connect to the database, create table
    with pyodbc.connect(conn_str_db, autocommit=True) as conn:
        print(f"Connected to database '{database}'.")
        cursor = conn.cursor()
        cursor.execute(create_table_sql)
        print("OCR_Results table created or already exists.")

except Exception as e:
    print("Connection or database creation failed:", e) 