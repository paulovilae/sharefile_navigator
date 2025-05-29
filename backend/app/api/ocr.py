import logging
import os
logging.basicConfig(filename='ocr_debug.log', level=logging.DEBUG, format='%(asctime)s %(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)

print("OCR.PY LOADED")
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from sqlalchemy.orm import sessionmaker
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

# Developers: To use a specific SQLite database file, set DATABASE_URL below to an absolute path.
# Example (uncomment and edit as needed):
# DATABASE_URL = 'sqlite:///C:/Users/paulo/Programs/ocr/ocr.db'
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ocr.db')  # Uses .env or defaults to ocr.db in current working directory

# Log the actual SQLite database file being used
if DATABASE_URL.startswith('sqlite:///'):
    db_path = DATABASE_URL.replace('sqlite:///', '')
    abs_db_path = os.path.abspath(db_path)
    print(f'Using SQLite database at: {abs_db_path}')
    logger.warning(f'Using SQLite database at: {abs_db_path}')

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

router = APIRouter(tags=["ocr"])

class OcrRequest(BaseModel):
    drive_id: str
    item_id: str
    lang: str = 'en'
    engine: str = 'easyocr'

    def __init__(self, **data):
        print("OcrRequest model constructed")
        super().__init__(**data)

class PreprocessRequest(BaseModel):
    file_id: str
    directory_id: str
    pdf_data: str  # base64-encoded
    engine: str = "pymupdf"
    dpi: int = 300
    width: int = 0  # 0 means auto
    height: int = 0  # 0 means auto
    scale: float = 1.0  # 1.0 means no scaling
    colorspace: str = "rgb"  # rgb, gray, cmyk
    alpha: bool = False
    rotation: int = 0  # degrees
    image_format: str = "png"  # png, jpeg, tiff
    page_range: str = ""  # e.g. "1-3,5"
    grayscale: bool = False
    transparent: bool = False
    # Note: Pillow post-processing (contrast, gamma, etc.) is not included here
    # and should be handled in a later step.
    
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

class OcrImagesRequest(BaseModel):
    image_paths: list
    engine: str = 'easyocr'
    lang: str = 'en'
    paragraph: bool = True  # for easyocr
    # Add more options as needed

@router.post('/file')
def ocr_file(req: OcrRequest):
    logger.warning("ENTERED OCR FILE ENDPOINT")
    try:
        forbidden_names = {'file', 'test', 'engines', 'status', 'ocr'}
        logger.warning("Checking forbidden names")
        if req.item_id.lower() in forbidden_names:
            logger.warning(f"Forbidden item_id used: {req.item_id}")
            raise HTTPException(status_code=400, detail=f"Forbidden file/item_id: {req.item_id}")
        logger.warning("Creating DB session")
        session = SessionLocal()
        logger.warning("DB session created")
        file_id = req.item_id
        logger.warning("Querying for existing OCR result")
        try:
            ocr_result = session.query(OcrResult).filter_by(file_id=file_id).first()
        except OperationalError as e:
            if "no such table: ocr_results" in str(e):
                logger.warning("Table ocr_results does not exist, running Alembic migrations...")
                from pathlib import Path
                project_root = Path(__file__).resolve().parents[1]
                alembic_ini_path = str(project_root / 'alembic.ini')
                alembic_cfg = Config(alembic_ini_path)
                script_location = str(project_root / "alembic")
                logger.warning(f"Using alembic script_location: {script_location}")
                alembic_cfg.set_main_option("script_location", script_location)
                command.upgrade(alembic_cfg, "head")
                session.close()
                session = SessionLocal()
                ocr_result = session.query(OcrResult).filter_by(file_id=file_id).first()
            else:
                logger.warning(f"Exception at start of endpoint: {e}")
                session.close()
                raise
        logger.warning("Checked for existing OCR result")
        if ocr_result and ocr_result.ocr_text:
            logger.warning(f"[OCR] Cache hit for file_id={file_id}")
            session.close()
            return {"file_id": file_id, "ocr_text": ocr_result.ocr_text, "cached": True, "engine": req.engine}
        # Fetch file content from SharePoint API
        url = f"http://localhost:8001/api/sharepoint/file_content?drive_id={req.drive_id}&item_id={req.item_id}"
        logger.warning(f"[OCR] About to fetch file from {url}")
        resp = requests.get(url)
        logger.warning(f"[OCR] File fetch response status: {resp.status_code}")
        if resp.status_code != 200:
            logger.warning(f"[OCR] File fetch failed: {resp.status_code}")
            session.close()
            raise HTTPException(status_code=404, detail="File not found or could not be fetched.")
        # Detect file type
        ext = os.path.splitext(file_id)[-1].lower()
        mime_type = resp.headers.get('content-type') or mimetypes.guess_type(file_id)[0] or ''
        logger.warning(f"[OCR] File extension: {ext}, mime_type: {mime_type}")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".ocr") as tmp_file:
            tmp_file.write(resp.content)
            tmp_path = tmp_file.name
        text = ''
        try:
            if ext == '.pdf' or 'pdf' in mime_type:
                logger.warning(f"[OCR] Detected PDF, converting to images with PyMuPDF...")
                images = pdf_to_images(tmp_path)
                ocr_texts = []
                for i, img in enumerate(images):
                    logger.warning(f"[OCR] OCR page {i+1} with engine {req.engine}")
                    if req.engine == 'tesseract':
                        ocr_texts.append(pytesseract.image_to_string(img, lang=req.lang))
                    else:  # easyocr default
                        # Save image to a temp file for easyocr
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as img_tmp:
                            img.save(img_tmp.name)
                            reader = easyocr.Reader([req.lang], gpu=True)
                            result = reader.readtext(img_tmp.name, detail=0, paragraph=True)
                            ocr_texts.append('\n'.join(result))
                        os.remove(img_tmp.name)
                text = '\n\n'.join(ocr_texts)
            else:
                logger.warning(f"[OCR] Detected image, using engine {req.engine}")
                if req.engine == 'tesseract':
                    img = Image.open(tmp_path)
                    text = pytesseract.image_to_string(img, lang=req.lang)
                else:  # easyocr default
                    reader = easyocr.Reader([req.lang], gpu=True)
                    result = reader.readtext(tmp_path, detail=0, paragraph=True)
                    text = '\n'.join(result)
            logger.warning(f"[OCR] OCR complete for file_id={file_id}")
        except Exception as e:
            logger.warning(f"[OCR] Exception: {e}")
            os.remove(tmp_path)
            session.close()
            raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")
        # Save to DB
        if ocr_result:
            ocr_result.ocr_text = text
        else:
            ocr_result = OcrResult(file_id=file_id, ocr_text=text)
            session.add(ocr_result)
        session.commit()
        session.close()
        os.remove(tmp_path)
        logger.warning(f"[OCR] Done for file_id={file_id}")
        return {"file_id": file_id, "ocr_text": text, "cached": False, "engine": req.engine}
    except Exception as e:
        logger.warning(f"Exception at start of endpoint: {e}")
        raise

