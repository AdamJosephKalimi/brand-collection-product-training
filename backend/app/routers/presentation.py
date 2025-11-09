"""
Presentation Generation Router

API endpoints for generating PowerPoint presentations from collection data.
"""

import logging
from typing import Dict, Any, Literal
from fastapi import APIRouter, Depends, HTTPException, Query

from ..utils.auth import get_current_user
from ..services.presentation_generation_service import presentation_generation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Presentation Generation"])


@router.post("/collections/{collection_id}/presentation/generate")
async def generate_presentation(
    collection_id: str,
    products_per_slide: int = Query(
        default=1,
        ge=1,
        le=4,
        description="Number of products to display per slide (1, 2, 3, or 4)"
    ),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generate PowerPoint presentation for a collection.
    
    Creates a presentation with:
    - Intro slides (from LLM-generated content)
    - Product slides (from collection items) [Coming soon]
    
    **Parameters:**
    - collection_id: ID of the collection to generate presentation for
    - products_per_slide: Number of products per slide (1, 2, or 4). Default: 1
    
    **Returns:**
    - download_url: Public URL to download the generated .pptx file
    - slide_count: Number of slides in the presentation
    - generated_at: Timestamp of generation
    
    **Example Response:**
    ```json
    {
        "download_url": "https://storage.googleapis.com/...",
        "slide_count": 2,
        "generated_at": "2025-11-08T14:30:00",
        "message": "Presentation generated successfully"
    }
    ```
    """
    try:
        user_id = current_user["uid"]
        
        # Validate products_per_slide
        if products_per_slide not in [1, 2, 3, 4]:
            raise HTTPException(
                status_code=400, 
                detail=f"products_per_slide must be 1, 2, 3, or 4. Got: {products_per_slide}"
            )
        
        logger.info(f"Generating presentation for collection: {collection_id}, user: {user_id}, products_per_slide: {products_per_slide}")
        
        # Generate presentation
        download_url = await presentation_generation_service.generate_presentation(
            collection_id=collection_id,
            user_id=user_id,
            products_per_slide=products_per_slide
        )
        
        # Get slide count from the service
        slide_count = len(presentation_generation_service.prs.slides) if presentation_generation_service.prs else 0
        
        return {
            "download_url": download_url,
            "slide_count": slide_count,
            "generated_at": presentation_generation_service.db.collection('collections').document(collection_id).get().to_dict().get('presentation', {}).get('generated_at'),
            "message": "Presentation generated successfully"
        }
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    
    except Exception as e:
        logger.error(f"Error generating presentation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate presentation: {str(e)}")
