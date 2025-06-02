from app.schemas import OcrImagesRequest
import logging
import os
import re # Added for regex in get_llm_quality_score
logging.basicConfig(filename='ocr_debug.log', level=logging.DEBUG, format='%(asctime)s %(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)

print("OCR.PY LOADED")
from fastapi import APIRouter, HTTPException, Body, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import create_engine
from app.models import OcrResult, Base
import easyocr
import pytesseract
import fitz  # PyMuPDF
from PIL import Image
import requests
import mimetypes
from alembic.config import Config
from alembic import command
from sqlalchemy.exc import OperationalError
import tempfile
import io
import base64
import time
from typing import List, Optional
from pdf2image import convert_from_bytes
from fastapi.responses import FileResponse
import shutil
import datetime
import json
from app.api.sharepoint import get_graph_token, list_files as list_sharepoint_files_in_folder, get_file_content as get_sharepoint_file_content
from app.utils.llm_utils import get_llm_quality_score
from app.utils.cache_utils import cache_ocr_result, cache_preprocessing_result, generate_cache_key, save_file_cache, load_file_cache
from app.utils.gpu_utils import configure_easyocr_gpu
from app.utils.preload_utils import get_cached_text, get_cached_image_paths, is_data_preloaded, preload_manager
from app.models import Setting

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ocr.db')

if DATABASE_URL.startswith('sqlite:///'):
    db_path = DATABASE_URL.replace('sqlite:///', '')
    abs_db_path = os.path.abspath(db_path)
    print(f'Using SQLite database at: {abs_db_path}')
    logger.warning(f'Using SQLite database at: {abs_db_path}')

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from typing import Any

router = APIRouter(tags=["ocr"])

# Language code mapping for different OCR engines
LANGUAGE_CODE_MAPPING = {
    'es': 'spa',  # Spanish
    'en': 'eng',  # English
    'fr': 'fra',  # French
    'de': 'deu',  # German
    'it': 'ita',  # Italian
    'pt': 'por',  # Portuguese
    'ru': 'rus',  # Russian
    'zh': 'chi_sim',  # Chinese Simplified
    'ja': 'jpn',  # Japanese
    'ko': 'kor',  # Korean
    'ar': 'ara',  # Arabic
}

def get_setting_value(key: str, default_value: str = None, category: str = None) -> str:
    """
    Get a setting value from the database.
    """
    try:
        db = SessionLocal()
        query = db.query(Setting).filter(Setting.key == key)
        if category:
            query = query.filter(Setting.category == category)
        setting = query.first()
        db.close()
        
        if setting and setting.value:
            return setting.value
        return default_value
    except Exception as e:
        logger.error(f"Error getting setting {key}: {e}")
        return default_value

def get_ocr_language_code(lang_setting: str = None) -> str:
    """
    Get the appropriate OCR language code based on settings.
    """
    if not lang_setting:
        # Get from settings database
        lang_setting = get_setting_value('ocr_default_lang', 'es', 'ocr')
    
    # Map to OCR engine language code
    ocr_lang = LANGUAGE_CODE_MAPPING.get(lang_setting, lang_setting)
    logger.info(f"Language setting: {lang_setting} -> OCR language: {ocr_lang}")
    return ocr_lang

class OcrRequest(BaseModel):
    drive_id: str
    item_id: str
    lang: str = 'en'
    engine: str = 'easyocr'

    def __init__(self, **data):
        print("OcrRequest model constructed")
        super().__init__(**data)

class SharePointItem(BaseModel):
    drive_id: str
    item_id: str
    item_type: str  # "file" or "folder"

class PreprocessRequest(BaseModel):
    file_id: str
    directory_id: str
    pdf_data: str  # base64-encoded
    engine: str = "pymupdf"
    dpi: int = 300
    width: int = 0
    height: int = 0
    scale: float = 1.0
    colorspace: str = "rgb"
    alpha: bool = False
    rotation: int = 0
    image_format: str = "png"
    page_range: str = ""
    grayscale: bool = False
    transparent: bool = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "file_id": "abc123",
                "directory_id": "parent456",
                "pdf_data": "...",
                "engine": "pymupdf",
                "dpi": 300,
                "width": 1200,
                "height": 1600,
                "scale": 1.0,
                "colorspace": "rgb",
                "alpha": False,
                "rotation": 0,
                "image_format": "png",
                "page_range": "1-3,5",
                "grayscale": False,
                "transparent": False
            }
        }

class PdfOcrRequest(BaseModel):
    file_data: str  # base64-encoded PDF data
    filename: str
    settings: dict = {
        "dpi": 300,
        "imageFormat": "PNG",
        "colorMode": "RGB",
        "ocrEngine": None,  # Will be set from database settings
        "language": "spa",  # Default to Spanish
        "enableGpuAcceleration": True,
        "confidenceThreshold": 0.7
    }

@router.get('/preload_check/{file_id}', summary="Check if file data is preloaded")
async def check_preloaded_data(file_id: str):
    """
    Check if a file has preloaded data available and return it if found.
    This endpoint allows quick access to already processed data without reprocessing.
    """
    try:
        logger.info(f"Checking preloaded data for file: {file_id}")
        
        # Check what's preloaded
        preload_status = is_data_preloaded(file_id)
        availability = preload_manager.check_preload_availability(file_id)
        
        if not availability.get('exists', False):
            return {
                "file_id": file_id,
                "preloaded": False,
                "message": "File not found in database"
            }
        
        result = {
            "file_id": file_id,
            "preloaded": any(preload_status.values()) if 'error' not in preload_status else False,
            "availability": availability,
            "preload_status": preload_status
        }
        
        # If data is preloaded, include it in the response
        if result["preloaded"]:
            cached_data = {}
            
            # Get cached text
            pdf_text = get_cached_text(file_id, 'pdf')
            if pdf_text:
                cached_data['pdf_text'] = {
                    'text': pdf_text[:500] + '...' if len(pdf_text) > 500 else pdf_text,
                    'full_length': len(pdf_text)
                }
            
            ocr_text = get_cached_text(file_id, 'ocr')
            if ocr_text:
                cached_data['ocr_text'] = {
                    'text': ocr_text[:500] + '...' if len(ocr_text) > 500 else ocr_text,
                    'full_length': len(ocr_text)
                }
            
            # Get cached image paths
            pdf_images = get_cached_image_paths(file_id, 'pdf')
            if pdf_images:
                cached_data['pdf_images'] = {
                    'paths': pdf_images,
                    'count': len(pdf_images)
                }
            
            ocr_images = get_cached_image_paths(file_id, 'ocr')
            if ocr_images:
                cached_data['ocr_images'] = {
                    'paths': ocr_images,
                    'count': len(ocr_images)
                }
            
            result['cached_data'] = cached_data
        
        return result
        
    except Exception as e:
        logger.error(f"Error checking preloaded data for file {file_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking preloaded data: {str(e)}")

