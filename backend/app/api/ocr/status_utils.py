import logging
import datetime
from fastapi import HTTPException
from .db_utils import get_db_session
from app.models import OcrResult

logger = logging.getLogger(__name__)

def get_ocr_status(ocr_result_id_or_file_id: str):
    """
    Retrieves the OCR processing status and results for a given item.
    The path parameter can be either the integer ID of the OcrResult record
    or the string file_id (SharePoint item ID).
    """
    session = get_db_session()
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
        if is_integer_id:
            # This is likely a database record ID that doesn't exist - true 404
            logger.warning(f"OCR record with ID {ocr_result_id_or_file_id} not found in database.")
            raise HTTPException(status_code=404, detail=f"OCR record not found for ID: {ocr_result_id_or_file_id}")
        else:
            # This is a SharePoint file_id that hasn't been processed yet - return not processed status
            logger.info(f"OCR status requested for file_id '{ocr_result_id_or_file_id}' - file not yet processed through OCR.")
            return {
                "id": ocr_result_id_or_file_id,
                "file_id": ocr_result_id_or_file_id,
                "directory_id": None,
                "status": "not_processed",
                "ocr_text_snippet": None,
                "pdf_text_snippet": None,
                "metrics": None,
                "created_at": None,
                "updated_at": None,
                "message": "File has not been processed through OCR yet"
            }

    logger.info(f"Returning OCR status for {ocr_result_id_or_file_id}: {ocr_result.status}")
    return {
        "id": ocr_result.file_id,  # Use file_id as the id for compatibility
        "file_id": ocr_result.file_id,
        "directory_id": ocr_result.directory_id,
        "status": ocr_result.status,
        "ocr_text_snippet": (ocr_result.ocr_text[:200] + '...' if ocr_result.ocr_text and len(ocr_result.ocr_text) > 200 else ocr_result.ocr_text) if ocr_result.ocr_text else None,
        "pdf_text_snippet": (ocr_result.pdf_text[:200] + '...' if ocr_result.pdf_text and len(ocr_result.pdf_text) > 200 else ocr_result.pdf_text) if ocr_result.pdf_text else None,
        "metrics": ocr_result.metrics,
        "created_at": ocr_result.created_at,
        "updated_at": ocr_result.updated_at
    }

def get_ocr_text(file_id: str):
    """
    Retrieves the full OCR text for a given file.
    Returns both PDF text and OCR text if available.
    """
    session = get_db_session()
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

async def update_ocr_status(file_id: str, status: str, ocr_text: str = None, pdf_text: str = None):
    """
    Manually update the OCR status for a file. Useful for fixing status mismatches.
    """
    try:
        db = get_db_session()
        
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