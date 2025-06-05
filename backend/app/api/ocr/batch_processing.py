import logging
import asyncio
import json
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
import time

from .models import SharePointItem, PdfOcrRequest
from .db_utils import get_db_session
from .pdf_processing import pdf_ocr_process
from .sharepoint_processing import process_sharepoint_folder
from app.models import OcrResult, BatchProcessingJob
from app.api.sharepoint import list_files as list_sharepoint_files_in_folder
from app.api.thumbnails.thumbnail_utils import download_pdf_content_from_sharepoint
from .task_queue import task_queue

logger = logging.getLogger(__name__)

# Test logging on import
print("BATCH_PROCESSING.PY: Module loaded with persistent task queue")
logger.info("BATCH_PROCESSING.PY: Module loaded with persistent task queue")

# Global storage for batch processing status (in-memory cache)
batch_processing_status = {}

class BatchProcessor:
    def __init__(self, batch_id: str, files: List[Dict], settings: Dict):
        self.batch_id = batch_id
        self.files = files
        self.settings = settings
        self.total_files = len(files)
        self.processed_count = 0
        self.failed_count = 0
        self.skipped_count = 0
        self.current_file_index = 0
        self.current_file = None
        self.start_time = None
        self.status = "queued"  # queued, processing, paused, completed, error, cancelled
        self.is_paused = False
        self.should_stop = False
        self.results = []
        self.errors = []
        self.processing_stats = {
            "total_pages": 0,
            "total_words": 0,
            "total_characters": 0,
            "total_processing_time": 0,
            "average_processing_time": 0
        }
        self.logs = []

    async def download_sharepoint_file_direct(self, drive_id: str, item_id: str) -> bytes:
        """Download file directly from SharePoint using drive_id and item_id"""
        try:
            from app.api.sharepoint import get_graph_token
            import requests
            
            # Get access token
            token = get_graph_token()
            
            # Download file content directly
            url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{item_id}/content"
            headers = {"Authorization": f"Bearer {token}"}
            
            response = requests.get(url, headers=headers, allow_redirects=True)
            response.raise_for_status()
            
            content = response.content
            if len(content) == 0:
                logger.warning(f"Empty content received for drive_id: {drive_id}, item_id: {item_id}")
                return None
                
            logger.info(f"Successfully downloaded {len(content)} bytes for item_id: {item_id}")
            return content
            
        except Exception as e:
            logger.error(f"Error downloading SharePoint file {item_id}: {e}")
            return None

    def add_log(self, message: str, log_type: str = "info"):
        """Add a log entry with timestamp"""
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "message": message,
            "type": log_type
        }
        self.logs.append(log_entry)
        logger.info(f"Batch {self.batch_id}: {message}")

    def get_progress_percentage(self) -> float:
        """Calculate overall progress percentage"""
        if self.total_files == 0:
            return 0.0
        return (self.processed_count + self.failed_count + self.skipped_count) / self.total_files * 100

    def get_estimated_time_remaining(self) -> Optional[float]:
        """Calculate estimated time remaining in seconds"""
        if not self.start_time or self.processed_count == 0:
            return None
        
        elapsed_time = time.time() - self.start_time
        # Only count processed and failed files for time estimation (skipped files are instant)
        completed_files = self.processed_count + self.failed_count
        if completed_files == 0:
            return None
            
        average_time_per_file = elapsed_time / completed_files
        remaining_files = self.total_files - self.processed_count - self.failed_count - self.skipped_count
        
        return remaining_files * average_time_per_file

    def get_status_dict(self) -> Dict[str, Any]:
        """Get current status as dictionary"""
        # Calculate remaining files
        remaining_files = self.total_files - self.processed_count - self.failed_count - self.skipped_count
        
        status_dict = {
            "batch_id": self.batch_id,
            "status": self.status,
            "is_paused": self.is_paused,
            "total_files": self.total_files,
            "processed_count": self.processed_count,
            "failed_count": self.failed_count,
            "skipped_count": self.skipped_count,
            "remaining_files": remaining_files,
            "current_file_index": self.current_file_index,
            "current_file": self.current_file,
            "progress_percentage": self.get_progress_percentage(),
            "estimated_time_remaining": self.get_estimated_time_remaining(),
            "start_time": self.start_time,
            "processing_stats": self.processing_stats,
            "results": self.results,
            "errors": self.errors,
            "logs": self.logs[-50] if len(self.logs) > 50 else self.logs  # Last 50 logs
        }
        
        # Enhanced debug logging
        current_file_name = self.current_file.get('name', 'Unknown') if self.current_file else 'None'
        logger.info(f"Batch {self.batch_id} status: {self.status}, current_file_index: {self.current_file_index}, "
                   f"current_file: {current_file_name}, processed: {self.processed_count}/{self.total_files}")
        
        return status_dict

    async def process_single_file(self, file_info: Dict, db: Session) -> Dict[str, Any]:
        """Process a single file and return result"""
        try:
            # Ensure current_file is set (should already be set in start_processing)
            self.current_file = file_info
            self.add_log(f"Processing file {self.current_file_index + 1}/{self.total_files}: {file_info['name']}")
            
            # Check if file is already processed
            if 'item_id' in file_info:
                from app.models import OcrResult
                existing_result = db.query(OcrResult).filter(OcrResult.file_id == file_info['item_id']).first()
                if existing_result and existing_result.status in ['completed', 'success']:
                    self.skipped_count += 1
                    self.add_log(f"Skipped already processed file: {file_info['name']}", "info")
                    
                    result_info = {
                        "file": file_info,
                        "result": {"message": "Already processed", "status": existing_result.status},
                        "processing_time": 0,
                        "status": "skipped"
                    }
                    
                    return result_info
            
            file_start_time = time.time()
            
            # Download file from SharePoint if needed
            if 'drive_id' in file_info and 'item_id' in file_info:
                # This is a SharePoint file - download directly using SharePoint API
                file_content = await self.download_sharepoint_file_direct(
                    file_info['drive_id'],
                    file_info['item_id']
                )
                
                if file_content is None:
                    raise Exception(f"Failed to download file from SharePoint: {file_info['name']}")
                
                # Convert to base64
                import base64
                file_data_base64 = base64.b64encode(file_content).decode('utf-8')
                
                # Create PdfOcrRequest
                request = PdfOcrRequest(
                    file_data=file_data_base64,
                    filename=file_info['name'],
                    settings=self.settings
                )
                
                # Process with OCR
                result = await pdf_ocr_process(request, file_info.get('item_id'))
                
            else:
                # This is an uploaded file (base64 data should be in file_info)
                request = PdfOcrRequest(
                    file_data=file_info['file_data'],
                    filename=file_info['name'],
                    settings=self.settings
                )
                
                result = await pdf_ocr_process(request, file_info.get('file_id'))
            
            processing_time = time.time() - file_start_time
            
            # Update statistics
            self.processing_stats["total_pages"] += result.get("pageCount", 0)
            self.processing_stats["total_words"] += result.get("totalWords", 0)
            self.processing_stats["total_characters"] += result.get("totalCharacters", 0)
            self.processing_stats["total_processing_time"] += processing_time
            
            if self.processed_count > 0:
                self.processing_stats["average_processing_time"] = (
                    self.processing_stats["total_processing_time"] / (self.processed_count + 1)
                )
            
            self.processed_count += 1
            
            result_info = {
                "file": file_info,
                "result": result,
                "processing_time": processing_time,
                "status": "success"
            }
            
            self.results.append(result_info)
            self.add_log(f"Successfully processed: {file_info['name']} ({result.get('pageCount', 0)} pages)", "success")
            
            return result_info
            
        except Exception as e:
            self.failed_count += 1
            error_info = {
                "file": file_info,
                "error": str(e),
                "status": "error"
            }
            self.errors.append(error_info)
            self.add_log(f"Failed to process: {file_info['name']} - {str(e)}", "error")
            return error_info

    async def start_processing(self):
        """Start the batch processing"""
        print(f"DIAGNOSTIC: start_processing called for batch {self.batch_id}")
        logger.info(f"DIAGNOSTIC: start_processing called for batch {self.batch_id}")
        
        try:
            print(f"DIAGNOSTIC: About to change status to processing for batch {self.batch_id}")
            self.status = "processing"
            self.start_time = time.time()
            print(f"DIAGNOSTIC: Batch {self.batch_id} status changed to processing - status is now: {self.status}")
            
            # Force update the global status immediately
            if self.batch_id in batch_processing_status:
                batch_processing_status[self.batch_id].status = "processing"
                print(f"DIAGNOSTIC: Updated global status for batch {self.batch_id}")
            
            self.add_log(f"Starting batch processing for {self.total_files} files")
            print(f"DIAGNOSTIC: Batch {self.batch_id} starting file loop with {self.total_files} files")
            logger.info(f"DIAGNOSTIC: Batch {self.batch_id} status changed to processing, starting file loop")
        except Exception as e:
            print(f"DIAGNOSTIC ERROR in start_processing setup: {e}")
            logger.error(f"DIAGNOSTIC ERROR in start_processing setup: {e}", exc_info=True)
            raise
        
        try:
            print(f"DIAGNOSTIC: About to get database session for batch {self.batch_id}")
            with get_db_session() as db:
                print(f"DIAGNOSTIC: Got database session, starting file loop for batch {self.batch_id}")
                for i, file_info in enumerate(self.files):
                    # Check for pause/stop signals
                    while self.is_paused and not self.should_stop:
                        await asyncio.sleep(1)
                    
                    if self.should_stop:
                        self.add_log("Processing stopped by user", "warning")
                        break
                    
                    # Update current file tracking BEFORE processing
                    self.current_file_index = i
                    self.current_file = file_info
                    
                    # Process the file
                    await self.process_single_file(file_info, db)
                    
                    # Keep current file info until next file starts
                    # Don't clear current_file here to maintain tracking
                    
                    # Small delay between files
                    await asyncio.sleep(0.5)
                
                if not self.should_stop:
                    self.status = "completed"
                    self.add_log(f"Batch processing completed. Processed: {self.processed_count}, Failed: {self.failed_count}")
                else:
                    self.status = "cancelled"
                    
        except Exception as e:
            self.status = "error"
            self.add_log(f"Batch processing error: {str(e)}", "error")
            logger.error(f"Batch processing error: {e}", exc_info=True)
        
        finally:
            # Only clear current_file when batch is completely finished
            self.current_file = None

    def pause(self):
        """Pause the processing"""
        self.is_paused = True
        self.add_log("Processing paused", "warning")

    def resume(self):
        """Resume the processing"""
        self.is_paused = False
        self.add_log("Processing resumed", "info")

    def stop(self):
        """Stop the processing"""
        self.should_stop = True
        self.is_paused = False
        self.add_log("Processing stop requested", "warning")


