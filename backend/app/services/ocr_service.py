"""
OCR Service for extracting text from images with multi-language support.
"""
import io
import base64
from typing import Dict, Any, List, Optional, Tuple
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import cv2
import numpy as np
from langdetect import detect, detect_langs, LangDetectException
from fastapi import HTTPException

class OCRService:
    """Service for OCR processing with multi-language support"""
    
    # Tesseract language codes mapping
    LANGUAGE_CODES = {
        'en': 'eng',  # English
        'es': 'spa',  # Spanish
        'fr': 'fra',  # French
        'de': 'deu',  # German
        'it': 'ita',  # Italian
        'pt': 'por',  # Portuguese
        'ru': 'rus',  # Russian
        'zh': 'chi_sim+chi_tra',  # Chinese (Simplified + Traditional)
        'zh-cn': 'chi_sim',  # Chinese Simplified
        'zh-tw': 'chi_tra',  # Chinese Traditional
        'ja': 'jpn',  # Japanese
        'ko': 'kor',  # Korean
        'ar': 'ara',  # Arabic
        'hi': 'hin',  # Hindi
        'th': 'tha',  # Thai
        'vi': 'vie',  # Vietnamese
        'tr': 'tur',  # Turkish
        'pl': 'pol',  # Polish
        'nl': 'nld',  # Dutch
        'sv': 'swe',  # Swedish
        'no': 'nor',  # Norwegian
        'da': 'dan',  # Danish
        'fi': 'fin',  # Finnish
        'he': 'heb',  # Hebrew
        'id': 'ind',  # Indonesian
        'ms': 'msa',  # Malay
        'uk': 'ukr',  # Ukrainian
        'cs': 'ces',  # Czech
        'ro': 'ron',  # Romanian
        'hu': 'hun',  # Hungarian
        'el': 'ell',  # Greek
    }
    
    def __init__(self):
        """Initialize OCR service"""
        # Set Tesseract path if needed (Windows specific)
        # Uncomment and adjust path if Tesseract is not in PATH
        # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        pass
    
    def preprocess_image(self, image: Image.Image, enhance_options: Optional[Dict] = None) -> Image.Image:
        """
        Preprocess image for better OCR accuracy.
        
        Args:
            image: PIL Image object
            enhance_options: Optional enhancement parameters
            
        Returns:
            Preprocessed PIL Image
        """
        # Default enhancement options
        options = {
            'resize_factor': 2,  # Upscale small images
            'denoise': True,
            'contrast': 1.5,
            'brightness': 1.0,
            'sharpness': 1.5,
            'binarize': False,  # Convert to black and white
            'remove_noise': True,
            'deskew': True
        }
        
        if enhance_options:
            options.update(enhance_options)
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if image is too small
        width, height = image.size
        if width < 1000 or height < 1000:
            new_width = int(width * options['resize_factor'])
            new_height = int(height * options['resize_factor'])
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Apply enhancements
        if options['contrast'] != 1.0:
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(options['contrast'])
        
        if options['brightness'] != 1.0:
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(options['brightness'])
        
        if options['sharpness'] != 1.0:
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(options['sharpness'])
        
        # Convert to OpenCV format for advanced processing
        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Denoise
        if options['denoise']:
            img_cv = cv2.fastNlMeansDenoisingColored(img_cv, None, 10, 10, 7, 21)
        
        # Remove noise with morphological operations
        if options['remove_noise']:
            kernel = np.ones((1, 1), np.uint8)
            img_cv = cv2.morphologyEx(img_cv, cv2.MORPH_CLOSE, kernel)
            img_cv = cv2.morphologyEx(img_cv, cv2.MORPH_OPEN, kernel)
        
        # Deskew image
        if options['deskew']:
            img_cv = self._deskew_image(img_cv)
        
        # Convert to grayscale for binarization
        if options['binarize']:
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            # Apply adaptive thresholding
            img_cv = cv2.adaptiveThreshold(
                gray, 255, 
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 
                11, 2
            )
            # Convert back to RGB format
            img_cv = cv2.cvtColor(img_cv, cv2.COLOR_GRAY2RGB)
        else:
            # Convert back to RGB
            img_cv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
        
        # Convert back to PIL Image
        return Image.fromarray(img_cv)
    
    def _deskew_image(self, image: np.ndarray) -> np.ndarray:
        """
        Deskew a tilted image.
        
        Args:
            image: OpenCV image array
            
        Returns:
            Deskewed image array
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.bitwise_not(gray)
        
        # Get coordinates of non-zero pixels
        coords = np.column_stack(np.where(gray > 0))
        
        if len(coords) > 0:
            # Calculate the skew angle
            angle = cv2.minAreaRect(coords)[-1]
            
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            
            # Rotate the image to deskew it
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                image, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
            
            return rotated
        
        return image
    
    def extract_text(
        self,
        image: Image.Image,
        languages: Optional[List[str]] = None,
        preprocess: bool = True,
        config: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract text from image using OCR.
        
        Args:
            image: PIL Image object
            languages: List of language codes (e.g., ['en', 'zh', 'ja'])
            preprocess: Whether to preprocess the image
            config: Custom Tesseract config string
            
        Returns:
            Dictionary with extracted text and metadata
        """
        try:
            # Preprocess image if requested
            if preprocess:
                processed_image = self.preprocess_image(image)
            else:
                processed_image = image
            
            # Prepare language string for Tesseract
            if languages:
                # Convert our language codes to Tesseract codes
                tesseract_langs = []
                for lang in languages:
                    if lang in self.LANGUAGE_CODES:
                        tesseract_langs.append(self.LANGUAGE_CODES[lang])
                    else:
                        # Try to use the code as-is if not in our mapping
                        tesseract_langs.append(lang)
                lang_str = '+'.join(tesseract_langs)
            else:
                # Default to English + major languages
                lang_str = 'eng+chi_sim+chi_tra+jpn+kor+spa+fra+deu+ara'
            
            # Default config for better accuracy
            if not config:
                config = '--oem 3 --psm 3'  # LSTM OCR Engine Mode with automatic page segmentation
            
            # Extract text
            text = pytesseract.image_to_string(
                processed_image,
                lang=lang_str,
                config=config
            )
            
            # Get detailed data including confidence scores
            data = pytesseract.image_to_data(
                processed_image,
                lang=lang_str,
                config=config,
                output_type=pytesseract.Output.DICT
            )
            
            # Calculate average confidence (excluding -1 values)
            confidences = [float(conf) for conf in data['conf'] if conf != -1]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # Extract bounding boxes for text regions
            boxes = []
            n_boxes = len(data['text'])
            for i in range(n_boxes):
                if int(data['conf'][i]) > 0:  # Only include confident detections
                    boxes.append({
                        'text': data['text'][i],
                        'left': data['left'][i],
                        'top': data['top'][i],
                        'width': data['width'][i],
                        'height': data['height'][i],
                        'confidence': data['conf'][i]
                    })
            
            return {
                'text': text.strip(),
                'confidence': avg_confidence,
                'word_count': len(text.split()),
                'char_count': len(text),
                'languages_used': lang_str,
                'boxes': boxes[:10],  # Return first 10 boxes to avoid huge responses
                'preprocessing_applied': preprocess
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"OCR extraction failed: {str(e)}"
            )
    
    def detect_language(self, text: str) -> Dict[str, Any]:
        """
        Detect the language(s) of the given text.
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary with detected languages and probabilities
        """
        try:
            if not text or len(text.strip()) < 10:
                return {
                    'primary_language': 'unknown',
                    'confidence': 0.0,
                    'all_languages': [],
                    'error': 'Text too short for reliable detection'
                }
            
            # Detect primary language
            primary_lang = detect(text)
            
            # Get all possible languages with probabilities
            all_langs = detect_langs(text)
            
            # Format results
            languages_list = [
                {
                    'code': lang.lang,
                    'confidence': lang.prob,
                    'name': self._get_language_name(lang.lang)
                }
                for lang in all_langs
            ]
            
            return {
                'primary_language': primary_lang,
                'confidence': all_langs[0].prob if all_langs else 0.0,
                'all_languages': languages_list,
                'text_sample': text[:100] + '...' if len(text) > 100 else text
            }
            
        except LangDetectException as e:
            return {
                'primary_language': 'unknown',
                'confidence': 0.0,
                'all_languages': [],
                'error': f"Language detection failed: {str(e)}"
            }
    
    def _get_language_name(self, code: str) -> str:
        """Get human-readable language name from code"""
        language_names = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'zh-cn': 'Chinese (Simplified)',
            'zh-tw': 'Chinese (Traditional)',
            'ja': 'Japanese',
            'ko': 'Korean',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'th': 'Thai',
            'vi': 'Vietnamese',
            'tr': 'Turkish',
            'pl': 'Polish',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'no': 'Norwegian',
            'da': 'Danish',
            'fi': 'Finnish',
            'he': 'Hebrew',
            'id': 'Indonesian',
            'ms': 'Malay',
            'uk': 'Ukrainian',
            'cs': 'Czech',
            'ro': 'Romanian',
            'hu': 'Hungarian',
            'el': 'Greek'
        }
        return language_names.get(code, code.upper())
    
    async def process_image_bytes(
        self,
        image_bytes: bytes,
        languages: Optional[List[str]] = None,
        preprocess: bool = True
    ) -> Dict[str, Any]:
        """
        Process image bytes and extract text.
        
        Args:
            image_bytes: Raw image bytes
            languages: Optional list of language codes
            preprocess: Whether to preprocess the image
            
        Returns:
            OCR results with text and metadata
        """
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Extract text
            ocr_result = self.extract_text(image, languages, preprocess)
            
            # Detect language if text was extracted
            if ocr_result['text']:
                language_result = self.detect_language(ocr_result['text'])
                ocr_result['detected_languages'] = language_result
            else:
                ocr_result['detected_languages'] = {
                    'primary_language': 'none',
                    'confidence': 0.0,
                    'all_languages': []
                }
            
            return ocr_result
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process image: {str(e)}"
            )
    
    async def process_base64_image(
        self,
        base64_string: str,
        languages: Optional[List[str]] = None,
        preprocess: bool = True
    ) -> Dict[str, Any]:
        """
        Process base64 encoded image and extract text.
        
        Args:
            base64_string: Base64 encoded image
            languages: Optional list of language codes
            preprocess: Whether to preprocess the image
            
        Returns:
            OCR results with text and metadata
        """
        try:
            # Decode base64 to bytes
            image_bytes = base64.b64decode(base64_string)
            
            # Process the image
            return await self.process_image_bytes(image_bytes, languages, preprocess)
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process base64 image: {str(e)}"
            )

# Global OCR service instance
ocr_service = OCRService()
