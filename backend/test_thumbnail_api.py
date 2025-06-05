import requests
import json

# Test the thumbnail endpoint for a file that should have a thumbnail
file_id = '01YZ3KRSGACNJGN6ILFJB3KJVOEBF3USSD'
url = f'http://localhost:8000/api/thumbnails/thumbnail/{file_id}'

try:
    response = requests.get(url)
    print(f'Status: {response.status_code}')
    print(f'Headers: {dict(response.headers)}')
    if response.status_code == 200:
        print(f'Content length: {len(response.content)} bytes')
        print(f'Content type: {response.headers.get("content-type", "unknown")}')
    else:
        print(f'Error response: {response.text}')
except Exception as e:
    print(f'Error: {e}')