async def start_batch_processing(
    batch_id: str,
    files: List[Dict],
    settings: Dict,
    background_tasks: BackgroundTasks = None
) -> Dict[str, Any]:
    """Start batch processing for a list of files"""
    
    print(f"DIAGNOSTIC: start_batch_processing called for batch {batch_id} with {len(files)} files")
    logger.info(f"DIAGNOSTIC: start_batch_processing called for batch {batch_id} with {len(files)} files")
    
    if batch_id in batch_processing_status:
        raise HTTPException(status_code=400, detail=f"Batch {batch_id} is already being processed")
    
    # Check if already running in persistent queue
    if task_queue.is_task_running(batch_id):
        raise HTTPException(status_code=400, detail=f"Batch {batch_id} is already running in persistent queue")
    
    # Create batch processor
    processor = BatchProcessor(batch_id, files, settings)
    batch_processing_status[batch_id] = processor
    
    # Start processing in persistent task queue instead of background tasks
    print(f"DIAGNOSTIC: Submitting batch {batch_id} to persistent task queue")
    logger.info(f"DIAGNOSTIC: Submitting batch {batch_id} to persistent task queue with {len(files)} files")
    task_queue.submit_batch_task(batch_id, processor.start_processing)
    
    # Add immediate status check
    print(f"DIAGNOSTIC: Batch {batch_id} created with status: {processor.status}")
    logger.info(f"DIAGNOSTIC: Batch {batch_id} created with status: {processor.status}")
    
    return processor.get_status_dict()


