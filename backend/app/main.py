import os
from fastapi import FastAPI
import pyodbc
from dotenv import load_dotenv
from backend.app.api import sharepoint

load_dotenv()

app = FastAPI()

app.include_router(sharepoint.router, prefix="/api/sharepoint")

@app.get("/health")
def health_check():
    server = os.getenv('SQL_SERVER')
    database = os.getenv('SQL_DATABASE')
    username = os.getenv('SQL_USERNAME')
    password = os.getenv('SQL_PASSWORD')
    driver = os.getenv('SQL_DRIVER', '{ODBC Driver 18 for SQL Server}')
    extra = os.getenv('SQL_EXTRA', '')
    conn_str = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password}'
    if extra:
        conn_str += f';{extra}'
    try:
        with pyodbc.connect(conn_str, timeout=3) as conn:
            return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)} 