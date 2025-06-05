import sqlite3
import base64
from pathlib import Path

# Connect to database
conn = sqlite3.connect('../ocr.db')
cursor = conn.execute('SELECT file_id, thumbnail_preview FROM ocr_results WHERE file_id = ?', ('01YZ3KRSGACNJGN6ILFJB3KJVOEBF3USSD',))
result = cursor.fetchone()

if result:
    file_id, thumbnail_data = result
    if thumbnail_data:
        # Decode and save thumbnail to see what it actually contains
        decoded_data = base64.b64decode(thumbnail_data)
        with open(f'debug_thumbnail_{file_id}.jpg', 'wb') as f:
            f.write(decoded_data)
        print(f'Saved thumbnail to debug_thumbnail_{file_id}.jpg')
        print(f'Thumbnail size: {len(decoded_data)} bytes')
    else:
        print('No thumbnail data found')
else:
    print('Record not found')

conn.close()