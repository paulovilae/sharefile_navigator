"""
OCR API module - modularized from the original ocr.py file.

This module provides OCR functionality split into logical components:
- models: Pydantic models and schemas
- db_utils: Database utilities and configuration
- preload_utils: Preload data checking utilities
- pdf_processing: PDF OCR processing functions
- image_utils: Image serving utilities
- status_utils: OCR status management
- sharepoint_processing: SharePoint integration
- preprocessing: PDF preprocessing utilities
- ocr_processing: Core OCR processing
- pipeline: OCR pipeline orchestration
- routes: FastAPI route definitions
"""

from .routes import router

__all__ = ["router"]