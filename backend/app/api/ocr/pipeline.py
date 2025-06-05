import logging
import base64
import os
import tempfile
from sqlalchemy.orm import Session
from .models import PreprocessRequest
from .db_utils import get_db_session, get_setting_value
from .preprocessing import preprocess
from .ocr_processing import ocr_images
from app.schemas import OcrImagesRequest
from app.models import OcrResult
from app.api.sharepoint import get_file_content as get_sharepoint_file_content
from app.utils.cache_utils import generate_cache_key, save_file_cache, load_file_cache
from app.utils.llm_utils import get_llm_quality_score

logger = logging.getLogger(__name__)

async def run_ocr_pipeline(drive_id: str, item_id: str, ocr_result_file_id: str):
    """
    Runs the OCR pipeline for a given file.
    """
    logging.info(f"Starting OCR pipeline for file_id: {item_id}, ocr_result_file_id: {ocr_result_file_id}")
    db = None
    try:
        db = get_db_session()
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
            logging.info(f"Quality score {quality_score} is below threshold {quality_threshold}. Setting status to 'OCR Done'")
            ocr_result.status = "OCR Done"
            ocr_result.ocr_text = extracted_text
            db.commit()
        else:
            logging.info(f"Quality score {quality_score} is above threshold {quality_threshold}. Setting status to 'OCR Done'")
            ocr_result.status = "OCR Done"
            ocr_result.ocr_text = extracted_text
            db.commit()

    except Exception as e:
        logging.error(f"Error in OCR pipeline for ocr_result_file_id: {ocr_result_file_id}: {e}", exc_info=True)
        if db:
            ocr_result = db.query(OcrResult).filter(OcrResult.file_id == ocr_result_file_id).first()
            if ocr_result:
                ocr_result.status = "Error"
                ocr_result.error_message = str(e)
                db.commit()
    finally:
        if db:
            db.close()