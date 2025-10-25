"""
Item Generation API Router - Generate collection items from purchase orders and line sheets.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from ..services.item_generation_service import item_generation_service
from ..utils.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["Item Generation"],
    responses={404: {"description": "Not found"}},
)


@router.post("/collections/{collection_id}/items/generate", status_code=status.HTTP_200_OK)
async def generate_items_for_collection(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Generate collection items from purchase order and line sheet.
    
    **Process:**
    1. Fetch purchase order document
    2. Parse purchase order (Excel)
    3. Identify columns with LLM (SKU, color, size, quantity)
    4. Extract SKU data from PO
    5. Enrich from line sheet (product names, prices, origin)
    6. Generate item objects with auto-generated IDs
    7. Save to Firestore with duplicate detection
    
    **Requirements:**
    - Collection must have a purchase order document uploaded
    - Collection must have a line sheet document uploaded
    - Line sheet must have structured_products extracted
    
    **Duplicate Detection:**
    - Items are deduplicated by content hash (SKU + color_code)
    - Re-running generation will skip existing items
    
    **Returns:**
    - success: Boolean indicating if generation succeeded
    - items: List of generated item objects
    - stats: Statistics about the generation process
      - po_items_extracted: Number of items found in PO
      - items_enriched: Number of items matched with line sheet
      - items_unmatched: Number of items not found in line sheet
      - final_items_generated: Total items generated
      - items_created: Number of new items saved
      - items_skipped: Number of duplicate items skipped
    
    **Errors:**
    - 404: Collection not found
    - 400: Missing purchase order or line sheet
    - 500: Generation failed
    """
    try:
        logger.info(f"Generating items for collection: {collection_id}")
        
        # Call item generation service
        result = await item_generation_service.generate_items_for_collection(collection_id)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Item generation failed')
            )
        
        logger.info(f"Successfully generated items for collection {collection_id}: {result.get('stats')}")
        return result
        
    except ValueError as e:
        # Missing documents or validation errors
        logger.error(f"Validation error generating items for collection {collection_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error generating items for collection {collection_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate items: {str(e)}"
        )
