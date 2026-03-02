"""
Item Generation API Router - Generate collection items from purchase orders and line sheets.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import Dict, Any
from ..services.item_generation_service import item_generation_service
from ..services.firebase_service import FirebaseService
from ..services.background_tasks import (
    generate_collection_items_task,
    initialize_processing_status,
    cleanup_partial_items,
    background_executor,
    run_async_task_in_thread
)
from ..utils.auth import get_current_user
import logging
import asyncio

logger = logging.getLogger(__name__)
firebase_service = FirebaseService()

router = APIRouter(
    prefix="/api",
    tags=["Item Generation"],
    responses={404: {"description": "Not found"}},
)


@router.post("/collections/{collection_id}/items/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_items_for_collection(
    collection_id: str,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Generate collection items from purchase order and line sheet (asynchronously).
    
    **Process:**
    1. Validates collection exists and user has access
    2. Starts background task for item generation
    3. Returns immediately (generation happens in background)
    4. Updates processing_status in Firestore with progress
    
    **Processing Steps:**
    1. Fetching purchase order
    2. Parsing purchase order
    3. Identifying columns with AI
    4. Extracting SKU data
    5. Enriching from linesheet
    6. Generating item objects
    7. Saving
    
    **Requirements:**
    - Collection must have a purchase order document uploaded
    - Collection must have a line sheet document uploaded
    - Line sheet must have structured_products extracted
    
    **Duplicate Detection:**
    - Items are deduplicated by content hash (SKU + color_code)
    - Re-running generation will skip existing items
    
    **Status Tracking:**
    - Poll GET /collections/{id}/processing-status to track progress
    - Processing status stored in Firestore
    - Survives server restarts
    
    **Returns:**
    - 202 Accepted with message
    - Generation happens asynchronously
    
    **Errors:**
    - 404: Collection not found
    - 409: Generation already in progress
    """
    try:
        user_id = current_user["uid"]
        logger.info(f"Starting item generation for collection: {collection_id}")
        
        # Check if already processing
        collection_ref = firebase_service.db.collection('collections').document(collection_id)
        collection_doc = collection_ref.get()
        
        if not collection_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found"
            )
        
        data = collection_doc.to_dict()
        current_status = data.get('processing_status', {}).get('item_generation', {}).get('status')
        
        if current_status == 'processing':
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Item generation already in progress"
            )
        
        # If regenerating (status was 'completed'), clean up old items synchronously
        if current_status == 'completed':
            logger.info(f"Regeneration detected - cleaning up previous items for collection {collection_id}")
            await cleanup_partial_items(firebase_service.db, collection_id)
        
        # Initialize processing status BEFORE starting background task
        # This ensures frontend sees 'processing' status immediately
        initialize_processing_status(firebase_service.db, collection_id, 'item_generation')
        logger.info(f"Initialized item generation status for collection {collection_id}")
        
        # Start background task in thread pool (cleanup already done, status already set)
        # Using run_in_executor with wrapper to run async task in separate thread/event loop
        loop = asyncio.get_event_loop()
        loop.run_in_executor(
            background_executor,
            run_async_task_in_thread,
            generate_collection_items_task,
            collection_id,
            firebase_service.db
        )
        
        logger.info(f"Background task started for item generation in collection {collection_id}")
        
        # Return the new processing status so frontend can update cache
        return {
            "message": "Item generation started",
            "collection_id": collection_id,
            "processing_status": {
                "item_generation": {
                    "status": "processing",
                    "current_step": "Starting...",
                    "progress": {
                        "step": 0,
                        "total_steps": 7,
                        "percentage": 0
                    },
                    "error": None
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting item generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start item generation: {str(e)}"
        )


@router.post("/collections/{collection_id}/items/generate/cancel")
async def cancel_item_generation(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Cancel ongoing item generation.
    
    **Behavior:**
    - Sets cancellation flag in Firestore
    - Background task checks flag and stops gracefully
    - Partial items are cleaned up by background task
    - Status updated to 'cancelled'
    
    **Note:**
    - Cancellation is not immediate (background task must check flag)
    - Usually takes a few seconds to cancel
    - Poll /processing-status to confirm cancellation
    
    **Returns:**
    - Success message
    
    **Errors:**
    - 404: Collection not found
    - 400: No generation in progress
    """
    try:
        user_id = current_user["uid"]
        
        # Set cancellation flag
        collection_ref = firebase_service.db.collection('collections').document(collection_id)
        collection_doc = collection_ref.get()
        
        if not collection_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found"
            )
        
        data = collection_doc.to_dict()
        processing_status = data.get('processing_status', {}).get('item_generation', {})
        
        if processing_status.get('status') != 'processing':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No item generation in progress to cancel"
            )
        
        # Update status to cancelled
        collection_ref.update({
            'processing_status.item_generation.status': 'cancelled'
        })
        
        logger.info(f"Cancellation requested for item generation in collection {collection_id}")
        
        return {
            "message": "Cancellation requested",
            "collection_id": collection_id,
            "note": "Background task will stop gracefully. Poll /processing-status to confirm."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling item generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel item generation"
        )


@router.post("/collections/{collection_id}/items/re-enrich")
async def re_enrich_items(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Re-enrich unmatched items using all available line sheets.

    Finds items where product_name is null or equals the SKU (unmatched),
    then attempts to match them against all processed line sheets.

    Returns stats on how many items were matched.
    """
    try:
        user_id = current_user["uid"]
        logger.info(f"Re-enriching unmatched items for collection: {collection_id}")

        # Verify collection exists
        collection_ref = firebase_service.db.collection('collections').document(collection_id)
        collection_doc = collection_ref.get()

        if not collection_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found"
            )

        # Fetch all items for the collection
        items_ref = collection_ref.collection('items')
        all_items = list(items_ref.stream())

        # Filter to unmatched items (product_name is None or equals SKU)
        unmatched_items = []
        for item_doc in all_items:
            item_data = item_doc.to_dict()
            item_data['item_id'] = item_doc.id
            product_name = item_data.get('product_name')
            sku = item_data.get('sku')
            if not product_name or product_name == sku:
                unmatched_items.append(item_data)

        if not unmatched_items:
            return {
                "items_checked": 0,
                "items_matched": 0,
                "items_still_unmatched": 0,
                "message": "No unmatched items found"
            }

        # Fetch all line sheets and build lookup
        linesheets = await item_generation_service.fetch_all_linesheets(collection_id)
        if not linesheets:
            return {
                "items_checked": len(unmatched_items),
                "items_matched": 0,
                "items_still_unmatched": len(unmatched_items),
                "message": "No line sheets available for matching"
            }

        linesheet_lookup = item_generation_service.merge_structured_products(linesheets)
        if not linesheet_lookup:
            return {
                "items_checked": len(unmatched_items),
                "items_matched": 0,
                "items_still_unmatched": len(unmatched_items),
                "message": "No structured products found in line sheets"
            }

        # Try to match each unmatched item
        matched_count = 0
        for item_data in unmatched_items:
            sku = item_data.get('sku')
            base_sku = item_data.get('base_sku')

            # Try full SKU first, then base SKU
            linesheet_data = linesheet_lookup.get(sku)
            if not linesheet_data and base_sku:
                linesheet_data = linesheet_lookup.get(base_sku)

            if linesheet_data:
                # Build update from linesheet data
                ls_colors = linesheet_data.get('colors', [])
                ls_color = ls_colors[0] if ls_colors else {}

                update_fields = {
                    'product_name': linesheet_data.get('product_name'),
                    'wholesale_price': linesheet_data.get('wholesale_price'),
                    'rrp': linesheet_data.get('rrp'),
                    'currency': linesheet_data.get('currency'),
                    'origin': linesheet_data.get('origin'),
                    'materials': linesheet_data.get('materials', []),
                    'category': linesheet_data.get('category'),
                    'subcategory': linesheet_data.get('subcategory'),
                    'color': ls_color.get('color_name') or item_data.get('color'),
                    'color_code': ls_color.get('color_code') or item_data.get('color_code'),
                    'source_document_id': linesheet_data.get('source_document_id'),
                    'images': [
                        {
                            'url': url,
                            'alt': f"{linesheet_data.get('product_name', 'Product')} - {ls_color.get('color_name', '')}"
                        }
                        for url in linesheet_data.get('images', [])
                    ],
                }

                # Remove None values to avoid overwriting with null
                update_fields = {k: v for k, v in update_fields.items() if v is not None}

                # Update the item in Firestore
                item_ref = items_ref.document(item_data['item_id'])
                item_ref.update(update_fields)
                matched_count += 1
                logger.info(f"Re-enriched item {item_data['item_id']} (SKU: {sku}) with linesheet data")

        still_unmatched = len(unmatched_items) - matched_count
        logger.info(f"Re-enrichment complete: {matched_count}/{len(unmatched_items)} items matched")

        return {
            "items_checked": len(unmatched_items),
            "items_matched": matched_count,
            "items_still_unmatched": still_unmatched,
            "message": f"Successfully matched {matched_count} item(s)"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error re-enriching items: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to re-enrich items: {str(e)}"
        )
