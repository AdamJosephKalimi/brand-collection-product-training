from fastapi import APIRouter, HTTPException, status
from ..services.pinecone_service import pinecone_service

router = APIRouter(prefix="/pinecone", tags=["Pinecone"])

@router.get("/test-connection")
async def test_pinecone_connection():
    """Test Pinecone connection and OpenAI embedding"""
    try:
        result = await pinecone_service.test_connection()
        
        if result["status"] == "success":
            return {
                "status": "success",
                "message": "Pinecone connection successful",
                "details": result
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Pinecone connection failed: {result.get('error', 'Unknown error')}"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pinecone test failed: {str(e)}"
        )

@router.post("/test-embedding")
async def test_embedding_generation(text: str = "This is a test document about fashion products"):
    """Test OpenAI embedding generation"""
    try:
        embedding = await pinecone_service.generate_embedding(text)
        
        return {
            "status": "success",
            "message": "Embedding generated successfully",
            "text": text,
            "embedding_dimensions": len(embedding),
            "model": "text-embedding-3-small",
            "sample_values": embedding[:5]  # First 5 values for verification
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding generation failed: {str(e)}"
        )
