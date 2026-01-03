"""
Collection Management API Router - CRUD operations for collections.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from ..models.collection import CollectionCreate, CollectionUpdate, CollectionResponse
from ..services.collection_service import collection_service
from ..utils.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["Collection Management"],
    responses={404: {"description": "Not found"}},
)


@router.post("/brands/{brand_id}/collections", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    brand_id: str,
    collection_data: CollectionCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> CollectionResponse:
    """
    Create a new collection for a brand.
    
    **Parameters:**
    - brand_id: Parent brand ID (from URL)
    
    **Required:**
    - name: Collection name (1-100 characters)
    
    **Optional:**
    - season: Spring/Summer, Fall/Winter, Resort, Pre-Fall, Year-Round
    - year: Collection year (2000-2100)
    - description: Collection description (max 1000 characters)
    - theme: Theme name, mood boards, color palette, keywords
    - settings: Language preferences, citation style
    - categories: Product categories with display order
    
    **Validations:**
    - User must own the brand
    - Collection name must be unique within the brand
    
    **Returns:**
    - Created collection with generated ID and initialized statistics
    - Status defaults to "draft", visibility to "private"
    - RAG settings initialized on first document upload
    """
    try:
        user_id = current_user["uid"]
        # Override brand_id from URL path
        collection_data.brand_id = brand_id
        return await collection_service.create_collection(brand_id, user_id, collection_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_collection endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create collection"
        )


@router.get("/brands/{brand_id}/collections", response_model=List[CollectionResponse])
async def get_brand_collections(
    brand_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[CollectionResponse]:
    """
    Get all collections for a brand.
    
    **Parameters:**
    - brand_id: Parent brand ID
    
    **Returns:**
    - List of collections for the brand
    - Includes all statuses (draft, published, archived)
    
    **Validations:**
    - User must own the brand
    """
    try:
        user_id = current_user["uid"]
        return await collection_service.get_brand_collections(brand_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_brand_collections endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve collections"
        )


@router.get("/collections/{collection_id}", response_model=CollectionResponse)
async def get_collection(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> CollectionResponse:
    """
    Get a specific collection by ID.
    
    **Parameters:**
    - collection_id: Unique collection identifier
    
    **Validations:**
    - User must own the collection's brand
    
    **Returns:**
    - Collection details including all metadata and statistics
    
    **Errors:**
    - 403: User doesn't own the collection's brand
    - 404: Collection not found
    """
    try:
        user_id = current_user["uid"]
        return await collection_service.get_collection(collection_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_collection endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve collection"
        )


@router.put("/collections/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: str,
    update_data: CollectionUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> CollectionResponse:
    """
    Update a collection's information.
    
    **Parameters:**
    - collection_id: Unique collection identifier
    
    **Updateable Fields:**
    - All fields from collection creation
    - status: Change between draft/published/archived
    - visibility: Change between private/team/public
    - rag_settings: Configure AI behavior (auto-initialized on first document)
    - workflow: Approval settings
    
    **Validations:**
    - User must own the collection's brand
    - If updating name, must be unique within the brand
    
    **Special Behaviors:**
    - Publishing sets published_at timestamp
    - Archiving soft-deletes the collection
    
    **Returns:**
    - Updated collection with new timestamp
    
    **Errors:**
    - 400: Collection name already exists
    - 403: User doesn't own the collection's brand
    - 404: Collection not found
    """
    try:
        user_id = current_user["uid"]
        return await collection_service.update_collection(collection_id, user_id, update_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_collection endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update collection"
        )


@router.patch("/collections/{collection_id}", response_model=CollectionResponse)
async def patch_collection(
    collection_id: str,
    update_data: CollectionUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> CollectionResponse:
    """
    Partially update a collection (e.g., update only categories).
    
    **Parameters:**
    - collection_id: Unique collection identifier
    
    **Updateable Fields:**
    - Any field from CollectionUpdate model
    - Commonly used for updating categories after generation
    
    **Example - Update Categories:**
    ```json
    {
        "categories": [
            {
                "name": "Dresses",
                "product_count": 0,
                "display_order": 1,
                "subcategories": [
                    {"name": "Maxi Dresses", "product_count": 0, "display_order": 1},
                    {"name": "Mini Dresses", "product_count": 0, "display_order": 2}
                ]
            }
        ]
    }
    ```
    
    **Validations:**
    - User must own the collection's brand
    
    **Returns:**
    - Updated collection
    
    **Errors:**
    - 403: User doesn't own the collection's brand
    - 404: Collection not found
    """
    try:
        user_id = current_user["uid"]
        return await collection_service.update_collection(collection_id, user_id, update_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in patch_collection endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to patch collection"
        )


@router.delete("/collections/{collection_id}", response_model=Dict[str, str])
async def delete_collection(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete a collection (soft delete).
    
    **Parameters:**
    - collection_id: Unique collection identifier
    
    **Behavior:**
    - Sets collection is_active to False
    - Collection data is retained but hidden from queries
    - Updates brand's collection count
    
    **Validations:**
    - User must own the collection's brand
    
    **Returns:**
    - Success message
    
    **Errors:**
    - 403: User doesn't own the collection's brand
    - 404: Collection not found
    """
    try:
        user_id = current_user["uid"]
        return await collection_service.delete_collection(collection_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_collection endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete collection"
        )
