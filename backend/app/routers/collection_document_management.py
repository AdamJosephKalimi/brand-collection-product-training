"""
Collection Document Management API Router - CRUD operations for collection documents.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from typing import List, Dict, Any, Optional
from ..models.collection_document import CollectionDocumentCreate, CollectionDocumentUpdate, CollectionDocumentResponse, CollectionDocumentType
from ..services.collection_document_service import collection_document_service
from ..services.firebase_service import FirebaseService
from ..services.background_tasks import (
    process_collection_documents_task,
    initialize_processing_status,
    update_progress,
    cleanup_for_reprocessing
)
from ..utils.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
firebase_service = FirebaseService()

router = APIRouter(
    prefix="/api/collections",
    tags=["Collection Document Management"],
    responses={404: {"description": "Not found"}},
)


@router.post("/{collection_id}/documents", response_model=CollectionDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_collection_document(
    collection_id: str,
    file: UploadFile = File(...),
    name: str = Form(None),
    type: CollectionDocumentType = Form(None),
    process: bool = Form(True),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> CollectionDocumentResponse:
    """
    Upload a document to a collection.
    
    **Parameters:**
    - collection_id: Parent collection ID (from URL)
    - file: Document file to upload
    - name: Document name (optional, defaults to filename)
    - type: Document type (optional, defaults to OTHER)
    - process: Whether to process document immediately (default: True for backward compatibility)
    
    **Validations:**
    - User must own the collection's brand
    
    **Automatic Updates:**
    - Uploads file to Firebase Storage: brands/{brand_id}/collections/{collection_id}/documents/{doc_id}.ext
    - Creates Firestore record in subcollection
    - Increments collection's total_collection_documents count
    - If process=True, processes document immediately (legacy behavior)
    - If process=False, only uploads file (use /documents/process endpoint to process later)
    
    **Returns:**
    - Created document with generated ID, storage path, and signed URL
    """
    try:
        user_id = current_user["uid"]
        
        # Use filename as default name if not provided
        document_name = name if name else file.filename
        
        # Use OTHER as default type if not provided
        document_type = type if type else CollectionDocumentType.OTHER
        
        document_data = CollectionDocumentCreate(
            collection_id=collection_id,
            name=document_name,
            type=document_type
        )
        
        # Upload document (with or without processing based on 'process' parameter)
        return await collection_document_service.upload_document(collection_id, user_id, file, document_data, process)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload_collection_document endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        )


@router.get("/{collection_id}/documents", response_model=List[CollectionDocumentResponse])
async def get_collection_documents(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[CollectionDocumentResponse]:
    """
    Get all documents for a collection.
    
    **Parameters:**
    - collection_id: Parent collection ID
    
    **Returns:**
    - List of documents for the collection
    - Empty list if no documents exist
    
    **Validations:**
    - User must own the collection's brand
    """
    try:
        user_id = current_user["uid"]
        return await collection_document_service.get_collection_documents(collection_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_collection_documents endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve documents"
        )


@router.get("/{collection_id}/documents/{document_id}", response_model=CollectionDocumentResponse)
async def get_collection_document(
    collection_id: str,
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> CollectionDocumentResponse:
    """
    Get a specific collection document by ID.
    
    **Parameters:**
    - collection_id: Parent collection ID
    - document_id: Unique document identifier
    
    **Validations:**
    - User must own the collection's brand
    
    **Returns:**
    - Document details including storage path and signed URL
    
    **Errors:**
    - 403: User doesn't own the collection's brand
    - 404: Document or collection not found
    """
    try:
        user_id = current_user["uid"]
        return await collection_document_service.get_document(collection_id, document_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_collection_document endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document"
        )


@router.put("/{collection_id}/documents/{document_id}", response_model=CollectionDocumentResponse)
async def update_collection_document(
    collection_id: str,
    document_id: str,
    update_data: CollectionDocumentUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> CollectionDocumentResponse:
    """
    Update collection document metadata.
    
    **Parameters:**
    - collection_id: Parent collection ID
    - document_id: Unique document identifier
    
    **Updateable Fields:**
    - name: Document name
    - type: Document type
    
    **Note:** This only updates metadata. To replace the file, delete and re-upload.
    
    **Validations:**
    - User must own the collection's brand
    
    **Returns:**
    - Updated document with new timestamp
    
    **Errors:**
    - 403: User doesn't own the collection's brand
    - 404: Document or collection not found
    """
    try:
        user_id = current_user["uid"]
        return await collection_document_service.update_document(collection_id, document_id, user_id, update_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_collection_document endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update document"
        )


@router.delete("/{collection_id}/documents/{document_id}", response_model=Dict[str, str])
async def delete_collection_document(
    collection_id: str,
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete a collection document.
    
    **Parameters:**
    - collection_id: Parent collection ID
    - document_id: Unique document identifier
    
    **Behavior:**
    - Permanently deletes the file from Firebase Storage
    - Deletes the Firestore document record
    - Document cannot be recovered
    
    **Automatic Updates:**
    - Decrements collection's total_collection_documents count
    
    **Validations:**
    - User must own the collection's brand
    
    **Returns:**
    - Success message
    
    **Errors:**
    - 403: User doesn't own the collection's brand
    - 404: Document or collection not found
    """
    try:
        user_id = current_user["uid"]
        return await collection_document_service.delete_document(collection_id, document_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_collection_document endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        )


# ============================================================================
# ASYNC PROCESSING ENDPOINTS
# ============================================================================

