import sqlite3
with open('tables_output.txt', 'w', encoding='utf-8') as f:
    f.write('Running list_sqlite_tables.py...\n')
    conn = sqlite3.connect('ocr.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    if tables:
        f.write('Tables in ocr.db:\n')
        for t in tables:
            f.write(f'- {t[0]}\n')
    else:
        f.write('No tables found in ocr.db\n')
    conn.close() 