"""
Collection Document Management API Router - CRUD operations for collection documents.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Dict, Any
from ..models.collection_document import CollectionDocumentCreate, CollectionDocumentUpdate, CollectionDocumentResponse, CollectionDocumentType
from ..services.collection_document_service import collection_document_service
from ..utils.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

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
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> CollectionDocumentResponse:
    """
    Upload a document to a collection.
    
    **Parameters:**
    - collection_id: Parent collection ID (from URL)
    - file: Document file to upload
    - name: Document name (optional, defaults to filename)
    - type: Document type (optional, defaults to OTHER)
    
    **Validations:**
    - User must own the collection's brand
    
    **Automatic Updates:**
    - Uploads file to Firebase Storage: brands/{brand_id}/collections/{collection_id}/documents/{doc_id}.ext
    - Creates Firestore record in subcollection
    - Increments collection's total_collection_documents count
    
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
        return await collection_document_service.upload_document(collection_id, user_id, file, document_data)
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