async def start_folder_batch_processing(
    batch_id: str,
    drive_id: str,
    folder_id: str,
    settings: Dict,
    background_tasks: BackgroundTasks = None,
    recursive: bool = True
) -> Dict[str, Any]:
    """Start batch processing for all PDF files in a SharePoint folder"""
    
    if batch_id in batch_processing_status:
        raise HTTPException(status_code=400, detail=f"Batch {batch_id} is already being processed")
    
    # Check if already running in persistent queue
    if task_queue.is_task_running(batch_id):
        raise HTTPException(status_code=400, detail=f"Batch {batch_id} is already running in persistent queue")
    
    try:
        # Get all PDF files in the folder
        response = list_sharepoint_files_in_folder(drive_id=drive_id, parent_id=folder_id)
        folder_files_data = json.loads(response.body)
        
        # Filter PDF files
        pdf_files = []
        for file_info in folder_files_data:
            if (file_info.get("name", "").lower().endswith(".pdf") or
                file_info.get("mimeType") == "application/pdf"):
                
                pdf_files.append({
                    "name": file_info.get("name"),
                    "item_id": file_info.get("id"),
                    "drive_id": drive_id,
                    "size": file_info.get("size", 0),
                    "modified": file_info.get("lastModifiedDateTime")
                })
        
        if not pdf_files:
            raise HTTPException(status_code=404, detail="No PDF files found in the specified folder")
        
        # Create batch processor
        processor = BatchProcessor(batch_id, pdf_files, settings)
        batch_processing_status[batch_id] = processor
        
        # Start processing in persistent task queue instead of background tasks
        logger.info(f"DIAGNOSTIC: Submitting folder batch {batch_id} to persistent task queue with {len(pdf_files)} PDF files")
        task_queue.submit_batch_task(batch_id, processor.start_processing)
        
        # Add immediate status check
        logger.info(f"DIAGNOSTIC: Folder batch {batch_id} created with status: {processor.status}")
        
        return processor.get_status_dict()
        
    except Exception as e:
        logger.error(f"Error starting folder batch processing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error starting folder batch processing: {str(e)}")


