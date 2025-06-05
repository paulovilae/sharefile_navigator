import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from .models import SharePointItem, PdfOcrRequest, BatchProcessingRequest
from .db_utils import get_db_session
from .preload_utils import check_preloaded_data
from .pdf_processing import pdf_ocr_with_preload, pdf_ocr_process
from .sharepoint_processing import process_sharepoint_item
from .status_utils import get_ocr_status, get_ocr_text, update_ocr_status
from .image_utils import serve_temp_image, serve_preloaded_image, serve_image
from .preprocessing import preprocess
from .ocr_processing import ocr_images
from .batch_processing import (
    start_batch_processing,
    start_folder_batch_processing,
    get_batch_status,
    pause_batch_processing,
    resume_batch_processing,
    stop_batch_processing,
    list_batch_jobs,
    cleanup_completed_jobs
)
from app.api.ocr.process_health import (
    get_process_health_status,
    cleanup_stuck_processes
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ocr"])

print("OCR.PY LOADED")

@router.get('/preload_check/{file_id}', summary="Check if file data is preloaded")
async def preload_check_endpoint(file_id: str):
    """
    Check if a file has preloaded data available and return it if found.
    This endpoint allows quick access to already processed data without reprocessing.
    """
    return await check_preloaded_data(file_id)

@router.post('/pdf_ocr_with_preload', summary="Process PDF with OCR using preloaded data when available")
async def pdf_ocr_with_preload_endpoint(request: PdfOcrRequest, file_id: str = None):
    """
    Process a PDF file with OCR, utilizing preloaded data when available.
    This endpoint first checks for preloaded data and uses it if found,
    otherwise falls back to normal OCR processing.
    """
    return await pdf_ocr_with_preload(request, file_id)

@router.post('/pdf_ocr', summary="Process PDF with OCR", description="Converts PDF to images and extracts text using OCR with configurable settings.")
async def pdf_ocr_endpoint(request: PdfOcrRequest, file_id: str = None):
    """
    Process a PDF file with OCR:
    1. Convert PDF to images
    2. Try to extract embedded text
    3. Use OCR if no embedded text or low quality
    4. Return results with images and extracted text
    """
    return await pdf_ocr_process(request, file_id)

@router.get('/temp_image')
def temp_image_endpoint(path: str, temp_dir: str):
    """
    Serves a temporary image from PDF OCR processing.
    """
    return serve_temp_image(path, temp_dir)

@router.get('/preloaded_image')
def preloaded_image_endpoint(file_id: str, page: int, filename: str):
    """
    Serves a preloaded image from database-stored paths.
    This endpoint handles images that were processed previously and stored in the database.
    """
    return serve_preloaded_image(file_id, page, filename)

@router.post('/process_sharepoint_item', summary="Process SharePoint item for OCR", description="Accepts a SharePoint item (file or folder) and initiates OCR processing.")
async def process_sharepoint_item_endpoint(item: SharePointItem, background_tasks: BackgroundTasks, db: Session = Depends(get_db_session)):
    """
    Processes a SharePoint item (file or folder) for OCR.

    If the item is a folder, it recursively finds all PDF files within the folder.
    For each PDF file, it downloads the file from SharePoint, creates an initial OcrResult
    entry in the database with status "Queued", and adds the file to an asynchronous
    processing queue (FastAPI background tasks) for OCR.
    """
    return await process_sharepoint_item(item, background_tasks, db)

@router.get('/status/{ocr_result_id_or_file_id}', summary="Get OCR status by OcrResult ID or SharePoint File ID")
def status_endpoint(ocr_result_id_or_file_id: str):
    """
    Retrieves the OCR processing status and results for a given item.
    The path parameter can be either the integer ID of the OcrResult record
    or the string file_id (SharePoint item ID).
    """
    return get_ocr_status(ocr_result_id_or_file_id)

@router.get('/text/{file_id}', summary="Get full OCR text for a file")
def text_endpoint(file_id: str):
    """
    Retrieves the full OCR text for a given file.
    Returns both PDF text and OCR text if available.
    """
    return get_ocr_text(file_id)

@router.post('/update_status/{file_id}', summary="Update OCR status for a file")
async def update_status_endpoint(file_id: str, status: str, ocr_text: str = None, pdf_text: str = None):
    """
    Manually update the OCR status for a file. Useful for fixing status mismatches.
    """
    return await update_ocr_status(file_id, status, ocr_text, pdf_text)

@router.get('/engines')
def engines_endpoint():
    logger.warning("ENGINES ENDPOINT CALLED")
    return {"engines": ["easyocr", "tesseract"]}

@router.get('/test')
def test_endpoint():
    print("TEST ENDPOINT CALLED")
    return {"status": "ok"}

@router.post("/preprocess")
def preprocess_endpoint(req):
    """
    Preprocess a PDF file: convert to images and extract embedded text.
    Supports PyMuPDF and pdf2image engines. All image options are applied here.
    """
    return preprocess(req)

@router.get('/image')
def image_endpoint(path: str):
    """
    Serves a preprocessed image.
    """
    return serve_image(path)

@router.post('/images')
def images_endpoint(req):
    """
    Perform OCR on a list of images.
    """
    return ocr_images(req)

# Batch Processing Endpoints

@router.post('/batch/start', summary="Start batch OCR processing for multiple files")
async def start_batch_endpoint(
    request: BatchProcessingRequest,
    background_tasks: BackgroundTasks
):
    """
    Start batch OCR processing for a list of files.
    Files should contain file data (base64) or SharePoint file information.
    """
    # Convert BatchFileInfo objects to dictionaries for the processing function
    files_dict = [file.dict() for file in request.files]
    return await start_batch_processing(request.batch_id, files_dict, request.settings, background_tasks)

@router.post('/batch/start_folder', summary="Start batch OCR processing for a SharePoint folder")
async def start_folder_batch_endpoint(
    batch_id: str,
    drive_id: str,
    folder_id: str,
    settings: Dict[str, Any],
    background_tasks: BackgroundTasks,
    recursive: bool = True
):
    """
    Start batch OCR processing for all PDF files in a SharePoint folder.
    """
    return await start_folder_batch_processing(
        batch_id, drive_id, folder_id, settings, background_tasks, recursive
    )

@router.get('/batch/status/{batch_id}', summary="Get batch processing status")
def get_batch_status_endpoint(batch_id: str):
    """
    Get the current status of a batch processing job including progress,
    statistics, logs, and results.
    """
    return get_batch_status(batch_id)

@router.post('/batch/pause/{batch_id}', summary="Pause batch processing")
def pause_batch_endpoint(batch_id: str):
    """
    Pause a running batch processing job.
    """
    return pause_batch_processing(batch_id)

@router.post('/batch/resume/{batch_id}', summary="Resume batch processing")
def resume_batch_endpoint(batch_id: str):
    """
    Resume a paused batch processing job.
    """
    return resume_batch_processing(batch_id)

@router.post('/batch/stop/{batch_id}', summary="Stop batch processing")
def stop_batch_endpoint(batch_id: str):
    """
    Stop a running or paused batch processing job.
    """
    return stop_batch_processing(batch_id)

@router.get('/batch/list', summary="List all batch processing jobs")
def list_batch_jobs_endpoint():
    """
    List all current batch processing jobs with their status.
    """
    return list_batch_jobs()

@router.get('/health', summary="Get OCR process health status")
def get_process_health_endpoint():
    """
    Get comprehensive health status of OCR processes including:
    - Active batch jobs
    - Individual OCR process status
    - Potentially stuck processes
    - System recommendations
    """
    return get_process_health_status()

@router.post('/health/cleanup', summary="Clean up stuck or problematic processes")
def cleanup_processes_endpoint(file_ids: list[str] = None):
    """
    Clean up stuck or problematic OCR processes.
    
    Args:
        file_ids: Optional list of specific file IDs to clean up.
                 If not provided, will clean up automatically detected stuck processes.
    """
    return cleanup_stuck_processes(file_ids)

@router.post('/batch/cleanup', summary="Clean up completed batch jobs")
def cleanup_batch_jobs_endpoint():
    """
    Clean up completed, error, or cancelled batch jobs that are older than 1 hour.
    """
    cleanup_completed_jobs()
    return {"message": "Cleanup completed"}