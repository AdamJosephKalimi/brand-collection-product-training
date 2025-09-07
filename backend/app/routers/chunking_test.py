"""
Test router for Chunking Service - allows testing text chunking operations via SwaggerUI.
"""
from fastapi import APIRouter, HTTPException, Form, Body
from typing import Optional, Dict, Any, List
from ..services.chunking_service import chunking_service
import re

router = APIRouter(
    prefix="/api/chunking-test",
    tags=["Chunking Test"],
    responses={404: {"description": "Not found"}},
)

@router.post("/chunk-text")
async def chunk_text(
    text: str = Form(..., description="Text to chunk"),
    chunk_size: int = Form(500, description="Target chunk size in characters"),
    overlap: int = Form(100, description="Overlap between chunks in characters"),
    preserve_sentences: bool = Form(True, description="Preserve sentence boundaries"),
    clean_text: bool = Form(True, description="Clean and sanitize text"),
    merge_small_chunks: bool = Form(False, description="Merge chunks smaller than min_size"),
    min_chunk_size: int = Form(100, description="Minimum chunk size when merging is enabled"),
    language: str = Form("default", description="Language hint (default, chinese, japanese, arabic, thai)"),
    document_id: Optional[str] = Form(None, description="Optional document ID"),
    page_number: Optional[int] = Form(None, description="Optional page number"),
    section: Optional[str] = Form(None, description="Optional section identifier"),
    show_debug_info: bool = Form(False, description="Include debug information about processing")
) -> Dict[str, Any]:
    """
    Chunk text into optimized segments for embedding generation.
    
    **Features:**
    - Fixed-size chunks with configurable overlap
    - Sentence boundary preservation
    - Multi-language support
    - Automatic text sanitization (HTML/script removal)
    - Small chunk merging option
    - Positional metadata tracking
    
    **Parameters:**
    - chunk_size: Target size for each chunk (max 1000)
    - overlap: Characters to overlap between chunks
    - preserve_sentences: Try to break at sentence boundaries
    - clean_text: Remove HTML, scripts, and sanitize
    - merge_small_chunks: Automatically merge undersized chunks
    - language: Helps with sentence detection
    
    **Returns:**
    - Array of chunks with text and metadata
    - Statistics about the chunking operation
    - Optional debug info showing sanitization and sentence detection
    """
    try:
        # Store original text for debug info if requested
        original_text = text if show_debug_info else None
        
        # Create chunking service with specified parameters
        service = chunking_service.__class__(
            chunk_size=chunk_size,
            overlap=overlap,
            preserve_sentences=preserve_sentences,
            clean_text=clean_text
        )
        
        # Create chunks
        chunks = service.create_chunks(
            text=text,
            document_id=document_id,
            page_number=page_number,
            section=section,
            language=language
        )
        
        # Merge small chunks if requested
        if merge_small_chunks and chunks:
            chunks = service.merge_small_chunks(chunks, min_chunk_size)
        
        # Get statistics
        stats = service.get_chunk_statistics(chunks)
        
        response = {
            "success": True,
            "parameters": {
                "chunk_size": chunk_size,
                "overlap": overlap,
                "preserve_sentences": preserve_sentences,
                "clean_text": clean_text,
                "merge_small_chunks": merge_small_chunks,
                "language": language
            },
            "statistics": stats,
            "chunks": chunks
        }
        
        # Add debug information if requested
        if show_debug_info and original_text:
            # Show sanitization effects
            if clean_text:
                sanitized = service.sanitize_text(original_text)
                response["debug"] = {
                    "sanitization": {
                        "original_length": len(original_text),
                        "sanitized_length": len(sanitized),
                        "characters_removed": len(original_text) - len(sanitized),
                        "html_tags_found": len(re.findall(r'<[^>]+>', original_text))
                    }
                }
            
            # Show sentence boundaries detected
            if preserve_sentences:
                boundaries = service.detect_sentence_boundaries(text, language)
                response["debug"]["sentence_detection"] = {
                    "boundaries_found": len(boundaries),
                    "boundary_positions": boundaries[:10]  # First 10 only
                }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chunking failed: {str(e)}")

@router.post("/chunk-documents")
async def chunk_multiple_documents(
    documents: List[Dict[str, Any]] = Body(
        ...,
        example=[
            {
                "text": "This is the first document. It contains multiple sentences.",
                "document_id": "doc1",
                "page_number": 1,
                "section": "introduction"
            },
            {
                "text": "This is the second document. It also has content.",
                "document_id": "doc2",
                "page_number": 1,
                "section": "main"
            }
        ],
        description="List of documents with text and metadata"
    ),
    chunk_size: int = 500,
    overlap: int = 100,
    merge_small_chunks: bool = False,
    min_chunk_size: int = 100,
    language: str = "default"
) -> Dict[str, Any]:
    """
    Chunk multiple documents in a single batch operation.
    
    **Input Format:**
    Each document should have:
    - text: The document text to chunk
    - document_id: Optional document identifier
    - page_number: Optional page number
    - section: Optional section name
    
    **Parameters:**
    - chunk_size: Target size for chunks (default 500)
    - overlap: Overlap between chunks (default 100)
    - merge_small_chunks: Merge undersized chunks
    - language: Language hint for sentence detection
    
    **Returns:**
    - All chunks from all documents
    - Combined statistics
    - Chunks grouped by document
    """
    try:
        # Create chunking service
        service = chunking_service.__class__(
            chunk_size=chunk_size,
            overlap=overlap,
            preserve_sentences=True,
            clean_text=True
        )
        
        # Process all documents
        all_chunks = service.create_chunks_from_documents(documents, language)
        
        # Merge small chunks if requested
        if merge_small_chunks and all_chunks:
            all_chunks = service.merge_small_chunks(all_chunks, min_chunk_size)
        
        # Get statistics
        stats = service.get_chunk_statistics(all_chunks)
        
        # Group chunks by document
        chunks_by_doc = {}
        for chunk in all_chunks:
            doc_id = chunk["metadata"]["document_id"] or "unknown"
            if doc_id not in chunks_by_doc:
                chunks_by_doc[doc_id] = []
            chunks_by_doc[doc_id].append(chunk)
        
        return {
            "success": True,
            "total_documents": len(documents),
            "statistics": stats,
            "chunks_by_document": chunks_by_doc,
            "all_chunks": all_chunks
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document chunking failed: {str(e)}")

@router.get("/chunking-info")
async def get_chunking_info() -> Dict[str, Any]:
    """
    Get information about the chunking service configuration.
    
    **Returns:**
    - Default parameters
    - Supported languages
    - Limits and constraints
    """
    return {
        "success": True,
        "defaults": {
            "chunk_size": chunking_service.DEFAULT_CHUNK_SIZE,
            "overlap": chunking_service.DEFAULT_OVERLAP,
            "max_chunk_size": chunking_service.MAX_CHUNK_SIZE
        },
        "supported_languages": list(chunking_service.SENTENCE_ENDINGS.keys()),
        "features": [
            "Sentence boundary preservation",
            "Multi-language support",
            "HTML/script sanitization",
            "Unicode normalization",
            "Positional metadata tracking",
            "Small chunk merging",
            "Overlap configuration"
        ],
        "notes": {
            "chunk_size": "Target size in characters, actual size may vary to preserve sentences",
            "overlap": "Characters shared between consecutive chunks for context preservation",
            "language": "Helps optimize sentence detection for specific languages"
        }
    }
