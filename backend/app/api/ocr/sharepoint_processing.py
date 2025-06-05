import logging
import datetime
import json
from fastapi import HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from .models import SharePointItem
from .db_utils import get_db_session
from .pipeline import run_ocr_pipeline
from app.models import OcrResult
from app.api.sharepoint import list_files as list_sharepoint_files_in_folder

logger = logging.getLogger(__name__)

async def process_sharepoint_item(item: SharePointItem, background_tasks: BackgroundTasks, db: Session):
    """
    Processes a SharePoint item (file or folder) for OCR.

    If the item is a folder, it recursively finds all PDF files within the folder.
    For each PDF file, it downloads the file from SharePoint, creates an initial OcrResult
    entry in the database with status Queued, and adds the file to an asynchronous
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