@router.post("/{collection_id}/documents/process", status_code=status.HTTP_202_ACCEPTED)
async def process_collection_documents(
    collection_id: str,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Start asynchronous processing of collection documents.
    
    **Process:**
    1. Validates collection exists and user has access
    2. Starts background task for document processing
    3. Returns immediately (processing happens in background)
    4. Updates processing_status in Firestore with progress
    
    **Processing Phases:**
    1. Extracting images
    2. Extracting text
    3. Filtering product images
    4. Generating categories
    5. Extracting structured products
    6. Matching images to products
    
    **Status Tracking:**
    - Poll GET /collections/{id}/processing-status to track progress
    - Processing status stored in Firestore
    - Survives server restarts
    
    **Returns:**
    - 202 Accepted with message
    - Processing happens asynchronously
    
    **Errors:**
    - 404: Collection not found
    - 400: No documents to process
    - 409: Processing already in progress
    """
    try:
        user_id = current_user["uid"]
        logger.info(f"Starting document processing for collection {collection_id}")
        
        # Get collection documents
        documents = await collection_document_service.get_collection_documents(collection_id, user_id)
        
        if not documents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No documents found to process"
            )
        
        # Check current processing status
        collection_ref = firebase_service.db.collection('collections').document(collection_id)
        collection_doc = collection_ref.get()
        
        current_status = None
        if collection_doc.exists:
            data = collection_doc.to_dict()
            current_status = data.get('processing_status', {}).get('document_processing', {}).get('status')
            
            if current_status == 'processing':
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Document processing already in progress"
                )
        
        # Get document IDs
        document_ids = [doc.document_id for doc in documents]
        
        # If reprocessing (status was 'completed'), clean up old data synchronously
        if current_status == 'completed':
            logger.info(f"Reprocessing detected - cleaning up previous data for collection {collection_id}")
            await cleanup_for_reprocessing(firebase_service.db, collection_id, document_ids)
        
        # Initialize processing status BEFORE starting background task
        # This ensures frontend sees 'processing' status immediately
        initialize_processing_status(firebase_service.db, collection_id, 'document_processing')
        logger.info(f"Initialized processing status for collection {collection_id}")
        
        # Start background task (cleanup already done, status already set)
        background_tasks.add_task(
            process_collection_documents_task,
            collection_id,
            document_ids,
            firebase_service.db
        )
        
        logger.info(f"Background task started for collection {collection_id}")
        
        # Return the new processing status so frontend can update cache
        return {
            "message": "Document processing started",
            "collection_id": collection_id,
            "document_count": len(document_ids),
            "processing_status": {
                "document_processing": {
                    "status": "processing",
                    "current_phase": "Starting...",
                    "progress": {
                        "phase": 0,
                        "total_phases": 6,
                        "percentage": 0
                    },
                    "error": None
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting document processing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start processing: {str(e)}"
        )


@router.get("/{collection_id}/processing-status")
async def get_processing_status(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current processing status for a collection.
    
    **Returns:**
    - document_processing: Status of document processing
      - status: idle|processing|completed|failed|cancelled
      - current_phase: Current processing phase
      - progress: Progress information (phase, percentage)
      - started_at: When processing started
      - completed_at: When processing completed (if done)
      - error: Error details (if failed)
    
    - item_generation: Status of item generation
      - status: idle|processing|completed|failed|cancelled
      - current_step: Current processing step
      - progress: Progress information (step, percentage)
      - started_at: When generation started
      - completed_at: When generation completed (if done)
      - error: Error details (if failed)
    
    **Usage:**
    - Frontend polls this endpoint every 2-3 seconds during processing
    - Status persists in Firestore (survives page refresh)
    
    **Errors:**
    - 404: Collection not found
    """
    try:
        user_id = current_user["uid"]
        
        # Verify user has access to collection
        # (This will raise 404 if collection doesn't exist or user doesn't have access)
        await collection_document_service.get_collection_documents(collection_id, user_id)
        
        # Get processing status from Firestore
        collection_ref = firebase_service.db.collection('collections').document(collection_id)
        collection_doc = collection_ref.get()
        
        if not collection_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found"
            )
        
        data = collection_doc.to_dict()
        processing_status = data.get('processing_status', {})
        
        # Return default status if not set
        if not processing_status:
            processing_status = {
                'document_processing': {
                    'status': 'idle',
                    'progress': {'percentage': 0}
                },
                'item_generation': {
                    'status': 'idle',
                    'progress': {'percentage': 0}
                }
            }
        
        return processing_status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting processing status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get processing status"
        )


@router.post("/{collection_id}/documents/process/cancel")
async def cancel_document_processing(
    collection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Cancel ongoing document processing.
    
    **Behavior:**
    - Sets cancellation flag in Firestore
    - Background task checks flag and stops gracefully
    - Partial data is cleaned up by background task
    - Status updated to 'cancelled'
    
    **Note:**
    - Cancellation is not immediate (background task must check flag)
    - Usually takes a few seconds to cancel
    - Poll /processing-status to confirm cancellation
    
    **Returns:**
    - Success message
    
    **Errors:**
    - 404: Collection not found
    - 400: No processing in progress
    """
    try:
        user_id = current_user["uid"]
        
        # Verify user has access
        await collection_document_service.get_collection_documents(collection_id, user_id)
        
        # Set cancellation flag
        collection_ref = firebase_service.db.collection('collections').document(collection_id)
        collection_doc = collection_ref.get()
        
        if not collection_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found"
            )
        
        data = collection_doc.to_dict()
        processing_status = data.get('processing_status', {}).get('document_processing', {})
        
        if processing_status.get('status') != 'processing':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No processing in progress to cancel"
            )
        
        # Update status to cancelled
        collection_ref.update({
            'processing_status.document_processing.status': 'cancelled'
        })
        
        logger.info(f"Cancellation requested for collection {collection_id}")
        
        return {
            "message": "Cancellation requested",
            "collection_id": collection_id,
            "note": "Background task will stop gracefully. Poll /processing-status to confirm."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling processing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel processing"
        )
