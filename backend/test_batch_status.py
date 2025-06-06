import sys
sys.path.append('.')
from app.api.ocr.batch_processing import get_batch_status

try:
    status = get_batch_status('paginated_paginated_batch_1749107202506_chunk_0_z7oelb3ki')
    print('Backend status response:')
    print('estimated_time_remaining:', status.get('estimated_time_remaining'))
    print('processing_stats:', status.get('processing_stats'))
    print('logs count:', len(status.get('logs', [])))
    print('start_time:', status.get('start_time'))
    print('processed_count:', status.get('processed_count'))
    print('failed_count:', status.get('failed_count'))
    print('total_files:', status.get('total_files'))
except Exception as e:
    print('Error:', e)