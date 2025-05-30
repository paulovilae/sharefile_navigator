import sqlite3
print('Running list_sqlite_tables.py...')
conn = sqlite3.connect('../ocr.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
if tables:
    print('Tables in ocr.db:')
    for t in tables:
        print(f'- {t[0]}')
else:
    print('No tables found in ocr.db')
conn.close()