import sys
sys.path.append('.')
from app.api.ocr.batch_processing import batch_processing_status

print('Currently active batches:')
for batch_id, processor in batch_processing_status.items():
    print(f'- {batch_id}: {processor.status}')

if not batch_processing_status:
    print('No active batches found')