import logging
from PIL import Image
from fastapi import HTTPException
import easyocr
import pytesseract
from app.schemas import OcrImagesRequest
from app.utils.cache_utils import cache_ocr_result
from app.utils.gpu_utils import configure_easyocr_gpu

logger = logging.getLogger(__name__)

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