def get_batch_status(batch_id: str) -> Dict[str, Any]:
    """Get the current status of a batch processing job"""
    if batch_id not in batch_processing_status:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    
    processor = batch_processing_status[batch_id]
    status_dict = processor.get_status_dict()
    
    # Add diagnostic logging
    print(f"DIAGNOSTIC: get_batch_status for {batch_id} returning status: {status_dict['status']}")
    
    return status_dict


def pause_batch_processing(batch_id: str) -> Dict[str, Any]:
    """Pause a batch processing job"""
    if batch_id not in batch_processing_status:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    
    processor = batch_processing_status[batch_id]
    processor.pause()
    return processor.get_status_dict()


def resume_batch_processing(batch_id: str) -> Dict[str, Any]:
    """Resume a batch processing job"""
    if batch_id not in batch_processing_status:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    
    processor = batch_processing_status[batch_id]
    processor.resume()
    return processor.get_status_dict()


def stop_batch_processing(batch_id: str) -> Dict[str, Any]:
    """Stop a batch processing job"""
    if batch_id not in batch_processing_status:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    
    processor = batch_processing_status[batch_id]
    processor.stop()
    
    # Also try to cancel in the persistent task queue
    task_queue.cancel_task(batch_id)
    
    return processor.get_status_dict()


def list_batch_jobs() -> Dict[str, Any]:
    """List all batch processing jobs"""
    jobs = {}
    for batch_id, processor in batch_processing_status.items():
        jobs[batch_id] = {
            "batch_id": batch_id,
            "status": processor.status,
            "total_files": processor.total_files,
            "processed_count": processor.processed_count,
            "failed_count": processor.failed_count,
            "skipped_count": processor.skipped_count,
            "progress_percentage": processor.get_progress_percentage(),
            "start_time": processor.start_time
        }
    return {"jobs": jobs}


def cleanup_completed_jobs():
    """Clean up completed batch jobs (call periodically)"""
    completed_jobs = []
    for batch_id, processor in batch_processing_status.items():
        if processor.status in ["completed", "error", "cancelled"]:
            # Keep completed jobs for 1 hour
            if processor.start_time and time.time() - processor.start_time > 3600:
                completed_jobs.append(batch_id)
    
    for batch_id in completed_jobs:
        del batch_processing_status[batch_id]
        logger.info(f"Cleaned up completed batch job: {batch_id}")