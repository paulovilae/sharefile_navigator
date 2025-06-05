from pydantic import BaseModel
from typing import List, Optional

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

def get_ocr_language_code(lang_setting: str = None) -> str:
    """
    Get the appropriate OCR language code based on settings.
    """
    from .db_utils import get_setting_value
    import logging
    
    logger = logging.getLogger(__name__)
    
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

class BatchFileInfo(BaseModel):
    """Information about a file for batch processing"""
    name: str
    item_id: str
    drive_id: str
    size: int = 0
    modified: Optional[str] = None

class BatchProcessingRequest(BaseModel):
    """Request model for batch OCR processing"""
    batch_id: str
    files: List[BatchFileInfo]
    settings: dict = {
        "dpi": 300,
        "imageFormat": "PNG",
        "colorMode": "RGB",
        "pageRange": "all",
        "ocrEngine": "easyocr",
        "language": "spa",
        "confidenceThreshold": 0.7,
        "enableGpuAcceleration": True,
        "batchSize": 5,
        "autoSave": True
    }