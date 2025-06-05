import logging
import time
import base64
import os
import tempfile
import json
import datetime
import fitz  # PyMuPDF
from PIL import Image
from fastapi import HTTPException
from .models import PdfOcrRequest, get_ocr_language_code
from .db_utils import get_db_session, get_setting_value, DATABASE_URL
from app.models import OcrResult
from app.utils.preload_utils import is_data_preloaded, preload_manager
from app.utils.gpu_utils import configure_easyocr_gpu
from app.utils.thumbnail_utils import ThumbnailGenerator
import easyocr
import pytesseract

logger = logging.getLogger(__name__)

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
                    db_check = get_db_session()
                    ocr_check = db_check.query(OcrResult).filter_by(file_id=file_id).first()
                    db_check.close()
                    if ocr_check and (ocr_check.pdf_text or ocr_check.ocr_text):
                        availability = {'exists': True, 'is_processed': True, 'status': ocr_check.status}
                        logger.info(f"Direct database check found processed file {file_id}")
                except Exception as db_check_error:
                    logger.warning(f"Direct database check also failed: {db_check_error}")
            
            if availability.get('exists', False) and availability.get('is_processed', False):
                # Try to get preloaded text and images from database
                db = get_db_session()
                try:
                    ocr_result = db.query(OcrResult).filter_by(file_id=file_id).first()
                    if ocr_result and (ocr_result.pdf_text or ocr_result.ocr_text):
                        logger.info(f"Found database record for file {file_id} with status: {ocr_result.status}")
                        
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
                                
                                page_result = {
                                    "id": f"{request.filename}_page_{i + 1}",
                                    "pageNumber": i + 1,
                                    "imageUrl": "",
                                    "extractedText": page_text,
                                    "wordCount": len(page_text.split()) if page_text.strip() else 0,
                                    "characterCount": len(page_text),
                                    "confidence": 0.9,
                                    "processingTime": 0,
                                    "status": "preloaded",
                                    "hasEmbeddedText": has_embedded_text,
                                    "fileId": f"{file_id}_page_{i + 1}"
                                }
                                results["pages"].append(page_result)
                        else:
                            # No images stored - create a single page entry for the text without image
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
                                "hasEmbeddedText": has_embedded_text,
                                "fileId": f"{file_id}_page_1"
                            }
                            results["pages"].append(page_result)
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
    
    try:
        # Decode PDF data
        pdf_bytes = base64.b64decode(request.file_data)
        settings = request.settings
        
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
        
        # Convert PDF to images and extract embedded text
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(doc)
        
        # Variables for thumbnail generation
        first_page_pixmap = None
        first_page_image_path = None
        
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
            
            # Store first page pixmap for thumbnail generation
            if page_num == 0:
                first_page_pixmap = pix
            
            # Save image
            image_format = settings.get("imageFormat", "PNG").lower()
            img_filename = f"page_{page_num + 1}.{image_format}"
            img_path = os.path.join(temp_dir, img_filename)
            
            # Store first page image path for thumbnail generation
            if page_num == 0:
                first_page_image_path = img_path
            
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
                raise save_error
            
            # Try to extract embedded text first
            embedded_text = page.get_text()
            word_count = len(embedded_text.split()) if embedded_text.strip() else 0
            
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
                "hasEmbeddedText": False,
                "fileId": f"{file_id}_page_{page_num + 1}"
            }
            
            if embedded_text.strip() and word_count > 5:  # Minimum threshold for meaningful text
                # Use embedded text
                page_result.update({
                    "extractedText": embedded_text,
                    "wordCount": word_count,
                    "characterCount": len(embedded_text),
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
                            logger.warning(f"Tesseract failed, falling back to EasyOCR: {tesseract_error}")
                            # Fallback to EasyOCR if Tesseract fails
                            easyocr_lang = 'es' if language_setting == 'es' else 'en'
                            gpu_enabled = configure_easyocr_gpu(settings.get("enableGpuAcceleration", True))
                            reader = easyocr.Reader([easyocr_lang], gpu=gpu_enabled)
                            result = reader.readtext(img_path, detail=0, paragraph=False)
                            ocr_text = '\n'.join(result)
                    elif ocr_engine == "easyocr":
                        # EasyOCR uses different language codes
                        easyocr_lang = 'es' if language_setting == 'es' else 'en'
                        gpu_enabled = configure_easyocr_gpu(settings.get("enableGpuAcceleration", True))
                        reader = easyocr.Reader([easyocr_lang], gpu=gpu_enabled)
                        result = reader.readtext(img_path, detail=0, paragraph=False)
                        ocr_text = '\n'.join(result)
                    else:
                        # Default to EasyOCR
                        logger.info(f"Unknown OCR engine '{ocr_engine}', using EasyOCR as default")
                        easyocr_lang = 'es' if language_setting == 'es' else 'en'
                        gpu_enabled = configure_easyocr_gpu(settings.get("enableGpuAcceleration", True))
                        reader = easyocr.Reader([easyocr_lang], gpu=gpu_enabled)
                        result = reader.readtext(img_path, detail=0, paragraph=False)
                        ocr_text = '\n'.join(result)
                    
                    ocr_word_count = len(ocr_text.split()) if ocr_text.strip() else 0
                    ocr_character_count = len(ocr_text) if ocr_text.strip() else 0
                    
                    # Simulate confidence score
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
                db = get_db_session()
                
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
                
                # Generate thumbnail during OCR processing
                try:
                    db_path = DATABASE_URL.replace('sqlite:///', '') if DATABASE_URL.startswith('sqlite:///') else 'ocr.db'
                    thumbnail_generator = ThumbnailGenerator(db_path)
                    thumbnail_success = thumbnail_generator.generate_thumbnail_during_ocr(
                        file_id=file_id,
                        first_page_image_path=first_page_image_path,
                        first_page_pixmap=first_page_pixmap
                    )
                    if thumbnail_success:
                        logger.info(f"Successfully generated thumbnail for {file_id}")
                    else:
                        logger.warning(f"Failed to generate thumbnail for {file_id}")
                except Exception as thumb_error:
                    logger.error(f"Error generating thumbnail for {file_id}: {thumb_error}")
            except Exception as db_error:
                logger.error(f"Error storing OCR results in database: {db_error}")
                if 'db' in locals():
                    db.close()
        
        logger.info(f"PDF OCR completed for {request.filename}: {page_count} pages, {results['totalWords']} words")
        return results
        
    except Exception as e:
        logger.error(f"Error in PDF OCR processing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF OCR processing failed: {str(e)}")