import requests

# Test the exact page IDs that the frontend is requesting
file_id_1 = '01YZ3KRSHCQULXOFGVKREYNVOBURDAPGYU_page_1'
file_id_2 = '01YZ3KRSHCQULXOFGVKREYNVOBURDAPGYU_page_2'

print('Testing the exact page IDs from frontend requests...')

for file_id in [file_id_1, file_id_2]:
    url = f'http://localhost:8000/api/thumbnails/thumbnail/{file_id}'
    try:
        response = requests.get(url)
        print(f'\n{file_id}:')
        print(f'  Status: {response.status_code}')
        if response.status_code != 200:
            print(f'  Error: {response.text}')
        else:
            print(f'  Content-Length: {len(response.content)} bytes')
            print(f'  Thumbnail-Source: {response.headers.get("X-Thumbnail-Source", "unknown")}')
    except Exception as e:
        print(f'  Error: {e}')