import sqlite3
import sys
print('Running list_sqlite_tables.py...', flush=True)
conn = sqlite3.connect('ocr.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
if tables:
    print('Tables in ocr.db:', flush=True)
    for t in tables:
        print('-', t[0], flush=True)
else:
    print('No tables found in ocr.db', flush=True)
conn.close() 