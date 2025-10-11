"""
Brand Document Management API Router - CRUD operations for brand documents.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Dict, Any
from ..models.brand_document import BrandDocumentCreate, BrandDocumentUpdate, BrandDocumentResponse, BrandDocumentType
from ..services.brand_document_service import brand_document_service
from ..utils.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/brands",
    tags=["Brand Document Management"],
    responses={404: {"description": "Not found"}},
)


@router.post("/{brand_id}/documents", response_model=BrandDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_brand_document(
    brand_id: str,
    file: UploadFile = File(...),
    name: str = Form(None),
    type: BrandDocumentType = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> BrandDocumentResponse:
    """
    Upload a document to a brand.
    
    **Parameters:**
    - brand_id: Parent brand ID (from URL)
    - file: Document file to upload
    - name: Document name
    - type: Document type (brand_guide, logo_pack, lookbook, press_kit, etc.)
    
    **Validations:**
    - User must own the brand
    
    **Automatic Updates:**
    - Uploads file to Firebase Storage: brands/{brand_id}/documents/{document_id}.ext
    - Creates Firestore record in subcollection
    - Increments brand's total_brand_documents count
    - Updates brand's storage_used_bytes
    
    **Returns:**
    - Created document with generated ID, storage path, and signed URL
    """
    try:
        user_id = current_user["uid"]
        
        # Use filename as default name if not provided
        document_name = name if name else file.filename
        
        # Use OTHER as default type if not provided
        document_type = type if type else BrandDocumentType.OTHER
        
        document_data = BrandDocumentCreate(
            brand_id=brand_id,
            name=document_name,
            type=document_type
        )
        return await brand_document_service.upload_document(brand_id, user_id, file, document_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload_brand_document endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        )


@router.get("/{brand_id}/documents", response_model=List[BrandDocumentResponse])
async def get_brand_documents(
    brand_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[BrandDocumentResponse]:
    """
    Get all documents for a brand.
    
    **Parameters:**
    - brand_id: Parent brand ID
    
    **Returns:**
    - List of documents for the brand
    - Empty list if no documents exist
    
    **Validations:**
    - User must own the brand
    """
    try:
        user_id = current_user["uid"]
        return await brand_document_service.get_brand_documents(brand_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_brand_documents endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve documents"
        )


@router.get("/{brand_id}/documents/{document_id}", response_model=BrandDocumentResponse)
async def get_brand_document(
    brand_id: str,
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> BrandDocumentResponse:
    """
    Get a specific brand document by ID.
    
    **Parameters:**
    - brand_id: Parent brand ID
    - document_id: Unique document identifier
    
    **Validations:**
    - User must own the brand
    
    **Returns:**
    - Document details including storage path and signed URL
    
    **Errors:**
    - 403: User doesn't own the brand
    - 404: Document not found
    """
    try:
        user_id = current_user["uid"]
        return await brand_document_service.get_document(brand_id, document_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_brand_document endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document"
        )


@router.put("/{brand_id}/documents/{document_id}", response_model=BrandDocumentResponse)
async def update_brand_document(
    brand_id: str,
    document_id: str,
    update_data: BrandDocumentUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> BrandDocumentResponse:
    """
    Update brand document metadata.
    
    **Parameters:**
    - brand_id: Parent brand ID
    - document_id: Unique document identifier
    
    **Updateable Fields:**
    - name: Document name
    - type: Document type
    
    **Note:** This only updates metadata. To replace the file, delete and re-upload.
    
    **Validations:**
    - User must own the brand
    
    **Returns:**
    - Updated document with new timestamp
    
    **Errors:**
    - 403: User doesn't own the brand
    - 404: Document not found
    """
    try:
        user_id = current_user["uid"]
        return await brand_document_service.update_document(brand_id, document_id, user_id, update_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_brand_document endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update document"
        )


@router.delete("/{brand_id}/documents/{document_id}", response_model=Dict[str, str])
async def delete_brand_document(
    brand_id: str,
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete a brand document.
    
    **Parameters:**
    - brand_id: Parent brand ID
    - document_id: Unique document identifier
    
    **Behavior:**
    - Permanently deletes the file from Firebase Storage
    - Deletes the Firestore document record
    - Document cannot be recovered
    
    **Automatic Updates:**
    - Decrements brand's total_brand_documents count
    - Decrements brand's storage_used_bytes
    
    **Validations:**
    - User must own the brand
    
    **Returns:**
    - Success message
    
    **Errors:**
    - 403: User doesn't own the brand
    - 404: Document not found
    """
    try:
        user_id = current_user["uid"]
        return await brand_document_service.delete_document(brand_id, document_id, user_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_brand_document endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        )
