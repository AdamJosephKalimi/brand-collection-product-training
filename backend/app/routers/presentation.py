"""
Presentation Generation Router

API endpoints for generating PowerPoint presentations from collection data.
"""

import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from io import BytesIO

from ..utils.auth import get_current_user
from ..services.presentation_generation_service import presentation_generation_service
from ..services.collection_service import collection_service
from ..services.brand_service import brand_service
from ..services.firebase_service import firebase_service

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
    slide_aspect_ratio: str = Query(
        default="16:9",
        description="Slide aspect ratio: '4:3' (standard) or '16:9' (widescreen)"
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

        # Validate slide_aspect_ratio
        if slide_aspect_ratio not in ["4:3", "16:9"]:
            raise HTTPException(
                status_code=400,
                detail=f"slide_aspect_ratio must be '4:3' or '16:9'. Got: {slide_aspect_ratio}"
            )
        
        logger.info(f"Generating presentation for collection: {collection_id}, user: {user_id}, products_per_slide: {products_per_slide}")

        # Fetch brand typography settings
        collection = await collection_service.get_collection(collection_id, user_id)
        deck_typography = None
        if collection and collection.brand_id:
            try:
                brand = await brand_service.get_brand(collection.brand_id, user_id)
                if brand and hasattr(brand, 'deck_typography') and brand.deck_typography:
                    dt = brand.deck_typography
                    if isinstance(dt, dict):
                        deck_typography = dt
                    else:
                        deck_typography = dt.model_dump(exclude_none=True)
                    logger.info(f"Brand typography for presentation: {deck_typography}")
            except Exception as e:
                logger.warning(f"Could not fetch brand typography: {e}")

        # Read deck language from collection settings
        selected_language = "en"
        if collection and collection.settings:
            selected_language = collection.settings.selected_language or "en"

        # Generate presentation
        download_url = await presentation_generation_service.generate_presentation(
            collection_id=collection_id,
            user_id=user_id,
            products_per_slide=products_per_slide,
            slide_aspect_ratio=slide_aspect_ratio,
            deck_typography=deck_typography,
            selected_language=selected_language
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


@router.get("/presentations")
async def list_all_presentations(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List all generated presentations for the current user.
    
    Returns presentations grouped by brand, with collection and presentation metadata.
    Only returns collections that have a generated presentation.
    
    **Returns:**
    ```json
    {
        "brands": [
            {
                "brand_id": "...",
                "brand_name": "...",
                "brand_logo_url": "...",
                "decks": [
                    {
                        "collection_id": "...",
                        "collection_name": "...",
                        "generated_at": "...",
                        "slide_count": 24,
                        "product_count": 89,
                        "download_url": "..."
                    }
                ]
            }
        ]
    }
    ```
    """
    try:
        user_id = current_user["uid"]
        logger.info(f"Fetching all presentations for user: {user_id}")
        
        # Get all brands for the user
        brands = await brand_service.get_user_brands(user_id)
        
        result = {"brands": []}
        
        for brand in brands:
            brand_id = brand.brand_id
            brand_name = brand.name or "Unknown Brand"
            brand_logo_url = brand.logo_url
            
            # Get all collections for this brand
            collections = await collection_service.get_brand_collections(brand_id, user_id)
            
            # Filter to collections with presentations
            decks = []
            for collection in collections:
                presentation = collection.presentation
                if presentation and presentation.get("generated_at"):
                    decks.append({
                        "collection_id": collection.collection_id,
                        "collection_name": collection.name,
                        "season": collection.season,
                        "year": collection.year,
                        "generated_at": presentation.get("generated_at"),
                        "slide_count": presentation.get("slide_count", 0),
                        "product_count": collection.stats.total_products if collection.stats else 0,
                        "download_url": presentation.get("download_url"),
                        "storage_path": presentation.get("storage_path")
                    })
            
            # Only include brand if it has decks
            if decks:
                # Sort decks by generated_at (most recent first)
                decks.sort(key=lambda x: x.get("generated_at") or "", reverse=True)
                result["brands"].append({
                    "brand_id": brand_id,
                    "brand_name": brand_name,
                    "brand_logo_url": brand_logo_url,
                    "decks": decks
                })
        
        logger.info(f"Found {len(result['brands'])} brands with presentations")
        return result
        
    except Exception as e:
        logger.error(f"Error listing presentations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list presentations: {str(e)}")


@router.get("/collections/{collection_id}/presentation/download")
async def download_presentation(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Download the generated presentation for a collection.
    
    Returns the .pptx file as a streaming response for browser download.
    
    **Parameters:**
    - collection_id: ID of the collection
    
    **Returns:**
    - StreamingResponse with the .pptx file
    """
    try:
        user_id = current_user["uid"]
        logger.info(f"Downloading presentation for collection: {collection_id}, user: {user_id}")
        
        # Validate collection ownership
        if not await collection_service.validate_collection_ownership(collection_id, user_id):
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to access this presentation"
            )
        
        # Get collection to find presentation metadata
        collection = await collection_service.get_collection(collection_id, user_id)
        
        if not collection.presentation:
            raise HTTPException(
                status_code=404,
                detail="No presentation found for this collection. Generate one first."
            )
        
        storage_path = collection.presentation.get("storage_path")
        if not storage_path:
            # Fallback to default path
            storage_path = f"presentations/{collection_id}/presentation.pptx"

        # Download from Firebase Storage
        bucket = firebase_service.bucket
        blob = bucket.blob(storage_path)

        if not blob.exists():
            raise HTTPException(
                status_code=404,
                detail="Presentation file not found in storage"
            )

        # Download to bytes
        file_bytes = blob.download_as_bytes()

        # Create filename for download
        collection_name = collection.name.replace(" ", "_")
        filename = f"{collection_name}_Training_Deck.pptx"
        
        # Return as streaming response
        return StreamingResponse(
            BytesIO(file_bytes),
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-store",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading presentation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download presentation: {str(e)}")