@router.get('/status')
def ocr_status(file_id: str):
    session = SessionLocal()
    ocr_result = session.query(OcrResult).filter_by(file_id=file_id).first()
    session.close()
    if not ocr_result:
        return {
            "file_id": file_id,
            "status": "not_processed"
        }
    return {
        "file_id": file_id,
        "pdf_text": ocr_result.pdf_text,
        "pdf_image_path": ocr_result.pdf_image_path,
        "ocr_text": ocr_result.ocr_text,
        "ocr_image_path": ocr_result.ocr_image_path,
        "ocr_json": ocr_result.ocr_json,
        "metrics": ocr_result.metrics,
        "updated_at": ocr_result.updated_at,
        "status": "processed"
    }

@router.get('/engines')
def list_engines():
    logger.warning("ENGINES ENDPOINT CALLED")
    return {"engines": ["easyocr", "tesseract"]}

@router.get('/test')
def test():
    print("TEST ENDPOINT CALLED")
    return {"status": "ok"}

def pdf_to_images(pdf_path):
    doc = fitz.open(pdf_path)
    images = []
    for page in doc:
        pix = page.get_pixmap()
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        images.append(img)
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
    # Use a fixed directory for each file_id
    base_temp_dir = os.path.join(tempfile.gettempdir(), 'ocr_images')
    temp_dir = os.path.join(base_temp_dir, req.directory_id, req.file_id)
    # Clear the directory for this file_id before saving new images
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    # Parse page range
    def parse_page_range(page_range, num_pages):
        if not page_range:
            return list(range(num_pages))
        pages = set()
        for part in page_range.split(","):
            if "-" in part:
                start, end = part.split("-")
                pages.update(range(int(start)-1, int(end)))
            else:
                pages.add(int(part)-1)
        return sorted([p for p in pages if 0 <= p < num_pages])
    if req.engine == "pymupdf":
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages = parse_page_range(req.page_range, len(doc))
        for i in pages:
            page = doc.load_page(i)
            # Extract embedded text
            text = page.get_text()
            page_texts.append(text)
            # Compute width/height
            rect = page.rect
            if req.width > 0 and req.height > 0:
                zoom_x = req.width / rect.width
                zoom_y = req.height / rect.height
            else:
                scale = req.scale if hasattr(req, 'scale') and req.scale else 1.0
                zoom_x = (req.dpi / 72.0) * scale
                zoom_y = (req.dpi / 72.0) * scale
            matrix = fitz.Matrix(zoom_x, zoom_y).prerotate(req.rotation)
            # Colorspace
            colorspace = fitz.csRGB
            if req.colorspace.lower() == "gray":
                colorspace = fitz.csGRAY
            elif req.colorspace.lower() == "cmyk":
                colorspace = fitz.csCMYK
            img_path = os.path.join(temp_dir, f"{req.file_id}_page{i+1}.{req.image_format}")
            pix = page.get_pixmap(matrix=matrix, colorspace=colorspace, alpha=req.alpha)
            pix.save(img_path)
            image_ids.append(img_path)
            image_urls.append(f"/api/ocr/image?path={img_path}")
    elif req.engine == "pdf2image":
        # pdf2image options
        first_page = None
        last_page = None
        if req.page_range:
            pages = parse_page_range(req.page_range, 10000)  # pdf2image will error if out of range
            if pages:
                first_page = pages[0] + 1
                last_page = pages[-1] + 1
        # Compute size
        size = None
        if req.width > 0 and req.height > 0:
            size = (req.width, req.height)
        else:
            scale = req.scale if hasattr(req, 'scale') and req.scale else 1.0
            # Use A4 as default if we can't get real size
            base_width = 595
            base_height = 842
            width = int(base_width * (req.dpi / 72.0) * scale)
            height = int(base_height * (req.dpi / 72.0) * scale)
            size = (width, height)
        imgs = convert_from_bytes(
            pdf_bytes,
            dpi=req.dpi,
            size=size,
            fmt=req.image_format,
            first_page=first_page,
            last_page=last_page,
            grayscale=req.grayscale,
            transparent=req.transparent,
            thread_count=1
        )
        for idx, img in enumerate(imgs):
            img_path = os.path.join(temp_dir, f"{req.file_id}_page{(first_page or 1) + idx}.{req.image_format}")
            img.save(img_path)
            image_ids.append(img_path)
            image_urls.append(f"/api/ocr/image?path={img_path}")
        # pdf2image cannot extract text
        page_texts = [None] * len(image_ids)
    else:
        raise HTTPException(status_code=400, detail="Unknown engine")
    elapsed = time.time() - start_time
    logger.info(f"/preprocess params: {req.dict()}")
    # Save to DB
    session = SessionLocal()
    ocr_result = session.query(OcrResult).filter_by(file_id=req.file_id).first()
    preprocess_metrics = {
        "engine": req.engine,
        "time_seconds": elapsed,
        "pages": len(image_ids),
        "params": req.dict()
    }
    if ocr_result:
        ocr_result.directory_id = req.directory_id
        ocr_result.pdf_text = '\n\n'.join([t for t in page_texts if t]) if page_texts else None
        ocr_result.pdf_image_path = json.dumps(image_ids)
        # Merge or create metrics JSON
        metrics = ocr_result.metrics or {}
        metrics["preprocess"] = preprocess_metrics
        ocr_result.metrics = metrics
        ocr_result.updated_at = datetime.datetime.utcnow()
    else:
        ocr_result = OcrResult(
            file_id=req.file_id,
            directory_id=req.directory_id,
            pdf_text='\n\n'.join([t for t in page_texts if t]) if page_texts else None,
            pdf_image_path=json.dumps(image_ids),
            metrics={"preprocess": preprocess_metrics},
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow()
        )
        session.add(ocr_result)
    session.commit()
    session.close()
    return {
        "image_ids": image_ids,
        "image_urls": image_urls,
        "page_texts": page_texts,
        "metrics": preprocess_metrics
    }

