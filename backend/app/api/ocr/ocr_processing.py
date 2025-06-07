import logging
from PIL import Image
from fastapi import HTTPException
import easyocr
import pytesseract
from app.schemas import OcrImagesRequest
from app.utils.cache_utils import cache_ocr_result
from app.utils.gpu_utils import configure_easyocr_gpu_with_selection, get_gpu_info, release_gpu, get_gpu_usage_stats

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
    
    # Log memory usage at start
    try:
        import psutil
        process = psutil.Process()
        memory_info = process.memory_info()
        logger.info(f"Memory usage before OCR processing: {memory_info.rss / 1024 / 1024:.2f} MB")
    except ImportError:
        pass

    if ocr_engine not in ["easyocr", "tesseract"]:
        raise HTTPException(status_code=400, detail=f"Unsupported OCR engine: {ocr_engine}")

    try:
        extracted_texts = []
        
        # Process images in batches of 5 to prevent memory buildup
        batch_size = 5
        for i in range(0, len(req.image_paths), batch_size):
            batch_paths = req.image_paths[i:i+batch_size]
            logger.info(f"Processing batch {i//batch_size + 1} of {(len(req.image_paths) + batch_size - 1)//batch_size}")
            
            for image_path in batch_paths:
                logger.info(f"Processing image: {image_path} with {ocr_engine}")
            if ocr_engine == 'easyocr':
                # Get preferred GPU from request parameters or default to auto-selection
                preferred_gpu = getattr(req, 'preferred_gpu', None)
                if preferred_gpu is not None and preferred_gpu != "auto":
                    try:
                        preferred_gpu = int(preferred_gpu)
                    except (ValueError, TypeError):
                        preferred_gpu = None
                else:
                    preferred_gpu = None
                
                # Configure GPU with selection
                gpu_enabled, gpu_id = configure_easyocr_gpu_with_selection(True, preferred_gpu)
                
                try:
                    reader = easyocr.Reader([ocr_lang], gpu=gpu_enabled)
                    result = reader.readtext(image_path, detail=0, paragraph=paragraph_mode)
                    text = '\n'.join(result)
                finally:
                    # Always release the GPU when done
                    if gpu_enabled and gpu_id is not None:
                        release_gpu(gpu_id)
            elif ocr_engine == 'tesseract':
                img = Image.open(image_path)
                text = pytesseract.image_to_string(img, lang=ocr_lang)
            else:
                raise ValueError(f"Unsupported OCR engine: {ocr_engine}")
                extracted_texts.append(text)
                
                # Force garbage collection after each image
                import gc
                gc.collect()
            
            # Log memory usage after each batch
            try:
                import psutil
                process = psutil.Process()
                memory_info = process.memory_info()
                logger.info(f"Memory usage after batch {i//batch_size + 1}: {memory_info.rss / 1024 / 1024:.2f} MB")
            except ImportError:
                pass
            
        # Get GPU information
        gpu_info = get_gpu_info()
        gpu_usage_stats = get_gpu_usage_stats()
        
        return {
            "texts": extracted_texts,
            "gpuUsed": gpu_info["is_available"],
            "gpuInfo": gpu_info,
            "gpuUsageStats": gpu_usage_stats
        }
        
        # Log memory usage at end
        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()
            logger.info(f"Memory usage after OCR processing: {memory_info.rss / 1024 / 1024:.2f} MB")
        except ImportError:
            pass
            
    except Exception as e:
        logger.error(f"Error during OCR: {e}", exc_info=True)
        
        # Force garbage collection on error
        import gc
        gc.collect()
        
        raise HTTPException(status_code=500, detail=str(e))