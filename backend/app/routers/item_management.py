"""
Item Management API Router - CRUD operations for collection items.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
from ..models.item import ItemCreate, ItemUpdate, ItemResponse
from ..services.item_service import item_service
from ..utils.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/collections",
    tags=["Item Management"],
    responses={404: {"description": "Not found"}},
)


@router.post("/{collection_id}/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    collection_id: str,
    item_data: ItemCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> ItemResponse:
    """
    Create a new item in a collection.
    
    **Parameters:**
    - collection_id: Parent collection ID (from URL)
    
    **Required:**
    - product_name: Product name (1-200 characters)
    - sku: Stock keeping unit
    - category: Product category
    - currency: Currency code (USD, EUR, GBP, etc.)
    
    **Optional:**
    - base_sku: Base SKU without color code
    - subcategory: Product subcategory
    - gender: men, women, unisex, kids, boys, girls
    - color: Color name
    - color_code: Color code or identifier
    - description: Product description (max 2000 characters)
    - materials: List of materials
    - care_instructions: List of care instructions
    - process: List of manufacturing processes
    - origin: Country of origin
    - wholesale_price: Wholesale price
    - rrp: Recommended retail price
    - highlighted_item: Whether this is a featured item (default: false)
    - images: List of product images
    - sizes: Size to quantity mapping (e.g., {"S": 10, "M": 20})
    - tags: Product tags
    - source_document_id: Document this was extracted from
    - extraction_confidence: AI extraction confidence (0-1)
    
    **Validations:**
    - User must own the collection's brand
    
    **Automatic Updates:**
    - Adds item_id to collection's items array
    - Increments collection's total_products count
    - Updates category/subcategory product counts
    - Creates category/subcategory if they don't exist
    
    **Returns:**
    - Created item with generated ID and timestamps
    """
    try:
        user_id = current_user["uid"]
        # Override collection_id from URL path
        item_data.collection_id = collection_id
        return await item_service.create_item(collection_id, user_id, item_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_item endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create item"
        )


@router.get("/{collection_id}/items", response_model=List[ItemResponse])
async def get_collection_items(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    category: Optional[str] = Query(None, description="Filter by category"),
    highlighted_only: bool = Query(False, description="Only return highlighted items")
) -> List[ItemResponse]:
    """
    Get all items in a collection with optional filtering.
    
    **Parameters:**
    - collection_id: Parent collection ID
    
    **Query Parameters:**
    - category: Filter items by category (optional)
    - highlighted_only: If true, only return highlighted/featured items (default: false)
    
    **Returns:**
    - List of items in the collection
    - Empty list if no items match filters
    
    **Validations:**
    - User must own the collection's brand
    
    **Examples:**
    - Get all items: `GET /collections/{id}/items`
    - Get dresses only: `GET /collections/{id}/items?category=Dresses`
    - Get highlighted items: `GET /collections/{id}/items?highlighted_only=true`
    """
    try:
        user_id = current_user["uid"]
        return await item_service.get_collection_items(
            collection_id, 
            user_id, 
            category=category,
            highlighted_only=highlighted_only
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_collection_items endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve items"
        )


@router.get("/{collection_id}/items/{item_id}", response_model=ItemResponse)
async def get_item(
    collection_id: str,
    item_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> ItemResponse:
    """
    Get a specific item by ID.
    
    **Parameters:**
    - collection_id: Parent collection ID
    - item_id: Unique item identifier
    
    **Validations:**
    - User must own the collection's brand
    
    **Returns:**
    - Item details including all metadata, images, and sizes
    
    **Errors:**
    - 403: User doesn't own the collection's brand
    - 404: Item or collection not found
    """
    try:
        user_id = current_user["uid"]
        return await item_service.get_item(collection_id, item_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_item endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve item"
        )


@router.patch("/{collection_id}/items/{item_id}", response_model=ItemResponse)
async def partial_update_item(
    collection_id: str,
    item_id: str,
    update_data: ItemUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> ItemResponse:
    """
    Partially update an item (e.g., toggle highlight).
    
    **Parameters:**
    - collection_id: Parent collection ID
    - item_id: Unique item identifier
    
    **Use Cases:**
    - Toggle highlighted_item flag
    - Quick field updates without sending full object
    
    **Returns:**
    - Updated item
    """
    try:
        user_id = current_user["uid"]
        return await item_service.update_item(collection_id, item_id, user_id, update_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in partial_update_item endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update item"
        )


@router.put("/{collection_id}/items/{item_id}", response_model=ItemResponse)
async def update_item(
    collection_id: str,
    item_id: str,
    update_data: ItemUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> ItemResponse:
    """
    Update an item's information.
    
    **Parameters:**
    - collection_id: Parent collection ID
    - item_id: Unique item identifier
    
    **Updateable Fields:**
    - All fields from item creation
    - manual_review: Mark item as manually reviewed
    - reviewed_by: User ID who reviewed the item
    - reviewed_at: Review timestamp
    
    **Validations:**
    - User must own the collection's brand
    
    **Special Behaviors:**
    - If category or subcategory changes, collection stats are updated automatically
    - Old category counts are decremented
    - New category counts are incremented
    - New categories/subcategories are created if needed
    
    **Returns:**
    - Updated item with new timestamp
    
    **Errors:**
    - 403: User doesn't own the collection's brand
    - 404: Item or collection not found
    """
    try:
        user_id = current_user["uid"]
        return await item_service.update_item(collection_id, item_id, user_id, update_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_item endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update item"
        )


@router.delete("/{collection_id}/items/{item_id}", response_model=Dict[str, str])
async def delete_item(
    collection_id: str,
    item_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete an item from a collection.
    
    **Parameters:**
    - collection_id: Parent collection ID
    - item_id: Unique item identifier
    
    **Behavior:**
    - Permanently deletes the item (hard delete)
    - Item data cannot be recovered
    
    **Automatic Updates:**
    - Removes item_id from collection's items array
    - Decrements collection's total_products count
    - Decrements category/subcategory product counts
    
    **Validations:**
    - User must own the collection's brand
    
    **Returns:**
    - Success message
    
    **Errors:**
    - 403: User doesn't own the collection's brand
    - 404: Item or collection not found
    """
    try:
        user_id = current_user["uid"]
        return await item_service.delete_item(collection_id, item_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_item endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete item"
        )
