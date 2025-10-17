"""
Category Generation Router - Endpoints for generating product categories from line sheets.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any
from ..services.category_generation_service import category_generation_service
from ..utils.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/collections/{collection_id}/categories",
    tags=["Category Generation"],
    responses={404: {"description": "Not found"}},
)


@router.post("/generate")
async def generate_categories(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Generate product categories from line sheet documents using AI.
    
    **Process:**
    1. Fetches all line sheet documents for the collection
    2. Downloads and parses documents (PDF, Excel, CSV)
    3. Extracts product information from parsed text
    4. Uses GPT-4 to analyze products and generate category hierarchy
    
    **Parameters:**
    - collection_id: Collection ID (from URL path)
    
    **Returns:**
    - success: Boolean indicating if generation succeeded
    - categories: Array of category objects with name and subcategories
    - product_count: Number of products analyzed
    - error: Error message if generation failed
    
    **Requirements:**
    - User must be authenticated
    - Collection must have at least one line sheet document uploaded
    
    **Example Response:**
    ```json
    {
        "success": true,
        "categories": [
            {
                "name": "Dresses",
                "subcategories": ["Maxi Dresses", "Mini Dresses", "Midi Dresses"]
            },
            {
                "name": "Tops",
                "subcategories": ["T-Shirts", "Blouses", "Sweaters"]
            }
        ],
        "product_count": 45
    }
    ```
    
    **Error Cases:**
    - 404: Collection not found or no line sheets uploaded
    - 500: Document parsing or LLM generation failed
    """
    try:
        logger.info(f"Generating categories for collection {collection_id} by user {current_user['uid']}")
        
        # Call category generation service
        result = await category_generation_service.generate_categories_for_collection(collection_id)
        
        # Check if generation was successful
        if not result.get('success'):
            error_msg = result.get('error', 'Unknown error')
            
            # Determine appropriate status code based on error
            if 'No line sheet documents found' in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=error_msg
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=error_msg
                )
        
        logger.info(f"Successfully generated {len(result.get('categories', []))} categories for collection {collection_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating categories for collection {collection_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate categories: {str(e)}"
        )


@router.get("/info")
async def get_category_generation_info(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get information about the category generation service.
    
    **Returns:**
    - Service capabilities and requirements
    """
    return {
        "service": "Category Generation",
        "description": "Analyzes line sheet documents and generates product categories using AI",
        "requirements": [
            "At least one line sheet document must be uploaded",
            "Supported formats: PDF, Excel (.xlsx, .xls), CSV"
        ],
        "process": [
            "1. Fetch line sheet documents from collection",
            "2. Download and parse documents",
            "3. Extract product information",
            "4. Generate categories using GPT-4"
        ],
        "output": {
            "categories": "Array of category objects",
            "each_category": {
                "name": "Category name",
                "subcategories": "Array of subcategory names"
            }
        }
    }
