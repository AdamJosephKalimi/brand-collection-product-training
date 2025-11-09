"""
Intro Slides Router

API endpoints for generating intro slide content for fashion collection presentations.
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.services.intro_slide_generation_service import intro_slide_generation_service
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/collections/{collection_id}/intro-slides/generate",
    response_model=Dict[str, Any],
    summary="Generate Intro Slides",
    description="""
    Generate intro slide content for a collection presentation using LLM.
    
    **Generates up to 8 slide types based on collection settings:**
    1. Cover Page
    2. Brand Introduction
    3. Brand History
    4. Brand Values
    5. Brand Personality
    6. Flagship Stores & Experiences
    7. Core Collection & Signature Categories
    8. Product Categories
    
    **Returns:**
    - JSON with generated slides and metadata
    - Stores results in Firestore (collection.intro_slides)
    
    **Requirements:**
    - User must own the collection's brand
    - At least one slide type must be enabled in collection settings
    """,
    tags=["Intro Slides"]
)
async def generate_intro_slides(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Generate intro slides for a collection.
    
    **Parameters:**
    - collection_id: Unique collection identifier
    
    **Example Response:**
    ```json
    {
        "generated_at": "2025-11-04T20:30:00Z",
        "slides": [
            {
                "slide_type": "cover_page",
                "title": "Fall Winter 2025 FW25 Core",
                "subtitle": "R13",
                "content": {
                    "title": "Fall Winter 2025 FW25 Core",
                    "subtitle": "R13",
                    "tagline": "Contemporary American Luxury"
                }
            }
        ]
    }
    ```
    
    **Errors:**
    - 403: User doesn't own the collection's brand
    - 404: Collection not found
    - 500: Generation failed
    """
    try:
        user_id = current_user["uid"]
        logger.info(f"User {user_id} generating intro slides for collection {collection_id}")
        
        result = await intro_slide_generation_service.generate_intro_slides(collection_id, user_id)
        
        logger.info(f"Successfully generated {len(result.get('slides', []))} slides")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in generate_intro_slides endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate intro slides: {str(e)}"
        )
