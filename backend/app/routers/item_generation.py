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
