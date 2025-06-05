import logging
import time
import base64
import os
import tempfile
import shutil
import fitz
from PIL import Image
from fastapi import HTTPException
from .models import PreprocessRequest
from app.utils.cache_utils import cache_preprocessing_result

logger = logging.getLogger(__name__)

@cache_preprocessing_result
def preprocess(req: PreprocessRequest):
    """
    Preprocess a PDF file: convert to images and extract embedded text.
    Supports PyMuPDF and pdf2image engines. All image options are applied here.
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