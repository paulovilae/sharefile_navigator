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
        schema_extra = {
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
                reader = easyocr.Reader([ocr_lang], gpu=True)
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

        # 1. Perform initial OCR
        file_content = get_sharepoint_file_content(drive_id=drive_id, item_id=item_id)
        if file_content and file_content.body:
            pdf_data = base64.b64encode(file_content.body).decode('utf-8')
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

        ocr_images_request = OcrImagesRequest(image_paths=image_paths, lang='eng', engine='easyocr', paragraph=False)
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
            logging.warning(f"LLM quality score is None for ocr_result_id: {ocr_result_id}. Setting status to 'Needs Manual Review'")
            ocr_result.status = "Needs Manual Review"
            db.commit()
            return

        if quality_score < quality_threshold:
            logging.info(f"Quality score {quality_score} is below threshold {quality_threshold} for ocr_result_id: {ocr_result_id}. Retrying with higher DPI.")
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
            ocr_images_request_dpi = OcrImagesRequest(image_paths=image_paths_dpi, lang='eng', engine='easyocr', paragraph=False)
            ocr_result_dpi = ocr_images(ocr_images_request_dpi)
            extracted_text_dpi = "\\n".join(ocr_result_dpi["texts"])

            ocr_result.pdf_text = extracted_text_dpi
            db.commit()

            ocr_result.status = "LLM Reviewing"
            db.commit()
            logging.info(f"Updated OcrResult {ocr_result_id} status to 'LLM Reviewing' after DPI retry")
            quality_score_dpi = await get_llm_quality_score(extracted_text_dpi, system_prompt)

            if quality_score_dpi is None:
                logging.warning(f"LLM quality score is None after DPI retry for ocr_result_id: {ocr_result_id}. Setting status to 'Needs Manual Review'")
                ocr_result.status = "Needs Manual Review"
                db.commit()
                return

            if quality_score_dpi < quality_threshold:
                logging.info(f"Quality score {quality_score_dpi} is below threshold {quality_threshold} after DPI retry for ocr_result_id: {ocr_result_id}. Retrying with Image OCR.")
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
                ocr_images_request_image = OcrImagesRequest(image_paths=image_paths_image, lang='eng', engine='easyocr', paragraph=False)
                ocr_result_image = ocr_images(ocr_images_request_image)
                extracted_text_image = "\\n".join(ocr_result_image["texts"])

                ocr_result.pdf_text = extracted_text_image
                db.commit()

                ocr_result.status = "LLM Reviewing"
                db.commit()
                logging.info(f"Updated OcrResult {ocr_result_id} status to 'LLM Reviewing' after Image OCR retry")
                quality_score_image = await get_llm_quality_score(extracted_text_image, system_prompt)

                if quality_score_image is None:
                    logging.warning(f"LLM quality score is None after Image OCR retry for ocr_result_id: {ocr_result_id}. Setting status to 'Needs Manual Review'")
                    ocr_result.status = "Needs Manual Review"
                    db.commit()
                    return

                if quality_score_image < quality_threshold:
                    logging.info(f"Quality score {quality_score_image} is still below threshold {quality_threshold} after Image OCR retry for ocr_result_id: {ocr_result_id}. Setting status to 'Needs Manual Review'")
                    ocr_result.status = "Needs Manual Review"
                    db.commit()
                else:
                    logging.info(f"Quality score {quality_score_image} is above threshold {quality_threshold} after Image OCR retry for ocr_result_id: {ocr_result_id}. Setting status to 'OCR Done'")
                    ocr_result.status = "OCR Done"
                    ocr_result.ocr_text = extracted_text_image
                    db.commit()
            else:
                logging.info(f"Quality score {quality_score_dpi} is above threshold {quality_threshold} after DPI retry for ocr_result_id: {ocr_result_id}. Setting status to 'OCR Done'")
                ocr_result.status = "OCR Done"
                ocr_result.ocr_text = extracted_text_dpi
                db.commit()
        else:
            logging.info(f"Quality score {quality_score} is above threshold {quality_threshold} for ocr_result_id: {ocr_result_id}. Setting status to 'OCR Done'")
            ocr_result.status = "OCR Done"
            ocr_result.ocr_text = extracted_text
            db.commit()

    except Exception as e:
        logging.error(f"Error in OCR pipeline for ocr_result_id: {ocr_result_id}: {e}", exc_info=True)
        ocr_result = db.query(OcrResult).filter(OcrResult.id == ocr_result_id).first()
        if ocr_result:
            ocr_result.status = "Error"
            ocr_result.error_message = str(e)
            db.commit()
    finally:
        db.close()