@router.post('/pdf_ocr_with_preload', summary="Process PDF with OCR using preloaded data when available")
async def pdf_ocr_with_preload(request: PdfOcrRequest, file_id: str = None):
    """
    Process a PDF file with OCR, utilizing preloaded data when available.
    This endpoint first checks for preloaded data and uses it if found,
    otherwise falls back to normal OCR processing.
    """
    start_time = time.time()
    logger.info(f"Starting PDF OCR with preload check for file: {request.filename}")
    
    try:
        # If file_id is provided, check for preloaded data
        if file_id:
            logger.info(f"Checking for preloaded data for file_id: {file_id}")
            
            # Check if data is already preloaded
            try:
                preload_status = is_data_preloaded(file_id)
                availability = preload_manager.check_preload_availability(file_id)
            except Exception as preload_check_error:
                logger.warning(f"Error checking preload status for {file_id}: {preload_check_error}")
                # Try direct database check as fallback
                availability = {'exists': False, 'is_processed': False}
                try:
                    db_check = SessionLocal()
                    ocr_check = db_check.query(OcrResult).filter_by(file_id=file_id).first()
                    db_check.close()
                    if ocr_check and (ocr_check.pdf_text or ocr_check.ocr_text):
                        availability = {'exists': True, 'is_processed': True, 'status': ocr_check.status}
                        logger.info(f"Direct database check found processed file {file_id}")
                except Exception as db_check_error:
                    logger.warning(f"Direct database check also failed: {db_check_error}")
            
            if availability.get('exists', False) and availability.get('is_processed', False):
                # Try to get preloaded text and images from database
                db = SessionLocal()
                try:
                    ocr_result = db.query(OcrResult).filter_by(file_id=file_id).first()
                    if ocr_result and (ocr_result.pdf_text or ocr_result.ocr_text):
                        logger.info(f"Found database record for file {file_id} with status: {ocr_result.status}")
                        logger.info(f"Has PDF text: {bool(ocr_result.pdf_text)}, Has OCR text: {bool(ocr_result.ocr_text)}")
                        logger.info(f"Has PDF images: {bool(ocr_result.pdf_image_path)}, Has OCR images: {bool(ocr_result.ocr_image_path)}")
                        
                        # Get the text (prefer PDF text over OCR text)
                        text_content = ocr_result.pdf_text or ocr_result.ocr_text
                        has_embedded_text = bool(ocr_result.pdf_text)
                        
                        # Parse image paths from database
                        image_paths = []
                        if ocr_result.pdf_image_path:
                            try:
                                if ocr_result.pdf_image_path.startswith('['):
                                    image_paths = json.loads(ocr_result.pdf_image_path)
                                else:
                                    image_paths = [p.strip() for p in ocr_result.pdf_image_path.split(',') if p.strip()]
                            except Exception as e:
                                logger.warning(f"Error parsing PDF image paths: {e}")
                        
                        if not image_paths and ocr_result.ocr_image_path:
                            try:
                                if ocr_result.ocr_image_path.startswith('['):
                                    image_paths = json.loads(ocr_result.ocr_image_path)
                                else:
                                    image_paths = [p.strip() for p in ocr_result.ocr_image_path.split(',') if p.strip()]
                            except Exception as e:
                                logger.warning(f"Error parsing OCR image paths: {e}")
                        
                        logger.info(f"Using preloaded text for file {file_id} ({len(text_content)} chars) with {len(image_paths)} images")
                        
                        # Create a response similar to pdf_ocr but using preloaded data
                        results = {
                            "filename": request.filename,
                            "pages": [],
                            "totalWords": len(text_content.split()),
                            "totalCharacters": len(text_content),
                            "processingTime": int((time.time() - start_time) * 1000),
                            "hasEmbeddedText": has_embedded_text,
                            "status": "preloaded",
                            "source": "database_preload",
                            "file_id": file_id,
                            "pageCount": len(image_paths) if image_paths else 1
                        }
                        
                        # Create page entries
                        if image_paths:
                            # Split text roughly across pages (simple approach)
                            text_lines = text_content.split('\n')
                            lines_per_page = max(1, len(text_lines) // len(image_paths))
                            
                            for i, image_path in enumerate(image_paths):
                                # Get text for this page (rough distribution)
                                start_line = i * lines_per_page
                                end_line = start_line + lines_per_page if i < len(image_paths) - 1 else len(text_lines)
                                page_text = '\n'.join(text_lines[start_line:end_line])
                                
                                # Convert absolute path to relative path for serving
                                # Handle different path formats that might be stored in database
                                image_url = ""  # Default to empty if image not accessible
                                
                                if os.path.isabs(image_path):
                                    # Check if the absolute path still exists
                                    if os.path.exists(image_path):
                                        # Convert absolute path to relative path for the image endpoint
                                        if 'ocr_images' in image_path:
                                            relative_path = image_path.split('ocr_images' + os.sep, 1)[-1]
                                            image_url = f"/api/ocr/image?path={relative_path.replace(os.sep, '/')}"
                                        else:
                                            # Try the preloaded image endpoint
                                            filename = os.path.basename(image_path)
                                            image_url = f"/api/ocr/preloaded_image?file_id={file_id}&page={i+1}&filename={filename}"
                                    else:
                                        # Image file no longer exists - log warning and leave empty
                                        logger.warning(f"Preloaded image not found at path: {image_path}")
                                        image_url = ""
                                else:
                                    # Already relative path - check if it exists
                                    full_path = os.path.join(tempfile.gettempdir(), 'ocr_images', image_path)
                                    if os.path.exists(full_path):
                                        image_url = f"/api/ocr/image?path={image_path.replace(os.sep, '/')}"
                                    else:
                                        logger.warning(f"Preloaded image not found at relative path: {full_path}")
                                        image_url = ""
                                
                                page_result = {
                                    "id": f"{request.filename}_page_{i + 1}",
                                    "pageNumber": i + 1,
                                    "imageUrl": image_url,
                                    "extractedText": page_text,
                                    "wordCount": len(page_text.split()) if page_text.strip() else 0,
                                    "characterCount": len(page_text),
                                    "confidence": 0.9,
                                    "processingTime": 0,
                                    "status": "preloaded",
                                    "hasEmbeddedText": has_embedded_text
                                }
                                results["pages"].append(page_result)
                        else:
                            # No images stored - create a single page entry for the text without image
                            # This handles cases where text was extracted but images weren't stored
                            logger.info(f"No image paths found for file {file_id}, creating text-only preloaded result")
                            page_result = {
                                "id": f"{request.filename}_page_1",
                                "pageNumber": 1,
                                "imageUrl": "",
                                "extractedText": text_content,
                                "wordCount": len(text_content.split()),
                                "characterCount": len(text_content),
                                "confidence": 0.9,
                                "processingTime": 0,
                                "status": "preloaded",
                                "hasEmbeddedText": has_embedded_text
                            }
                            results["pages"].append(page_result)
                            # Update page count to 1 since we don't have image information
                            results["pageCount"] = 1
                        
                        logger.info(f"Returned preloaded data for {request.filename}: {results['totalWords']} words, {len(results['pages'])} pages")
                        return results
                        
                finally:
                    db.close()
        
        # If no preloaded data available, fall back to normal OCR processing
        logger.info(f"No preloaded data available for {request.filename}, proceeding with normal OCR")
        return await pdf_ocr_process(request, file_id)
        
    except Exception as e:
        logger.error(f"Error in PDF OCR with preload: {e}", exc_info=True)
        # Fall back to normal OCR processing on error
        logger.info(f"Falling back to normal OCR processing due to error: {e}")
        return await pdf_ocr_process(request, file_id)

@router.post('/pdf_ocr', summary="Process PDF with OCR", description="Converts PDF to images and extracts text using OCR with configurable settings.")
async def pdf_ocr_process(request: PdfOcrRequest, file_id: str = None):
    """
    Process a PDF file with OCR:
    1. Convert PDF to images
    2. Try to extract embedded text
    3. Use OCR if no embedded text or low quality
    4. Return results with images and extracted text
    """
    start_time = time.time()
    logger.info(f"Starting PDF OCR processing for file: {request.filename}")
    logger.info(f"Request details - filename: '{request.filename}', file_data length: {len(request.file_data)}")
    
    try:
        # Decode PDF data
        logger.info(f"Decoding PDF data for {request.filename}")
        pdf_bytes = base64.b64decode(request.file_data)
        logger.info(f"Decoded PDF size: {len(pdf_bytes)} bytes for file: {request.filename}")
        settings = request.settings
        logger.info(f"Settings: {settings}")
        
        # Create temporary directory for processing
        temp_dir = os.path.join(tempfile.gettempdir(), 'pdf_ocr', str(int(time.time())))
        os.makedirs(temp_dir, exist_ok=True)
        
        results = {
            "filename": request.filename,
            "pages": [],
            "totalWords": 0,
            "totalCharacters": 0,
            "processingTime": 0,
            "hasEmbeddedText": False,
            "status": "processing"
        }
        
        # Step 1: Convert PDF to images and extract embedded text
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(doc)
        
        for page_num in range(page_count):
            page_start_time = time.time()
            page = doc[page_num]
            
            # Convert page to image
            dpi = settings.get("dpi", 300)
            zoom = dpi / 72.0
            matrix = fitz.Matrix(zoom, zoom)
            
            if settings.get("colorMode") == "Grayscale":
                pix = page.get_pixmap(matrix=matrix, alpha=False, colorspace=fitz.csGRAY)
            else:
                pix = page.get_pixmap(matrix=matrix, alpha=False)
            
            # Save image
            image_format = settings.get("imageFormat", "PNG").lower()
            img_filename = f"page_{page_num + 1}.{image_format}"
            img_path = os.path.join(temp_dir, img_filename)
            
            try:
                if image_format == "png":
                    pix.save(img_path)
                else:
                    # Convert to PIL Image for other formats
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    img.save(img_path, format=image_format.upper())
                logger.info(f"Successfully saved image: {img_path}")
            except Exception as save_error:
                logger.error(f"Error saving image {img_path}: {save_error}")
                # Try alternative method
                try:
                    img_data = pix.tobytes("png")
                    with open(img_path, "wb") as f:
                        f.write(img_data)
                    logger.info(f"Successfully saved image using alternative method: {img_path}")
                except Exception as alt_error:
                    logger.error(f"Alternative save method also failed: {alt_error}")
                    raise save_error
            
            # Try to extract embedded text first
            embedded_text = page.get_text()
            word_count = len(embedded_text.split()) if embedded_text.strip() else 0
            character_count = len(embedded_text) if embedded_text.strip() else 0
            
            page_result = {
                "id": f"{request.filename}_page_{page_num + 1}",
                "pageNumber": page_num + 1,
                "imageUrl": f"/api/ocr/temp_image?path={img_filename}&temp_dir={os.path.basename(temp_dir)}",
                "width": pix.width,
                "height": pix.height,
                "extractedText": "",
                "wordCount": 0,
                "characterCount": 0,
                "confidence": 0.0,
                "processingTime": 0,
                "status": "converted",
                "hasEmbeddedText": False
            }
            
            if embedded_text.strip() and word_count > 5:  # Minimum threshold for meaningful text
                # Use embedded text
                page_result.update({
                    "extractedText": embedded_text,
                    "wordCount": word_count,
                    "characterCount": character_count,
                    "confidence": 0.95,
                    "status": "text_extracted",
                    "hasEmbeddedText": True
                })
                results["hasEmbeddedText"] = True
            else:
                # Use OCR
                try:
                    # Get default OCR engine from settings if not provided
                    default_engine = get_setting_value('ocr_default_engine', 'easyocr', 'ocr')
                    ocr_engine = settings.get("ocrEngine", default_engine)
                    language_setting = settings.get("language")
                    
                    # Get language from settings database if not provided
                    if not language_setting:
                        language_setting = get_setting_value('ocr_default_lang', 'es', 'ocr')
                    
                    # Map language code for OCR engines
                    ocr_language = get_ocr_language_code(language_setting)
                    
                    logger.info(f"Using OCR engine: {ocr_engine}, language setting: {language_setting}, OCR language: {ocr_language}")
                    
                    if ocr_engine.startswith("tesseract"):
                        try:
                            img = Image.open(img_path)
                            ocr_text = pytesseract.image_to_string(img, lang=ocr_language)
                            logger.info(f"Tesseract OCR successful for {request.filename} page {page_num + 1}")
                        except Exception as tesseract_error:
                            logger.warning(f"Tesseract failed for {request.filename} page {page_num + 1}, falling back to EasyOCR: {tesseract_error}")
                            # Fallback to EasyOCR if Tesseract fails
                            # EasyOCR uses different language codes
                            easyocr_lang = 'es' if language_setting == 'es' else 'en'
                            gpu_enabled = configure_easyocr_gpu(settings.get("enableGpuAcceleration", True))
                            reader = easyocr.Reader([easyocr_lang], gpu=gpu_enabled)
                            result = reader.readtext(img_path, detail=0, paragraph=False)
                            ocr_text = '\n'.join(result)
                            logger.info(f"EasyOCR fallback successful for {request.filename} page {page_num + 1}")
                    elif ocr_engine == "easyocr":
                        # EasyOCR uses different language codes
                        easyocr_lang = 'es' if language_setting == 'es' else 'en'
                        gpu_enabled = configure_easyocr_gpu(settings.get("enableGpuAcceleration", True))
                        reader = easyocr.Reader([easyocr_lang], gpu=gpu_enabled)
                        result = reader.readtext(img_path, detail=0, paragraph=False)
                        ocr_text = '\n'.join(result)
                        logger.info(f"EasyOCR successful for {request.filename} page {page_num + 1}")
                    elif ocr_engine == "paddleocr":
                        # For now, fallback to EasyOCR (PaddleOCR can be implemented later)
                        logger.info("PaddleOCR requested, using EasyOCR as fallback")
                        easyocr_lang = 'es' if language_setting == 'es' else 'en'
                        gpu_enabled = configure_easyocr_gpu(settings.get("enableGpuAcceleration", True))
                        reader = easyocr.Reader([easyocr_lang], gpu=gpu_enabled)
                        result = reader.readtext(img_path, detail=0, paragraph=False)
                        ocr_text = '\n'.join(result)
                        logger.info(f"EasyOCR (PaddleOCR fallback) successful for {request.filename} page {page_num + 1}")
                    else:
                        # Default to EasyOCR
                        logger.info(f"Unknown OCR engine '{ocr_engine}', using EasyOCR as default")
                        easyocr_lang = 'es' if language_setting == 'es' else 'en'
                        gpu_enabled = configure_easyocr_gpu(settings.get("enableGpuAcceleration", True))
                        reader = easyocr.Reader([easyocr_lang], gpu=gpu_enabled)
                        result = reader.readtext(img_path, detail=0, paragraph=False)
                        ocr_text = '\n'.join(result)
                        logger.info(f"EasyOCR (default) successful for {request.filename} page {page_num + 1}")
                    
                    ocr_word_count = len(ocr_text.split()) if ocr_text.strip() else 0
                    ocr_character_count = len(ocr_text) if ocr_text.strip() else 0
                    
                    # Simulate confidence score (in real implementation, this would come from OCR engine)
                    confidence = 0.75 + (min(ocr_word_count, 100) / 100) * 0.2
                    
                    page_result.update({
                        "extractedText": ocr_text,
                        "wordCount": ocr_word_count,
                        "characterCount": ocr_character_count,
                        "confidence": confidence,
                        "status": "ocr_processed",
                        "hasEmbeddedText": False
                    })
                    
                except Exception as ocr_error:
                    logger.error(f"OCR failed for page {page_num + 1}: {ocr_error}")
                    page_result.update({
                        "status": "failed",
                        "extractedText": f"OCR failed: {str(ocr_error)}"
                    })
            
            page_result["processingTime"] = int((time.time() - page_start_time) * 1000)
            results["pages"].append(page_result)
            results["totalWords"] += page_result["wordCount"]
            results["totalCharacters"] += page_result["characterCount"]
        
        doc.close()
        
        # Final results
        results["processingTime"] = int((time.time() - start_time) * 1000)
        results["status"] = "completed"
        results["pageCount"] = page_count
        
        # Store results in database if file_id is provided
        if file_id:
            try:
                db = SessionLocal()
                
                # Determine overall status based on page results
                has_text_extracted = any(page.get("hasEmbeddedText", False) for page in results["pages"])
                has_ocr_processed = any(page.get("status") == "ocr_processed" for page in results["pages"])
                has_failed = any(page.get("status") == "failed" for page in results["pages"])
                
                if has_failed:
                    overall_status = "error"
                elif has_text_extracted and not has_ocr_processed:
                    overall_status = "text_extracted"
                elif has_ocr_processed:
                    overall_status = "ocr_processed"
                else:
                    overall_status = "completed"
                
                # Combine all extracted text
                all_text = "\n".join([page.get("extractedText", "") for page in results["pages"]])
                
                # Check if record exists
                ocr_result = db.query(OcrResult).filter_by(file_id=file_id).first()
                if not ocr_result:
                    ocr_result = OcrResult(
                        file_id=file_id,
                        status=overall_status,
                        created_at=datetime.datetime.utcnow(),
                        updated_at=datetime.datetime.utcnow()
                    )
                    db.add(ocr_result)
                else:
                    ocr_result.status = overall_status
                    ocr_result.updated_at = datetime.datetime.utcnow()
                
                # Store the extracted text
                if has_text_extracted:
                    ocr_result.pdf_text = all_text
                else:
                    ocr_result.ocr_text = all_text
                
                # Store metrics
                ocr_result.metrics = json.dumps({
                    "total_words": results["totalWords"],
                    "total_characters": results["totalCharacters"],
                    "processing_time_ms": results["processingTime"],
                    "page_count": page_count,
                    "has_embedded_text": results["hasEmbeddedText"]
                })
                
                db.commit()
                logger.info(f"Stored OCR results in database for file_id: {file_id} with status: {overall_status}")
                db.close()
            except Exception as db_error:
                logger.error(f"Error storing OCR results in database: {db_error}")
                if 'db' in locals():
                    db.close()
        
        logger.info(f"PDF OCR completed for {request.filename}: {page_count} pages, {results['totalWords']} words")
        return results
        
    except Exception as e:
        logger.error(f"Error in PDF OCR processing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF OCR processing failed: {str(e)}")

@router.get('/temp_image')
def serve_temp_image(path: str, temp_dir: str):
    """
    Serves a temporary image from PDF OCR processing.
    """
    base_temp_dir = os.path.join(tempfile.gettempdir(), 'pdf_ocr', temp_dir)
    image_path = os.path.join(base_temp_dir, path)
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Temporary image not found")
    return FileResponse(image_path, media_type=mimetypes.guess_type(image_path)[0] or 'image/png')

@router.get('/preloaded_image')
def serve_preloaded_image(file_id: str, page: int, filename: str):
    """
    Serves a preloaded image from database-stored paths.
    This endpoint handles images that were processed previously and stored in the database.
    """
    try:
        db = SessionLocal()
        ocr_result = db.query(OcrResult).filter_by(file_id=file_id).first()
        db.close()
        
        if not ocr_result:
            raise HTTPException(status_code=404, detail="OCR result not found")
        
        # Try to find the image path from stored paths
        image_paths = []
        
        # Check PDF image paths first
        if ocr_result.pdf_image_path:
            try:
                if ocr_result.pdf_image_path.startswith('['):
                    image_paths = json.loads(ocr_result.pdf_image_path)
                else:
                    image_paths = [p.strip() for p in ocr_result.pdf_image_path.split(',') if p.strip()]
            except Exception as e:
                logger.warning(f"Error parsing PDF image paths: {e}")
        
        # If no PDF images, check OCR image paths
        if not image_paths and ocr_result.ocr_image_path:
            try:
                if ocr_result.ocr_image_path.startswith('['):
                    image_paths = json.loads(ocr_result.ocr_image_path)
                else:
                    image_paths = [p.strip() for p in ocr_result.ocr_image_path.split(',') if p.strip()]
            except Exception as e:
                logger.warning(f"Error parsing OCR image paths: {e}")
        
        # Find the specific page image
        if page <= len(image_paths):
            image_path = image_paths[page - 1]  # Convert to 0-based index
            
            # Check if the file exists
            if os.path.exists(image_path):
                return FileResponse(image_path, media_type=mimetypes.guess_type(image_path)[0] or 'image/png')
            else:
                logger.warning(f"Preloaded image not found at path: {image_path}")
        
        # If we can't find the specific image, try to find any image with the filename
        # in common OCR image directories
        possible_dirs = [
            os.path.join(tempfile.gettempdir(), 'ocr_images'),
            os.path.join(tempfile.gettempdir(), 'pdf_ocr'),
            os.path.join(tempfile.gettempdir(), 'ocr_preload')
        ]
        
        for base_dir in possible_dirs:
            if os.path.exists(base_dir):
                # Search recursively for the image file
                for root, dirs, files in os.walk(base_dir):
                    if filename in files:
                        found_path = os.path.join(root, filename)
                        logger.info(f"Found preloaded image at: {found_path}")
                        return FileResponse(found_path, media_type=mimetypes.guess_type(found_path)[0] or 'image/png')
        
        raise HTTPException(status_code=404, detail=f"Preloaded image not found for file {file_id}, page {page}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving preloaded image: {e}")
        raise HTTPException(status_code=500, detail=f"Error serving preloaded image: {str(e)}")

@router.post('/process_sharepoint_item', summary="Process SharePoint item for OCR", description="Accepts a SharePoint item (file or folder) and initiates OCR processing.")
async def process_sharepoint_item(item: SharePointItem, background_tasks: BackgroundTasks, db: Session = Depends(SessionLocal)):
    """
    Processes a SharePoint item (file or folder) for OCR.

    If the item is a folder, it recursively finds all PDF files within the folder.
    For each PDF file, it downloads the file from SharePoint, creates an initial `OcrResult`
    entry in the database with status "Queued", and adds the file to an asynchronous
    processing queue (FastAPI background tasks) for OCR.
    """
    logger.info(f"Received request to process SharePoint item: {item.dict()}")
    try:
        if item.item_type == "file":
            await process_sharepoint_file(item.drive_id, item.item_id, background_tasks, db)
            return {"message": "File processing initiated", "file_id": item.item_id, "status": "queued"}

        elif item.item_type == "folder":
            return await process_sharepoint_folder(item.drive_id, item.item_id, background_tasks, db)

        else:
            raise HTTPException(status_code=400, detail="Invalid item_type. Must be 'file' or 'folder'.")

    except Exception as e:
        logger.error(f"Error in process_sharepoint_item: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def process_sharepoint_file(drive_id: str, item_id: str, background_tasks: BackgroundTasks, db: Session):
    """
    Processes a single SharePoint file for OCR.
    """
    logger.info(f"Processing single file: drive_id={drive_id}, item_id={item_id}")
    ocr_result = db.query(OcrResult).filter_by(file_id=item_id).first()
    if not ocr_result:
        ocr_result = OcrResult(
            file_id=item_id,
            directory_id=drive_id,
            status="queued",
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow()
        )
        db.add(ocr_result)
        db.commit()
        db.refresh(ocr_result)
        logger.info(f"Created OcrResult for file {item_id} with status 'queued'")
    elif ocr_result.status not in ["completed", "error", "needs_manual_review"]:
        ocr_result.status = "queued"
        ocr_result.updated_at = datetime.datetime.utcnow()
        db.commit()
        logger.info(f"Re-queueing OcrResult for file {item_id}")
    else:
        logger.info(f"File {item_id} already processed with status: {ocr_result.status}. Skipping.")
        return {"message": f"File {item_id} already processed.", "file_id": item_id, "status": ocr_result.status}

    background_tasks.add_task(run_ocr_pipeline, drive_id, item_id, ocr_result.file_id)
    logger.info(f"Task added for file: {item_id}")


async def process_sharepoint_folder(drive_id: str, item_id: str, background_tasks: BackgroundTasks, db: Session):
    """
    Processes a SharePoint folder for OCR.
    """
    logger.info(f"Processing folder: drive_id={drive_id}, item_id={item_id}")
    processed_files_info = []
    try:
        response = list_sharepoint_files_in_folder(drive_id=drive_id, parent_id=item_id)
        folder_files_data = json.loads(response.body)

        pdf_files_in_folder = [
            f for f in folder_files_data
            if f.get("name", "").lower().endswith(".pdf") or (f.get("mimeType") == "application/pdf")
        ]
        logger.info(f"Found {len(pdf_files_in_folder)} PDF(s) in folder {item_id}")

        for pdf_file_meta in pdf_files_in_folder:
            file_item_id = pdf_file_meta.get("id")
            if not file_item_id:
                logger.warning(f"Skipping file without id in folder {item_id}: {pdf_file_meta.get('name')}")
                continue

            ocr_result = db.query(OcrResult).filter_by(file_id=file_item_id).first()
            current_status = "unknown"
            if not ocr_result:
                ocr_result = OcrResult(
                    file_id=file_item_id,
                    directory_id=drive_id,
                    status="queued",
                    created_at=datetime.datetime.utcnow(),
                    updated_at=datetime.datetime.utcnow()
                )
                db.add(ocr_result)
                db.commit()
                db.refresh(ocr_result)
                current_status = "queued"
                logger.info(f"Created OcrResult for file {file_item_id} in folder {item_id} with status 'queued'")
            elif ocr_result.status not in ["completed", "error", "needs_manual_review"]:
                ocr_result.status = "queued"
                ocr_result.updated_at = datetime.datetime.utcnow()
                db.commit()
                current_status = "queued"
                logger.info(f"Re-queueing OcrResult for file {file_item_id} in folder {item_id}")
            else:
                current_status = ocr_result.status
                logger.info(f"File {file_item_id} in folder {item_id} already processed with status: {current_status}. Skipping.")
                processed_files_info.append({"file_id": file_item_id, "status": current_status, "message": "Already processed"})
                continue

            background_tasks.add_task(run_ocr_pipeline, drive_id, file_item_id, ocr_result.file_id)
            processed_files_info.append({"file_id": file_item_id, "status": current_status})

        return {"message": f"Folder processing initiated for {len(pdf_files_in_folder)} PDF(s).", "folder_id": item_id, "processed_files": processed_files_info}

    except Exception as e:
        logger.error(f"Error processing folder {item_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing folder {item_id}: {str(e)}")

@router.get('/status/{ocr_result_id_or_file_id}', summary="Get OCR status by OcrResult ID or SharePoint File ID")
def get_ocr_status(ocr_result_id_or_file_id: str):
    """
    Retrieves the OCR processing status and results for a given item.
    The path parameter can be either the integer ID of the OcrResult record
    or the string file_id (SharePoint item ID).
    """
    session = SessionLocal()
    ocr_result = None
    is_integer_id = False
    try:
        # Try to interpret as integer ID first
        result_id = int(ocr_result_id_or_file_id)
        is_integer_id = True
        ocr_result = session.query(OcrResult).filter_by(id=result_id).first()
        logger.info(f"Attempting to fetch OCR status by OcrResult.id: {result_id}")
    except ValueError:
        # Not an integer, so treat as file_id (string)
        logger.info(f"Attempting to fetch OCR status by file_id: {ocr_result_id_or_file_id}")
        ocr_result = session.query(OcrResult).filter_by(file_id=ocr_result_id_or_file_id).first()

    session.close()

    if not ocr_result:
        identifier_type = "OcrResult.id" if is_integer_id else "file_id"
        logger.warning(f"OCR status requested for {identifier_type} '{ocr_result_id_or_file_id}', but no record found.")
        raise HTTPException(status_code=404, detail=f"OCR result not found for identifier: {ocr_result_id_or_file_id}")

    logger.info(f"Returning OCR status for {ocr_result_id_or_file_id}: {ocr_result.status}")
    return {
        "id": ocr_result.file_id,  # Use file_id as the id for compatibility
        "file_id": ocr_result.file_id,
        "directory_id": ocr_result.directory_id,
        "status": ocr_result.status,
        "ocr_text_snippet": (ocr_result.ocr_text[:200] + '...' if ocr_result.ocr_text and len(ocr_result.ocr_text) > 200 else ocr_result.ocr_text) if ocr_result.ocr_text else None,
        # "ocr_text": ocr_result.ocr_text, # Full text can be large, consider a separate endpoint or conditional inclusion
        "pdf_text_snippet": (ocr_result.pdf_text[:200] + '...' if ocr_result.pdf_text and len(ocr_result.pdf_text) > 200 else ocr_result.pdf_text) if ocr_result.pdf_text else None,
        "metrics": ocr_result.metrics,
        "created_at": ocr_result.created_at,
        "updated_at": ocr_result.updated_at
    }

@router.get('/text/{file_id}', summary="Get full OCR text for a file")
def get_ocr_text(file_id: str):
    """
    Retrieves the full OCR text for a given file.
    Returns both PDF text and OCR text if available.
    """
    session = SessionLocal()
    try:
        ocr_result = session.query(OcrResult).filter_by(file_id=file_id).first()
        
        if not ocr_result:
            logger.warning(f"OCR text requested for file_id '{file_id}', but no record found.")
            raise HTTPException(status_code=404, detail=f"OCR result not found for file: {file_id}")
        
        # Determine which text to return (prefer PDF text over OCR text)
        text_content = ""
        text_type = "none"
        
        if ocr_result.pdf_text:
            text_content = ocr_result.pdf_text
            text_type = "pdf_text"
        elif ocr_result.ocr_text:
            text_content = ocr_result.ocr_text
            text_type = "ocr_text"
        
        if not text_content:
            raise HTTPException(status_code=404, detail=f"No text content available for file: {file_id}")
        
        logger.info(f"Returning {text_type} for file {file_id} ({len(text_content)} characters)")
        
        return {
            "file_id": file_id,
            "text_type": text_type,
            "text": text_content,
            "character_count": len(text_content),
            "word_count": len(text_content.split()) if text_content else 0,
            "status": ocr_result.status,
            "created_at": ocr_result.created_at,
            "updated_at": ocr_result.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving OCR text for file {file_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving OCR text: {str(e)}")
    finally:
        session.close()

@router.post('/update_status/{file_id}', summary="Update OCR status for a file")
async def update_ocr_status(file_id: str, status: str, ocr_text: str = None, pdf_text: str = None):
    """
    Manually update the OCR status for a file. Useful for fixing status mismatches.
    """
    try:
        db = SessionLocal()
        
        # Check if record exists
        ocr_result = db.query(OcrResult).filter_by(file_id=file_id).first()
        if not ocr_result:
            ocr_result = OcrResult(
                file_id=file_id,
                status=status,
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow()
            )
            db.add(ocr_result)
        else:
            ocr_result.status = status
            ocr_result.updated_at = datetime.datetime.utcnow()
        
        # Update text if provided
        if ocr_text:
            ocr_result.ocr_text = ocr_text
        if pdf_text:
            ocr_result.pdf_text = pdf_text
        
        db.commit()
        db.close()
        
        logger.info(f"Updated OCR status for file_id: {file_id} to status: {status}")
        return {"message": f"Status updated successfully for file {file_id}", "status": status}
        
    except Exception as e:
        logger.error(f"Error updating OCR status: {e}")
        if 'db' in locals():
            db.close()
        raise HTTPException(status_code=500, detail=f"Error updating status: {str(e)}")

@router.get('/engines')
def list_engines():
    logger.warning("ENGINES ENDPOINT CALLED")
    return {"engines": ["easyocr", "tesseract"]}

@router.get('/test')
def test():
    print("TEST ENDPOINT CALLED")
    return {"status": "ok"}

def pdf_to_images(pdf_path, dpi: Optional[int] = None):
    """
    Converts a PDF file to a list of PIL Images.
    Allows specifying DPI for rendering.
    """
    doc = fitz.open(pdf_path)
    images = []
    for page_num, page in enumerate(doc):
        try:
            if dpi:
                zoom = dpi / 72.0  # PyMuPDF's default DPI is 72
                matrix = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=matrix, alpha=False)
            else:
                pix = page.get_pixmap(alpha=False) # Default DPI
            
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            images.append(img)
        except Exception as e_page:
            logger.error(f"Error converting page {page_num} of {pdf_path} to image: {e_page}", exc_info=True)
            # Optionally, append a placeholder or skip the page
    return images

@router.post("/preprocess")
@cache_preprocessing_result
def preprocess(req: PreprocessRequest):
    """
    Preprocess a PDF file: convert to images and extract embedded text.
    Supports PyMuPDF and pdf2image engines. All image options are applied here.
    If width/height are provided and >0, they are used. Otherwise, if scale is provided, width/height are computed as (original page size in points) * (dpi/72) * scale.
    Pillow post-processing (contrast, gamma, etc.) is NOT handled here.
    Returns: image_ids (paths), image_urls (API URLs), page_texts, metrics.
    """
    start_time = time.time()
    pdf_bytes = base64.b64decode(req.pdf_data)
    image_ids = []
    image_urls = []
    page_texts = []
    base_temp_dir = os.path.join(tempfile.gettempdir(), 'ocr_images')
    temp_dir = os.path.join(base_temp_dir, req.directory_id, req.file_id)
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    
    def parse_page_range(page_range_str, num_pages):
        """Parses a page range string (e.g., "1-3,5") and returns a list of page numbers."""
        if not page_range_str:
            return list(range(1, num_pages + 1))  # All pages
        
        page_numbers = []
        ranges = page_range_str.split(',')
        for r in ranges:
            if '-' in r:
                try:
                    start, end = map(int, r.split('-'))
                    page_numbers.extend(range(start, end + 1))
                except ValueError:
                    logger.warning(f"Invalid page range format: {r}")
            else:
                try:
                    page_numbers.append(int(r))
                except ValueError:
                    logger.warning(f"Invalid page number format: {r}")
        
        return [p for p in page_numbers if 1 <= p <= num_pages]

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        num_pages = len(doc)
        selected_pages = parse_page_range(req.page_range, num_pages)
        
        for page_num in selected_pages:
            page = doc[page_num - 1]  # PyMuPDF uses 0-based indexing
            
            rotate = int(req.rotation)
            mat = fitz.Matrix(1, 1).preRotate(rotate)
            
            if req.width > 0 and req.height > 0:
                # Use provided width and height
                width, height = int(req.width), int(req.height)
                zoom_x = width / page.rect.width
                zoom_y = height / page.rect.height
                pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB if req.colorspace == "rgb" else None, alpha=req.alpha, xres=int(req.dpi * zoom_x), yres=int(req.dpi * zoom_y))
            elif req.scale != 1.0:
                # Compute width and height from scale
                width = int(page.rect.width * (req.dpi / 72) * req.scale)
                height = int(page.rect.height * (req.dpi / 72) * req.scale)
                zoom_x = width / page.rect.width
                zoom_y = height / page.rect.height
                pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB if req.colorspace == "rgb" else None, alpha=req.alpha, xres=int(req.dpi * zoom_x), yres=int(req.dpi * zoom_y))
            else:
                # Use DPI only
                pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB if req.colorspace == "rgb" else None, alpha=req.alpha, dpi=req.dpi)

            if req.grayscale:
                pix = pix.convert("gray")
            
            image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            img_filename = f"page_{page_num}.{req.image_format}"
            img_path = os.path.join(temp_dir, img_filename)
            image.save(img_path, format=req.image_format.upper())
            image_id = f"{req.directory_id}/{req.file_id}/{img_filename}"
            image_ids.append(image_id)
            image_url = f"/api/ocr/image?path={image_id}"
            image_urls.append(image_url)
            page_texts.append("")  # Placeholder for OCR text
    
    except Exception as e:
        logger.error(f"Error during PDF preprocessing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'doc' in locals():
            doc.close()
    
    end_time = time.time()
    metrics = {
        "preprocessing_time": end_time - start_time,
        "num_pages": len(image_ids),
        "dpi": req.dpi,
        "width": req.width,
        "height": req.height,
        "scale": req.scale,
        "colorspace": req.colorspace,
        "alpha": req.alpha,
        "rotation": req.rotation,
        "image_format": req.image_format,
        "page_range": req.page_range,
        "grayscale": req.grayscale,
        "transparent": req.transparent
    }
    
    logger.info(f"PDF preprocessed. Images: {image_ids}, Metrics: {metrics}")
    return {"image_ids": image_ids, "image_urls": image_urls, "page_texts": page_texts, "metrics": metrics}

@router.get('/image')
def serve_image(path: str):
    """
    Serves a preprocessed image.
    """
    base_temp_dir = os.path.join(tempfile.gettempdir(), 'ocr_images')
    image_path = os.path.join(base_temp_dir, path)
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(image_path, media_type=mimetypes.guess_type(image_path)[0] or 'image/png')

@router.post('/images')
@cache_ocr_result
def ocr_images(req: OcrImagesRequest):
    """
    Perform OCR on a list of images.
    """
    logger.info(f"Received request to OCR images: {req.image_paths}")
    ocr_engine = req.engine
    ocr_lang = req.lang
    paragraph_mode = req.paragraph

    if ocr_engine not in ["easyocr", "tesseract"]:
        raise HTTPException(status_code=400, detail=f"Unsupported OCR engine: {ocr_engine}")

    try:
        extracted_texts = []
        for image_path in req.image_paths:
            logger.info(f"Processing image: {image_path} with {ocr_engine}")
            if ocr_engine == 'easyocr':
                gpu_enabled = configure_easyocr_gpu(True)
                reader = easyocr.Reader([ocr_lang], gpu=gpu_enabled)
                result = reader.readtext(image_path, detail=0, paragraph=paragraph_mode)
                text = '\n'.join(result)
            elif ocr_engine == 'tesseract':
                img = Image.open(image_path)
                text = pytesseract.image_to_string(img, lang=ocr_lang)
            else:
                raise ValueError(f"Unsupported OCR engine: {ocr_engine}")
            extracted_texts.append(text)
        return {"texts": extracted_texts}
    except Exception as e:
        logger.error(f"Error during OCR: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        pass

async def run_ocr_pipeline(drive_id: str, item_id: str, ocr_result_file_id: str):
    """
    Runs the OCR pipeline for a given file.
    """
    logging.info(f"Starting OCR pipeline for file_id: {item_id}, ocr_result_file_id: {ocr_result_file_id}")
    try:
        db: Session = SessionLocal()
        ocr_result = db.query(OcrResult).filter(OcrResult.file_id == ocr_result_file_id).first()
        if not ocr_result:
            logging.error(f"OcrResult not found for file_id: {ocr_result_file_id}")
            return

        ocr_result.status = "Processing OCR"
        db.commit()
        logging.info(f"Updated OcrResult {ocr_result_file_id} status to 'Processing OCR'")

        # 1. Perform initial OCR with file caching
        cache_key = generate_cache_key("sharepoint_file", drive_id, item_id)
        cached_file_data = load_file_cache(cache_key, "sharepoint_files")
        
        if cached_file_data:
            logging.info(f"Using cached file data for item_id: {item_id}")
            pdf_data = base64.b64encode(cached_file_data).decode('utf-8')
        else:
            file_content = get_sharepoint_file_content(drive_id=drive_id, item_id=item_id)
            if file_content and file_content.body:
                # Cache the file data
                save_file_cache(cache_key, file_content.body, "sharepoint_files")
                pdf_data = base64.b64encode(file_content.body).decode('utf-8')
                logging.info(f"Cached file data for item_id: {item_id}")
            else:
                logging.error(f"Failed to retrieve file content for item_id: {item_id}")
                ocr_result.status = "Error"
                ocr_result.error_message = "Failed to retrieve file content from SharePoint."
                db.commit()
                return

        preprocess_request = PreprocessRequest(
            file_id=item_id,
            directory_id=drive_id,
            pdf_data=pdf_data
        )
        preprocess_result = preprocess(preprocess_request)
        image_paths = [os.path.join(tempfile.gettempdir(), 'ocr_images', path) for path in preprocess_result["image_ids"]]

        # Get language and engine from settings
        default_lang = get_setting_value('ocr_default_lang', 'es', 'ocr')
        default_engine = get_setting_value('ocr_default_engine', 'easyocr', 'ocr')
        easyocr_lang = 'es' if default_lang == 'es' else 'en'
        ocr_images_request = OcrImagesRequest(image_paths=image_paths, lang=easyocr_lang, engine=default_engine, paragraph=False)
        ocr_result_initial = ocr_images(ocr_images_request)
        extracted_text = "\\n".join(ocr_result_initial["texts"])

        ocr_result.pdf_text = extracted_text
        db.commit()

        # 2. LLM Quality Review
        ocr_result.status = "LLM Reviewing"
        db.commit()
        logging.info(f"Updated OcrResult {ocr_result_file_id} status to 'LLM Reviewing'")

        system_prompt = os.environ.get("LLM_SYSTEM_PROMPT", "Evaluate the quality of the extracted text. Return a numerical score between 0 and 100.")
        quality_score = await get_llm_quality_score(extracted_text, system_prompt)

        quality_threshold = float(os.environ.get("LLM_QUALITY_THRESHOLD", "70"))

        if quality_score is None:
            logging.warning(f"LLM quality score is None for ocr_result_file_id: {ocr_result_file_id}. Setting status to 'Needs Manual Review'")
            ocr_result.status = "Needs Manual Review"
            db.commit()
            return

        if quality_score < quality_threshold:
            logging.info(f"Quality score {quality_score} is below threshold {quality_threshold} for ocr_result_file_id: {ocr_result_file_id}. Retrying with higher DPI.")
            ocr_result.status = "Retry w/ DPI"
            db.commit()

            # Retry OCR with higher DPI
            preprocess_request_dpi = PreprocessRequest(
                file_id=item_id,
                directory_id=drive_id,
                pdf_data=pdf_data,
                dpi=600  # Higher DPI
            )
            preprocess_result_dpi = preprocess(preprocess_request_dpi)
            image_paths_dpi = [os.path.join(tempfile.gettempdir(), 'ocr_images', path) for path in preprocess_result_dpi["image_ids"]]
            ocr_images_request_dpi = OcrImagesRequest(image_paths=image_paths_dpi, lang=easyocr_lang, engine=default_engine, paragraph=False)
            ocr_result_dpi = ocr_images(ocr_images_request_dpi)
            extracted_text_dpi = "\\n".join(ocr_result_dpi["texts"])

            ocr_result.pdf_text = extracted_text_dpi
            db.commit()

            ocr_result.status = "LLM Reviewing"
            db.commit()
            logging.info(f"Updated OcrResult {ocr_result_file_id} status to 'LLM Reviewing' after DPI retry")
            quality_score_dpi = await get_llm_quality_score(extracted_text_dpi, system_prompt)

            if quality_score_dpi is None:
                logging.warning(f"LLM quality score is None after DPI retry for ocr_result_file_id: {ocr_result_file_id}. Setting status to 'Needs Manual Review'")
                ocr_result.status = "Needs Manual Review"
                db.commit()
                return

            if quality_score_dpi < quality_threshold:
                logging.info(f"Quality score {quality_score_dpi} is below threshold {quality_threshold} after DPI retry for ocr_result_file_id: {ocr_result_file_id}. Retrying with Image OCR.")
                ocr_result.status = "Retry w/ Image OCR"
                db.commit()

                # Retry OCR with Image OCR
                preprocess_request_image = PreprocessRequest(
                    file_id=item_id,
                    directory_id=drive_id,
                    pdf_data=pdf_data,
                    image_format='png'
                )
                preprocess_result_image = preprocess(preprocess_request_image)
                image_paths_image = [os.path.join(tempfile.gettempdir(), 'ocr_images', path) for path in preprocess_result_image["image_ids"]]
                ocr_images_request_image = OcrImagesRequest(image_paths=image_paths_image, lang=easyocr_lang, engine=default_engine, paragraph=False)
                ocr_result_image = ocr_images(ocr_images_request_image)
                extracted_text_image = "\\n".join(ocr_result_image["texts"])

                ocr_result.pdf_text = extracted_text_image
                db.commit()

                ocr_result.status = "LLM Reviewing"
                db.commit()
                logging.info(f"Updated OcrResult {ocr_result_file_id} status to 'LLM Reviewing' after Image OCR retry")
                quality_score_image = await get_llm_quality_score(extracted_text_image, system_prompt)

                if quality_score_image is None:
                    logging.warning(f"LLM quality score is None after Image OCR retry for ocr_result_file_id: {ocr_result_file_id}. Setting status to 'Needs Manual Review'")
                    ocr_result.status = "Needs Manual Review"
                    db.commit()
                    return

                if quality_score_image < quality_threshold:
                    logging.info(f"Quality score {quality_score_image} is still below threshold {quality_threshold} after Image OCR retry for ocr_result_file_id: {ocr_result_file_id}. Setting status to 'Needs Manual Review'")
                    ocr_result.status = "Needs Manual Review"
                    db.commit()
                else:
                    logging.info(f"Quality score {quality_score_image} is above threshold {quality_threshold} after Image OCR retry for ocr_result_file_id: {ocr_result_file_id}. Setting status to 'OCR Done'")
                    ocr_result.status = "OCR Done"
                    ocr_result.ocr_text = extracted_text_image
                    db.commit()
            else:
                logging.info(f"Quality score {quality_score_dpi} is above threshold {quality_threshold} after DPI retry for ocr_result_file_id: {ocr_result_file_id}. Setting status to 'OCR Done'")
                ocr_result.status = "OCR Done"
                ocr_result.ocr_text = extracted_text_dpi
                db.commit()
        else:
            logging.info(f"Quality score {quality_score} is above threshold {quality_threshold} for ocr_result_file_id: {ocr_result_file_id}. Setting status to 'OCR Done'")
            ocr_result.status = "OCR Done"
            ocr_result.ocr_text = extracted_text
            db.commit()

    except Exception as e:
        logging.error(f"Error in OCR pipeline for ocr_result_file_id: {ocr_result_file_id}: {e}", exc_info=True)
        ocr_result = db.query(OcrResult).filter(OcrResult.file_id == ocr_result_file_id).first()
        if ocr_result:
            ocr_result.status = "Error"
            ocr_result.error_message = str(e)
            db.commit()
    finally:
        db.close()