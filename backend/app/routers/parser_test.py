"""
Test router for Parser Service - allows testing document parsing operations via SwaggerUI.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Optional, Dict, Any
from ..services.parser_service import parser_service
from ..services.storage_service import storage_service

router = APIRouter(
    prefix="/api/parser-test",
    tags=["Parser Test"],
    responses={404: {"description": "Not found"}},
)

@router.post("/parse-pdf")
async def parse_pdf_document(
    file: UploadFile = File(..., description="PDF file to parse")
) -> Dict[str, Any]:
    """
    Parse a PDF document and extract text, tables, and image metadata.
    
    **What this does:**
    - Extracts text from all pages
    - Detects and converts tables to structured text
    - Identifies images with position and size metadata
    - Provides page-by-page analysis
    
    **Returns:**
    - Full extracted text
    - Text organized by page
    - Table data in readable format
    - Image metadata (positions, sizes, filenames)
    - Document statistics and metadata
    
    **Supported formats:** PDF files only
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400, 
                detail="Only PDF files are supported for this endpoint"
            )
        
        # Read file content
        file_bytes = await file.read()
        
        # Parse the PDF
        result = await parser_service.parse_pdf(file_bytes, file.filename)
        
        return {
            "success": True,
            "message": "PDF parsed successfully",
            "data": result
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

@router.post("/test-pdf-images-pymupdf")
async def test_pdf_images_pymupdf(file: UploadFile = File(...)):
    """
    Test PyMuPDF-based PDF image extraction with Firebase Storage upload.
    
    This endpoint:
    1. Extracts images from PDF using PyMuPDF
    2. Generates SHA256 hashes for deduplication
    3. Uploads images to Firebase Storage
    4. Returns metadata with signed URLs (no raw bytes)
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Read file content
        content = await file.read()
        
        # Extract images using PyMuPDF (includes raw bytes temporarily)
        images = parser_service._extract_images_with_pymupdf(content)
        
        # Process and upload images to Firebase Storage
        processed_images = await storage_service.process_and_upload_images(images)
        
        # Create summary
        summary = {
            "total_images": len(processed_images),
            "images_uploaded": sum(1 for img in processed_images if img.get("signed_url")),
            "images_deduplicated": sum(1 for img in processed_images if img.get("deduplicated", False)),
            "formats_found": list(set(img.get("format", "unknown") for img in processed_images)),
            "pages_with_images": list(set(img.get("page", 0) for img in processed_images))
        }
        
        return {
            "status": "success",
            "filename": file.filename,
            "summary": summary,
            "images": processed_images  # Now contains metadata + URLs, no raw bytes
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PyMuPDF image extraction failed: {str(e)}")

@router.post("/parse-docx")
async def parse_docx_document(
    file: UploadFile = File(..., description="DOCX file to parse")
) -> Dict[str, Any]:
    """
    Parse a DOCX document and extract text, tables, and images.
    
    **What this does:**
    - Extracts text from all paragraphs with style information
    - Detects and converts tables to structured text
    - Extracts embedded images as base64 data
    - Preserves document structure and formatting info
    
    **Returns:**
    - Full extracted text
    - Paragraphs with style information
    - Table data in readable format
    - Embedded images as base64 data
    - Document statistics and metadata
    
    **Supported formats:** DOCX files only
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.docx'):
            raise HTTPException(
                status_code=400, 
                detail="Only DOCX files are supported for this endpoint"
            )
        
        # Read file content
        file_bytes = await file.read()
        
        # Parse the DOCX
        result = await parser_service.parse_docx(file_bytes, file.filename)
        
        return {
            "success": True,
            "message": "DOCX parsed successfully",
            "data": result
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse DOCX: {str(e)}")

@router.post("/parse-excel")
async def parse_excel_document(
    file: UploadFile = File(..., description="Excel file to parse (.xlsx or .xls)")
) -> Dict[str, Any]:
    """
    Parse an Excel document and extract data from all sheets.
    
    **What this does:**
    - Extracts data from all sheets in the workbook
    - Converts each sheet to structured text format
    - Provides column names and data types
    - Shows sample data from each sheet
    - Handles both .xlsx and .xls formats
    
    **Returns:**
    - Full extracted text from all sheets
    - Sheet-by-sheet data with statistics
    - Column information and data types
    - Sample data rows from each sheet
    - Workbook metadata and statistics
    
    **Supported formats:** .xlsx and .xls files
    """
    try:
        # Validate file type
        if not (file.filename.lower().endswith('.xlsx') or file.filename.lower().endswith('.xls')):
            raise HTTPException(
                status_code=400, 
                detail="Only Excel files (.xlsx, .xls) are supported for this endpoint"
            )
        
        # Read file content
        file_bytes = await file.read()
        
        # Parse the Excel file
        result = await parser_service.parse_excel(file_bytes, file.filename)
        
        return {
            "success": True,
            "message": "Excel file parsed successfully",
            "data": result
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Excel: {str(e)}")

@router.post("/document-info")
async def get_document_info(
    file: UploadFile = File(..., description="Document file to analyze")
) -> Dict[str, Any]:
    """
    Get basic document information without full parsing.
    
    **What this does:**
    - Identifies document type from file extension
    - Gets basic metadata (pages, file size, etc.)
    - Checks if document type is supported
    - Fast operation for document validation
    
    **Use cases:**
    - Validate uploaded files before processing
    - Get quick document overview
    - Check file compatibility
    
    **Supported formats:** PDF (more formats coming in future steps)
    """
    try:
        # Read file content
        file_bytes = await file.read()
        
        # Get document info
        result = await parser_service.get_document_info(file_bytes, file.filename)
        
        return {
            "success": True,
            "message": "Document info retrieved successfully",
            "data": result
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get document info: {str(e)}")

@router.get("/test-connection")
async def test_parser_connection() -> Dict[str, Any]:
    """
    Test the Parser Service dependencies and configuration.
    
    **What this tests:**
    - pdfplumber library availability
    - Basic PDF processing capability
    - Parser service initialization
    
    **Returns:**
    - Service status and available parsers
    - Dependency versions
    - Supported document types
    """
    try:
        import pdfplumber
        import PIL
        
        # Test basic functionality with a minimal PDF-like operation
        test_result = {
            "service": "Parser Service",
            "status": "connected",
            "available_parsers": ["PDF"],
            "dependencies": {
                "pdfplumber": getattr(pdfplumber, '__version__', 'unknown'),
                "PIL": getattr(PIL, '__version__', 'unknown')
            },
            "supported_formats": [".pdf"],
            "coming_soon": [".docx", ".xlsx", ".xls"]
        }
        
        return {
            "success": True,
            "message": "Parser Service connection successful",
            "data": test_result
        }
        
    except ImportError as e:
        return {
            "success": False,
            "message": "Parser Service connection failed - missing dependencies",
            "error": f"Import error: {str(e)}"
        }
    except Exception as e:
        return {
            "success": False,
            "message": "Parser Service connection failed",
            "error": str(e)
        }

@router.get("/supported-formats")
async def get_supported_formats() -> Dict[str, Any]:
    """
    Get list of currently supported document formats and their capabilities.
    
    **Returns:**
    - Supported file extensions
    - Parser capabilities for each format
    - Processing features available
    """
    try:
        formats = {
            "pdf": {
                "extensions": [".pdf"],
                "parser": "pdfplumber",
                "capabilities": [
                    "Text extraction from all pages",
                    "Table detection and extraction", 
                    "Image metadata extraction",
                    "Page-by-page analysis",
                    "Document statistics and metadata"
                ],
                "status": "implemented",
                "endpoint": "/api/parser-test/parse-pdf"
            },
            "docx": {
                "extensions": [".docx"],
                "parser": "python-docx",
                "capabilities": [
                    "Text extraction with style information",
                    "Embedded image extraction (base64)",
                    "Table extraction and conversion",
                    "Paragraph structure preservation",
                    "Document metadata analysis"
                ],
                "status": "implemented",
                "endpoint": "/api/parser-test/parse-docx"
            },
            "excel": {
                "extensions": [".xlsx", ".xls"],
                "parser": "pandas/openpyxl",
                "capabilities": [
                    "Multi-sheet data extraction",
                    "Column name and data type detection",
                    "Sample data preview",
                    "Sheet statistics and metadata",
                    "Structured text conversion"
                ],
                "status": "implemented",
                "endpoint": "/api/parser-test/parse-excel"
            }
        }
        
        return {
            "success": True,
            "message": "Supported formats retrieved successfully",
            "data": {
                "formats": formats,
                "total_supported": len([f for f in formats.values() if f["status"] == "implemented"]),
                "total_planned": len([f for f in formats.values() if f["status"] == "planned"])
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get supported formats: {str(e)}")
