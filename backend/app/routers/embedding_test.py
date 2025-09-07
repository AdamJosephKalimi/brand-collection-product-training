"""
Test router for Embedding Service - allows testing embedding generation via SwaggerUI.
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Optional
from ..services.embedding_service import get_embedding_service

router = APIRouter(
    prefix="/api/embedding-test",
    tags=["Embedding Test"],
    responses={404: {"description": "Not found"}},
)

@router.post("/generate-embeddings")
async def generate_embeddings(
    texts: List[str] = Body(
        ...,
        example=["This is the first text to embed.", "This is the second text.", "And a third one."],
        description="List of texts to generate embeddings for"
    ),
    include_metadata: bool = False
) -> Dict[str, Any]:
    """
    Generate embeddings for multiple texts using OpenAI's text-embedding-3-small model.
    
    **Features:**
    - Batch processing (up to 2048 texts per API call)
    - Automatic retry on rate limits
    - Cost tracking
    - Token counting
    
    **Parameters:**
    - texts: List of texts to embed
    - include_metadata: Whether to include detailed metadata
    
    **Returns:**
    - Embeddings (1536 dimensions each)
    - Cost information
    - Processing statistics
    """
    try:
        service = get_embedding_service()
        
        # Generate embeddings
        results = await service.generate_embeddings_batch(texts)
        
        # Get cost report
        cost_report = service.get_cost_report()
        
        response = {
            "success": True,
            "total_texts": len(texts),
            "embeddings_generated": len(results),
            "cost_info": {
                "total_cost_usd": cost_report["current_session"]["total_cost_usd"],
                "total_tokens": cost_report["current_session"]["total_tokens"],
                "batches_used": cost_report["current_session"]["total_batches"]
            }
        }
        
        if include_metadata:
            response["embeddings"] = results
        else:
            # Just return embedding dimensions for brevity
            response["embedding_dimensions"] = [r["dimensions"] for r in results]
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

@router.post("/generate-chunk-embeddings")
async def generate_chunk_embeddings(
    chunks: List[Dict[str, Any]] = Body(
        ...,
        example=[
            {
                "chunk_id": "chunk-1",
                "text": "This is the first chunk of text that needs an embedding.",
                "metadata": {
                    "chunk_index": 0,
                    "document_id": "doc-123"
                }
            },
            {
                "chunk_id": "chunk-2",
                "text": "This is the second chunk with different content.",
                "metadata": {
                    "chunk_index": 1,
                    "document_id": "doc-123"
                }
            }
        ],
        description="List of chunks from chunking service"
    )
) -> Dict[str, Any]:
    """
    Generate embeddings for text chunks (integration with chunking service).
    
    **Input Format:**
    Each chunk should have:
    - chunk_id: Unique identifier
    - text: The text content to embed
    - metadata: Optional metadata (chunk_index, document_id, etc.)
    
    **Returns:**
    - Enhanced chunks with embeddings
    - Cost information
    - Processing statistics
    """
    try:
        service = get_embedding_service()
        
        # Generate embeddings for chunks
        enhanced_chunks = await service.generate_embeddings_for_chunks(chunks)
        
        # Get cost report
        cost_report = service.get_cost_report()
        
        # Prepare response (exclude actual embeddings for brevity)
        chunks_summary = []
        for chunk in enhanced_chunks:
            chunks_summary.append({
                "chunk_id": chunk.get("chunk_id"),
                "has_embedding": "embedding" in chunk,
                "embedding_dimensions": chunk.get("embedding_dimensions"),
                "embedding_model": chunk.get("embedding_model")
            })
        
        return {
            "success": True,
            "total_chunks": len(chunks),
            "embeddings_generated": len(enhanced_chunks),
            "chunks_summary": chunks_summary,
            "cost_info": {
                "total_cost_usd": cost_report["current_session"]["total_cost_usd"],
                "total_tokens": cost_report["current_session"]["total_tokens"],
                "batches_used": cost_report["current_session"]["total_batches"],
                "processing_time_seconds": cost_report["current_session"]["processing_time_seconds"]
            },
            "model_info": cost_report["model_info"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chunk embedding generation failed: {str(e)}")

@router.post("/generate-single-embedding")
async def generate_single_embedding(
    text: str = Body(
        ...,
        example="This is a single text that needs an embedding.",
        description="Single text to generate embedding for"
    )
) -> Dict[str, Any]:
    """
    Generate embedding for a single text.
    
    **Use Case:**
    - Query embedding for RAG search
    - Testing individual text processing
    
    **Returns:**
    - Embedding vector (1536 dimensions)
    - Token count
    - Cost information
    """
    try:
        service = get_embedding_service()
        
        # Count tokens
        token_count = service.count_tokens(text)
        
        # Generate embedding
        result = await service.generate_single_embedding(text)
        
        # Get cost report
        cost_report = service.get_cost_report()
        
        return {
            "success": True,
            "text_length": len(text),
            "token_count": token_count,
            "embedding_dimensions": result["dimensions"],
            "embedding_preview": result["embedding"][:10],  # First 10 values only
            "cost_info": {
                "cost_usd": cost_report["current_session"]["total_cost_usd"],
                "model": cost_report["model_info"]["model"]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Single embedding generation failed: {str(e)}")

@router.get("/cost-report")
async def get_cost_report() -> Dict[str, Any]:
    """
    Get detailed cost report for embedding generation.
    
    **Admin Only**: This endpoint is for application administrators to track OpenAI API costs.
    
    **Returns:**
    - Current session costs
    - Token usage
    - Request statistics
    - Model information
    """
    try:
        service = get_embedding_service()
        report = service.get_cost_report()
        
        return {
            "success": True,
            "report": report,
            "summary": {
                "total_cost_usd": f"${report['current_session']['total_cost_usd']:.4f}",
                "total_tokens": f"{report['current_session']['total_tokens']:,}",
                "total_requests": report['current_session']['total_requests'],
                "average_cost_per_request": f"${report['current_session']['total_cost_usd'] / max(1, report['current_session']['total_requests']):.6f}"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cost report: {str(e)}")

@router.post("/reset-cost-tracking")
async def reset_cost_tracking() -> Dict[str, Any]:
    """
    Reset cost tracking for a new session.
    
    **Admin Only**: Clears current session costs and starts fresh tracking.
    
    **Returns:**
    - Confirmation of reset
    """
    try:
        service = get_embedding_service()
        service.reset_cost_tracking()
        
        return {
            "success": True,
            "message": "Cost tracking reset successfully",
            "new_session_started": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset cost tracking: {str(e)}")

@router.post("/test-batch-processing")
async def test_batch_processing(
    num_texts: int = 5000,
    text_length: int = 100
) -> Dict[str, Any]:
    """
    Test batch processing efficiency with synthetic data.
    
    **Parameters:**
    - num_texts: Number of texts to generate (default 5000)
    - text_length: Approximate length of each text (default 100)
    
    **Returns:**
    - Batch processing statistics
    - Cost comparison (batch vs individual)
    - Performance metrics
    """
    try:
        if num_texts > 10000:
            raise HTTPException(status_code=400, detail="Maximum 10000 texts for testing")
        
        service = get_embedding_service()
        
        # Generate synthetic texts
        texts = [f"This is test text number {i}. " * (text_length // 30) for i in range(num_texts)]
        
        # Calculate theoretical costs
        total_tokens = sum(service.count_tokens(text) for text in texts)
        batch_cost = (total_tokens / 1_000_000) * 0.02
        individual_cost = batch_cost  # Same token cost, but more API calls
        
        # Prepare batches (don't actually call API in test)
        batches = service.prepare_batches(texts)
        
        return {
            "success": True,
            "test_configuration": {
                "num_texts": num_texts,
                "text_length": text_length
            },
            "batch_processing": {
                "num_batches": len(batches),
                "texts_per_batch": [len(batch) for batch in batches],
                "max_batch_size": service.MAX_BATCH_SIZE
            },
            "cost_analysis": {
                "total_tokens": total_tokens,
                "estimated_cost_usd": f"${batch_cost:.4f}",
                "api_calls_with_batching": len(batches),
                "api_calls_without_batching": num_texts,
                "efficiency_gain": f"{(num_texts / len(batches)):.1f}x fewer API calls"
            },
            "note": "This is a dry run - no actual API calls were made"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch processing test failed: {str(e)}")
