"""
Test router for OCR Service - allows testing OCR operations via SwaggerUI.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional, Dict, Any, List
from ..services.ocr_service import ocr_service
import base64

router = APIRouter(
    prefix="/api/ocr-test",
    tags=["OCR Test"],
    responses={404: {"description": "Not found"}},
)

@router.post("/extract-text")
async def extract_text_from_image(
    file: UploadFile = File(..., description="Image file (PNG, JPG, JPEG)"),
    languages: Optional[str] = Form(None, description="Comma-separated language codes (e.g., 'en,zh,ja')"),
    preprocess: bool = Form(True, description="Apply image preprocessing for better OCR")
) -> Dict[str, Any]:
    """
    Extract text from an uploaded image using OCR with multi-language support.
    
    **Supported Languages:**
    - en: English
    - es: Spanish  
    - fr: French
    - de: German
    - it: Italian
    - pt: Portuguese
    - ru: Russian
    - zh: Chinese (Simplified + Traditional)
    - ja: Japanese
    - ko: Korean
    - ar: Arabic
    - hi: Hindi
    - th: Thai
    - vi: Vietnamese
    - tr: Turkish
    - And many more...
    
    **Features:**
    - Automatic image preprocessing (denoising, contrast enhancement, deskewing)
    - Multi-language text extraction
    - Confidence scoring
    - Automatic language detection
    
    **Returns:**
    - Extracted text
    - Confidence score
    - Detected languages
    - Word and character counts
    - Text bounding boxes
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp')):
            raise HTTPException(
                status_code=400, 
                detail="File must be an image (PNG, JPG, JPEG, BMP, TIFF, WEBP)"
            )
        
        # Read file content
        image_bytes = await file.read()
        
        # Parse languages if provided
        lang_list = None
        if languages:
            lang_list = [lang.strip() for lang in languages.split(',')]
        
        # Process image with OCR
        result = await ocr_service.process_image_bytes(
            image_bytes=image_bytes,
            languages=lang_list,
            preprocess=preprocess
        )
        
        return {
            "success": True,
            "filename": file.filename,
            "result": result
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

@router.post("/detect-language")
async def detect_text_language(
    text: str = Form(..., description="Text to analyze for language detection")
) -> Dict[str, Any]:
    """
    Detect the language(s) of the provided text.
    
    **Features:**
    - Detects primary language
    - Returns confidence scores
    - Identifies multiple possible languages
    - Supports 50+ languages
    
    **Returns:**
    - Primary detected language
    - Confidence score
    - List of all possible languages with probabilities
    """
    try:
        if not text or len(text.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Text must be at least 10 characters long for reliable detection"
            )
        
        # Detect language
        result = ocr_service.detect_language(text)
        
        return {
            "success": True,
            "text_length": len(text),
            "result": result
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Language detection failed: {str(e)}")

@router.post("/preprocess-image")
async def preprocess_image_only(
    file: UploadFile = File(..., description="Image file to preprocess"),
    resize_factor: float = Form(2.0, description="Resize factor for small images"),
    contrast: float = Form(1.5, description="Contrast enhancement factor"),
    brightness: float = Form(1.0, description="Brightness adjustment factor"),
    sharpness: float = Form(1.5, description="Sharpness enhancement factor"),
    denoise: bool = Form(True, description="Apply denoising"),
    binarize: bool = Form(False, description="Convert to black and white")
) -> Dict[str, Any]:
    """
    Preprocess an image to improve OCR accuracy (returns preprocessed image as base64).
    
    **Preprocessing Options:**
    - Resize small images
    - Adjust contrast and brightness
    - Enhance sharpness
    - Remove noise
    - Deskew tilted images
    - Binarize (convert to black/white)
    
    **Returns:**
    - Preprocessed image as base64
    - Applied enhancements list
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp')):
            raise HTTPException(
                status_code=400,
                detail="File must be an image"
            )
        
        # Read file content
        image_bytes = await file.read()
        
        # Convert to PIL Image
        from PIL import Image
        import io
        image = Image.open(io.BytesIO(image_bytes))
        
        # Prepare enhancement options
        enhance_options = {
            'resize_factor': resize_factor,
            'contrast': contrast,
            'brightness': brightness,
            'sharpness': sharpness,
            'denoise': denoise,
            'binarize': binarize
        }
        
        # Preprocess image
        preprocessed = ocr_service.preprocess_image(image, enhance_options)
        
        # Convert preprocessed image to base64
        buffered = io.BytesIO()
        preprocessed.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return {
            "success": True,
            "filename": file.filename,
            "original_size": image.size,
            "preprocessed_size": preprocessed.size,
            "enhancements_applied": enhance_options,
            "preprocessed_image_base64": img_base64
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image preprocessing failed: {str(e)}")

@router.post("/batch-ocr")
async def batch_ocr_processing(
    files: List[UploadFile] = File(..., description="Multiple image files"),
    languages: Optional[str] = Form(None, description="Comma-separated language codes"),
    preprocess: bool = Form(True, description="Apply preprocessing to all images")
) -> Dict[str, Any]:
    """
    Process multiple images with OCR in a single request.
    
    **Features:**
    - Process up to 10 images at once
    - Same language settings for all images
    - Returns results for each image
    
    **Returns:**
    - Results array with OCR output for each image
    - Summary statistics
    """
    try:
        if len(files) > 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 images allowed per batch"
            )
        
        # Parse languages
        lang_list = None
        if languages:
            lang_list = [lang.strip() for lang in languages.split(',')]
        
        results = []
        total_text_length = 0
        detected_languages = set()
        
        for file in files:
            # Validate file type
            if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp')):
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": "Not a valid image file"
                })
                continue
            
            try:
                # Read and process image
                image_bytes = await file.read()
                result = await ocr_service.process_image_bytes(
                    image_bytes=image_bytes,
                    languages=lang_list,
                    preprocess=preprocess
                )
                
                results.append({
                    "filename": file.filename,
                    "success": True,
                    "text_length": len(result['text']),
                    "confidence": result['confidence'],
                    "primary_language": result['detected_languages']['primary_language'],
                    "text_preview": result['text'][:200] + '...' if len(result['text']) > 200 else result['text']
                })
                
                total_text_length += len(result['text'])
                if result['detected_languages']['primary_language'] != 'unknown':
                    detected_languages.add(result['detected_languages']['primary_language'])
                
            except Exception as e:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "success": True,
            "total_images": len(files),
            "successful_extractions": sum(1 for r in results if r['success']),
            "total_text_extracted": total_text_length,
            "detected_languages": list(detected_languages),
            "results": results
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch OCR processing failed: {str(e)}")

@router.get("/supported-languages")
async def get_supported_languages() -> Dict[str, Any]:
    """
    Get list of supported languages for OCR.
    
    **Returns:**
    - Dictionary of language codes and names
    - Total count of supported languages
    """
    return {
        "success": True,
        "total_languages": len(ocr_service.LANGUAGE_CODES),
        "languages": {
            code: ocr_service._get_language_name(code) 
            for code in ocr_service.LANGUAGE_CODES.keys()
        },
        "note": "OCR can attempt to process other languages not in this list using their ISO codes"
    }