@router.get('/image')
def serve_image(path: str):
    """
    Serve a generated image file by its path (only from temp dir, only images).
    """
    temp_dir = tempfile.gettempdir()
    abs_path = os.path.abspath(path)
    if not abs_path.startswith(temp_dir):
        raise HTTPException(status_code=403, detail="Access denied.")
    mime, _ = mimetypes.guess_type(abs_path)
    if not mime or not mime.startswith('image/'):
        raise HTTPException(status_code=400, detail="Not an image file.")
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(abs_path, media_type=mime)

@router.post('/images')
def ocr_images(req: OcrImagesRequest):
    """
    Run OCR on a list of image paths (generated by PDF conversion step).
    """
    start_time = time.time()
    results = []
    all_texts = []
    for img_path in req.image_paths:
        if not os.path.exists(img_path):
            results.append({'image': img_path, 'error': 'File not found'})
            continue
        if req.engine == 'tesseract':
            img = Image.open(img_path)
            text = pytesseract.image_to_string(img, lang=req.lang)
            results.append({'image': img_path, 'text': text})
            all_texts.append(text)
        elif req.engine == 'torch':
            logger.warning("Torch engine selected: using EasyOCR with GPU enabled.")
            reader = easyocr.Reader([req.lang], gpu=True)
            result = reader.readtext(img_path, detail=0, paragraph=req.paragraph)
            text = '\n'.join(result)
            results.append({'image': img_path, 'text': text})
            all_texts.append(text)
        else:  # easyocr default
            reader = easyocr.Reader([req.lang], gpu=True)
            result = reader.readtext(img_path, detail=0, paragraph=req.paragraph)
            text = '\n'.join(result)
            results.append({'image': img_path, 'text': text})
            all_texts.append(text)
    elapsed = time.time() - start_time
    # Save OCR results and metrics to DB
    session = SessionLocal()
    file_id = None
    if req.image_paths:
        # Try to extract file_id from the image path
        file_id = os.path.basename(req.image_paths[0]).split('_page')[0]
    ocr_metrics = {
        "engine": req.engine,
        "time_seconds": elapsed,
        "images": len(req.image_paths),
        "words": sum(len(t.split()) for t in all_texts),
        "params": req.dict()
    }
    if file_id:
        ocr_result = session.query(OcrResult).filter_by(file_id=file_id).first()
        if ocr_result:
            ocr_result.ocr_text = '\n\n'.join([t for t in all_texts if t]) if all_texts else None
            ocr_result.ocr_image_path = json.dumps(req.image_paths)
            ocr_result.ocr_json = results
            # Merge or create metrics JSON
            metrics = ocr_result.metrics or {}
            metrics["ocr"] = ocr_metrics
            ocr_result.metrics = metrics
            ocr_result.updated_at = datetime.datetime.utcnow()
        else:
            ocr_result = OcrResult(
                file_id=file_id,
                ocr_text='\n\n'.join([t for t in all_texts if t]) if all_texts else None,
                ocr_image_path=json.dumps(req.image_paths),
                ocr_json=results,
                metrics={"ocr": ocr_metrics},
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow()
            )
            session.add(ocr_result)
        session.commit()
    session.close()
    return {'results': results, 'metrics': ocr_metrics} 